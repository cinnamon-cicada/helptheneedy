import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { PROFILE_LISTS } from '../data/mockProfile';
import { colors, fonts, ICON_STROKE, shadow } from '../theme';
import type { TileRect } from './ProfileShortcutCard';
import type { ProfileSection } from './ProfileShortcutGrid';

const MARGIN = 20;
// Estimates for sizing the window: one row, and the header plus the sample note.
const ROW_HEIGHT = 46;
const CHROME_HEIGHT = 112;
const TIMING = { duration: 260, easing: Easing.out(Easing.cubic) };

type Props = {
  section: ProfileSection | null;
  origin: TileRect | null;
  onClose: () => void;
};

/** Grows out of the tapped shortcut tile and shrinks back into it when closed. */
export function ProfileListWindow({ section, origin, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const screen = useWindowDimensions();
  const visible = section !== null;
  const progress = useSharedValue(0);
  // Kept after closing so the exit animation still has content and a target.
  const [shown, setShown] = useState({ section, origin });

  if (visible && (shown.section !== section || shown.origin !== origin)) setShown({ section, origin });

  useEffect(() => {
    if (visible) {
      progress.set(withTiming(1, TIMING));
    } else {
      progress.set(
        withTiming(0, TIMING, (finished) => {
          if (finished) scheduleOnRN(setShown, { section: null, origin: null });
        }),
      );
    }
  }, [visible, progress]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const from = shown.origin ?? { x: 0, y: 0, width: 0, height: 0 };
  const list = shown.section ? PROFILE_LISTS[shown.section] : null;
  const width = screen.width - MARGIN * 2;
  // Fit the rows, centered; longer lists scroll inside the largest window that fits.
  const maxHeight = screen.height - insets.top - Math.max(insets.bottom, MARGIN) - MARGIN;
  const height = Math.min((list?.items.length ?? 0) * ROW_HEIGHT + CHROME_HEIGHT, maxHeight);
  const top = insets.top + (maxHeight - height) / 2;

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const windowStyle = useAnimatedStyle(() => ({
    left: interpolate(progress.value, [0, 1], [from.x, MARGIN]),
    top: interpolate(progress.value, [0, 1], [from.y, top]),
    width: interpolate(progress.value, [0, 1], [from.width, width]),
    height: interpolate(progress.value, [0, 1], [from.height, height]),
  }));
  const contentStyle = useAnimatedStyle(() => ({ opacity: interpolate(progress.value, [0.4, 1], [0, 1], 'clamp') }));

  if (!list) return null;
  const { title, items } = list;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View style={[styles.window, windowStyle]} accessibilityViewIsModal accessibilityLabel={title}>
        {/* Fixed to the final size so rows don't reflow while the window grows. */}
        <Animated.View style={[{ width, height }, contentStyle]}>
          <View style={styles.header}>
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={`Close ${title}`}
              style={({ pressed }) => pressed && { opacity: 0.6 }}
            >
              <X size={20} color={colors.text} strokeWidth={ICON_STROKE} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.list}>
            {items.map((item, i) => (
              <View key={item.id} style={[styles.row, i > 0 && styles.divider]}>
                <Text style={styles.rowTitle}>{item.title}</Text>
                <Text style={styles.rowDetail}>{item.detail}</Text>
              </View>
            ))}
            <Text style={styles.note}>Sample data for this prototype.</Text>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: colors.scrim },
  window: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.sheet,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
  },
  title: { fontSize: 18, fontFamily: fonts.display, color: colors.text },
  list: { paddingHorizontal: 18, paddingBottom: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { flex: 1, fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
  rowDetail: { fontSize: 12.5, fontFamily: fonts.regular, color: colors.textMuted },
  note: { marginTop: 14, fontSize: 12.5, fontFamily: fonts.regular, color: colors.textMuted, textAlign: 'center' },
});
