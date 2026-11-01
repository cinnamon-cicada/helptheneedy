# Mobile app

The React Native client, built with Expo (SDK 58) and TypeScript. It holds only the Discover screen prototype for now, and that screen runs on local mock data. It doesn't call Supabase and doesn't process payments.

## Run it

```bash
cd mobile
npm install
npx expo start
```

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

## Code layout

| Path | Contents |
| --- | --- |
| `src/screens/DiscoverScreen.tsx` | Screen layout and sheet wiring |
| `src/state/useDiscoverState.ts` | Business state: queue, filters, saves, reactions, comments |
| `src/animation/useCardGestures.ts` | Gesture and animation logic for the front card |
| `src/components/` | `SwipeCardDeck`, `GiftRequestCard`, `CardStackLayer`, `ExpandedCardContent`, `ReactionBar`, `CommentList`, `CommentInput`, `BottomSheet`, `FilterBottomSheet`, `GiftAmountBottomSheet`, `BottomNavigation` |
| `src/data/mockRequests.ts` | Eight mock requests; Jamie's matcha request is first |
| `src/theme.ts` | Colors, radii, shadows and spring settings |

Amounts are stored as integer cents, as `ARCHITECTURE.md` requires.

## Differences from the backend

This prototype follows the design spec. In these places the spec differs from `ARCHITECTURE.md`, so settle each one before the app is connected to Supabase:

- **Right swipe:** In the prototype, a right swipe opens a gift amount sheet. In the backend, a right swipe calls `record_swipe` to send a match request, and the gifter records a gift only after the receiver accepts.
- **Comments, reactions and saves:** These have no tables or RPCs in the backend yet.
- **Recipient age:** `profiles` has no age or birth date column.
