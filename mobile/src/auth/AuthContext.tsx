import { createContext, use, useCallback, useEffect, useMemo, useState } from 'react';

import { ensureDemoAccount, generateAlias, type MyAccount } from '../api/account';
import { isOnline } from '../api/client';
import type { AuthUser } from './types';

/**
 * `connecting` while the demo account is created or restored, `failed` if
 * Supabase couldn't be reached, and `ready` otherwise.
 */
export type AuthStatus = 'connecting' | 'failed' | 'ready';

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
  /** The signed-in Supabase account; null when running on mock data. */
  account: MyAccount | null;
  setAccount: (account: MyAccount) => void;
  status: AuthStatus;
  retry: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

// An unreachable server can leave a request hanging, so give up and offer a retry.
const CONNECT_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

/** A local account for mock mode, named like a Supabase demo account. */
function createLocalUser(): AuthUser {
  const alias = generateAlias();
  return {
    id: 'local-user',
    email: '',
    username: alias.toLowerCase(),
    displayName: alias,
    intent: 'gifter',
  };
}

/**
 * Everyone gets an account automatically; there is no sign-in step. With
 * Supabase configured it's an anonymous Supabase account (see
 * ensureDemoAccount) that comes back on every visit. Without it, a local
 * account is made up on load and lasts until reload.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => (isOnline ? null : createLocalUser()));
  const [account, setAccountState] = useState<MyAccount | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isOnline ? 'connecting' : 'ready');
  const [attempt, setAttempt] = useState(0);

  const setAccount = useCallback((next: MyAccount) => {
    setAccountState(next);
    setUser(next.user);
  }, []);

  useEffect(() => {
    if (!isOnline) return;
    let cancelled = false;
    withTimeout(ensureDemoAccount(), CONNECT_TIMEOUT_MS)
      .then((next) => {
        if (cancelled) return;
        setAccount(next);
        setStatus('ready');
      })
      .catch(() => !cancelled && setStatus('failed'));
    return () => {
      cancelled = true;
    };
  }, [attempt, setAccount]);

  const retry = useCallback(() => {
    setStatus('connecting');
    setAttempt((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ user, setUser, account, setAccount, status, retry }),
    [user, account, setAccount, status, retry],
  );
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
