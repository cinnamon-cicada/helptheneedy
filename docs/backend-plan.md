# Backend plan

Implementation plan for Claude. Work through the milestones in order, one PR per milestone, and reference the GitHub issue in each PR.

## Product

helptheneedy is a dating-style app that matches gifters with receivers. Receivers publish posts describing a need. Gifters swipe through posts, and a right swipe sends the receiver a request. If the receiver accepts, they match, and the gifter can send money. One account can act in both roles.

| Issue | Feature | Milestone |
| --- | --- | --- |
| #1 | Login and signup | 1 |
| #3 | Add post | 2 |
| #2 | Card swipe | 3, 4 |
| #4 | Discover | 5 |
| #5 | Friends | 6 |
| #6 | Leaderboard | 7 |
| #7 | Profile | 1, 8 |

## Decisions

These are defaults chosen to get started. Change them here before building if they turn out wrong.

- **Stack:** Supabase (Postgres, Auth, Storage, Realtime, Edge Functions) with TypeScript.
- **Data access:** Clients read through Row Level Security (RLS) policies and write through Postgres RPC functions. Edge Functions are used only for work that needs secrets, meaning Stripe.
- **Payments:** Stripe Connect with Express accounts. Stripe handles identity checks, card data, and payouts. We never store card or government ID data.
- **Matching:** A match requires a gifter's right swipe and the receiver's acceptance.
- **Gifting:** A gift can be any amount from $1 up to the amount remaining on the post, and only from an active match.
- **Out of v1:** Chat, recurring gifts, and non-USD currencies.

## Before writing payment code

Milestone 4 is blocked until the project owner confirms these. Earlier milestones aren't.

1. **Stripe approval:** Confirm with Stripe that this person-to-person gifting model is allowed on Connect, and which charge type they require.
2. **Legal review:** Ask a lawyer about money transmission, tax reporting for receivers, charity or fundraising rules, and how gifts should be described to users.
3. **Platform fee:** Decide the fee, and whether the gifter or receiver pays it. Until then, use a configurable fee defaulting to 0.

## Rules that must always hold

- **Money:** Store amounts as integer cents. Never use floats.
- **Source of truth:** Only a verified Stripe webhook can mark a gift as paid. A client's claim of success never counts.
- **Idempotency:** Webhooks can arrive repeatedly and out of order. Record each Stripe event ID and ignore repeats. Swipes and matches rely on unique constraints.
- **Authorization:** Enable RLS on every table, with no exceptions. Every RPC derives the user from `auth.uid()`, never from an argument.
- **Secrets:** Stripe secret keys and the service role key stay in Edge Function secrets and never reach clients.
- **Privacy:** Store only a general location (city or coarse area), never an exact address. Anonymous gifts never expose the pairing to anyone but the two participants, and the gifter's identity stays hidden from the receiver if the gifter chooses.
- **Blocks:** A block applies in both directions across every feed, search, request, and friend list.
- **Retention:** Deleting an account removes personal data but keeps anonymized gift rows for financial records.

## Schema

All tables have `id uuid` primary keys and `created_at`, unless noted. Use Postgres enums for statuses.

| Table | Key columns | Constraints and notes |
| --- | --- | --- |
| `profiles` | `id` (references `auth.users`), `username`, `display_name`, `bio`, `avatar_path`, `intent`, `is_adult_confirmed`, `general_location`, `deleted_at` | `username` unique |
| `privacy_settings` | `user_id`, `show_gifted_total`, `show_received_total`, `on_gifted_board` (default true), `on_received_board` (default false), `share_activity` | One row per user |
| `payout_accounts` | `user_id`, `stripe_account_id`, `charges_enabled`, `payouts_enabled` | Updated only by webhook |
| `posts` | `receiver_id`, `title`, `story`, `category`, `goal_cents`, `raised_cents`, `general_location`, `status` (`draft`, `open`, `closed`, `removed`), `search` (tsvector) | `goal_cents > 0`; `raised_cents` changes only through the gift webhook |
| `post_photos` | `post_id`, `storage_path`, `position` | At most 5 per post |
| `swipes` | `gifter_id`, `post_id`, `direction` | Unique on (`gifter_id`, `post_id`) |
| `match_requests` | `gifter_id`, `post_id`, `status` (`pending`, `accepted`, `declined`, `cancelled`) | Unique on (`gifter_id`, `post_id`) |
| `matches` | `request_id`, `gifter_id`, `receiver_id`, `post_id`, `status` | Unique on `request_id` |
| `gifts` | `match_id`, `gifter_id`, `receiver_id`, `post_id`, `amount_cents`, `fee_cents`, `is_anonymous`, `status` (`pending`, `succeeded`, `failed`, `refunded`, `disputed`), `stripe_payment_intent_id`, `succeeded_at` | Payment intent ID unique; `gifter_id <> receiver_id`; `refunded_cents` tracks partial refunds |
| `stripe_events` | `event_id` (primary key), `type`, `processed_at` | Webhook deduplication |
| `friendships` | `user_low`, `user_high`, `requested_by`, `status` | One row per pair, with `user_low < user_high` |
| `blocks` | `blocker_id`, `blocked_id` | Unique on the pair |
| `reports` | `reporter_id`, `target_user_id`, `target_post_id`, `reason`, `status` | Readable only by moderators |
| `notifications` | `user_id`, `type`, `payload`, `read_at` | Delivered through Realtime |

## API

Each RPC runs as the signed-in user and enforces the rules above.

