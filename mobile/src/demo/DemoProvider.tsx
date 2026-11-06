import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { getMyAccount, type MyAccount, updateMyAccount } from '../api/account';
import { ApiError, isOnline } from '../api/client';
import { fetchMyGifts, sendDemoGift, type SentGift } from '../api/gifts';
import { useAuth } from '../auth/AuthContext';
import { MOCK_PROFILE } from '../data/mockProfile';
import type { GiftRequest } from '../types';
import { readJson, removeKey, writeJson } from './storage';

/**
 * Demo mode. The balance is play money kept on this device only: it is never
 * sent to Supabase, and no real payment happens.
 *
 * With Supabase configured, every gift is logged in the `gifts` table first,
 * and the balance goes down only if that succeeds. The account's profile and
 * gift history are then fetched again and kept here too, so the app opens
 * with them straight away. Without Supabase, everything stays on the device.
 */
const STORAGE_KEY = 'htn.demo.v2';
const VERSION = 2;
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
  /** The Supabase account this balance belongs to; null offline. */
  accountId: string | null;
  profile: DemoProfile;
  balanceCents: number;
  gifts: DemoGift[];
  /** Confirmed total from the backend; null offline. */
  giftedCents: number | null;
};

export type GiftResult = { ok: true } | { ok: false; error: string };

function defaults(accountId: string | null = null): Saved {
  return {
    version: VERSION,
    accountId,
    profile: { username: MOCK_PROFILE.username, avatarUrl: MOCK_PROFILE.avatarUrl },
    balanceCents: STARTING_BALANCE_CENTS,
    gifts: [],
    giftedCents: null,
  };
}

function load(): Saved {
  const saved = readJson<Saved>(STORAGE_KEY);
  // Drop data saved in an older shape instead of guessing at it.
  if (!saved || saved.version !== VERSION || !Number.isInteger(saved.balanceCents)) return defaults();
  return saved;
}

const toDemoGift = (g: SentGift): DemoGift => ({
  id: g.id,
  requestId: g.postId ?? g.id,
  recipientId: g.recipientId,
  recipientName: g.recipientName,
  amountCents: g.amountCents,
  anonymous: g.anonymous,
  at: g.at,
});

type DemoContextValue = Saved & {
  online: boolean;
  /** Goes up after every gift, so screens that show backend totals know to fetch again. */
  revision: number;
  updateProfile: (edits: DemoProfile) => Promise<void>;
  /** Changes nothing, and says why, if the amount is invalid, above the balance, or the backend refuses it. */
  sendGift: (request: GiftRequest, amountCents: number, anonymous: boolean) => Promise<GiftResult>;
  /** Puts the balance back to $1,000. Online, the account and its gifts stay. */
  resetDemo: () => void;
};

const DemoContext = createContext<DemoContextValue | null>(null);

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const { account, setAccount } = useAuth();
  // Storage is synchronous, so the saved balance is there on the first frame.
  const [state, setState] = useState<Saved>(load);
  const [revision, setRevision] = useState(0);
  const sending = useRef(false);

  useEffect(() => writeJson(STORAGE_KEY, state), [state]);

  const accountId = account?.user.id ?? null;

  const apply = useCallback(
    (me: MyAccount, gifts: SentGift[]) => {
      setAccount(me);
      setState((s) =>
        s.accountId !== me.user.id
          ? s
          : {
              ...s,
              profile: { username: me.user.displayName, avatarUrl: me.avatarUrl ?? s.profile.avatarUrl },
              gifts: gifts.map(toDemoGift),
              giftedCents: me.giftedCents,
            },
      );
    },
    [setAccount],
  );

  const refresh = useCallback(async () => {
    if (!accountId) return;
    const [me, gifts] = await Promise.all([getMyAccount(), fetchMyGifts(accountId)]);
    apply(me, gifts);
  }, [accountId, apply]);

  // A new account starts with a fresh $1,000; the same account keeps its balance.
  if (accountId && state.accountId !== accountId) setState(defaults(accountId));

  useEffect(() => {
    if (!accountId) return;
    let cancelled = false;
    Promise.all([getMyAccount(), fetchMyGifts(accountId)])
      .then(([me, gifts]) => !cancelled && apply(me, gifts))
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [accountId, apply]);

  const updateProfile = useCallback(
    async (profile: DemoProfile) => {
      setState((s) => ({ ...s, profile }));
      if (!isOnline || !accountId) return;
      const me = await updateMyAccount({ displayName: profile.username, avatarUrl: profile.avatarUrl });
      setAccount(me);
      setState((s) => ({ ...s, profile: { username: me.user.displayName, avatarUrl: me.avatarUrl ?? profile.avatarUrl } }));
    },
    [accountId, setAccount],
  );

  const sendGift = useCallback(
    async (request: GiftRequest, amountCents: number, anonymous: boolean): Promise<GiftResult> => {
      if (!Number.isInteger(amountCents) || amountCents <= 0) return { ok: false, error: 'invalid_amount' };
      if (amountCents > state.balanceCents) return { ok: false, error: 'insufficient_balance' };
      if (sending.current) return { ok: false, error: 'busy' };

      if (!isOnline) {
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
        return { ok: true };
      }

      sending.current = true;
      try {
        await sendDemoGift(request.id, amountCents, anonymous);
      } catch (e) {
        return { ok: false, error: e instanceof ApiError ? e.code : 'network' };
      } finally {
        sending.current = false;
      }
      setState((s) => ({ ...s, balanceCents: s.balanceCents - amountCents }));
      setRevision((n) => n + 1);
      // The gift is saved; a failed refresh only delays the new totals.
      refresh().catch(() => undefined);
      return { ok: true };
    },
    [state.balanceCents, refresh],
  );

  const resetDemo = useCallback(() => {
    if (!isOnline) {
      removeKey(STORAGE_KEY);
      setState(defaults());
      return;
    }
    setState((s) => ({ ...s, balanceCents: STARTING_BALANCE_CENTS }));
  }, []);

  const value = useMemo(
    () => ({ ...state, online: isOnline, revision, updateProfile, sendGift, resetDemo }),
    [state, revision, updateProfile, sendGift, resetDemo],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const value = useContext(DemoContext);
  if (!value) throw new Error('useDemo must be used inside DemoProvider');
  return value;
}
