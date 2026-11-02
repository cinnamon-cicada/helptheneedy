import { SendHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ME } from '../data/mockRequests';
import { colors, fonts, ICON_STROKE, radius } from '../theme';
import { Avatar } from './Avatar';

export type TextInputHandle = React.ComponentRef<typeof TextInput>;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSubmit: () => void;
  inputRef?: React.Ref<TextInputHandle>;
};

export function CommentInput({ value, onChangeText, onSubmit, inputRef }: Props) {
  const [focused, setFocused] = useState(false);
  const canSend = value.trim().length > 0;

  return (
    <View style={styles.row}>
      <Avatar uri={ME.avatarUrl} size={30} />
      <View style={[styles.field, focused && styles.fieldFocused]}>
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder="Add a comment..."
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          returnKeyType="send"
          onSubmitEditing={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          maxLength={300}
          submitBehavior="submit"
        />
        <Pressable
          onPress={onSubmit}
          disabled={!canSend}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Post comment"
          style={({ pressed }) => [styles.send, pressed && { transform: [{ scale: 0.92 }] }]}
        >
          <SendHorizontal
            size={18}
            strokeWidth={ICON_STROKE + 0.25}
            color={canSend ? colors.orange : colors.textFaint}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: radius.input,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    paddingLeft: 16,
    paddingRight: 6,
  },
  fieldFocused: { borderColor: colors.yellow },
  input: { flex: 1, fontSize: 14.5, fontFamily: fonts.regular, color: colors.text, paddingVertical: 0, outlineWidth: 0 },
  send: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
});
