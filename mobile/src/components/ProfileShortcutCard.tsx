import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, ICON_STROKE, radius, shadow } from '../theme';

type Props = { title: string; Icon: LucideIcon; onPress: () => void };

export function ProfileShortcutCard({ title, Icon, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.card, pressed && { transform: [{ scale: 0.97 }] }]}
    >
      <Icon size={22} color={colors.orange} strokeWidth={ICON_STROKE} style={styles.icon} />
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <ChevronRight size={16} color={colors.textMuted} strokeWidth={ICON_STROKE} style={styles.icon} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: radius.card,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadow.layer,
  },
  icon: { flexShrink: 0 },
  title: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
});
