import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { usePanGesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
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
  overlay?: React.ReactNode;
};

/** Shared bottom sheet: springs up, drag down or tap the scrim to close. */
export function BottomSheet({ visible, onClose, accessibilityLabel, children, overlay }: Props) {
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
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
    transform: [{ translateY: (1 - progress.value) * height + dragY.value }],
  }));

  if (!mounted) return null;

  // A separate presentation surface keeps animated/elevated cards below the sheet.
  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={visible ? onClose : undefined}
    >
      <GestureHandlerRootView style={styles.root}>
        <View style={styles.root} pointerEvents={visible ? 'auto' : 'none'}>
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
          {overlay}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
