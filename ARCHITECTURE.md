# Architecture

helptheneedy is a dating-style mobile app that matches gifters with receivers. The client is React Native with Expo, and the backend is Supabase with TypeScript.

**Status:** The backend is implemented in `supabase/`. The mobile client in `mobile/` has Discover and Profile screen prototypes that run on mock data, and a Supabase client in `src/lib/supabase.ts` that no screen uses yet. For demos it saves a $1,000 play-money balance, gifts and profile edits on the device only; that balance is never real money and never reaches the backend; see [mobile/README.md](mobile/README.md). Keep this file in sync with migrations in the same PR. The migrations win if the two disagree.

See [docs/backend-plan.md](docs/backend-plan.md) for the milestones, build order, and testing requirements.

## Rules

- The app never does not handle or move money, for now.
- Only a receiver's confirmation counts a gift toward post progress and leaderboards.
- Store money as integer cents. Gift totals are reported by members, so never describe them as verified payments.
- Enable Row Level Security (RLS) on every table. Clients read through RLS and write through RPCs.
- RPCs derive the user from `auth.uid()`, never from an argument.
- Blocks apply in both directions across every feed, search, request, and friend list.
- Store only a general location, never an exact address.
- Keep the service role key in Edge Function secrets. It must never reach the client.

## Database

Unless noted, tables have an `id uuid` primary key and `created_at timestamptz`.

### Accounts

**`profiles`**: one row per user, created by a signup trigger.

| Column | Type | Notes |
| --- | --- | --- |
| `id` | `uuid` | Primary key, references `auth.users` |
| `username` | `text` | Unique |
| `display_name` | `text` | |
| `bio` | `text` | Nullable |
| `avatar_path` | `text` | Storage path, nullable |
| `intent` | `user_intent` | `gifter`, `receiver`, `both` |
| `is_adult_confirmed` | `boolean` | Must be true to finish onboarding |
| `general_location` | `text` | Nullable |
| `leaderboard_excluded` | `boolean` | Default false; set by moderators |
| `onboarded_at` | `timestamptz` | Null until onboarding finishes; most RPCs require it |

Other users can read only `id`, `username`, `display_name`, `bio`, and `avatar_path`. `username`, `display_name`, and `intent` are null until onboarding finishes. Deleting an account removes the row.

**`privacy_settings`**: one row per user.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key, references `profiles` |
| `show_gifted_total` | `boolean` | Default false |
| `show_received_total` | `boolean` | Default false |
| `on_gifted_board` | `boolean` | Default true |
| `on_received_board` | `boolean` | Default false |
| `share_activity` | `boolean` | Default true |
| `push_enabled` | `boolean` | Default true |

**`push_tokens`**

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | References `profiles` |
| `expo_push_token` | `text` | Unique |
| `platform` | `text` | `ios` or `android` |

### Posts

**`posts`**

| Column | Type | Notes |
| --- | --- | --- |
| `receiver_id` | `uuid` | References `profiles` |
| `title` | `text` | |
| `story` | `text` | |
| `category` | `text` | |
| `goal_cents` | `integer` | $1 to $10,000 |
| `raised_cents` | `integer` | Default 0; changes only through gift confirmation |
| `general_location` | `text` | Nullable |
| `status` | `post_status` | `draft`, `open`, `closed`, `removed` |
| `search` | `tsvector` | GIN index |

**`post_photos`**: at most 5 per post.

| Column | Type | Notes |
| --- | --- | --- |
| `post_id` | `uuid` | References `posts` |
| `storage_path` | `text` | |
| `position` | `integer` | |

**`post_gift_instructions`**: readable only by the receiver and gifters matched on that post.

| Column | Type | Notes |
| --- | --- | --- |
| `post_id` | `uuid` | Primary key, references `posts` |
| `instructions` | `text` | How to receive a gift |

### Matching

**`swipes`**: unique on (`gifter_id`, `post_id`).

| Column | Type | Notes |
| --- | --- | --- |
| `gifter_id` | `uuid` | References `profiles` |
| `post_id` | `uuid` | References `posts` |
| `direction` | `swipe_direction` | `left`, `right` |

**`match_requests`**: unique on (`gifter_id`, `post_id`).

| Column | Type | Notes |
| --- | --- | --- |
| `gifter_id` | `uuid` | References `profiles` |
| `post_id` | `uuid` | References `posts` |
| `status` | `request_status` | `pending`, `accepted`, `declined`, `cancelled` |

**`matches`**: unique on `request_id`.

| Column | Type | Notes |
| --- | --- | --- |
| `request_id` | `uuid` | References `match_requests` |
| `gifter_id` | `uuid` | References `profiles` |
| `receiver_id` | `uuid` | References `profiles` |
| `post_id` | `uuid` | References `posts` |
| `status` | `match_status` | `active`, `closed` |

