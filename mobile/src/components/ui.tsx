import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { colors, fonts, radius } from '../theme';

export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && styles.pressed,
        style,
      ]}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.primary, disabled && styles.primaryDisabled, pressed && styles.pressed]}
    >
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

/** A short line in place of a list that has nothing in it. */
export function EmptyNote({ children }: { children: string }) {
  return <Text style={styles.emptyNote}>{children}</Text>;
}

export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      style={({ pressed }) => [styles.textButton, pressed && { opacity: 0.6 }]}
    >
      <Text style={styles.textButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: {
    backgroundColor: colors.orangeSoft,
    borderColor: colors.orange,
  },
  chipText: { fontSize: 14.5, fontFamily: fonts.medium, color: colors.text, fontVariant: ['tabular-nums'] },
  chipTextSelected: { fontFamily: fonts.semibold, color: colors.text },
  pressed: { transform: [{ scale: 0.97 }] },
  primary: {
    height: 54,
    borderRadius: radius.pill,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryDisabled: { opacity: 0.45 },
  // Dark text: white on this orange is below 3:1 contrast.
  primaryText: { fontSize: 16.5, fontFamily: fonts.bold, color: colors.text, letterSpacing: 0.1 },
  textButton: { paddingVertical: 8, paddingHorizontal: 4 },
  emptyNote: {
    paddingVertical: 20,
    paddingHorizontal: 12,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    textAlign: 'center',
  },
  textButtonText: { fontSize: 15, fontFamily: fonts.semibold, color: colors.textMuted },
});
