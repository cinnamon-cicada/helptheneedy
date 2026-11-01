import type { AuthResult, AuthService, AuthUser, SignUpInput } from './types';

type StoredUser = AuthUser & { password: string };

const LATENCY_MS = 650;

/** Seeded so the login flow can be tried without signing up first. */
const SEED_USERS: StoredUser[] = [
  {
    id: 'mock-user-1',
    email: 'demo@poki.app',
    username: 'demo',
    displayName: 'Demo Gifter',
    intent: 'both',
    password: 'password123',
  },
];

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function publicUser({ password: _password, ...user }: StoredUser): AuthUser {
  return user;
}

/**
 * In-memory stand-in for Supabase Auth. Accounts last until the app reloads.
 * Unlike a real backend, it reports `account_not_found` so the
 * "no account, sign up instead" path can be exercised.
 */
export function createMockAuthService(latencyMs = LATENCY_MS): AuthService {
  const users: StoredUser[] = SEED_USERS.map((u) => ({ ...u }));
  let nextId = users.length + 1;

  const findByIdentifier = (identifier: string) => {
    const key = identifier.trim().replace(/^@/, '').toLowerCase();
    return users.find((u) => u.email === key || u.username === key);
  };

  return {
    async signIn(identifier, password): Promise<AuthResult> {
      await wait(latencyMs);
      const user = findByIdentifier(identifier);
      if (!user) return { ok: false, error: 'account_not_found' };
      if (user.password !== password) return { ok: false, error: 'invalid_credentials' };
      return { ok: true, user: publicUser(user) };
    },

    async signUp(input: SignUpInput): Promise<AuthResult> {
      await wait(latencyMs);
      const email = input.email.trim().toLowerCase();
      const username = input.username.trim().toLowerCase();
      if (!input.isAdultConfirmed) return { ok: false, error: 'must_be_adult' };
      if (users.some((u) => u.email === email)) return { ok: false, error: 'email_taken' };
      if (users.some((u) => u.username === username)) return { ok: false, error: 'username_taken' };

      // backupEmail is deliberately dropped: there is nowhere to store it yet.
      const user: StoredUser = {
        id: `mock-user-${nextId++}`,
        email,
        username,
        displayName: input.fullName.trim(),
        intent: input.intent,
        password: input.password,
      };
      users.push(user);
      return { ok: true, user: publicUser(user) };
    },

    async requestPasswordReset() {
      await wait(latencyMs);
    },
  };
}
