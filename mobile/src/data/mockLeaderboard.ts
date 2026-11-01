import { computeLeaderboard, findRow, startOfMonthUtc } from '../leaderboard/ranking';
import type { AliasAvatarSpec, AvatarIcon, GiftStatus, GiftTransaction, LeaderboardUser, MyRank } from '../types';
import { MOCK_PROFILE } from './mockProfile';

export const MY_LEADERBOARD_ID = 'me';

/** Warm pairs, with a little muted contrast, for illustrated avatars. */
const PALETTES: [string, string][] = [
  ['#FDE7C2', '#C9852B'],
  ['#FCE0CF', '#C8623A'],
  ['#FBEFC5', '#B88A16'],
  ['#F8E3D8', '#A8573C'],
  ['#E4EEDF', '#5E7F57'],
  ['#E2EAF3', '#56708F'],
  ['#F6E6EE', '#9A5571'],
];

const icon = (name: AvatarIcon, palette: number): AliasAvatarSpec => ({
  kind: 'icon',
  icon: name,
  background: PALETTES[palette][0],
  foreground: PALETTES[palette][1],
});

/** [gifts, total cents, distinct people] for one stretch of time. */
type Spend = [count: number, cents: number, people: number];

type Seed = {
  id: string;
  alias: string;
  avatar: AliasAvatarSpec;
  thisMonth: Spend;
  earlier: Spend;
  isLeaderboardVisible?: boolean;
  leaderboardExcluded?: boolean;
};

// Sized so Most Gifted and Most Helped, and Monthly and Overall, all rank
// people differently: big single gifts versus many small ones.
const SEEDS: Seed[] = [
  { id: 'k1', alias: 'KindSoul', avatar: icon('sun', 0), thisMonth: [4, 21000, 3], earlier: [10, 64000, 8] },
  { id: 'k2', alias: 'MysteryStar', avatar: icon('star', 5), thisMonth: [6, 18000, 6], earlier: [12, 41000, 10] },
  { id: 'k3', alias: 'GiftNinja', avatar: icon('gift', 1), thisMonth: [5, 12500, 5], earlier: [20, 52000, 17] },
  { id: 'k4', alias: 'CoffeeAngel', avatar: icon('coffee', 3), thisMonth: [11, 11000, 9], earlier: [15, 22000, 12] },
  { id: 'k5', alias: 'MoonGiver', avatar: icon('moon', 5), thisMonth: [7, 9800, 7], earlier: [30, 70000, 21] },
  { id: 'k6', alias: 'SunnySoul', avatar: icon('flower', 2), thisMonth: [12, 8700, 11], earlier: [9, 12000, 7] },
  { id: 'k7', alias: 'KindByte', avatar: icon('heart', 6), thisMonth: [5, 7600, 4], earlier: [14, 30000, 9] },
  { id: 'k8', alias: 'PeachHelper', avatar: icon('cherry', 1), thisMonth: [16, 6500, 15], earlier: [25, 18000, 19] },
  { id: 'k9', alias: 'GoodVibes', avatar: icon('music', 4), thisMonth: [14, 5400, 13], earlier: [40, 26000, 33] },
  { id: 'k10', alias: 'GivingTree', avatar: icon('leaf', 4), thisMonth: [3, 4200, 2], earlier: [8, 25000, 6] },
  { id: 'k11', alias: 'ChaiAndKindness', avatar: icon('coffee', 0), thisMonth: [6, 3900, 5], earlier: [6, 9000, 5] },
  { id: 'k12', alias: 'LuckyPenny', avatar: icon('sparkles', 2), thisMonth: [9, 3600, 8], earlier: [4, 3000, 4] },
  { id: 'k13', alias: 'MapleMornings', avatar: icon('feather', 3), thisMonth: [2, 3300, 2], earlier: [18, 34000, 14] },
  { id: 'k14', alias: 'QuietComet', avatar: icon('star', 6), thisMonth: [3, 3000, 3], earlier: [3, 4500, 3] },
  { id: 'k15', alias: 'BrightBasil', avatar: icon('sprout', 4), thisMonth: [4, 2800, 4], earlier: [10, 16000, 9] },
  { id: 'k16', alias: 'HoneyHarbor', avatar: icon('bird', 0), thisMonth: [5, 2500, 5], earlier: [2, 2000, 2] },
  {
    id: MY_LEADERBOARD_ID,
    alias: MOCK_PROFILE.username,
    avatar: { kind: 'photo', uri: MOCK_PROFILE.avatarUrl },
    // Overall adds up to the Profile screen's lifetime totals: $210, 12 people.
    thisMonth: [4, 2300, 3],
    earlier: [9, 18700, 9],
  },
  { id: 'k17', alias: 'PaperLantern', avatar: icon('cloud', 5), thisMonth: [2, 1800, 2], earlier: [5, 6000, 4] },
  { id: 'k18', alias: 'TangerineTom', avatar: icon('cookie', 1), thisMonth: [1, 1200, 1], earlier: [0, 0, 0] },
  { id: 'k19', alias: 'SoftSundays', avatar: icon('cloud', 2), thisMonth: [0, 0, 0], earlier: [7, 8800, 6] },
  { id: 'k20', alias: 'CloverCoast', avatar: icon('leaf', 0), thisMonth: [3, 900, 3], earlier: [1, 500, 1] },
  // Would top the monthly board, but opted out of public rankings.
  {
    id: 'k21',
    alias: 'GoldenHour',
    avatar: icon('sun', 2),
    thisMonth: [8, 25000, 7],
    earlier: [6, 20000, 6],
    isLeaderboardVisible: false,
  },
  // Taken off the boards by a moderator.
  {
    id: 'k22',
    alias: 'WarmToast',
    avatar: icon('cookie', 3),
    thisMonth: [9, 24000, 9],
    earlier: [3, 6000, 3],
    leaderboardExcluded: true,
  },
];

