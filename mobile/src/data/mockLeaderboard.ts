import type { LeaderboardEntry, MyRank } from '../types';

export const MY_LEADERBOARD_ID = 'me';

const NAMES = [
  'ChaiAndKindness', 'LuckyPenny', 'MapleMornings', 'QuietComet', 'BrightBasil',
  'HoneyHarbor', 'PaperLantern', 'TangerineTom', 'SoftSundays', 'CloverCoast',
  'WarmToast', 'PocketFullOfSun', 'GoldenHour', 'MarigoldMia', 'NorthStarNia', 'KindKestrel',
];

const OTHERS: LeaderboardEntry[] = NAMES.map((username, i) => ({
  id: `u${i + 1}`,
  username,
  giftedCents: 18000 - i * 900,
}));

/** This week's Most Gifted board. The Ranks screen and the Your Rank card both read it. */
export const WEEKLY_MOST_GIFTED: LeaderboardEntry[] = [
  ...OTHERS,
  { id: MY_LEADERBOARD_ID, username: 'SunsetGifter', giftedCents: 2300 },
  { id: 'u17', username: 'SlowPoke', giftedCents: 1800 },
  { id: 'u18', username: 'TeaForTwo', giftedCents: 1200 },
].sort((a, b) => b.giftedCents - a.giftedCents);

/** Ties share a rank, as in the backend's get_leaderboard. */
export function rankOf(board: LeaderboardEntry[], id: string): number | null {
  const entry = board.find((e) => e.id === id);
  if (!entry) return null;
  return board.filter((e) => e.giftedCents > entry.giftedCents).length + 1;
}

export function getMyRank(): MyRank {
  return {
    rank: rankOf(WEEKLY_MOST_GIFTED, MY_LEADERBOARD_ID),
    category: 'Most Gifted',
    period: 'Weekly',
  };
}
