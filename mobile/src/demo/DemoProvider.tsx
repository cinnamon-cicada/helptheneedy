import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { MOCK_PROFILE } from '../data/mockProfile';
import type { GiftRequest } from '../types';
import { readJson, removeKey, writeJson } from './storage';

/**
 * Demo mode. The balance is play money that exists only on this device: it is
 * never sent to Supabase, and no real payment happens.
 */
const STORAGE_KEY = 'htn.demo.v1';
const VERSION = 1;
export const STARTING_BALANCE_CENTS = 100_000;

export type DemoProfile = { username: string; avatarUrl: string };

export type DemoGift = {
  id: string;
  requestId: string;
  recipientId: string;
  recipientName: string;
  amountCents: number;
  anonymous: boolean;
  /** Epoch milliseconds. */
  at: number;
};

type Saved = {
  version: typeof VERSION;
  profile: DemoProfile;
  balanceCents: number;
  gifts: DemoGift[];
};

function defaults(): Saved {
  return {
    version: VERSION,
    profile: { username: MOCK_PROFILE.username, avatarUrl: MOCK_PROFILE.avatarUrl },
    balanceCents: STARTING_BALANCE_CENTS,
    gifts: [],
  };
}

function load(): Saved {
  const saved = readJson<Saved>(STORAGE_KEY);
  // Drop data saved in an older shape instead of guessing at it.
  if (!saved || saved.version !== VERSION || !Number.isInteger(saved.balanceCents)) return defaults();
  return saved;
}

type DemoContextValue = Saved & {
  updateProfile: (edits: DemoProfile) => void;
  /** Returns false, and changes nothing, if the amount isn't valid or is above the balance. */
  sendGift: (request: GiftRequest, amountCents: number, anonymous: boolean) => boolean;
  resetDemo: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  // Storage is synchronous, so the saved balance is there on the first frame.
  const [state, setState] = useState<Saved>(load);

  useEffect(() => writeJson(STORAGE_KEY, state), [state]);

  const updateProfile = useCallback((profile: DemoProfile) => setState((s) => ({ ...s, profile })), []);

  const sendGift = useCallback(
    (request: GiftRequest, amountCents: number, anonymous: boolean) => {
      if (!Number.isInteger(amountCents) || amountCents <= 0 || amountCents > state.balanceCents) return false;
      const gift: DemoGift = {
        id: `demo-${Date.now()}`,
        requestId: request.id,
        recipientId: request.recipient.id,
        recipientName: request.recipient.displayName,
        amountCents,
        anonymous,
        at: Date.now(),
      };
      setState((s) => ({ ...s, balanceCents: s.balanceCents - amountCents, gifts: [gift, ...s.gifts] }));
      return true;
    },
    [state.balanceCents],
  );

  const resetDemo = useCallback(() => {
    removeKey(STORAGE_KEY);
    setState(defaults());
  }, []);

  const value = useMemo(
    () => ({ ...state, updateProfile, sendGift, resetDemo }),
    [state, updateProfile, sendGift, resetDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo must be used inside DemoProvider');
  return value;
}
