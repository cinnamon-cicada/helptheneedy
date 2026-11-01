import { useEffect, useState } from 'react';
import { BackHandler, KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';
import { usePanGesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { colors, radius, shadow, spring } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
};

const OFFSCREEN = 800;

/** Shared bottom sheet: springs up, drag down or tap the scrim to close. */
export function BottomSheet({ visible, onClose, accessibilityLabel, children }: Props) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const dragY = useSharedValue(0);

  // Mount as soon as the sheet opens; unmount only after the exit animation.
  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (visible) {
      dragY.set(0);
      progress.set(withSpring(1, spring.sheet));
    } else {
      progress.set(withTiming(0, { duration: 220, easing: Easing.out(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      }));
    }
  }, [visible, dragY, progress]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const pan = usePanGesture({
    activeOffsetY: 10,
    failOffsetX: [-24, 24],
    onUpdate: (e) => {
      'worklet';
      dragY.set(e.translationY > 0 ? e.translationY : e.translationY * 0.1);
    },
    onDeactivate: (e) => {
      'worklet';
      if (dragY.value > 110 || e.velocityY > 900) {
        scheduleOnRN(onClose);
      } else {
        dragY.set(withSpring(0, spring.sheet));
      }
    },
  });

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * OFFSCREEN + dragY.value }],
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <KeyboardAvoidingView behavior="padding" style={styles.avoider} pointerEvents="box-none">
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) + 8 }, sheetStyle]}
            accessibilityViewIsModal
            accessibilityLabel={accessibilityLabel}
          >
            <View style={styles.handle} />
            {children}
          </Animated.View>
        </GestureDetector>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  avoider: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: 20,
    paddingTop: 10,
    boxShadow: shadow.sheet,
  },
  handle: {
    alignSelf: 'center',
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
    marginBottom: 14,
  },
});
