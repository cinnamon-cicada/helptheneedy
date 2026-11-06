import { useEffect, useMemo, useState } from 'react';

import { type Board, fetchBoard } from '../api/leaderboard';
import { useAuth } from '../auth/AuthContext';
import { LEADERBOARD_USERS, MOCK_TRANSACTIONS, MY_LEADERBOARD_ID } from '../data/mockLeaderboard';
import { useDemo } from '../demo/DemoProvider';
import type { RankingCategory, RankingPeriod } from '../types';
import { computeLeaderboard, findRow } from './ranking';

export type BoardState = Board & { myId: string; loading: boolean };

const cache = new Map<string, Board>();

/**
 * A leaderboard from Supabase when it's configured, fetched again after each
 * of your gifts; otherwise computed from mock data. The last board fetched is
 * kept for this session, so switching tabs doesn't flash empty.
 */
export function useBoard(category: RankingCategory, period: RankingPeriod): BoardState {
  const { online, revision } = useDemo();
  const { account } = useAuth();
  const myId = account?.user.id ?? null;
  const key = `${myId}:${category}:${period}`;
  const [fetched, setFetched] = useState<{ key: string; board: Board | null } | null>(null);
  const board = (fetched?.key === key ? fetched.board : null) ?? cache.get(key) ?? null;

  const mock = useMemo(() => {
    if (online) return null;
    const rows = computeLeaderboard({ users: LEADERBOARD_USERS, transactions: MOCK_TRANSACTIONS, category, period });
    return { rows, me: findRow(rows, MY_LEADERBOARD_ID) };
  }, [online, category, period]);

  useEffect(() => {
    if (!online || !myId) return;
    let cancelled = false;
    fetchBoard(category, period, myId)
      .then((next) => {
        cache.set(key, next);
        if (!cancelled) setFetched({ key, board: next });
      })
      .catch(() => !cancelled && setFetched({ key, board: null }));
    return () => {
      cancelled = true;
    };
  }, [online, myId, key, category, period, revision]);

  if (mock) return { ...mock, myId: MY_LEADERBOARD_ID, loading: false };
  return {
    rows: board?.rows ?? [],
    me: board?.me ?? null,
    myId: myId ?? '',
    loading: !board && fetched?.key !== key,
  };
}
