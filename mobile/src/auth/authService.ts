import { createMockAuthService } from './mockAuthService';
import type { AuthService } from './types';

/**
 * The service the app uses. Swap this for a Supabase-backed implementation
 * of `AuthService` (src/lib/supabase.ts) when the backend is wired up.
 */
export const authService: AuthService = createMockAuthService();