- **Accounts:** `complete_onboarding`, `update_profile`, `update_privacy`, `delete_account`
- **Posts:** `create_post`, `update_post`, `publish_post`, `close_post`, `delete_post`
- **Swiping:** `get_swipe_feed(limit)`, `record_swipe(post_id, direction)`, `respond_to_request(request_id, accept)`
- **Discover:** `search_posts(query, category, max_remaining_cents, location, sort, cursor)`
- **Friends:** `search_users`, `request_friend`, `respond_friend`, `remove_friend`, `block_user`, `unblock_user`, `get_friend_activity(cursor)`
- **Leaderboard:** `get_leaderboard(board, period, scope, cursor)`, `get_my_rank(board, period, scope)`
- **Moderation:** `report(target_user_id, target_post_id, reason)`

Edge Functions:

- `create-connect-onboarding`: Creates the Express account and returns an onboarding link.
- `create-gift-intent`: Validates the match and remaining amount, inserts a `pending` gift, and returns a PaymentIntent client secret.
- `stripe-webhook`: Verifies the signature, deduplicates the event, and applies state changes in one transaction.

## Milestones

### 1. Foundation and accounts (#1, part of #7)

Set up the Supabase project, migrations, local development, CI, and a test database. Create `profiles` and `privacy_settings` with a signup trigger, then configure email, Google, and Apple auth. Add the account RPCs and the 18+ check.

**Done when** the #1 acceptance criteria pass and RLS tests prove one user can't read another's private fields.

### 2. Posts (#3)

Add `posts`, `post_photos`, and a Storage bucket with size and type limits. Include the post RPCs and the automatic close at goal. Publishing checks payout readiness behind a helper that returns true until milestone 4 implements it.

**Done when** the #3 acceptance criteria pass, apart from payout enforcement, which milestone 4 finishes.

### 3. Swiping and matching (#2)

Add `swipes`, `match_requests`, `matches`, `blocks`, and `notifications`. `get_swipe_feed` excludes the user's own posts, closed posts, posts already swiped, and blocked users, ordered by recency with a boost for posts near their goal. A right swipe creates the request in the same transaction, and accepting creates the match.

**Done when** the #2 criteria pass, excluding sending a gift, and concurrency tests show double swipes and double accepts have no extra effect.

### 4. Payments (#2, #3)

Blocked on the checks in "Before writing payment code." Add `payout_accounts`, `gifts`, `stripe_events`, and the three Edge Functions.

Handle these webhook events:

| Event | Effect |
| --- | --- |
| `payment_intent.succeeded` | Mark the gift `succeeded`, add to `raised_cents`, close the post at goal, and notify both people |
| `payment_intent.payment_failed` | Mark the gift `failed` |
| `charge.refunded` | Update `refunded_cents`, reduce `raised_cents`, and mark `refunded` when fully refunded |
| `charge.dispute.created` | Mark the gift `disputed` and reduce `raised_cents` |
| `account.updated` | Sync `payout_accounts` |

Two gifts can race for the same remaining amount. Check the amount when creating the intent, and accept a small overshoot if both succeed rather than refunding a gifter.

**Done when** Stripe test mode covers success, failure, full and partial refunds, disputes, and duplicate or out-of-order webhooks, and `raised_cents` always equals the sum computed from `gifts`.

### 5. Discover (#4)

Add full-text search with a GIN index on `posts.search`, filters, sorts, and cursor pagination. Offering from Discover reuses the logic in `record_swipe`, so a post has one request however it was offered.

**Done when** the #4 acceptance criteria pass.

### 6. Friends (#5)

Add `friendships`, user search, and the friend RPCs. The activity feed shows succeeded gifts from friends with `share_activity` on and omits anonymous gifts entirely.

**Done when** the #5 acceptance criteria pass.

### 7. Leaderboard (#6)

Create a materialized view that aggregates each user's net cents (`amount_cents - refunded_cents`, excluding disputed gifts) by board and month, refreshed every 5 minutes with `pg_cron`. RPCs filter by opt-in settings and blocks, and friends scope joins `friendships`. Ties share a rank.

Leaderboards reward volume, so they invite fake gifting between colluding accounts. Add these from the start:

- Exclude pairs where the same card fingerprint or Stripe account appears on both sides.
- Flag accounts with repeated back-and-forth gifts for review.
- Add a `leaderboard_excluded` flag on profiles for moderators.

**Done when** the #6 acceptance criteria pass and tests prove refunds and opt-outs change the results after a refresh.

### 8. Profile, safety, and launch readiness (#7)

Add public and own-profile queries, gift history, the report queue, and full account deletion. Add rate limits on swipes, posts, friend requests, and reports. Add basic post moderation (`removed` status and a moderator role) and audit logs for moderator actions.

**Done when** the #7 acceptance criteria pass and the launch checklist below is complete.

## Testing

- **Database:** pgTAP tests for every RLS policy and RPC, including denied cases.
- **Payments:** Edge Function tests using signed fixture webhooks, then Stripe test mode end to end.
- **Concurrency:** Parallel tests for swipes, accepts, and webhook delivery.
- **CI:** Migrations apply from scratch and all tests pass before merge.
- **Credentials:** Only Stripe test keys and seeded test users outside production.

## Launch checklist

- Legal and Stripe reviews are complete.
- Every table has RLS enabled, verified by a CI check.
- Terms, privacy policy, and a clear statement on gifts and tax are published.
- Moderators can review reports, remove posts, and handle scam claims and disputes.
- Payment failures and webhook errors trigger alerts.
- Database backups are on, and a restore has been tested.
