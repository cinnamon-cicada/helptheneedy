# Mobile app

The React Native client, built with Expo (SDK 58) and TypeScript. It holds prototypes of the Discover and Profile screens, plus a minimal Ranks screen, all running on local mock data. It doesn't call Supabase and doesn't process payments. A Supabase client is ready in `src/lib/supabase.ts`, but no screen uses it yet.

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

## Discover screen

| Gesture | Result |
| --- | --- |
| Drag left past the threshold | Skips the card, and the next one moves forward |
| Drag right past the threshold | Parks the card and opens the gift sheet. Dismissing the sheet returns the card; finishing the flow advances the deck |
| Drag down | Expands the card to show the category, description, reactions and comments |
| Drag up on the expanded header | Collapses the card |
| Tap the bookmark | Saves or unsaves the request without advancing the deck |
| Tap the avatar | Does nothing yet; reserved for profile navigation |

A drag locks to one axis after about 6 points of movement, so a diagonal drag can only trigger one action. Horizontal drags are ignored while the card is expanded.

## Profile screen

| Control | Result |
| --- | --- |
| Avatar pencil | Opens the Edit Profile sheet; saves to local state only and resets on reload |
| Settings gear | Opens a placeholder screen |
| Your Rank card | Opens the Ranks tab |
| Shortcut cards | Open placeholder screens marked as demo content |
| View All | Opens a longer mock activity list |

The People and Post tabs do nothing yet.

## Code layout

| Path | Contents |
| --- | --- |
| `src/app/` | Expo Router routes; each file re-exports a screen |
| `src/screens/` | `DiscoverScreen`, `ProfileScreen`, `RanksScreen`, `ActivityScreen`, `ProfileSectionScreen` |
| `src/state/useDiscoverState.ts` | Business state: queue, filters, saves, reactions, comments |
| `src/animation/useCardGestures.ts` | Gesture and animation logic for the front card |
| `src/components/` | `SwipeCardDeck`, `GiftRequestCard`, `CardStackLayer`, `ExpandedCardContent`, `ReactionBar`, `CommentList`, `CommentInput`, `BottomSheet`, `FilterBottomSheet`, `GiftAmountBottomSheet`, `BottomNavigation` |
| `src/data/mockRequests.ts` | Eight mock requests; Jamie's matcha request is first |
| `src/data/mockProfile.ts`, `src/data/mockLeaderboard.ts` | The mock user and activity, and the weekly board that Ranks and the Your Rank card share |
| `src/theme.ts` | Colors, radii, shadows and spring settings |

Amounts are stored as integer cents, as `ARCHITECTURE.md` requires.

## Differences from the backend

This prototype follows the design spec. In these places the spec differs from `ARCHITECTURE.md`, so settle each one before the app is connected to Supabase:

- **Right swipe:** In the prototype, a right swipe opens a gift amount sheet. In the backend, a right swipe calls `record_swipe` to send a match request, and the gifter records a gift only after the receiver accepts.
- **Comments, reactions and saves:** These have no tables or RPCs in the backend yet.
- **Recipient age:** `profiles` has no age or birth date column.
- **Weekly ranks:** The Your Rank card and Ranks screen show a weekly board. `get_leaderboard` and `get_my_rank` only support `all_time` and `month`.
- **Profile labels:** The Profile dashboard shows Total Gifted without the "reported by members, not verified" label that `ARCHITECTURE.md` requires. The Ranks screen keeps it. Settle this before connecting Supabase.
