// Rules match the `profiles` constraints in supabase/migrations so the
// client never accepts something the backend would reject.

export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;
export const DISPLAY_NAME_MAX = 80;
export const PASSWORD_MIN = 8;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export function normalizeUsername(value: string): string {
  return value.trim().replace(/^@/, '').toLowerCase();
}

export type LoginValues = { identifier: string; password: string };
export type LoginErrors = Partial<Record<keyof LoginValues, string>>;

export function validateLogin(values: LoginValues): LoginErrors {
  const errors: LoginErrors = {};
  if (!values.identifier.trim()) errors.identifier = 'Enter your email or username.';
  if (!values.password) errors.password = 'Enter your password.';
  return errors;
}

export type SignupValues = {
  fullName: string;
  username: string;
  email: string;
  backupEmail: string;
  password: string;
  confirmPassword: string;
  intent: string | null;
  isAdultConfirmed: boolean;
};
export type SignupErrors = Partial<Record<keyof SignupValues, string>>;

export function validateSignup(values: SignupValues): SignupErrors {
  const errors: SignupErrors = {};

  const name = values.fullName.trim();
  if (!name) errors.fullName = 'Enter your name.';
  else if (name.length > DISPLAY_NAME_MAX) errors.fullName = `Use ${DISPLAY_NAME_MAX} characters or fewer.`;

  const username = normalizeUsername(values.username);
  if (!username) errors.username = 'Choose a username.';
  else if (username.length < 3 || username.length > 30) errors.username = 'Use 3 to 30 characters.';
  else if (!USERNAME_PATTERN.test(username)) {
    errors.username = 'Use lowercase letters, numbers and underscores only.';
  }

  if (!values.email.trim()) errors.email = 'Enter your email.';
  else if (!isEmail(values.email)) errors.email = 'Enter a valid email address.';

  const backup = values.backupEmail.trim();
  if (backup) {
    if (!isEmail(backup)) errors.backupEmail = 'Enter a valid email address, or leave this blank.';
    else if (backup.toLowerCase() === values.email.trim().toLowerCase()) {
      errors.backupEmail = 'Use a different address from your main email.';
    }
  }

  if (!values.password) errors.password = 'Create a password.';
  else if (values.password.length < PASSWORD_MIN) errors.password = `Use at least ${PASSWORD_MIN} characters.`;

  if (!values.confirmPassword) errors.confirmPassword = 'Confirm your password.';
  else if (values.confirmPassword !== values.password) errors.confirmPassword = "Passwords don't match.";

  if (!values.intent) errors.intent = 'Choose how you will use poki.';
  if (!values.isAdultConfirmed) errors.isAdultConfirmed = 'You must be 18 or older to use poki.';

  return errors;
}

export function hasErrors(errors: object): boolean {
  return Object.values(errors).some(Boolean);
}
