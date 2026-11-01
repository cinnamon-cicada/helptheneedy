import { Heart, MessageCircle, Sparkles } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, ICON_STROKE } from '../theme';
import type { Reactions } from '../types';
import { formatCompact } from '../utils/format';

type Props = {
  reactions: Reactions;
  commentCount: number;
  heartOn: boolean;
  sparkleOn: boolean;
  onToggleHeart: () => void;
  onToggleSparkle: () => void;
};

export function ReactionBar({
  reactions,
  commentCount,
  heartOn,
  sparkleOn,
  onToggleHeart,
  onToggleSparkle,
}: Props) {
  return (
    <View style={styles.row}>
      <Reaction
        label={formatCompact(reactions.hearts)}
        active={heartOn}
        onPress={onToggleHeart}
        accessibilityLabel={heartOn ? 'Remove heart' : 'Heart this request'}
        icon={(color) => (
          <Heart size={18} color={color} fill={heartOn ? color : 'transparent'} strokeWidth={ICON_STROKE} />
        )}
      />
      <Reaction
        label={formatCompact(reactions.sparkles)}
        active={sparkleOn}
        onPress={onToggleSparkle}
        accessibilityLabel={sparkleOn ? 'Remove sparkle' : 'Sparkle this request'}
        icon={(color) => (
          <Sparkles size={18} color={color} fill={sparkleOn ? color : 'transparent'} strokeWidth={ICON_STROKE} />
        )}
      />
      <Reaction
        label={formatCompact(commentCount)}
        active={false}
        accessibilityLabel={`${commentCount} comments`}
        icon={(color) => <MessageCircle size={18} color={color} strokeWidth={ICON_STROKE} />}
      />
    </View>
  );
}

function Reaction({
  label,
  active,
  onPress,
  icon,
  accessibilityLabel,
}: {
  label: string;
  active: boolean;
  onPress?: () => void;
  icon: (color: string) => React.ReactNode;
  accessibilityLabel: string;
}) {
  const color = active ? colors.peach : colors.textMuted;
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      hitSlop={8}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={onPress ? { selected: active } : undefined}
      style={({ pressed }) => [styles.item, pressed && styles.pressed]}
    >
      {icon(color)}
      <Text style={[styles.count, active && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  pressed: { opacity: 0.6, transform: [{ scale: 0.96 }] },
  count: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
    fontVariant: ['tabular-nums'],
  },
});
