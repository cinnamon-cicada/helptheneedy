# Mobile app

The React Native client, built with Expo (SDK 58) and TypeScript. It holds the login and signup screens, prototypes of the Discover, Friends, Profile, and public profile screens, and the Leaderboard, all running on local mock data. It doesn't call Supabase and doesn't process payments. A Supabase client is ready in `src/lib/supabase.ts`, but no screen uses it yet.

## Run it

```bash
cd mobile
npm install
npx expo start
```

Before importing the Supabase client, copy `.env.example` to `.env.local` and fill it in.

Open the app in Expo Go, or in an iOS simulator or Android emulator. If Expo Go doesn't support one of the native libraries, build a development client with `npx expo run:ios` or `npx expo run:android`.

| Command | What it does |
| --- | --- |
| `npm start` | Starts the Expo dev server |
| `npm run typecheck` | Runs the TypeScript compiler without emitting files |
| `npm run lint` | Runs ESLint with the Expo config |

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

Accounts are kept in memory by `createMockAuthService` and reset when the app reloads. To connect Supabase Auth, implement `AuthService` in `src/auth/types.ts` and export it from `src/auth/authService.ts`; the screens don't need to change.

## Discover screen

| Gesture | Result |
| --- | --- |
| Drag left past the threshold | Skips the card, and the next one moves forward |
| Drag right past the threshold | Parks the card and opens the gift sheet. Dismissing the sheet returns the card; finishing the flow advances the deck |
| Drag down | Expands the card to show the category, description, reactions and comments |
| Drag up on the expanded header | Collapses the card |
| Tap the bookmark | Saves or unsaves the request without advancing the deck |
| Tap the avatar | Opens that person's profile card |

A drag locks to one axis after about 6 points of movement, so a diagonal drag can only trigger one action. Horizontal drags are ignored while the card is expanded.

## Profile screen

| Control | Result |
| --- | --- |
| Avatar pencil | Opens the Edit Profile sheet; saves to local state only and resets on reload |
| Settings gear | Opens a placeholder screen |
| Your Rank card | Shows your Most Gifted rank this month; opens the Leaderboard |
| Shortcut tiles | Expand into a window with a simple mock list; tap the X or outside it to close |
| View All | Opens a longer mock activity list |

The Post tab does nothing yet.

## Friends screen

The People tab lists everyone you follow or who follows you. Search filters by name, and tapping a row opens that person's profile card. The three dots offer **Unfollow** if you follow them and **Remove as follower** if they follow you. Someone leaves the list once neither of you follows the other. Changes stay in local state and reset on reload.

## Public profile card

`/user/[id]` shows a person's name, photo, stats, and wishlist. A dash means they keep their total private. The wishlist is a simplified Discover deck: swipe either way to see the next wish. It has no gifting, saving, or expanding.

## Leaderboard

The Ranks tab ranks members under public aliases by **Most Gifted** (total confirmed gifts) or **Most Helped** (different people gifted), **Monthly** (since the 1st, UTC) or **Overall**. All four combinations update the podium, Your Rank and the list. The info button explains the rules, and tapping a person opens a short preview.

Rankings are computed from mock transactions in `src/data/mockLeaderboard.ts`, following the backend rules:

- Only `confirmed` gifts count; `pending`, `disputed`, `cancelled` and test gifts don't.
- Members who opted out, or that moderators excluded, don't appear.
- Gifting the same person twice counts once for Most Helped.
- Ties share a rank and are ordered by alias, so the order never jumps.

Your Overall totals match the Profile screen: $210 and 12 people helped.

## Code layout

| Path | Contents |
| --- | --- |
| `src/app/` | Expo Router routes; each file re-exports a screen. `_layout.tsx` shows `sign-in` until you log in |
| `index.ts` | Custom entry: loads `src/polyfills.ts` before `expo-router/entry` so three.js can start under Hermes |
| `src/screens/` | `AuthScreen`, `DiscoverScreen`, `FriendsScreen`, `UserProfileScreen`, `ProfileScreen`, `LeaderboardScreen`, `ActivityScreen` |
| `src/components/auth/` | `LoginForm`, `SignupForm`, `PaymentPlaceholders`, and shared fields |
| `src/auth/` | `AuthService` interface, the mock service, the session context, and validation rules |
| `src/components/poki/` | `AuthScene` (canvas and fallback), `MascotAnimationController`, `PokiMascot`, `GiftBox`, `GiftExplosion` |
| `src/animation/poki/` | Intro timeline and phases, intro choreography, idle behaviour scheduler, reactions, confetti physics |
| `src/state/useDiscoverState.ts` | Business state: queue, filters, saves, reactions, comments |
| `src/animation/useCardGestures.ts` | Gesture and animation logic for the front card |
| `src/components/` | `SwipeCardDeck`, `GiftRequestCard`, `CardStackLayer`, `ExpandedCardContent`, `ReactionBar`, `CommentList`, `CommentInput`, `BottomSheet`, `FilterBottomSheet`, `GiftAmountBottomSheet`, `BottomNavigation`, `WishlistDeck` |
| `src/data/mockRequests.ts` | Eight mock requests; Jamie's matcha request is first |
| `src/data/mockProfile.ts` | The mock user and activity |
| `src/data/mockLeaderboard.ts` | Mock members and gift transactions that the Leaderboard and the Your Rank card both rank |
| `src/leaderboard/` | Ranking rules (`computeLeaderboard`) and the board's labels, separate from the UI |
| `src/components/leaderboard/` | `LeaderboardHeader`, `SegmentedControl` (`RankingTypeSelector`, `TimePeriodSelector`), `TopThreePodium`, `YourRankSummary`, `RankingList`, the info and profile preview sheets, `AliasAvatar` |
| `src/data/mockPeople.ts` | Mock friends, their follow state and wishlists |
| `src/theme.ts` | Colors, radii, shadows and spring settings |

Amounts are stored as integer cents, as `ARCHITECTURE.md` requires.

## Differences from the backend

This prototype follows the design spec. In these places the spec differs from `ARCHITECTURE.md`, so settle each one before the app is connected to Supabase:

- **Right swipe:** In the prototype, a right swipe opens a gift amount sheet. In the backend, a right swipe calls `record_swipe` to send a match request, and the gifter records a gift only after the receiver accepts.
- **Comments, reactions and saves:** These have no tables or RPCs in the backend yet.
- **Recipient age:** `profiles` has no age or birth date column.
- **Login by username:** Supabase Auth signs in by email. Username login needs a lookup the backend doesn't have yet.
- **Unknown accounts:** The mock reports `account_not_found` so the signup handoff can be tried. Supabase doesn't reveal whether an account exists, so that path may never trigger once connected.
- **Backup email:** Collected on the signup form but not saved; `profiles` has no column for it.
- **Payment methods:** The PayPal, Venmo and Stripe rows are disabled placeholders. The app doesn't handle money.
- **Most Helped:** The Leaderboard ranks people by how many different people they gifted. The backend's boards are `gifted` and `received`, so this needs a new board in `get_leaderboard` and `get_my_rank`.
- **Profile labels:** The Profile dashboard shows Total Gifted without the "reported by members, not verified" label that `ARCHITECTURE.md` requires. The Leaderboard keeps it. Settle this before connecting Supabase.
- **Wishlist:** The backend has no wishlist. The mock maps it to a person's requests, which would be their `open` posts once connected. The mock also shares some requests across people.
- **Friend stats:** `get_public_profile` returns gift totals only if the person shares them, and has no People Helped or Requests Posted counts.
