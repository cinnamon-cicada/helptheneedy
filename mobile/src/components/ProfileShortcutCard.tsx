import type { LucideIcon } from 'lucide-react-native';
import { type ComponentRef, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, ICON_STROKE } from '../theme';

export type TileRect = { x: number; y: number; width: number; height: number };

type Props = { title: string; Icon: LucideIcon; onPress: (origin: TileRect) => void };

export function ProfileShortcutCard({ title, Icon, onPress }: Props) {
  const ref = useRef<ComponentRef<typeof View>>(null);

  return (
    <Pressable
      ref={ref}
      onPress={() => ref.current?.measureInWindow((x, y, width, height) => onPress({ x, y, width, height }))}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [styles.tile, pressed && { opacity: 0.6 }]}
    >
      <Icon size={22} color={colors.orange} strokeWidth={ICON_STROKE} style={styles.icon} />
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.corner} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingLeft: 4,
    paddingRight: 18,
    paddingVertical: 10,
  },
  icon: { flexShrink: 0 },
  title: { flex: 1, fontSize: 14, fontFamily: fonts.bold, color: colors.text },
  // The flipped "L" that marks a tile as expandable.
  corner: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 11,
    height: 11,
    borderRightWidth: 1.75,
    borderBottomWidth: 1.75,
    borderColor: colors.orange,
  },
});