### Gifts

**`gifts`**: `gifter_id` must differ from `receiver_id`, and each match can have one pending gift at a time. Only the gifter and receiver can read a gift. Because they matched, the receiver knows who the gifter is even when a gift is anonymous; `is_anonymous` hides the gift from everyone else.

| Column | Type | Notes |
| --- | --- | --- |
| `match_id` | `uuid` | References `matches`; set null on account deletion |
| `gifter_id` | `uuid` | References `profiles`; set null on account deletion |
| `receiver_id` | `uuid` | References `profiles`; set null on account deletion |
| `post_id` | `uuid` | References `posts`; set null on account deletion |
| `amount_cents` | `integer` | Must be above 0 |
| `is_anonymous` | `boolean` | |
| `status` | `gift_status` | `pending`, `confirmed`, `disputed`, `cancelled` |
| `confirmed_at` | `timestamptz` | Nullable |

Gift status moves only from `pending`:

| Change | Who | Effect |
| --- | --- | --- |
| `pending` to `confirmed` | Receiver | Adds to `raised_cents`, closes the post at goal, and notifies the gifter |
| `pending` to `disputed` | Receiver | No change to totals; notifies the gifter |
| `pending` to `cancelled` | Gifter | No change to totals |

Blocking someone or deleting an account also cancels pending gifts between the two people.

### Social and safety

**`follows`**: one row per follow, with no approval step. The primary key is (`follower_id`, `followed_id`), so this table has no `id`. Two people who follow each other are friends: `get_friend_activity` and the `friends` leaderboard scope include only mutual follows, so following a stranger never reveals their gifts.

| Column | Type | Notes |
| --- | --- | --- |
| `follower_id` | `uuid` | References `profiles` |
| `followed_id` | `uuid` | References `profiles`; must differ from `follower_id` |

**`blocks`**: unique on (`blocker_id`, `blocked_id`).

| Column | Type | Notes |
| --- | --- | --- |
| `blocker_id` | `uuid` | References `profiles` |
| `blocked_id` | `uuid` | References `profiles` |

**`reports`**: readable only by moderators.

| Column | Type | Notes |
| --- | --- | --- |
| `reporter_id` | `uuid` | References `profiles` |
| `target_user_id` | `uuid` | Nullable |
| `target_post_id` | `uuid` | Nullable |
| `reason` | `text` | |
| `status` | `report_status` | `open`, `resolved` |

**`notifications`**: delivered through Realtime while the app is open, and by push otherwise.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | References `profiles` |
| `type` | `text` | |
| `payload` | `jsonb` | |
| `read_at` | `timestamptz` | Nullable |

**`moderators`**: grants moderator access. Add rows with the service role; no RPC can.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key, references `profiles` |

**`moderation_log`**: every moderator action. Readable only by moderators.

| Column | Type | Notes |
| --- | --- | --- |
| `moderator_id` | `uuid` | Set null on account deletion |
| `action` | `text` | |
| `target_id` | `uuid` | |
| `detail` | `text` | Nullable |

### Private schema

- **`private.leaderboard_monthly`:** A materialized view of confirmed gift cents per user, by board and UTC month. `pg_cron` refreshes it every 5 minutes. RPCs apply opt-outs, `leaderboard_excluded`, and blocks when read, so those take effect immediately.
- **`private.rate_events`:** Backs rate limits, and `pg_cron` purges old rows.

## API

All RPCs are Postgres functions called with `supabase.rpc()` as the signed-in user. Every argument below has a `p_` prefix, such as `p_post_id`, and `?` marks an optional argument. Signed-out users can't call any RPC.

Errors return a stable code in the message, such as `post_not_found`, `invalid_amount`, or `rate_limited`.

To read your own data, query tables directly with RLS. For example, gift history comes from `gifts`, matches from `matches`, and requests from `match_requests`.

Rate limits per user:

| Action | Limit |
| --- | --- |
| `create_post` | 10 per day |
| `record_swipe` | 600 per hour |
| `record_gift` | 50 per day |
| `follow_user` | 50 per day |
| `report` | 20 per day |

### Accounts

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `complete_onboarding` | `username`, `display_name`, `intent`, `is_adult_confirmed`, `avatar_path?` | Finishes the profile; rejects users who don't confirm they are 18+ |
| `update_profile` | `display_name?`, `bio?`, `avatar_path?`, `general_location?` | Updates your profile |
| `update_privacy` | Any `privacy_settings` field | Updates your settings |
| `register_push_token` | `expo_push_token`, `platform` | Saves the token for your device |
| `mark_notifications_read` | `notification_ids?` | Marks those notifications, or all of them, as read |
| `get_my_profile` | None | Your full profile and totals |
| `get_public_profile` | `user_id` | Public fields; totals are null unless shared |

