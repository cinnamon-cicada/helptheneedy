/** Mirrors the backend `user_intent` enum. */
export type Intent = 'gifter' | 'receiver' | 'both';

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  intent: Intent;
};

export type SignUpInput = {
  /** Saved as `display_name`. */
  fullName: string;
  username: string;
  email: string;
  password: string;
  intent: Intent;
  /** `complete_onboarding` rejects users who don't confirm this. */
  isAdultConfirmed: boolean;
  /** Client-side only: the backend has no column for it yet, so it is never sent. */
  backupEmail?: string;
};

export type AuthErrorCode =
  | 'invalid_credentials'
  /** Only returned when the backend can safely confirm it; the UI then offers signup. */
  | 'account_not_found'
  | 'email_taken'
  | 'username_taken'
  | 'must_be_adult'
  | 'network';

export type AuthResult = { ok: true; user: AuthUser } | { ok: false; error: AuthErrorCode };

/**
 * Everything the auth screens need. The prototype uses `mockAuthService`;
 * a Supabase implementation can replace it without touching the UI.
 */
export interface AuthService {
  /** `identifier` is an email address or a username. */
  signIn(identifier: string, password: string): Promise<AuthResult>;
  signUp(input: SignUpInput): Promise<AuthResult>;
  /** Always resolves the same way, so it never reveals whether an account exists. */
  requestPasswordReset(email: string): Promise<void>;
}
