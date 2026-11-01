import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SAMPLE_AVATARS } from '../data/mockProfile';
import { colors, radius } from '../theme';
import type { UserProfile } from '../types';
import { Avatar } from './Avatar';
import { BottomSheet } from './BottomSheet';
import { PrimaryButton } from './ui';

type Edits = Pick<UserProfile, 'username' | 'avatarUrl'>;

type Props = {
  visible: boolean;
  profile: UserProfile;
  onSave: (edits: Edits) => void;
  onClose: () => void;
};

export function EditProfileModal({ visible, profile, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<Edits>(profile);
  const [wasVisible, setWasVisible] = useState(visible);

  // Start from the saved profile each time the sheet opens, so a dismissed edit is dropped.
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(profile);
  }

  const username = draft.username.trim();

  const nextPhoto = () => {
    const i = SAMPLE_AVATARS.indexOf(draft.avatarUrl);
    setDraft({ ...draft, avatarUrl: SAMPLE_AVATARS[(i + 1) % SAMPLE_AVATARS.length] });
  };

  return (
    <BottomSheet visible={visible} onClose={onClose} accessibilityLabel="Edit profile">
      <Text style={styles.title}>Edit Profile</Text>

      <View style={styles.photoRow}>
        <Avatar uri={draft.avatarUrl} size={64} />
        <Pressable onPress={nextPhoto} hitSlop={8} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
          <Text style={styles.photoAction}>Try another sample photo</Text>
        </Pressable>
      </View>

      <Text style={styles.label}>Username</Text>
      <TextInput
        value={draft.username}
        onChangeText={(text) => setDraft({ ...draft, username: text })}
        maxLength={24}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Username"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
      />

      <View style={styles.action}>
        <PrimaryButton
          label="Save"
          disabled={username.length === 0}
          onPress={() => onSave({ ...draft, username })}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 19, fontWeight: '700', color: colors.text, letterSpacing: -0.3 },
  photoRow: { marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  photoAction: { fontSize: 14.5, fontWeight: '600', color: colors.orangeText },
  label: { marginTop: 16, marginBottom: 6, fontSize: 13, fontWeight: '600', color: colors.textMuted },
  input: {
    minHeight: 46,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontSize: 15.5,
    color: colors.text,
  },
  action: { marginTop: 20 },
});
