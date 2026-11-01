# Backend plan

Implementation plan for Claude. Work through the milestones in order, one PR per milestone, and reference the GitHub issue in each PR.

## Product

helptheneedy is a dating-style app that matches gifters with receivers. Receivers publish posts describing a need. Gifters swipe through posts, and a right swipe sends the receiver a request. If the receiver accepts, they match. The gifter then sends the gift outside the app and records it, and the receiver confirms it. One account can act in both roles.

| Issue | Feature | Milestone |
| --- | --- | --- |
| #1 | Login and signup | 1 |
| #3 | Add post | 2, 4 |
| #2 | Card swipe | 3, 4 |
| #4 | Discover | 5 |
| #5 | Friends | 6 |
| #6 | Leaderboard | 7 |
| #7 | Profile | 1, 8 |

## Decisions

These are defaults chosen to get started. Change them here before building if they turn out wrong.

- **Client:** React Native with Expo, in TypeScript, for iOS and Android. Use `@supabase/supabase-js` directly from the app.
- **Stack:** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) with TypeScript.
- **Data access:** Clients read through Row Level Security (RLS) policies and write through Postgres RPC functions. Edge Functions are used only for work that needs secrets, meaning push delivery.
- **Payments:** No payment or fintech integration for now. The app never handles, holds, or moves money, and stores no card, bank, or government ID data.
- **Matching:** A match requires a gifter's right swipe and the receiver's acceptance.
- **Gifting:** After matching, the gifter sees the receiver's gift instructions and sends the gift outside the app. The gifter records the amount, from $1 up to the amount remaining on the post, and the receiver confirms or disputes it.
- **Out of v1:** Chat, recurring gifts, non-USD currencies, and in-app payments.

## If payments are added later

Before writing any payment code, the project owner needs to:

1. Confirm with the payment provider that this person-to-person gifting model is allowed.
2. Ask a lawyer about money transmission, tax reporting for receivers, and fundraising rules.
3. Check Apple and Google in-app purchase rules for this kind of gift.
4. Decide on a platform fee and who pays it.

## Rules that must always hold

- **Money:** Store amounts as integer cents. Never use floats.
- **Source of truth:** Only the receiver's confirmation counts a gift toward post progress and leaderboards. The gifter's record alone never does.
- **Labeling:** Gift totals are self-reported, so the app must not describe them as verified payments.
- **Idempotency:** Swipes, matches, and gift confirmations rely on unique constraints and status checks, so repeating a call has no extra effect.
- **Authorization:** Enable RLS on every table, with no exceptions. Every RPC derives the user from `auth.uid()`, never from an argument.
- **Secrets:** The service role key stays in Edge Function secrets and never reaches clients.
- **Privacy:** Store only a general location (city or coarse area), never an exact address. Anonymous gifts never expose the pairing to anyone but the two participants, and the gifter's identity stays hidden from the receiver if the gifter chooses.
- **Blocks:** A block applies in both directions across every feed, search, request, and friend list.
- **Retention:** Deleting an account removes personal data but keeps anonymized gift rows for financial records.

## Schema

All tables have `id uuid` primary keys and `created_at`, unless noted. Use Postgres enums for statuses.

| Table | Key columns | Constraints and notes |
| --- | --- | --- |
| `profiles` | `id` (references `auth.users`), `username`, `display_name`, `bio`, `avatar_path`, `intent`, `is_adult_confirmed`, `general_location`, `deleted_at` | `username` unique |
| `privacy_settings` | `user_id`, `show_gifted_total`, `show_received_total`, `on_gifted_board` (default true), `on_received_board` (default false), `share_activity` | One row per user |
| `posts` | `receiver_id`, `title`, `story`, `category`, `goal_cents`, `raised_cents`, `general_location`, `status` (`draft`, `open`, `closed`, `removed`), `search` (tsvector) | `goal_cents > 0`; `raised_cents` changes only through gift confirmation |
| `post_gift_instructions` | `post_id` (primary key), `instructions` | Free text on how to receive a gift; readable only by the receiver and gifters matched on that post |
| `post_photos` | `post_id`, `storage_path`, `position` | At most 5 per post |
| `swipes` | `gifter_id`, `post_id`, `direction` | Unique on (`gifter_id`, `post_id`) |
| `match_requests` | `gifter_id`, `post_id`, `status` (`pending`, `accepted`, `declined`, `cancelled`) | Unique on (`gifter_id`, `post_id`) |
| `matches` | `request_id`, `gifter_id`, `receiver_id`, `post_id`, `status` | Unique on `request_id` |
| `gifts` | `match_id`, `gifter_id`, `receiver_id`, `post_id`, `amount_cents`, `is_anonymous`, `status` (`pending`, `confirmed`, `disputed`, `cancelled`), `confirmed_at` | `amount_cents > 0`; `gifter_id <> receiver_id` |
| `follows` | `follower_id`, `followed_id` | Primary key on the pair; a follow needs no approval, and a mutual follow makes two people friends |
| `blocks` | `blocker_id`, `blocked_id` | Unique on the pair |
| `reports` | `reporter_id`, `target_user_id`, `target_post_id`, `reason`, `status` | Readable only by moderators |
| `notifications` | `user_id`, `type`, `payload`, `read_at` | Delivered through Realtime while the app is open, and by push otherwise |
| `push_tokens` | `user_id`, `expo_push_token`, `platform` | Token unique; delete tokens Expo reports as invalid |

## API

Each RPC runs as the signed-in user and enforces the rules above.

