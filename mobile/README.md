# Mobile app

The React Native client, built with Expo (SDK 58) and TypeScript. It holds the login and signup screens, prototypes of the Discover, Friends, Profile, and public profile screens, the Leaderboard, and the Create Post flow. With Supabase configured, the app makes an account automatically and Discover, Profile and the Leaderboard use real data; without it, everything runs on local mock data. It doesn't process payments: the $1,000 demo balance is play money on the device. See [Demo mode](#demo-mode).

## Run it

```bash
cd mobile
npm install
npx expo start
```

To use Supabase, copy `.env.example` to `.env.local` and fill it in. Without those two variables, the app runs on mock data and shows the sign-in screen.

For local Supabase, run `npm run db:start` and `npm run db:reset` from the repo root, then load the demo data with `npx supabase db query --local -f supabase/demo/seed.sql`. The database tests expect an empty database, so run `npm run db:reset` again before `npm test`. `.env.local` must point at an address this device can reach; a LAN IP goes stale when your network changes.

Open the app in Expo Go, or in an iOS simulator or Android emulator. If Expo Go doesn't support one of the native libraries, build a development client with `npx expo run:ios` or `npx expo run:android`.

| Command | What it does |
| --- | --- |
| `npm start` | Starts the Expo dev server |
| `npm run typecheck` | Runs the TypeScript compiler without emitting files |
| `npm run lint` | Runs ESLint with the Expo config |

## Web hosting

The web version is hosted on EAS Hosting at https://helptheneedy.expo.app, under the `cinnamoncicada` Expo account. It's a single-page app (`web.output` is `single` in `app.json`) running on the same mock data as the native app. Anyone with the link can open it.

To redeploy, export the web build with the `production` EAS environment, then deploy it. Without `--prod`, you get a preview URL instead of updating the production one.

```bash
npx eas-cli@latest env:exec production 'npx expo export --platform web'
npx eas-cli@latest deploy --prod --environment production
```

The `production` and `preview` EAS environments hold `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` for the hosted Supabase project, and `env:exec` makes them override `.env.local`. A plain `npx expo export` uses `.env.local` instead, which points at your own machine. Any `EXPO_PUBLIC_` variable a bundled module reads is baked into the public site, so store only the publishable key there, never a secret or service role key.

## Login and signup

The app opens on the sign-in route, and the tabs appear after logging in or signing up. On first load the mascot drags the gift to the centre of the screen, the gift bursts open, and the gift rises as the login form springs up. Afterward the mascot explores the gift: it wanders, peeks over the side, climbs onto the rim and slides off, hides behind the box, and pokes the loose ribbon.

| To try | Do this |
| --- | --- |
| Log in | Use `demo@poki.app` or `demo`, with the password `password123` |
| Unknown account | Log in with any other email; the form offers to sign up with that email |
| Skip the intro | Tap Skip or anywhere on the screen |
| Reduced motion | Turn on Reduce Motion in system settings; the screen opens settled, with no intro or idle motion |

The mascot glances at the form when a field is focused, deflates when a login or signup fails, and hops when one succeeds. A successful signup also gives it a bow. Signup reuses the scene with a smaller gift area instead of replaying the intro.

The scene is drawn with `three` and `@react-three/fiber` on `expo-gl`, from procedural geometry with no model files. It stops rendering while the app is in the background. If WebGL is unavailable or the GL context doesn't start, a 2D vector version of the opened gift is shown instead.

