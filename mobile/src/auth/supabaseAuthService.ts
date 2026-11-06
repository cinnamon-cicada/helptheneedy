import { ApiError, db, rpc } from '../api/client';
import type { AuthErrorCode, AuthResult, AuthService, AuthUser, Intent, SignUpInput } from './types';

type ProfileRow = { id: string; username: string | null; display_name: string | null; intent: Intent | null };

async function currentUser(email: string): Promise<AuthUser> {
  const rows = await rpc<ProfileRow[]>('get_my_profile');
  const row = rows[0];
  return {
    id: row.id,
    email,
    username: row.username ?? '',
    displayName: row.display_name ?? '',
    intent: row.intent ?? 'gifter',
  };
}

function fail(error: AuthErrorCode): AuthResult {
  return { ok: false, error };
}

/**
 * Email and password accounts in Supabase Auth, behind the same interface the
 * auth screens use. The demo signs people in anonymously instead (see
 * api/account.ts), so no screen uses this yet.
 */
export const supabaseAuthService: AuthService = {
  async signIn(identifier, password) {
    // Supabase signs in by email. Looking an email up from a username would
    // reveal who has an account, so usernames are treated as wrong credentials.
    const email = identifier.trim().toLowerCase();
    if (!email.includes('@')) return fail('invalid_credentials');
    const { error } = await db().auth.signInWithPassword({ email, password });
    if (error) return fail(error.status && error.status < 500 ? 'invalid_credentials' : 'network');
    try {
      return { ok: true, user: await currentUser(email) };
    } catch {
      return fail('network');
    }
  },

  async signUp(input: SignUpInput) {
    if (!input.isAdultConfirmed) return fail('must_be_adult');
    const email = input.email.trim().toLowerCase();
    const { data, error } = await db().auth.signUp({ email, password: input.password });
    if (error) return fail(error.code === 'user_already_exists' ? 'email_taken' : 'network');
    // With email confirmation on, there is no session until the link is opened.
    if (!data.session) return fail('network');
    try {
      await rpc('complete_onboarding', {
        p_username: input.username.trim().toLowerCase(),
        p_display_name: input.fullName.trim(),
        p_intent: input.intent,
        p_is_adult_confirmed: true,
      });
      return { ok: true, user: await currentUser(email) };
    } catch (e) {
      const code = e instanceof ApiError ? e.code : 'network';
      return fail(code === 'username_taken' || code === 'must_be_adult' ? code : 'network');
    }
  },

  async requestPasswordReset(email) {
    // Resolves the same way whatever happens, so it never reveals whether an account exists.
    await db().auth.resetPasswordForEmail(email.trim().toLowerCase()).catch(() => undefined);
  },
};
