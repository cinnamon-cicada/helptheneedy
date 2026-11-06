import { PALETTES } from '../data/mockLeaderboard';
import type { AliasAvatarSpec, AvatarIcon, LeaderboardRow, RankingCategory, RankingPeriod } from '../types';
import { rpc } from './client';
import { imageUrls } from './images';

type BoardRow = {
  user_rank: number;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_path: string | null;
  /** Cents on the gifted board, a head count on the helped board. */
  total_cents: number;
};

const ICONS: AvatarIcon[] = ['sun', 'moon', 'star', 'leaf', 'flower', 'coffee', 'heart', 'cloud', 'sparkles', 'gift', 'feather', 'cherry', 'bird', 'sprout', 'music', 'cookie'];

/** The same illustrated avatar for the same person every time. */
function iconFor(id: string): AliasAvatarSpec {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [background, foreground] = PALETTES[h % PALETTES.length];
  return { kind: 'icon', icon: ICONS[(h >>> 4) % ICONS.length], background, foreground };
}

const BOARD: Record<RankingCategory, string> = { gifted: 'gifted', helped: 'helped' };
const PERIOD: Record<RankingPeriod, string> = { monthly: 'month', overall: 'all_time' };

export type Board = { rows: LeaderboardRow[]; me: LeaderboardRow | null };

/**
 * One board from get_leaderboard, plus your own row from get_my_rank. The
 * backend applies opt-outs, moderator exclusions and blocks, and ties share
 * a rank.
 */
export async function fetchBoard(category: RankingCategory, period: RankingPeriod, myId: string): Promise<Board> {
  const args = { p_board: BOARD[category], p_period: PERIOD[period] };
  const [rows, mine] = await Promise.all([
    rpc<BoardRow[]>('get_leaderboard', { ...args, p_limit: 100 }),
    rpc<{ user_rank: number; total_cents: number }[]>('get_my_rank', args),
  ]);
  const photos = await imageUrls('avatars', rows.map((r) => r.avatar_path));

  const toRow = (r: BoardRow, i: number): LeaderboardRow => ({
    rank: Number(r.user_rank),
    value: Number(r.total_cents),
    user: {
      id: r.user_id,
      alias: r.display_name || r.username,
      avatar: photos[i] ? { kind: 'photo', uri: photos[i]! } : iconFor(r.user_id),
      isLeaderboardVisible: true,
      leaderboardExcluded: false,
    },
  });

  const list = rows.map(toRow);
  let me = list.find((r) => r.user.id === myId) ?? null;
  // Beyond the first 100, your row comes from get_my_rank alone.
  if (!me && mine[0]) {
    me = {
      rank: Number(mine[0].user_rank),
      value: Number(mine[0].total_cents),
      user: { id: myId, alias: 'You', avatar: iconFor(myId), isLeaderboardVisible: true, leaderboardExcluded: false },
    };
  }
  return { rows: list, me };
}
