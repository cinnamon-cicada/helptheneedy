import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { MascotSignals } from '../../animation/poki/signals';
import type { AuthService, AuthUser, Intent } from '../../auth/types';
import {
  type SignupErrors,
  type SignupValues,
  hasErrors,
  normalizeUsername,
  validateSignup,
} from '../../auth/validation';
import { colors, fonts } from '../../theme';
import { Chip, PrimaryButton } from '../ui';
import { Checkbox, FormNotice, PasswordField, TextField, type TextInputInstance, fieldStyles } from './fields';
import { authFormStyles } from './LoginForm';
import { PaymentPlaceholders } from './PaymentPlaceholders';

type Props = {
  service: AuthService;
  signals: MascotSignals;
  initialEmail?: string;
  onLogIn: () => void;
  onAuthenticated: (user: AuthUser) => void;
  /** Lets the screen scroll back up so the first error is visible. */
  onInvalid?: () => void;
};

const INTENTS: { value: Intent; label: string }[] = [
  { value: 'gifter', label: 'Give' },
  { value: 'receiver', label: 'Receive' },
  { value: 'both', label: 'Both' },
];

/** Lets the mascot's happy hop (and its new bow) play before moving on. */
const CELEBRATE_MS = 1300;

export function SignupForm({ service, signals, initialEmail = '', onLogIn, onAuthenticated, onInvalid }: Props) {
  const [values, setValues] = useState<SignupValues>({
    fullName: '',
    username: '',
    email: initialEmail,
    backupEmail: '',
    password: '',
    confirmPassword: '',
    intent: null,
    isAdultConfirmed: false,
  });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [attempted, setAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [welcome, setWelcome] = useState<string | null>(null);
  const usernameRef = useRef<TextInputInstance>(null);
  const emailRef = useRef<TextInputInstance>(null);
  const backupEmailRef = useRef<TextInputInstance>(null);
  const passwordRef = useRef<TextInputInstance>(null);
  const confirmRef = useRef<TextInputInstance>(null);
  const doneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(doneTimer.current), []);

  const set = <K extends keyof SignupValues>(key: K, value: SignupValues[K]) => {
    const next = { ...values, [key]: value };
    setValues(next);
    // After the first submit, errors update live as fields are fixed.
    if (attempted) setErrors(validateSignup(next));
    else if (errors[key]) setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const glance = () => signals.emit('glance');

  const submit = async () => {
    if (busy || welcome) return;
    setAttempted(true);
    setFailure(null);
    const found = validateSignup(values);
    setErrors(found);
    if (hasErrors(found)) {
      signals.emit('fail');
      onInvalid?.();
      return;
    }
    setBusy(true);
    const result = await service.signUp({
      fullName: values.fullName,
      username: normalizeUsername(values.username),
      email: values.email,
      password: values.password,
      intent: values.intent as Intent,
      isAdultConfirmed: values.isAdultConfirmed,
      backupEmail: values.backupEmail.trim() || undefined,
    });
    setBusy(false);
    if (result.ok) {
      signals.emit('signup');
      setWelcome(result.user.displayName.split(' ')[0]);
      doneTimer.current = setTimeout(() => onAuthenticated(result.user), CELEBRATE_MS);
      return;
    }
    signals.emit('fail');
    onInvalid?.();
    if (result.error === 'email_taken') setErrors({ email: 'An account already uses this email. Try logging in.' });
    else if (result.error === 'username_taken') setErrors({ username: 'That username is taken.' });
    else if (result.error === 'must_be_adult') setErrors({ isAdultConfirmed: 'You must be 18 or older to use poki.' });
    else setFailure('Something went wrong. Please try again.');
  };

  return (
    <View style={styles.form}>
      <TextField
        label="Full name"
        value={values.fullName}
        onChangeText={(v) => set('fullName', v)}
        error={errors.fullName}
        placeholder="Alex Rivera"
        autoComplete="name"
        textContentType="name"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => usernameRef.current?.focus()}
        onFocus={glance}
      />
      <TextField
        ref={usernameRef}
        label="Username"
        value={values.username}
        onChangeText={(v) => set('username', v.toLowerCase())}
        error={errors.username}
        hint="Lowercase letters, numbers and underscores."
        placeholder="alex_r"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => emailRef.current?.focus()}
        onFocus={glance}
      />
      <TextField
        ref={emailRef}
        label="Email"
        value={values.email}
        onChangeText={(v) => set('email', v)}
        error={errors.email}
        placeholder="you@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => backupEmailRef.current?.focus()}
        onFocus={glance}
      />
      <TextField
        ref={backupEmailRef}
        label="Backup email (optional)"
        value={values.backupEmail}
        onChangeText={(v) => set('backupEmail', v)}
        error={errors.backupEmail}
        hint="For account recovery. Not saved yet: recovery contacts are coming soon."
        placeholder="another@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => passwordRef.current?.focus()}
        onFocus={glance}
      />
      <PasswordField
        ref={passwordRef}
        label="Password"
        value={values.password}
        onChangeText={(v) => set('password', v)}
        error={errors.password}
        hint="At least 8 characters."
        placeholder="Create a password"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="next"
        submitBehavior="submit"
        onSubmitEditing={() => confirmRef.current?.focus()}
        onFocus={glance}
      />
      <PasswordField
        ref={confirmRef}
        label="Confirm password"
        value={values.confirmPassword}
        onChangeText={(v) => set('confirmPassword', v)}
        error={errors.confirmPassword}
        placeholder="Type it again"
        autoComplete="new-password"
        textContentType="newPassword"
        returnKeyType="done"
        onFocus={glance}
      />

      <View style={styles.group}>
        <Text style={styles.groupLabel} nativeID="intent-label">
          How will you use poki?
        </Text>
        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabelledBy="intent-label">
          {INTENTS.map(({ value, label }) => (
            <Chip
              key={value}
              label={label}
              selected={values.intent === value}
              onPress={() => set('intent', value)}
              style={styles.chip}
            />
          ))}
        </View>
        {errors.intent ? <Text style={styles.error}>{errors.intent}</Text> : null}
      </View>

      <Checkbox
        label="I'm 18 or older"
        checked={values.isAdultConfirmed}
        onChange={(v) => set('isAdultConfirmed', v)}
        error={errors.isAdultConfirmed}
      />

      <View style={styles.divider} />
      <PaymentPlaceholders />
      <View style={styles.divider} />

      {failure ? (
        <FormNotice tone="error">
          <Text style={fieldStyles.noticeText}>{failure}</Text>
        </FormNotice>
      ) : null}
      {welcome ? (
        <FormNotice tone="info">
          <Text style={fieldStyles.noticeText}>Welcome to poki, {welcome}!</Text>
        </FormNotice>
      ) : null}

      <PrimaryButton
        label={busy ? 'Creating account…' : welcome ? 'Account created' : 'Create account'}
        onPress={submit}
        disabled={busy || !!welcome}
      />

      <View style={authFormStyles.switchRow}>
        <Text style={authFormStyles.switchText}>Already have an account?</Text>
        <Pressable onPress={onLogIn} hitSlop={10} accessibilityRole="button">
          <Text style={authFormStyles.switchLink}>Log in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: 18 },
  group: { gap: 9 },
  groupLabel: { fontSize: 13.5, fontFamily: fonts.semibold, color: colors.text, letterSpacing: 0.1 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flex: 1 },
  error: { fontSize: 12.5, lineHeight: 17, color: colors.error, fontFamily: fonts.medium },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 4 },
});
