import type {
  GiftTransaction,
  LeaderboardRow,
  LeaderboardUser,
  RankingCategory,
  RankingPeriod,
} from '../types';

/**
 * Leaderboard maths, kept free of UI so it can be checked on its own and
 * later swapped for get_leaderboard / get_my_rank.
 */

/** Only a receiver's confirmation counts, as ARCHITECTURE.md requires. */
export function isEligible(tx: GiftTransaction) {
  return tx.status === 'confirmed' && !tx.isTest && tx.confirmedAt !== null && tx.amountCents > 0;
}

/** Start of the current month in UTC, matching the backend's monthly view. */
export function startOfMonthUtc(now: Date) {
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
}

function inPeriod(tx: GiftTransaction, period: RankingPeriod, now: Date) {
  if (period === 'overall') return true;
  const at = Date.parse(tx.confirmedAt!);
  return at >= startOfMonthUtc(now) && at <= now.getTime();
}

type Options = {
  users: LeaderboardUser[];
  transactions: GiftTransaction[];
  category: RankingCategory;
  period: RankingPeriod;
  now?: Date;
};

/**
 * Ranked rows, highest first. Members who opted out or were excluded by a
 * moderator never appear, and people with nothing eligible aren't ranked.
 * Ties share a rank (1, 1, 3) and are ordered by alias so the list never
 * reshuffles between renders.
 */
export function computeLeaderboard({ users, transactions, category, period, now = new Date() }: Options) {
  const publicUsers = new Map(
    users.filter((u) => u.isLeaderboardVisible && !u.leaderboardExcluded).map((u) => [u.id, u]),
  );
  const cents = new Map<string, number>();
  const recipients = new Map<string, Set<string>>();

  for (const tx of transactions) {
    if (!publicUsers.has(tx.gifterId) || !isEligible(tx) || !inPeriod(tx, period, now)) continue;
    cents.set(tx.gifterId, (cents.get(tx.gifterId) ?? 0) + tx.amountCents);
    // A Set, so helping the same person twice still counts once.
    const helped = recipients.get(tx.gifterId) ?? new Set<string>();
    helped.add(tx.recipientId);
    recipients.set(tx.gifterId, helped);
  }

  const scored = [...publicUsers.values()]
    .map((user) => ({
      user,
      value: category === 'gifted' ? (cents.get(user.id) ?? 0) : (recipients.get(user.id)?.size ?? 0),
    }))
    .filter((row) => row.value > 0)
    .sort(
      (a, b) =>
        b.value - a.value ||
        a.user.alias.localeCompare(b.user.alias, 'en') ||
        a.user.id.localeCompare(b.user.id, 'en'),
    );

  const rows: LeaderboardRow[] = [];
  scored.forEach((row, i) => {
    const tied = i > 0 && scored[i - 1].value === row.value;
    rows.push({ ...row, rank: tied ? rows[i - 1].rank : i + 1 });
  });
  return rows;
}

export function findRow(rows: LeaderboardRow[], userId: string) {
  return rows.find((r) => r.user.id === userId) ?? null;
}
