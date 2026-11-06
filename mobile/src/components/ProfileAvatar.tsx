import { Pencil } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, ICON_STROKE, shadow } from '../theme';
import { Avatar } from './Avatar';

const SIZE = 104;

export function ProfileAvatar({ uri, onEdit }: { uri: string; onEdit: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.photo}>
        <Avatar uri={uri} size={SIZE} />
      </View>
      <Pressable
        onPress={onEdit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Edit profile"
        style={({ pressed }) => [styles.edit, pressed && { transform: [{ scale: 0.94 }] }]}
      >
        <Pencil size={14} color={colors.text} strokeWidth={ICON_STROKE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE, height: SIZE },
  photo: { borderRadius: SIZE / 2, boxShadow: shadow.layer },
  edit: {
    position: 'absolute',
    right: 0,
    bottom: 2,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
