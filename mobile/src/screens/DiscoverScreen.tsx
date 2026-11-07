import { router } from 'expo-router';
import { Gift, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useRef, useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BalanceText } from '../components/BalanceText';
import { BottomNavigation, useBottomNavSpace } from '../components/BottomNavigation';
import { FilterBottomSheet } from '../components/FilterBottomSheet';
import { GiftAmountBottomSheet } from '../components/GiftAmountBottomSheet';
import { SwipeCardDeck, type SwipeCardDeckHandle } from '../components/SwipeCardDeck';
import { PrimaryButton, TextButton } from '../components/ui';
import { DEFAULT_FILTERS, useDiscoverState } from '../state/useDiscoverState';
import { colors, fonts, ICON_STROKE } from '../theme';
import type { GiftRequest } from '../types';

export function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const navSpace = useBottomNavSpace();
  const state = useDiscoverState();
  const deckRef = useRef<SwipeCardDeckHandle>(null);

  const [filterOpen, setFilterOpen] = useState(false);
  // Kept after the sheet closes so its exit animation still has content.
  const [giftRequest, setGiftRequest] = useState<GiftRequest | null>(null);
  const [giftOpen, setGiftOpen] = useState(false);

  const { markHandled } = state;

  const openGift = useCallback((request: GiftRequest) => {
    // You can't gift your own wish: a right swipe just moves past it.
    if (request.isMine) {
      deckRef.current?.completeGift();
      return;
    }
    setGiftRequest(request);
    setGiftOpen(true);
  }, []);

  const dismissGift = useCallback(() => {
    setGiftOpen(false);
    deckRef.current?.returnCard();
  }, []);

  const completeGift = useCallback(() => {
    setGiftOpen(false);
    deckRef.current?.completeGift();
  }, []);

  const openProfile = useCallback((request: GiftRequest) => {
    if (request.isMine) router.navigate('/profile');
    else router.push(`/user/${request.recipient.id}`);
  }, []);

  const emptyState = state.loading ? null : (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Gift size={28} color={colors.orangeText} strokeWidth={ICON_STROKE} />
      </View>
      {state.filtersActive ? (
        <>
          <Text style={styles.emptyTitle}>Nothing matches these filters</Text>
          <Text style={styles.emptyBody}>Try a different category or amount.</Text>
          <View style={styles.emptyAction}>
            <PrimaryButton label="Clear filters" onPress={() => state.setFilters(DEFAULT_FILTERS)} />
          </View>
        </>
      ) : (
        <>
          <Text style={styles.emptyTitle}>{"You've seen every request"}</Text>
          <Text style={styles.emptyBody}>Check back later for new ones.</Text>
          <View style={styles.emptyAction}>
            <TextButton label="Start over" onPress={state.startOver} />
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <BalanceText />
        <Pressable
          onPress={() => setFilterOpen(true)}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={state.filtersActive ? 'Filters, active' : 'Filters'}
          style={({ pressed }) => [styles.filterButton, pressed && { transform: [{ scale: 0.94 }] }]}
        >
          <SlidersHorizontal size={20} color={colors.text} strokeWidth={ICON_STROKE} />
          {state.filtersActive ? <View style={styles.filterDot} /> : null}
        </Pressable>
      </View>

      {/* The deck stops above the nav; when the keyboard opens it shrinks to fit. */}
      <KeyboardAvoidingView behavior="padding" style={[styles.deckArea, { marginBottom: navSpace }]}>
        <SwipeCardDeck
          ref={deckRef}
          requests={state.queue}
          myReactions={state.myReactions}
          emptyState={emptyState}
          onSkip={markHandled}
          onGiftIntent={openGift}
          onGifted={markHandled}
          onToggleSave={state.toggleSaved}
          onToggleReaction={state.toggleReaction}
          onToggleCommentLike={state.toggleCommentLike}
          onAddComment={state.addComment}
          onAvatarPress={openProfile}
        />
      </KeyboardAvoidingView>

      <BottomNavigation active="discover" />

      <FilterBottomSheet
        visible={filterOpen}
        filters={state.filters}
        availableCategories={state.availableCategories}
        countFor={state.countFor}
        onApply={(f) => {
          state.setFilters(f);
          setFilterOpen(false);
        }}
        onClose={() => setFilterOpen(false)}
      />

      <GiftAmountBottomSheet
        request={giftRequest}
        visible={giftOpen}
        onDismiss={dismissGift}
        onComplete={completeGift}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    height: 52,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterDot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.orange,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  deckArea: { flex: 1 },
  empty: { alignItems: 'center', maxWidth: 300 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.orangeSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 19, fontFamily: fonts.display, color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  emptyBody: { marginTop: 6, fontSize: 14.5, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
  emptyAction: { marginTop: 18, alignSelf: 'stretch' },
});
