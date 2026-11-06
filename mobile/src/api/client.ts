import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';

import { supabase } from '../lib/supabase';

/** True when the app talks to Supabase; false means it runs on mock data. */
export const isOnline = supabase !== null;

export function db(): SupabaseClient {
  if (!supabase) throw new ApiError('not_configured');
  return supabase;
}

/** Errors carry the backend's stable code, such as `invalid_amount` or `rate_limited`. */
export class ApiError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

// RPCs raise their code as the whole message; anything else is a network or server problem.
const CODE = /^[a-z_]+$/;

export function toApiError(error: PostgrestError | Error | null | undefined): ApiError {
  const message = error?.message ?? '';
  return new ApiError(CODE.test(message) ? message : 'network');
}

/** Calls an RPC and throws an ApiError on failure. */
export async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(name, args);
  if (error) throw toApiError(error);
  return data as T;
}
