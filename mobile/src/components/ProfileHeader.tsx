import { Settings } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts, ICON_STROKE } from '../theme';
import type { UserProfile } from '../types';
import { ProfileAvatar } from './ProfileAvatar';

type Props = {
  profile: UserProfile;
  onEdit: () => void;
  onOpenSettings: () => void;
};

export function ProfileHeader({ profile, onEdit, onOpenSettings }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 22 }]}>
      <Pressable
        onPress={onOpenSettings}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Settings"
        style={({ pressed }) => [
          styles.settings,
          { top: insets.top + 8 },
          pressed && { transform: [{ scale: 0.94 }] },
        ]}
      >
        <Settings size={20} color={colors.text} strokeWidth={ICON_STROKE} />
      </Pressable>
      <ProfileAvatar uri={profile.avatarUrl} onEdit={onEdit} />
      <Text style={styles.username}>{profile.username}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32 },
  settings: {
    position: 'absolute',
    right: 20,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  username: { marginTop: 14, fontSize: 24, fontFamily: fonts.display, color: colors.text, letterSpacing: -0.4 },
});