With Supabase configured, the sign-in screen never shows: the app creates an account on first load instead (see [Demo mode](#demo-mode)). Without it, accounts are kept in memory by `createMockAuthService` and reset when the app reloads. `src/auth/supabaseAuthService.ts` implements the same `AuthService` with Supabase email accounts, ready for when real sign-in is wanted; export it from `src/auth/authService.ts` and the screens don't need to change.

## Discover screen

| Gesture | Result |
| --- | --- |
| Drag left past the threshold | Skips the card, and the next one moves forward |
| Drag right past the threshold | Parks the card and opens the gift sheet. Dismissing the sheet returns the card; finishing the flow advances the deck |
| Drag down, or tap the image, title or amount | Expands the card to show the category, description, reactions and comments |
| Drag up on the expanded header | Collapses the card |
| Tap the bookmark | Saves or unsaves the request without advancing the deck |
| Tap the avatar | Opens that person's profile card |

A drag locks to one axis after about 6 points of movement, so a diagonal drag can only trigger one action. Horizontal drags are ignored while the card is expanded.

## Profile screen

| Control | Result |
| --- | --- |
| Avatar pencil | Opens the Edit Profile sheet; saves on this device and survives a reload |
| Settings gear | Opens Settings, which can reset the demo |
| Your Rank card | Shows your Most Gifted rank this month; opens the Leaderboard |
| Shortcut tiles | Expand into a window with a simple mock list; tap the X or outside it to close |
| A list or activity row | Opens the full request card, grown out of the row; tap outside it to close |
| View All | Opens a longer mock activity list |

## Demo mode

Everyone starts with $1,000 of play money, shown as plain text in the top left of Discover. The balance lives on the device only, under the `htn.demo.v2` key: the browser's `localStorage` on web, and an `expo-sqlite` store with the same API on iOS and Android. It never reaches Supabase.

With Supabase configured:

| What | Behavior |
| --- | --- |
| Account | On first load the app signs in anonymously and finishes onboarding with a generated alias, such as SunnyOtter. The session is saved, so the same account comes back on every visit. A new account starts with a fresh $1,000 |
| Discover | Shows the open posts in Supabase. The seeded ones are demo receivers, and keep the mock comments and reactions |
| Gifting | `demo_send_gift` logs the gift in `gifts`, tagged with giver and receiver, and it counts right away. The balance goes down only once that succeeds; if it fails, the sheet says why and nothing changes. The sheet won't let you give more than is still needed or more than you have left |
| After each gift | The profile, gift history and boards are fetched again, and the profile and gifts are kept on the device too |
| Profile | The name you type becomes your public alias (`display_name`, with a username made from it). A chosen photo is copied into the `avatars` bucket |
| Totals and activity | Come from your gifts in Supabase only, with no mock history |
| Reset | Settings > Reset demo sets the balance back to $1,000. Your account and gifts stay on the leaderboards |

Without Supabase, everything above stays on the device: demo gifts are added to the mock totals, and Reset clears it all. Reactions, saves, comments, follows and posts reset on reload either way.

To load the demo data into the hosted project, run `npx supabase db query --linked -f supabase/demo/seed.sql` from the repo root. Running it again changes nothing.

## Friends screen

The People tab lists everyone you follow or who follows you. Search filters by name, and tapping a row opens that person's profile card. The three dots offer **Unfollow** if you follow them and **Remove as follower** if they follow you. Someone leaves the list once neither of you follows the other. Changes stay in local state and reset on reload.

## Public profile card

`/user/[id]` shows a person's name, photo, stats, and wishlist. A dash means they keep their total private. The wishlist is a simplified Discover deck: swipe either way to see the next wish. Tapping the front wish opens its full card, and tapping outside shrinks it back onto the pile. It has no gifting or saving.

## Leaderboard

The Ranks tab ranks members under public aliases by **Most Gifted** (total confirmed gifts) or **Most Helped** (different people gifted), **Monthly** (since the 1st, UTC) or **Overall**. All four combinations update Your Rank and the list. The info button explains the rules, and tapping a person opens a short preview.

With Supabase configured, boards come from `get_leaderboard` and `get_my_rank` (`gifted` or `helped`, `month` or `all_time`) and refresh after each of your gifts, so other people's gifts show the next time a board loads. People without a photo get an illustrated avatar chosen from their id. Without Supabase, rankings are computed from mock transactions in `src/data/mockLeaderboard.ts`, following the same rules:

- Only `confirmed` gifts count; `pending`, `disputed`, `cancelled` and test gifts don't.
- Members who opted out, or that moderators excluded, don't appear.
- Gifting the same person twice counts once for Most Helped.
- Ties share a rank and are ordered by alias, so the order never jumps.

On mock data, your Overall totals match the Profile screen: $210 and 12 people helped.

## Create Post

The center Post tab opens the camera, with a 3:4 viewfinder the shape of a wish card. Photos taken with the shutter are cropped to exactly what the viewfinder showed. Take a photo with the shutter, or choose one with the album button at the bottom left. The photo then freezes, and a toolbar on the right offers optional edits:

| Tool | What it does |
| --- | --- |
| Crop | Rotates in 90° steps and centre-crops to Original, 3:4 (card), 1:1, 4:5 or 16:9. This changes the image with `expo-image-manipulator`, always starting from the original photo |
| Text | Adds text in five colours and three sizes. Drag to move; tap to select, then Edit or Remove |
| Stickers | Adds an emoji sticker. Drag to move; tap to select, then Remove |
| Filters | Warm, Golden, Soft, Cool or Mono, drawn as colour layers with blend modes |

Text, stickers and filters are saved as data on top of the photo rather than burned into it, so they look the same at every size. The arrow at the bottom right opens the details page. It shows the photo centre-cropped in the top third (the full photo is kept) and asks for:
- a title
- a price from $1 to $10,000
- a category
- a description, where `#` adds tags and `@` suggests friends (mutual follows) to mention
- optional gift instructions

The button reads **Post wish** once title, price, category and description are all valid; gift instructions are optional and don't affect it. Until then it reads **Save as draft** and saves whatever is filled in. Fields that are filled in must still be valid, so a $0.50 price blocks even a draft. The back button on each step keeps everything entered.

To try it in Expo Go: allow the camera when asked (or use the album), edit, tap the arrow, fill in the details, and tap **Post wish**. Then tap **See it in Discover**.

A posted wish goes to the front of your Discover deck, with your edited photo and a **Your wish** badge. It also appears first in Profile > My Posts. You can react to it and comment on it. You can't gift your own wish, so it has no gift indicator or save button, and a right swipe just moves past it. Drafts never appear in Discover.

Posts are stored in memory on the device (`MyPostsProvider`) and reset when the app reloads; nothing is uploaded.

## Code layout

| Path | Contents |
| --- | --- |
| `src/app/` | Expo Router routes; each file re-exports a screen. `_layout.tsx` shows `sign-in` until you log in |
| `index.ts` | Custom entry: loads `src/polyfills.ts` before `expo-router/entry` so three.js can start under Hermes |
| `src/screens/` | `AuthScreen`, `DiscoverScreen`, `FriendsScreen`, `UserProfileScreen`, `ProfileScreen`, `LeaderboardScreen`, `ActivityScreen`; the Create Post steps are in `src/screens/post/` |
| `src/components/auth/` | `LoginForm`, `SignupForm`, `PaymentPlaceholders`, and shared fields |
| `src/auth/` | `AuthService` interface, the mock and Supabase services, the session context (which creates the demo account), and validation rules |
| `src/api/` | Supabase calls: `account` (demo account, profile edits, avatar upload), `posts` (Discover cards), `gifts` (`demo_send_gift`, gift history), `leaderboard`, `images` (signed URLs) |
| `src/demo/` | `DemoProvider` (local balance, cached profile and gifts), `selectors` (Profile totals, Activity, lists) and `storage` (`localStorage` helpers) |
| `src/components/poki/` | `AuthScene` (canvas and fallback), `MascotAnimationController`, `PokiMascot`, `GiftBox`, `GiftExplosion` |
| `src/animation/poki/` | Intro timeline and phases, intro choreography, idle behaviour scheduler, reactions, confetti physics |
| `src/state/useDiscoverState.ts` | Business state: queue, filters, saves, reactions, comments |
| `src/animation/useCardGestures.ts` | Gesture and animation logic for the front card |
| `src/components/` | `SwipeCardDeck`, `GiftRequestCard`, `CardStackLayer`, `ExpandedCardContent`, `ReactionBar`, `CommentList`, `CommentInput`, `BottomSheet`, `FilterBottomSheet`, `GiftAmountBottomSheet`, `BottomNavigation`, `WishlistDeck` |
| `src/data/mockRequests.ts` | Eight mock requests; Jamie's matcha request is first |
| `src/data/mockProfile.ts` | The mock user and activity |
| `src/data/mockLeaderboard.ts` | Mock members and gift transactions that the Leaderboard and the Your Rank card both rank |
| `src/leaderboard/` | Ranking rules (`computeLeaderboard`), `useBoard` (Supabase or mock), and the board's labels, separate from the UI |
| `src/app/post/` | Create Post routes: `index` (camera and editor), `details`, `published`; the layout holds the shared draft |
| `src/post/` | Draft and my-posts state, photo crop and filter helpers, details validation, and hashtag and mention parsing |
| `src/components/post/` | `PhotoStage` (draws a photo with its edits), the edit sheets, `MentionInput` |
| `src/components/leaderboard/` | `LeaderboardHeader`, `SegmentedControl` (`RankingTypeSelector`, `TimePeriodSelector`), `YourRankSummary`, `RankingList`, the info and profile preview sheets, `AliasAvatar` |
| `src/data/mockPeople.ts` | Mock friends, their follow state and wishlists |
| `src/theme.ts` | Colors, radii, shadows and spring settings |

Amounts are stored as integer cents, as `ARCHITECTURE.md` requires.

## Differences from the backend

This prototype follows the design spec. In these places the spec differs from `ARCHITECTURE.md`, so settle each one before the app is connected to Supabase:

- **Right swipe:** A right swipe opens a gift amount sheet and, for demo receivers, `demo_send_gift` runs the whole flow at once. For real receivers the backend expects `record_swipe` to send a match request, and the gifter records a gift only after the receiver accepts; the app doesn't support that yet.
- **Left swipe:** Skipping a card isn't sent to `record_swipe`, so Start over can show the cards again.
- **Comments, reactions and saves:** These have no tables or RPCs in the backend yet.
- **Recipient age:** `profiles` has no age or birth date column.
- **Login by username:** Supabase Auth signs in by email. Username login needs a lookup the backend doesn't have yet.
- **Unknown accounts:** The mock reports `account_not_found` so the signup handoff can be tried. Supabase doesn't reveal whether an account exists, so that path may never trigger once connected.
- **Backup email:** Collected on the signup form but not saved; `profiles` has no column for it.
- **Payment methods:** The PayPal, Venmo and Stripe rows are disabled placeholders. The app doesn't handle money.
- **Your own wishes in Discover:** The prototype puts your posted wishes in your own deck so you can see them. The backend's `get_swipe_feed` and `search_posts` leave your own posts out, so once connected they'll show only to other people.
- **Posting:** Create Post saves to local state only. `create_post` and `publish_post` aren't called, and the photo isn't uploaded to the `post-photos` bucket.
- **Photo edits:** Text, stickers and filters are kept as data next to the photo. The backend stores only photo paths, so before connecting it either flatten them into the uploaded image or add a column for them.
- **Gift instructions:** `publish_post` requires gift instructions, but the app lets you post without them. Settle this before connecting the backend: either make the field required for posting, or relax the rule in the backend.
- **Hashtags and mentions:** Parsed and shown on the card, but the backend has no tags or mentions, and mentions don't notify anyone.
- **Profile labels:** The Profile dashboard shows Total Gifted without the "reported by members, not verified" label that `ARCHITECTURE.md` requires. The Leaderboard keeps it. Settle this before connecting Supabase.
- **Wishlist:** The backend has no wishlist. The mock maps it to a person's requests, which would be their `open` posts once connected. The mock also shares some requests across people.
- **Friend stats:** `get_public_profile` returns gift totals only if the person shares them, and has no People Helped or Requests Posted counts.
