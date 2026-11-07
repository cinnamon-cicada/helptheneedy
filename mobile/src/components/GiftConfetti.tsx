import { useEffect, useState } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { colors } from '../theme';

const DURATION = 2700;
const PALETTE = [colors.orange, colors.peach, colors.yellow, colors.orangeSoft];
// Fixed variation avoids allocating random particles on rerenders.
const PARTICLES = Array.from({ length: 36 }, (_, index) => ({
  side: index % 2 === 0 ? 1 : -1,
  spread: 0.22 + ((index * 17) % 29) / 100,
  lift: 100 + ((index * 31) % 140),
  delay: ((index * 7) % 13) / 100,
  spin: (index % 2 === 0 ? 1 : -1) * (140 + ((index * 23) % 200)),
  width: 4 + (index % 3),
  height: 7 + (index % 5),
  color: PALETTE[index % PALETTE.length],
}));

type Particle = (typeof PARTICLES)[number];

function ConfettiPiece({ particle: p, clock, width, height }: {
  particle: Particle;
  clock: SharedValue<number>;
  width: number;
  height: number;
}) {
  const motion = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (clock.value - p.delay) / (1 - p.delay)));
    const drift = 1 - Math.exp(-4 * t);
    return {
      opacity: t === 0 ? 0 : Math.min(1, t * 18) * Math.min(1, (1 - t) * 5),
      transform: [
        { translateX: (p.side === 1 ? -8 : width + 8) + p.side * width * p.spread * drift },
        { translateY: height * 0.56 - 4 * p.lift * t * (1 - t) + height * 0.58 * t * t },
        { rotate: `${p.spin * t}deg` },
        { scaleX: 0.55 + Math.abs(Math.cos(t * Math.PI * 3 + p.spin)) * 0.45 },
      ],
    };
  });
  return <Animated.View style={[styles.piece, { width: p.width, height: p.height, backgroundColor: p.color }, motion]} />;
}

/** Mount only after a confirmed gift. One UI-thread clock drives the whole burst. */
export function GiftConfetti() {
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [motionAllowed, setMotionAllowed] = useState(false);
  const [finished, setFinished] = useState(false);
  const clock = useSharedValue(0);

  useEffect(() => {
    let active = true;
    let changed = false;
    // Query at mount as the setting may have changed since the app started.
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active && !changed) setMotionAllowed(!enabled);
    }).catch(() => { /* Keep the static success state if the setting is unavailable. */ });
    // Stop immediately if reduced motion is enabled during the celebration too.
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      changed = true;
      if (enabled) {
        cancelAnimation(clock);
        setFinished(true);
      }
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [clock]);

  useEffect(() => {
    if (motionAllowed && !reducedMotion && !finished) {
      clock.set(withTiming(1, { duration: DURATION, easing: Easing.linear }, (done) => {
        if (done) scheduleOnRN(setFinished, true);
      }));
    }
    return () => {
      cancelAnimation(clock);
    };
  }, [clock, reducedMotion, motionAllowed, finished]);

  if (!motionAllowed || reducedMotion || finished) return null;
  return (
    <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.overlay}>
      {PARTICLES.map((particle, index) => (
        <ConfettiPiece key={index} particle={particle} clock={clock} width={width} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 1 },
});