### Posts

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `create_post` | `title`, `story`, `category`, `goal_cents`, `general_location?` | Creates a `draft` |
| `update_post` | `post_id`, changed fields | Owner only |
| `add_post_photo` | `post_id`, `storage_path` | Owner only; at most 5 photos |
| `remove_post_photo` | `photo_id` | Owner only; returns the path so the client can delete the file |
| `set_gift_instructions` | `post_id`, `instructions` | Owner only |
| `publish_post` | `post_id` | Requires gift instructions; sets `open` |
| `close_post` | `post_id` | Owner only; sets `closed` and cancels pending requests |
| `delete_post` | `post_id` | Owner only; rejected if the post has gifts; returns photo paths so the client can delete the files |

### Swiping and Discover

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `get_swipe_feed` | `limit?` | Open posts, excluding your own, already swiped, and blocked users |
| `record_swipe` | `post_id`, `direction` | A right swipe also creates a request and upgrades an earlier left swipe; also used to offer from Discover |
| `respond_to_request` | `request_id`, `accept` | Receiver only; accepting creates the match |
| `search_posts` | `query?`, `category?`, `max_remaining_cents?`, `location?`, `sort?` (`newest`, `closest_to_goal`, `nearby`), `cursor_value?`, `cursor_id?`, `limit?` | Paginated open posts, excluding your own and blocked users. For the next page, pass the last row's `sort_value` and `id`. `nearby` matches your profile's `general_location` as text. |

### Gifts

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `record_gift` | `match_id`, `amount_cents`, `is_anonymous?` | Gifter only; requires an active match, allows $1 up to the remaining amount, creates a `pending` gift, and notifies the receiver |
| `cancel_gift` | `gift_id` | Gifter only; pending gifts only |
| `respond_to_gift` | `gift_id`, `confirm` | Receiver only; pending gifts only |

### Friends and safety

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `search_users` | `query`, `cursor?`, `limit?` | Excludes blocked users; `cursor` is the last username |
| `follow_user` | `user_id` | Follows them and notifies them; repeating it has no extra effect |
| `unfollow_user` | `user_id` | Stops you following them |
| `remove_follower` | `user_id` | Stops them following you |
| `get_follows` | None | Everyone you follow or who follows you, with `is_following` and `follows_me` flags |
| `block_user` | `user_id` | Also removes follows in both directions, cancels pending requests and gifts, and closes matches |
| `unblock_user` | `user_id` | Removes your block |
| `get_friend_activity` | `cursor_at?`, `cursor_id?`, `limit?` | Confirmed gifts from mutual follows, honoring `share_activity`; omits anonymous gifts and receivers |
| `report` | `target_user_id?`, `target_post_id?`, `reason` | Requires one target |

### Moderation

Moderators only. Each action is written to `moderation_log`, and the report queue is read directly from `reports`.

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `mod_resolve_report` | `report_id`, `detail?` | Marks the report resolved |
| `mod_remove_post` | `post_id`, `detail?` | Sets `removed` and cancels pending requests |
| `mod_set_leaderboard_excluded` | `user_id`, `excluded`, `detail?` | Takes someone off or puts them back on the boards |
| `mod_get_flagged_accounts` | `large_total_cents?` | Pairs with gifts going both ways, and accounts with large confirmed totals |

### Leaderboard

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `get_leaderboard` | `board` (`gifted`, `received`), `period?` (`all_time`, `month`), `scope?` (`global`, `friends`), `offset?`, `limit?` | Ranked entries; ties share a rank |
| `get_my_rank` | `board`, `period?`, `scope?` | Your rank and total; no row if you aren't on the board |

### Edge Functions

| Function | Trigger | Behavior |
| --- | --- | --- |
| `send-push` | New `notifications` row, authenticated with the `x-webhook-secret` header | Sends through Expo's push service, honors `push_enabled`, and removes invalid tokens |
| `delete-account` | `POST` from the signed-in user | Removes their files and account, and keeps anonymized gift records |

`send-push` needs a `PUSH_WEBHOOK_SECRET` function secret, plus vault secrets named `project_url` and `push_webhook_secret`. Without the vault secrets, notifications still reach open apps through Realtime.

### Storage

Post photos and avatars live in the private `post-photos` and `avatars` buckets, with size and type limits. Signed-in users can read them with a signed URL. Upload to `<user id>/<file name>`, then save the path with an RPC. Other paths are rejected.
