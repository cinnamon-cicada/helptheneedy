import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import type { GiftRequest } from '../types';
import { CardStackLayer } from './CardStackLayer';
import {
  type CardGeometry,
  GiftRequestCard,
  type GiftRequestCardHandle,
  IMAGE_INSET,
  INFO_HEIGHT,
} from './GiftRequestCard';

export type SwipeCardDeckHandle = {
  /** The gift sheet was dismissed: bring the parked card back. */
  returnCard: () => void;
  /** The gift flow finished: send the card off and advance. */
  completeGift: () => void;
};

type ReactionKind = 'hearts' | 'sparkles';

type Props = {
  ref?: React.Ref<SwipeCardDeckHandle>;
  requests: GiftRequest[];
  myReactions: Record<string, Partial<Record<ReactionKind, boolean>>>;
  emptyState: React.ReactNode;
  onSkip: (id: string) => void;
  onGiftIntent: (request: GiftRequest) => void;
  onGifted: (id: string) => void;
  onToggleSave: (id: string) => void;
  onToggleReaction: (id: string, kind: ReactionKind) => void;
  onToggleCommentLike: (requestId: string, commentId: string) => void;
  onAddComment: (requestId: string, text: string) => void;
  onAvatarPress: (request: GiftRequest) => void;
};

// Horizontal nudge so the rear layers peek out on the left.
const DECK_SHIFT_X = 14;
const DECK_SHIFT_Y = 12;

function computeGeometry(w: number, h: number): CardGeometry {
  const cardW = Math.min(w - 56, 400);
  const cardH = Math.min(h - 56, Math.round(cardW * 1.62));
  return {
    collapsed: {
      left: Math.round((w - cardW) / 2 + DECK_SHIFT_X),
      top: Math.round((h - cardH) / 2 + DECK_SHIFT_Y),
      width: cardW,
      height: cardH,
    },
    expanded: { left: 12, top: 4, width: w - 24, height: h - 8 },
    imageCollapsed: cardH - 2 - IMAGE_INSET - INFO_HEIGHT,
    imageExpanded: Math.round(Math.min(210, Math.max(104, h * 0.25))),
    expandDistance: Math.min(260, h * 0.4),
  };
}

export function SwipeCardDeck({
  ref,
  requests,
  myReactions,
  emptyState,
  onSkip,
  onGiftIntent,
  onGifted,
  onToggleSave,
  onToggleReaction,
  onToggleCommentLike,
  onAddComment,
  onAvatarPress,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [expanded, setExpanded] = useState(false);
  const expand = useSharedValue(0);
  const isExpanded = useSharedValue(false);
  const frontRef = useRef<GiftRequestCardHandle>(null);

  const front = requests[0];
  const layerCount = Math.min(2, Math.max(0, requests.length - 1));

  const geometry = useMemo(() => (size ? computeGeometry(size.w, size.h) : null), [size]);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize((prev) =>
      prev && Math.abs(prev.w - width) < 1 && Math.abs(prev.h - height) < 1 ? prev : { w: width, h: height },
    );
  }, []);

  // A new front card always starts collapsed.
  const [frontId, setFrontId] = useState(front?.id);
  if (front?.id !== frontId) {
    setFrontId(front?.id);
    setExpanded(false);
  }
  useEffect(() => {
    expand.set(0);
    isExpanded.set(false);
  }, [front?.id, expand, isExpanded]);

  useImperativeHandle(
    ref,
    () => ({
      returnCard: () => frontRef.current?.returnToCenter(),
      completeGift: () => {
        const id = front?.id;
        if (!id) return;
        frontRef.current?.flyOutRight(() => onGifted(id));
      },
    }),
    [front?.id, onGifted],
  );

  return (
    <View style={styles.container} onLayout={onLayout}>
      {geometry && front ? (
        <>
          {layerCount >= 2 ? <CardStackLayer depth={2} rect={geometry.collapsed} expand={expand} /> : null}
          {layerCount >= 1 ? <CardStackLayer depth={1} rect={geometry.collapsed} expand={expand} /> : null}
          <GiftRequestCard
            key={front.id}
            ref={frontRef}
            request={front}
            geometry={geometry}
            screenWidth={screenWidth}
            expand={expand}
            isExpanded={isExpanded}
            expanded={expanded}
            heartOn={!!myReactions[front.id]?.hearts}
            sparkleOn={!!myReactions[front.id]?.sparkles}
            onSkip={() => onSkip(front.id)}
            onGiftIntent={() => onGiftIntent(front)}
            onExpandedChange={setExpanded}
            onToggleSave={() => onToggleSave(front.id)}
            onAvatarPress={() => onAvatarPress(front)}
            onToggleHeart={() => onToggleReaction(front.id, 'hearts')}
            onToggleSparkle={() => onToggleReaction(front.id, 'sparkles')}
            onToggleCommentLike={(commentId) => onToggleCommentLike(front.id, commentId)}
            onAddComment={(text) => onAddComment(front.id, text)}
          />
        </>
      ) : null}
      {geometry && !front ? <View style={styles.empty}>{emptyState}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
