import { createContext, use, useMemo, useState } from 'react';

import type { AuthUser } from './types';

type AuthState = {
  user: AuthUser | null;
  setUser: (user: AuthUser | null) => void;
};

const AuthContext = createContext<AuthState | null>(null);

/** In-memory session for the prototype; it resets when the app reloads. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const value = useMemo(() => ({ user, setUser }), [user]);
  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth() {
  const auth = use(AuthContext);
  if (!auth) throw new Error('useAuth must be used inside AuthProvider');
  return auth;
}
