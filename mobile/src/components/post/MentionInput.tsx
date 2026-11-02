import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { extractHashtags, extractMentions, handleFor, mentionAtCursor } from '../../post/details';
import { colors, fonts, radius } from '../../theme';
import type { Person } from '../../types';
import { Avatar } from '../Avatar';

type FieldProps = Omit<TextInputProps, 'style'> & { label: string; error?: string; hint?: string };

/** Multi-line version of the auth TextField, same look. */
export function MultilineField({ label, error, hint, onFocus, onBlur, ...input }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        multiline
        textAlignVertical="top"
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.orange}
        accessibilityLabel={label}
        accessibilityHint={error}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}
        {...input}
      />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

type Props = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  /** People who can be @mentioned (mutual follows). */
  friends: Person[];
  error?: string;
  placeholder?: string;
  maxLength?: number;
};

/**
 * Description with #hashtags and @mentions. Typing "@" suggests friends;
 * detected tags and mentions are listed under the field.
 */
export function MentionInput({ label, value, onChangeText, friends, error, placeholder, maxLength }: Props) {
  const [cursor, setCursor] = useState(value.length);
  const active = mentionAtCursor(value, cursor);
  const query = active?.query.toLowerCase() ?? '';
  const suggestions = active
    ? friends.filter((f) => handleFor(f.displayName).toLowerCase().startsWith(query)).slice(0, 5)
    : [];

  const insert = (friend: Person) => {
    if (!active) return;
    const handle = `@${handleFor(friend.displayName)} `;
    const next = value.slice(0, active.start) + handle + value.slice(cursor);
    onChangeText(next);
    setCursor(active.start + handle.length);
  };

  const tags = extractHashtags(value);
  const mentioned = extractMentions(value);
  const byHandle = new Map(friends.map((f) => [handleFor(f.displayName).toLowerCase(), f]));
  const unknown = mentioned.filter((m) => !byHandle.has(m.toLowerCase()));

  return (
    <View style={styles.wrap}>
      <MultilineField
        label={label}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          // Typing at the end is the common case; selection events refine it.
          if (text.length !== value.length) setCursor(Math.min(cursor + (text.length - value.length), text.length));
        }}
        onSelectionChange={(e) => setCursor(e.nativeEvent.selection.start)}
        error={error}
        hint="Use # for tags and @ to mention a friend."
        placeholder={placeholder}
        maxLength={maxLength}
      />

      {suggestions.length > 0 ? (
        <View style={styles.suggestions} accessibilityLabel="Friends to mention">
          {suggestions.map((f, i) => (
            <Pressable
              key={f.id}
              onPress={() => insert(f)}
              accessibilityRole="button"
              accessibilityLabel={`Mention ${f.displayName}`}
              style={({ pressed }) => [styles.suggestion, i > 0 && styles.divider, pressed && { backgroundColor: colors.background }]}
            >
              <Avatar uri={f.avatarUrl} size={28} />
              <Text style={styles.suggestionName}>{f.displayName}</Text>
              <Text style={styles.suggestionHandle}>@{handleFor(f.displayName)}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {tags.length > 0 || mentioned.length > 0 ? (
        <View style={styles.chips}>
          {tags.map((t) => (
            <View key={`#${t}`} style={styles.chip}>
              <Text style={styles.chipText}>#{t}</Text>
            </View>
          ))}
          {mentioned.map((m) => (
            <View key={`@${m}`} style={[styles.chip, !byHandle.has(m.toLowerCase()) && styles.chipMuted]}>
              <Text style={[styles.chipText, !byHandle.has(m.toLowerCase()) && styles.chipTextMuted]}>@{m}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {unknown.length > 0 ? (
        <Text style={styles.hint}>
          {unknown.map((m) => `@${m}`).join(', ')} {unknown.length === 1 ? "isn't" : "aren't"} among your friends, so{' '}
          {unknown.length === 1 ? "it won't" : "they won't"} link to anyone.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  field: { gap: 7 },
  label: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text, letterSpacing: 0.1 },
  box: {
    minHeight: 104,
    maxHeight: 180,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: fonts.regular,
    color: colors.text,
  },
  boxFocused: { borderColor: colors.orange, backgroundColor: colors.white },
  boxError: { borderColor: colors.error },
  hint: { fontSize: 12.5, lineHeight: 17, fontFamily: fonts.regular, color: colors.textMuted },
  error: { fontSize: 12.5, lineHeight: 17, fontFamily: fonts.medium, color: colors.error },
  suggestions: {
    borderRadius: radius.field,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    overflow: 'hidden',
  },
  suggestion: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, height: 46 },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  suggestionName: { flex: 1, fontSize: 14.5, fontFamily: fonts.medium, color: colors.text },
  suggestionHandle: { fontSize: 13, fontFamily: fonts.regular, color: colors.textMuted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, height: 26, borderRadius: radius.pill, backgroundColor: colors.orangeSoft, justifyContent: 'center' },
  chipMuted: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border },
  chipText: { fontSize: 12.5, fontFamily: fonts.semibold, color: colors.orangeText },
  chipTextMuted: { color: colors.textMuted },
});
