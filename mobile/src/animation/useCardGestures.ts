import { useCallback, useEffect } from 'react';
import { usePanGesture } from 'react-native-gesture-handler';
import {
  Extrapolation,
  interpolate,
  type SharedValue,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { spring } from '../theme';

const AXIS_NONE = 0;
const AXIS_X = 1;
const AXIS_Y = 2;
const AXIS_IGNORED = 3;

type Options = {
  screenWidth: number;
  /** How far a downward drag must travel to fully expand the card. */
  expandDistance: number;
  /** Shared with the deck so rear layers can react to expansion. */
  expand: SharedValue<number>;
  isExpanded: SharedValue<boolean>;
  onSkip: () => void;
  onGiftIntent: () => void;
  onExpandedChange: (expanded: boolean) => void;
};

/**
 * Directional gesture logic for the front card.
 *
 * The axis locks on activation from whichever direction dominates, so a
 * diagonal drag only ever drives one action: horizontal = skip or gift,
 * vertical = expand or collapse. Horizontal drags are ignored while expanded.
 * `expandCard` lets a tap on a collapsed card expand it too.
 */
export function useCardGestures({
  screenWidth,
  expandDistance,
  expand,
  isExpanded,
  onSkip,
  onGiftIntent,
  onExpandedChange,
}: Options) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const axis = useSharedValue(AXIS_NONE);
  // Set while the card is flying off or parked during the gift flow.
  const locked = useSharedValue(false);
  // 0 → 1 as the card moves forward from the second deck position.
  const enter = useSharedValue(0);

  useEffect(() => {
    enter.set(withSpring(1, spring.settle));
  }, [enter]);

  const swipeThreshold = screenWidth * 0.28;

  const pan = usePanGesture({
    minDistance: 10,
    onActivate: () => {
      'worklet';
      // The activation event can report zero translation, so the axis is
      // decided on the first update with real movement instead.
      axis.set(locked.value ? AXIS_IGNORED : AXIS_NONE);
    },
    onUpdate: (e) => {
      'worklet';
      if (axis.value === AXIS_NONE) {
        const ax = Math.abs(e.translationX);
        const ay = Math.abs(e.translationY);
        if (Math.max(ax, ay) < 6) return;
        if (ax > ay) {
          axis.set(isExpanded.value ? AXIS_IGNORED : AXIS_X);
        } else {
          axis.set(AXIS_Y);
        }
      }
      if (axis.value === AXIS_X) {
        translateX.set(e.translationX);
        translateY.set(e.translationY * 0.2);
      } else if (axis.value === AXIS_Y) {
        if (isExpanded.value) {
          // Dragging up collapses; dragging down does nothing.
          expand.set(interpolate(
            e.translationY,
            [-expandDistance, 0],
            [0, 1],
            Extrapolation.CLAMP,
          ));
        } else if (e.translationY >= 0) {
          expand.set(interpolate(
            e.translationY,
            [0, expandDistance],
            [0, 1],
            Extrapolation.CLAMP,
          ));
        } else {
          // Small rubber band when pulling a collapsed card upward.
          translateY.set(e.translationY * 0.12);
        }
      }
    },
    onDeactivate: (e) => {
      'worklet';
      const currentAxis = axis.value;
      axis.set(AXIS_NONE);

      if (currentAxis === AXIS_X) {
        const tx = e.translationX;
        const flungLeft = e.velocityX < -900 && tx < -40;
        const flungRight = e.velocityX > 900 && tx > 40;

        if (tx < -swipeThreshold || flungLeft) {
          locked.set(true);
          translateY.set(withTiming(translateY.value + 40, { duration: 260 }));
          translateX.set(withTiming(-screenWidth * 1.5, { duration: 260 }, (finished) => {
            if (finished) scheduleOnRN(onSkip);
          }));
        } else if (tx > swipeThreshold || flungRight) {
          // Park the card to the right while the gift sheet is open. The deck
          // only advances once the gift flow completes.
          locked.set(true);
          translateX.set(withSpring(screenWidth * 0.62, spring.settle));
          translateY.set(withSpring(0, spring.settle));
          scheduleOnRN(onGiftIntent);
        } else {
          translateX.set(withSpring(0, spring.settle));
          translateY.set(withSpring(0, spring.settle));
        }
        return;
      }

      if (currentAxis === AXIS_Y) {
        translateY.set(withSpring(0, spring.settle));
        let target: number;
        if (isExpanded.value) {
          target = expand.value < 0.75 || e.velocityY < -700 ? 0 : 1;
        } else {
          target = expand.value > 0.3 || e.velocityY > 700 ? 1 : 0;
        }
        expand.set(withSpring(target, spring.expand));
        const nextExpanded = target === 1;
        if (nextExpanded !== isExpanded.value) {
          isExpanded.set(nextExpanded);
          scheduleOnRN(onExpandedChange, nextExpanded);
        }
      }
    },
  });

  const expandCard = useCallback(() => {
    if (locked.value || isExpanded.value) return;
    expand.set(withSpring(1, spring.expand));
    isExpanded.set(true);
    onExpandedChange(true);
  }, [expand, isExpanded, locked, onExpandedChange]);

  const returnToCenter = useCallback(() => {
    translateX.set(withSpring(0, spring.settle, (finished) => {
      if (finished) locked.set(false);
    }));
    translateY.set(withSpring(0, spring.settle));
  }, [locked, translateX, translateY]);

  const flyOutRight = useCallback(
    (onDone: () => void) => {
      locked.set(true);
      translateX.set(withTiming(screenWidth * 1.5, { duration: 260 }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }));
    },
    [locked, screenWidth, translateX],
  );

  const collapse = useCallback(() => {
    expand.set(withSpring(0, spring.expand));
    if (isExpanded.value) {
      isExpanded.set(false);
      onExpandedChange(false);
    }
  }, [expand, isExpanded, onExpandedChange]);

  return { pan, expandCard, translateX, translateY, enter, returnToCenter, flyOutRight, collapse };
}
