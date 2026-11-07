import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { createMascotSignals } from '../animation/poki/signals';
import { isFormRevealed, useIntroSequence } from '../animation/poki/timeline';
import { authService } from '../auth/authService';
import type { AuthService, AuthUser } from '../auth/types';
import { LoginForm } from '../components/auth/LoginForm';
import { SignupForm } from '../components/auth/SignupForm';
import { AuthScene, type StageLayout } from '../components/poki/AuthScene';
import { Wordmark } from '../components/poki/Wordmark';
import { TextButton } from '../components/ui';
import { colors, radius, spring } from '../theme';

type Mode = 'login' | 'signup';

type Props = {
  onAuthenticated: (user: AuthUser) => void;
  service?: AuthService;
};

const HEADER_H = 52;
const FORM_MAX_W = 440;
/** Slightly underdamped so the form pops up rather than slides. */
const REVEAL_SPRING = { damping: 15, stiffness: 115, mass: 1 };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function useScreenReader() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    // react-native-web always reports a screen reader, so only trust native.
    if (Platform.OS === 'web') return;
    AccessibilityInfo.isScreenReaderEnabled().then(setEnabled);
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', setEnabled);
    return () => sub.remove();
  }, []);
  return enabled;
}

/**
 * Login and signup. On first load the mascot drags the gift to the centre,
 * it bursts, and the gift rises as the form springs up from below. Signup
 * reuses the same scene with a smaller gift area instead of replaying it.
 */
export function AuthScreen({ onAuthenticated, service = authService }: Props) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const screenReader = useScreenReader();
  const { clock, phase, skip } = useIntroSequence(reducedMotion);
  const [signals] = useState(createMascotSignals);
  const [mode, setMode] = useState<Mode>('login');
  const [prefill, setPrefill] = useState<string | undefined>();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const revealed = isFormRevealed(phase);

  // Nothing to watch with a screen reader: go straight to the form.
  useEffect(() => {
    if (screenReader) skip(true);
  }, [screenReader, skip]);

  const header = insets.top + HEADER_H;
  const stageHeight = mode === 'login' ? clamp(height * 0.3, 170, 300) : clamp(height * 0.15, 96, 140);
  const sheetTop = header + stageHeight;
  const stage = useMemo<StageLayout>(
    () => ({ centerY: header + stageHeight / 2, width, height: stageHeight }),
    [header, stageHeight, width],
  );

  const top = useSharedValue(sheetTop);
  const offset = useSharedValue(height);

  useEffect(() => {
    top.set(reducedMotion ? sheetTop : withSpring(sheetTop, spring.expand));
  }, [sheetTop, reducedMotion, top]);

  useEffect(() => {
    if (revealed) offset.set(reducedMotion ? 0 : withSpring(0, REVEAL_SPRING));
  }, [revealed, reducedMotion, offset]);

  const sheetStyle = useAnimatedStyle(() => ({
    top: top.value,
    transform: [{ translateY: offset.value }],
  }));

  const showSignup = useCallback((email?: string) => {
    setPrefill(email);
    setMode('signup');
  }, []);
  const showLogin = useCallback(() => setMode('login'), []);
  const fallBack = useCallback(() => skip(true), [skip]);
  const scrollToTop = useCallback(() => scrollRef.current?.scrollTo({ y: 0, animated: true }), []);

  useEffect(() => {
    if (mode !== 'signup') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setMode('login');
      return true;
    });
    return () => sub.remove();
  }, [mode]);

  return (
    <View style={styles.screen}>
      <AuthScene
        clock={clock}
        signals={signals}
        stage={stage}
        reducedMotion={reducedMotion}
        onFallback={fallBack}
      />

      <View style={[styles.header, { paddingTop: insets.top, height: header }]} pointerEvents="box-none">
        <Wordmark />
      </View>

      {!revealed ? (
        <>
          {/* Tapping anywhere during the intro skips to the form. */}
          <Pressable style={StyleSheet.absoluteFill} onPress={() => skip()} accessible={false} />
          <Animated.View
            entering={FadeIn.delay(400)}
            style={[styles.skip, { top: insets.top + 8 }]}
          >
            <TextButton label="Skip" onPress={() => skip()} />
          </Animated.View>
        </>
      ) : null}

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <KeyboardAvoidingView behavior="padding" style={styles.fill}>
          <ScrollView
            ref={scrollRef}
            style={styles.fill}
            contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 28 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {revealed ? (
              <Animated.View
                key={mode}
                entering={FadeInDown.duration(380).springify().damping(18)}
                exiting={FadeOut.duration(140)}
                style={styles.formWrap}
              >
                {mode === 'login' ? (
                  <LoginForm
                    service={service}
                    signals={signals}
                    onSignUp={showSignup}
                    onAuthenticated={onAuthenticated}
                  />
                ) : (
                  <SignupForm
                    service={service}
                    signals={signals}
                    initialEmail={prefill}
                    onLogIn={showLogin}
                    onAuthenticated={onAuthenticated}
                    onInvalid={scrollToTop}
                  />
                )}
              </Animated.View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  fill: { flex: 1 },
  header: { position: 'absolute', left: 0, right: 0, top: 0, alignItems: 'center', justifyContent: 'center' },
  skip: { position: 'absolute', right: 16 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
  },
  content: { paddingHorizontal: 24, paddingTop: 26, alignItems: 'center' },
  formWrap: { width: '100%', maxWidth: FORM_MAX_W },
});