- **Accounts:** `complete_onboarding`, `update_profile`, `update_privacy`, `delete_account`, `register_push_token`
- **Posts:** `create_post`, `update_post`, `set_gift_instructions`, `publish_post`, `close_post`, `delete_post`
- **Swiping:** `get_swipe_feed(limit)`, `record_swipe(post_id, direction)`, `respond_to_request(request_id, accept)`
- **Gifts:** `record_gift(match_id, amount_cents, is_anonymous)`, `cancel_gift(gift_id)`, `respond_to_gift(gift_id, confirm)`
- **Discover:** `search_posts(query, category, max_remaining_cents, location, sort, cursor)`
- **Friends:** `search_users`, `follow_user`, `unfollow_user`, `remove_follower`, `get_follows`, `block_user`, `unblock_user`, `get_friend_activity(cursor)`
- **Leaderboard:** `get_leaderboard(board, period, scope, cursor)`, `get_my_rank(board, period, scope)`
- **Moderation:** `report(target_user_id, target_post_id, reason)`

Edge Function:

- `send-push`: Triggered by new `notifications` rows; sends through Expo's push service and removes invalid tokens.

## Milestones

### 1. Foundation and accounts (#1, part of #7)

Set up the Supabase project, migrations, local development, CI, and a test database. Create `profiles` and `privacy_settings` with a signup trigger, then configure email, Google, and Apple auth. Add the account RPCs and the 18+ check.

**Done when** the #1 acceptance criteria pass and RLS tests prove one user can't read another's private fields.

### 2. Posts (#3)

Add `posts`, `post_photos`, and a Storage bucket with size and type limits. Include the post RPCs and `post_gift_instructions`. Publishing requires gift instructions to be set. Milestone 4 adds the automatic close at goal.

**Done when** the #3 acceptance criteria pass, apart from closing at goal.

### 3. Swiping and matching (#2)

Add `swipes`, `match_requests`, `matches`, `blocks`, `notifications`, `push_tokens`, and `send-push`. `get_swipe_feed` excludes the user's own posts, closed posts, posts already swiped, and blocked users, ordered by recency with a boost for posts near their goal. A right swipe creates the request in the same transaction, and accepting creates the match.

**Done when** the #2 criteria pass, excluding recording a gift, and concurrency tests show double swipes and double accepts have no extra effect.

### 4. Gift records (#2, #3)

Add `gifts` and the gift RPCs. No money moves through the app.

| Action | Who | Effect |
| --- | --- | --- |
| `record_gift` | Gifter | Validates the match and remaining amount, creates a `pending` gift, and notifies the receiver |
| `cancel_gift` | Gifter | Marks a `pending` gift `cancelled` |
| `respond_to_gift`, confirm | Receiver | Marks the gift `confirmed`, adds to `raised_cents`, closes the post at goal, and notifies the gifter |
| `respond_to_gift`, dispute | Receiver | Marks the gift `disputed`, with no change to totals, and notifies the gifter |

Two gifts can race for the same remaining amount. Check the amount when recording, and accept a small overshoot if both are confirmed, since the money has already changed hands.

**Done when** tests cover every transition above, repeated responses have no extra effect, only the receiver can confirm, gift instructions are hidden from unmatched users, and `raised_cents` always equals the sum of confirmed gifts.

### 5. Discover (#4)

Add full-text search with a GIN index on `posts.search`, filters, sorts, and cursor pagination. Offering from Discover reuses the logic in `record_swipe`, so a post has one request however it was offered.

**Done when** the #4 acceptance criteria pass.

### 6. Friends (#5)

Add `follows`, user search, and the follow RPCs. The activity feed shows confirmed gifts from mutual follows with `share_activity` on and omits anonymous gifts entirely.

**Done when** the #5 acceptance criteria pass.

### 7. Leaderboard (#6)

Create a materialized view that aggregates each user's confirmed gift cents by board and month, refreshed every 5 minutes with `pg_cron`. RPCs filter by opt-in settings and blocks, and friends scope includes only mutual follows. Ties share a rank.

Totals are self-reported, and two colluding accounts can confirm gifts that never happened. Add these from the start:

- Label totals as reported by members, not verified.
- Flag accounts with repeated back-and-forth gifts or unusually large confirmed amounts for review.
- Add a `leaderboard_excluded` flag on profiles for moderators.

**Done when** the #6 acceptance criteria pass and tests prove disputes and opt-outs change the results after a refresh.

### 8. Profile, safety, and launch readiness (#7)

Add public and own-profile queries, gift history, the report queue, and full account deletion. Add rate limits on swipes, posts, follows, and reports. Add basic post moderation (`removed` status and a moderator role) and audit logs for moderator actions.

**Done when** the #7 acceptance criteria pass and the launch checklist below is complete.

## Testing

- **Database:** pgTAP tests for every RLS policy and RPC, including denied cases.
- **Push:** Edge Function tests with a mocked Expo push service, including invalid tokens.
- **Concurrency:** Parallel tests for swipes, accepts, and gift confirmations.
- **CI:** Migrations apply from scratch and all tests pass before merge.
- **Credentials:** Only seeded test users outside production.

## Launch checklist

- Legal review of off-app gifting and scam liability is complete.
- Every table has RLS enabled, verified by a CI check.
- Terms, privacy policy, and a clear statement that gifts happen outside the app, and on tax, are published.
- Moderators can review reports, remove posts, and handle scam claims and disputes.
- Edge Function and push delivery errors trigger alerts.
- Database backups are on, and a restore has been tested.
