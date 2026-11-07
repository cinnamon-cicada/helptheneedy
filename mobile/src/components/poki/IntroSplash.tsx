import { useCallback, useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { createMascotSignals } from '../../animation/poki/signals';
import { isFormRevealed, useIntroSequence } from '../../animation/poki/timeline';
import { colors } from '../../theme';
import { TextButton } from '../ui';
import { AuthScene, type StageLayout } from './AuthScene';
import { Wordmark } from './Wordmark';

const HEADER_H = 52;
const FADE_MS = 450;

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

type Props = {
  /** False while the account is still being set up; the splash stays until it's ready. */
  ready: boolean;
};

/**
 * The Poki intro, played over the app on launch: the mascot drags the gift
 * in, it bursts, and the splash fades into Discover. Tapping skips it.
 * Reduced motion and screen readers go straight to the app.
 */
export function IntroSplash({ ready }: Props) {
  const reducedMotion = useReducedMotion();
  const [done, setDone] = useState(reducedMotion);
  if (done) return null;
  return <Splash ready={ready} onDone={() => setDone(true)} />;
}

function Splash({ ready, onDone }: Props & { onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const { clock, phase, skip, restart } = useIntroSequence(false);
  const [signals] = useState(createMascotSignals);
  const [skipped, setSkipped] = useState(false);
  const opacity = useSharedValue(1);

  // Keep the gift at the centre of the screen the whole way through.
  const stage = useMemo<StageLayout>(
    () => ({ centerY: height / 2, width, height: clamp(height * 0.42, 220, 380) }),
    [height, width],
  );

  // Nothing to watch with a screen reader.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isScreenReaderEnabled().then((on) => on && setSkipped(true));
  }, []);

  const leaving = ready && (skipped || isFormRevealed(phase));
  useEffect(() => {
    if (!leaving) return;
    opacity.set(
      withTiming(0, { duration: FADE_MS }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      }),
    );
  }, [leaving, opacity, onDone]);

  const skipIntro = useCallback(() => {
    skip(true);
    setSkipped(true);
  }, [skip]);
  const fallBack = useCallback(() => setSkipped(true), []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={[styles.splash, style]} pointerEvents={leaving ? 'none' : 'auto'}>
      <AuthScene
        clock={clock}
        signals={signals}
        stage={stage}
        reducedMotion={false}
        onFallback={fallBack}
        // WebGL can take a second or two to start; play the intro from then.
        onReady={restart}
      />
      <View style={[styles.header, { paddingTop: insets.top, height: insets.top + HEADER_H }]} pointerEvents="none">
        <Wordmark />
      </View>
      <Pressable style={StyleSheet.absoluteFill} onPress={skipIntro} accessible={false} />
      <Animated.View entering={FadeIn.delay(400)} style={[styles.skip, { top: insets.top + 8 }]}>
        <TextButton label="Skip" onPress={skipIntro} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  splash: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.white, zIndex: 10 },
  header: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  skip: { position: 'absolute', right: 16 },
});
