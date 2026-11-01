# Architecture

helptheneedy is a dating-style mobile app that matches gifters with receivers. The client is React Native with Expo, and the backend is Supabase with TypeScript.

**Status:** Nothing below is implemented yet. This file describes the target design. As migrations land, keep it in sync with them in the same PR; once they exist, the migrations win if the two disagree.

See [docs/backend-plan.md](docs/backend-plan.md) for the milestones, build order, and testing requirements.

## Rules

- The app never handles or moves money. Gifts happen outside the app and are recorded here.
- Only a receiver's confirmation counts a gift toward post progress and leaderboards.
- Store money as integer cents, and label totals as reported by members, not verified.
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
| `deleted_at` | `timestamptz` | Nullable |

**`privacy_settings`**: one row per user.

| Column | Type | Notes |
| --- | --- | --- |
| `user_id` | `uuid` | Primary key, references `profiles` |
| `show_gifted_total` | `boolean` | |
| `show_received_total` | `boolean` | |
| `on_gifted_board` | `boolean` | Default true |
| `on_received_board` | `boolean` | Default false |
| `share_activity` | `boolean` | |

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
| `goal_cents` | `integer` | Must be above 0 |
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

**`gifts`**: `gifter_id` must differ from `receiver_id`.

| Column | Type | Notes |
| --- | --- | --- |
| `match_id` | `uuid` | References `matches` |
| `gifter_id` | `uuid` | References `profiles`; set null on account deletion |
| `receiver_id` | `uuid` | References `profiles`; set null on account deletion |
| `post_id` | `uuid` | References `posts` |
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

### Social and safety

**`friendships`**: one row per pair, with `user_low < user_high`.

| Column | Type | Notes |
| --- | --- | --- |
| `user_low` | `uuid` | References `profiles` |
| `user_high` | `uuid` | References `profiles` |
| `requested_by` | `uuid` | References `profiles` |
| `status` | `friendship_status` | `pending`, `accepted` |

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

### Leaderboard view

A materialized view holds confirmed gift cents per user, by board and month. `pg_cron` refreshes it every 5 minutes. It excludes `leaderboard_excluded` profiles, and the RPCs apply opt-outs and blocks.

## API

All RPCs are Postgres functions called with `supabase.rpc()` as the signed-in user.

### Accounts

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `complete_onboarding` | `username`, `display_name`, `intent`, `is_adult_confirmed`, `avatar_path?` | Finishes the profile; rejects users who don't confirm they are 18+ |
| `update_profile` | `display_name?`, `bio?`, `avatar_path?`, `general_location?` | Updates your profile |
| `update_privacy` | Any `privacy_settings` field | Updates your settings |
| `delete_account` | None | Removes personal data and keeps anonymized gift records |
| `register_push_token` | `expo_push_token`, `platform` | Saves the token for your device |

### Posts

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `create_post` | `title`, `story`, `category`, `goal_cents`, `general_location?` | Creates a `draft` |
| `update_post` | `post_id`, changed fields | Owner only |
| `set_gift_instructions` | `post_id`, `instructions` | Owner only |
| `publish_post` | `post_id` | Requires gift instructions; sets `open` |
| `close_post` | `post_id` | Owner only; sets `closed` |
| `delete_post` | `post_id` | Owner only; rejected if the post has gifts |

### Swiping and Discover

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `get_swipe_feed` | `limit` | Open posts, excluding your own, already swiped, and blocked users |
| `record_swipe` | `post_id`, `direction` | A right swipe also creates a request; also used to offer from Discover |
| `respond_to_request` | `request_id`, `accept` | Receiver only; accepting creates the match |
| `search_posts` | `query?`, `category?`, `max_remaining_cents?`, `location?`, `sort`, `cursor?` | Paginated open posts, excluding blocked users |

### Gifts

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `record_gift` | `match_id`, `amount_cents`, `is_anonymous` | Gifter only; checks the remaining amount, creates a `pending` gift, and notifies the receiver |
| `cancel_gift` | `gift_id` | Gifter only; pending gifts only |
| `respond_to_gift` | `gift_id`, `confirm` | Receiver only; pending gifts only |

### Friends and safety

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `search_users` | `query`, `cursor?` | Excludes blocked users |
| `request_friend` | `user_id` | Creates a pending friendship |
| `respond_friend` | `friendship_id`, `accept` | Recipient only |
| `remove_friend` | `user_id` | Removes the friendship or cancels a request |
| `block_user` | `user_id` | Also removes any friendship |
| `unblock_user` | `user_id` | Removes your block |
| `get_friend_activity` | `cursor?` | Friends' confirmed gifts, honoring `share_activity`; omits anonymous gifts |
| `report` | `target_user_id?`, `target_post_id?`, `reason` | Requires one target |

### Leaderboard

| RPC | Arguments | Behavior |
| --- | --- | --- |
| `get_leaderboard` | `board` (`gifted`, `received`), `period` (`all_time`, `month`), `scope` (`global`, `friends`), `cursor?` | Ranked entries; ties share a rank |
| `get_my_rank` | `board`, `period`, `scope` | Your rank and total |

### Edge Functions

| Function | Trigger | Behavior |
| --- | --- | --- |
| `send-push` | New `notifications` row | Sends through Expo's push service and removes invalid tokens |

### Storage

Post photos and avatars live in Supabase Storage, with size and type limits on each bucket. Upload first, then save the returned path with an RPC.
