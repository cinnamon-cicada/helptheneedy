import { useEffect, useRef, useState, type ComponentRef, type RefObject } from 'react';
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
// Fixed, independent variation keeps trajectories natural without per-frame allocation.
function variation(index: number, salt: number) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

const PARTICLES = Array.from({ length: 144 }, (_, index) => ({
  origin: 0.08 + variation(index, 1) * 0.84,
  destination: 0.04 + variation(index, 2) * 0.92,
  apex: 0.03 + variation(index, 3) * 0.84,
  delay: variation(index, 4) * 0.08,
  gatherAt: 0.4 + variation(index, 9) * 0.12,
  spin: (index % 2 === 0 ? 1 : -1) * (100 + variation(index, 5) * 260),
  phase: variation(index, 6) * Math.PI * 2,
  width: 3 + variation(index, 7) * 4,
  height: 6 + variation(index, 8) * 7,
  color: PALETTE[index % PALETTE.length],
}));

type Target = { x: number; y: number };

type Particle = (typeof PARTICLES)[number];

function ConfettiPiece({ particle: p, clock, width, height, target }: {
  particle: Particle;
  clock: SharedValue<number>;
  width: number;
  height: number;
  target: Target;
}) {
  const motion = useAnimatedStyle(() => {
    const t = Math.max(0, Math.min(1, (clock.value - p.delay) / (1 - p.delay)));
    const rise = Math.min(1, t / p.gatherAt);
    const launch = 1 - (1 - rise) * (1 - rise);
    const gather = Math.max(0, (t - p.gatherAt) / (1 - p.gatherAt));
    const attraction = gather * gather * (3 - 2 * gather);
    const flutter = Math.sin(t * Math.PI * 3 + p.phase) * 7 * (1 - attraction);
    const spreadX = width * (p.origin + (p.destination - p.origin) * launch);
    const spreadY = height + 12 - (height + 12 - height * p.apex) * launch;
    return {
      opacity: t === 0 ? 0 : Math.min(1, t * 18) * (1 - Math.pow(gather, 1.35)),
      transform: [
        { translateX: spreadX + (target.x - p.width / 2 - spreadX) * attraction + flutter },
        { translateY: spreadY + (target.y - p.height / 2 - spreadY) * attraction },
        { rotate: `${p.phase * 180 / Math.PI + p.spin * t}deg` },
        { scaleX: 0.55 + Math.abs(Math.cos(t * Math.PI * 2 + p.phase)) * 0.45 },
      ],
    };
  });
  return <Animated.View style={[styles.piece, { width: p.width, height: p.height, backgroundColor: p.color }, motion]} />;
}

/** Mount only after a confirmed gift. One UI-thread clock drives the whole burst. */
export function GiftConfetti({ targetRef }: { targetRef: RefObject<ComponentRef<typeof View> | null> }) {
  const overlayRef = useRef<ComponentRef<typeof View>>(null);
  const [target, setTarget] = useState<Target | null>(null);
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
    if (target && motionAllowed && !reducedMotion && !finished) {
      clock.set(withTiming(1, { duration: DURATION, easing: Easing.linear }, (done) => {
        if (done) scheduleOnRN(setFinished, true);
      }));
    }
    return () => {
      cancelAnimation(clock);
    };
  }, [clock, reducedMotion, motionAllowed, finished, target]);

  if (!motionAllowed || reducedMotion || finished) return null;
  const measureTarget = () => {
    overlayRef.current?.measureInWindow((overlayX, overlayY) => {
      targetRef.current?.measureInWindow((x, y, badgeWidth, badgeHeight) => {
        setTarget({ x: x + badgeWidth / 2 - overlayX, y: y + badgeHeight / 2 - overlayY });
      });
    });
  };
  return (
    <View ref={overlayRef} onLayout={measureTarget} pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.overlay}>
      {target && PARTICLES.map((particle, index) => (
        <ConfettiPiece key={index} particle={particle} clock={clock} width={width} height={height} target={target} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  piece: { position: 'absolute', top: 0, left: 0, borderRadius: 1 },
});