const DAY = 24 * 60 * 60 * 1000;

function createRandom(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Splits `total` cents into `count` uneven whole-dollar-ish gifts that add up exactly. */
function split(total: number, count: number, rand: () => number) {
  const weights = Array.from({ length: count }, () => 0.5 + rand());
  const sum = weights.reduce((a, b) => a + b, 0);
  const parts = weights.map((w) => Math.max(100, Math.round((total * w) / sum / 100) * 100));
  parts[parts.length - 1] += total - parts.reduce((a, b) => a + b, 0);
  return parts;
}

function buildTransactions(now: Date): GiftTransaction[] {
  const rand = createRandom(42);
  const monthStart = startOfMonthUtc(now);
  const sinceMonthStart = Math.max(0, now.getTime() - monthStart);
  const txs: GiftTransaction[] = [];
  let n = 0;

  const add = (gifterId: string, recipientId: string, amountCents: number, at: number, status: GiftStatus = 'confirmed', isTest = false) => {
    txs.push({
      id: `tx${++n}`,
      gifterId,
      recipientId,
      amountCents,
      status,
      confirmedAt: status === 'confirmed' ? new Date(at).toISOString() : null,
      isTest,
    });
  };

  for (const seed of SEEDS) {
    let nextRecipient = 0;
    const spend = ([count, cents, people]: Spend, when: () => number) => {
      if (count === 0) return;
      const first = nextRecipient;
      nextRecipient += people;
      // Everyone in the group gets at least one gift; extras repeat people.
      split(cents, count, rand).forEach((amount, i) => {
        add(seed.id, `${seed.id}-r${first + (i % people)}`, amount, when());
      });
    };
    spend(seed.thisMonth, () => monthStart + rand() * sinceMonthStart);
    spend(seed.earlier, () => monthStart - DAY * (1 + rand() * 400));
  }

  // Ineligible gifts that would change the order if they were counted.
  const recent = monthStart + sinceMonthStart / 2;
  add('k3', 'k3-x1', 30000, recent, 'cancelled');
  add('k1', 'k1-x1', 15000, recent, 'disputed');
  add(MY_LEADERBOARD_ID, 'me-x1', 50000, recent, 'pending');
  add('k8', 'k8-x1', 40000, recent, 'confirmed', true);
  for (let i = 0; i < 20; i++) add('k20', `k20-x${i}`, 500, recent, 'cancelled');

  return txs;
}

export const LEADERBOARD_USERS: LeaderboardUser[] = SEEDS.map((s) => ({
  id: s.id,
  alias: s.alias,
  avatar: s.avatar,
  isLeaderboardVisible: s.isLeaderboardVisible ?? true,
  leaderboardExcluded: s.leaderboardExcluded ?? false,
}));

export const MOCK_TRANSACTIONS = buildTransactions(new Date());

/** The Profile screen's Your Rank card: Most Gifted this month. */
export function getMyRank(): MyRank {
  const rows = computeLeaderboard({
    users: LEADERBOARD_USERS,
    transactions: MOCK_TRANSACTIONS,
    category: 'gifted',
    period: 'monthly',
  });
  return { rank: findRow(rows, MY_LEADERBOARD_ID)?.rank ?? null, category: 'Most Gifted', period: 'Monthly' };
}
