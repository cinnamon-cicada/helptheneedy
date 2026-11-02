import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MascotSignals } from '../../animation/poki/signals';
import type { AuthService, AuthUser } from '../../auth/types';
import { type LoginErrors, hasErrors, isEmail, validateLogin } from '../../auth/validation';
import { colors, fonts } from '../../theme';
import { PrimaryButton } from '../ui';
import { FormNotice, PasswordField, TextField, type TextInputInstance, fieldStyles } from './fields';

type Props = {
  service: AuthService;
  signals: MascotSignals;
  initialIdentifier?: string;
  onSignUp: (email?: string) => void;
  onAuthenticated: (user: AuthUser) => void;
};

type Notice = { kind: 'not_found' } | { kind: 'error'; message: string } | { kind: 'reset'; email: string };

/** Lets the celebration hop play before the screen changes. */
const CELEBRATE_MS = 900;

export function LoginForm({ service, signals, initialIdentifier = '', onSignUp, onAuthenticated }: Props) {
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busy, setBusy] = useState(false);
  const passwordRef = useRef<TextInputInstance>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  const glance = () => signals.emit('glance');

  const submit = async () => {
    if (busy) return;
    const found = validateLogin({ identifier, password });
    setErrors(found);
    setNotice(null);
    if (hasErrors(found)) {
      signals.emit('fail');
      return;
    }
    setBusy(true);
    const result = await service.signIn(identifier, password);
    if (result.ok) {
      signals.emit('success');
      doneTimer.current = setTimeout(() => onAuthenticated(result.user), CELEBRATE_MS);
      return;
    }
    setBusy(false);
    signals.emit('fail');
    if (result.error === 'account_not_found') setNotice({ kind: 'not_found' });
    else if (result.error === 'invalid_credentials') {
      setNotice({ kind: 'error', message: 'That email, username or password is incorrect.' });
    } else setNotice({ kind: 'error', message: 'Something went wrong. Please try again.' });
  };

  const forgot = async () => {
    const email = identifier.trim();
    if (!isEmail(email)) {
      setErrors({ identifier: 'Enter your email address to reset your password.' });
      setNotice(null);
      return;
    }
    setErrors({});
    await service.requestPasswordReset(email);
    setNotice({ kind: 'reset', email });
  };

  return (
    <View style={styles.form}>
      <TextField
        label="Email or username"
        value={identifier}
        onChangeText={(v) => {
          setIdentifier(v);
          if (errors.identifier) setErrors((e) => ({ ...e, identifier: undefined }));
        }}
        error={errors.identifier}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        onFocus={glance}
      />
      <View style={styles.passwordBlock}>
        <PasswordField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (errors.password) setErrors((e) => ({ ...e, password: undefined }));
          }}
          error={errors.password}
          placeholder="Your password"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
          onFocus={glance}
        />
        <Pressable
          onPress={forgot}
          hitSlop={10}
          accessibilityRole="link"
          style={({ pressed }) => [styles.forgot, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
      </View>

      {notice?.kind === 'not_found' ? (
        <FormNotice tone="info">
          <Text style={fieldStyles.noticeText}>We couldn&apos;t find an account with those details.</Text>
          <Pressable
            onPress={() => onSignUp(isEmail(identifier) ? identifier.trim() : undefined)}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={styles.noticeAction}>Create an account instead</Text>
          </Pressable>
        </FormNotice>
      ) : notice?.kind === 'error' ? (
        <FormNotice tone="error">
          <Text style={fieldStyles.noticeText}>{notice.message}</Text>
        </FormNotice>
      ) : notice?.kind === 'reset' ? (
        <FormNotice tone="info">
          <Text style={fieldStyles.noticeText}>
            If an account exists for {notice.email}, we&apos;ll send a link to reset your password.
          </Text>
        </FormNotice>
      ) : null}

      <PrimaryButton label={busy ? 'Logging in…' : 'Log in'} onPress={submit} disabled={busy} />

      <View style={styles.switchRow}>
        <Text style={styles.switchText}>New to poki?</Text>
        <Pressable onPress={() => onSignUp()} hitSlop={10} accessibilityRole="button">
          <Text style={styles.switchLink}>Sign up</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const authFormStyles = StyleSheet.create({
  switchRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 4 },
  switchText: { fontSize: 15, fontFamily: fonts.regular, color: colors.textMuted },
  switchLink: { fontSize: 15, fontFamily: fonts.bold, color: colors.orangeText },
});

const styles = StyleSheet.create({
  form: { gap: 18 },
  passwordBlock: { gap: 10 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 2 },
  forgotText: { fontSize: 14, fontFamily: fonts.semibold, color: colors.orangeText },
  noticeAction: { fontSize: 14, fontFamily: fonts.bold, color: colors.orangeText },
  ...authFormStyles,
});
