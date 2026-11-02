import { Check, Eye, EyeOff } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';

import { colors, fonts, ICON_STROKE, radius } from '../../theme';

export type TextInputInstance = React.ComponentRef<typeof TextInput>;

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  error?: string;
  hint?: string;
  accessory?: React.ReactNode;
  ref?: React.Ref<TextInputInstance>;
};

/** Labelled input with focus and inline error states. */
export function TextField({ label, error, hint, accessory, onFocus, onBlur, ref, ...input }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  const message = error ?? hint;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError]}>
        <TextInput
          ref={ref}
          style={styles.input}
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
          {...input}
        />
        {accessory}
      </View>
      {message ? (
        <Text style={error ? styles.error : styles.hint} accessibilityLiveRegion={error ? 'polite' : 'none'}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

/** Password input with a show/hide toggle. */
export function PasswordField(props: Omit<TextFieldProps, 'secureTextEntry' | 'accessory'>) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <TextField
      {...props}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      accessory={
        <Pressable
          onPress={() => setVisible((v) => !v)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          style={({ pressed }) => [styles.accessory, pressed && { opacity: 0.6 }]}
        >
          <Icon size={20} color={colors.textMuted} strokeWidth={ICON_STROKE} />
        </Pressable>
      }
    />
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
  error,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}) {
  return (
    <View style={styles.field}>
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityHint={error}
        hitSlop={6}
        style={styles.checkRow}
      >
        <View style={[styles.checkBox, checked && styles.checkBoxOn, !!error && !checked && styles.boxError]}>
          {checked ? <Check size={15} color={colors.text} strokeWidth={2.4} /> : null}
        </View>
        <Text style={styles.checkLabel}>{label}</Text>
      </Pressable>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

/** Form-level message, e.g. a failed login. */
export function FormNotice({
  tone,
  children,
}: {
  tone: 'error' | 'info';
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.notice, tone === 'error' ? styles.noticeError : styles.noticeInfo]} accessibilityLiveRegion="polite">
      {children}
    </View>
  );
}

export const fieldStyles = StyleSheet.create({
  noticeText: { fontSize: 14, fontFamily: fonts.regular, lineHeight: 20, color: colors.text },
});

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text, letterSpacing: 0.1 },
  box: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.field,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingLeft: 16,
    paddingRight: 6,
  },
  boxFocused: { borderColor: colors.orange, backgroundColor: colors.white },
  boxError: { borderColor: colors.error },
  input: { flex: 1, height: '100%', fontSize: 16, fontFamily: fonts.regular, color: colors.text, paddingRight: 10 },
  accessory: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  hint: { fontSize: 12.5, fontFamily: fonts.regular, lineHeight: 17, color: colors.textMuted },
  error: { fontSize: 12.5, lineHeight: 17, color: colors.error, fontFamily: fonts.medium },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 2 },
  checkBox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxOn: { backgroundColor: colors.orange, borderColor: colors.orange },
  checkLabel: { flex: 1, fontSize: 15, fontFamily: fonts.regular, color: colors.text },
  notice: { borderRadius: radius.field, paddingHorizontal: 14, paddingVertical: 12, gap: 8 },
  noticeError: { backgroundColor: colors.errorSoft },
  noticeInfo: { backgroundColor: colors.orangeSoft },
});
