import type { PostPhoto } from './post/types';

export type Category = 'Food' | 'Product' | 'Bills' | 'School' | 'Celebration';

export type Recipient = {
  id: string;
  displayName: string;
  username: string;
  age?: number;
  avatarUrl: string;
};

export type Comment = {
  id: string;
  username: string;
  avatarUrl: string;
  text: string;
  minutesAgo: number;
  likes: number;
  likedByMe: boolean;
};

export type Reactions = {
  hearts: number;
  sparkles: number;
};

export type GiftRequest = {
  id: string;
  recipient: Recipient;
  imageUrl: string;
  title: string;
  description: string;
  category: Category;
  /** Money is always integer cents. */
  amountCents: number;
  comments: Comment[];
  reactions: Reactions;
  saved: boolean;
  /** A photo with on-device edits; drawn instead of `imageUrl` when set. */
  postPhoto?: PostPhoto;
  /** The signed-in user's own wish: shown in their deck but never giftable. */
  isMine?: boolean;
};

export type Filters = {
  category: Category | 'All';
  /** null means no limit. */
  maxAmountCents: number | null;
};

export type UserProfile = {
  username: string;
  avatarUrl: string;
  /** Lifetime, not limited to the current leaderboard week. */
  totalGiftedCents: number;
  peopleHelped: number;
  requestsPosted: number;
};

export type ActivityRecord = {
  id: string;
  minutesAgo: number;
  /** The request this activity is about, opened as a full card on tap. */
  requestId: string;
} & (
  | { kind: 'gift_sent'; amountCents: number; recipientName: string }
  | { kind: 'request_posted' }
);

export type ProfileListItem = {
  id: string;
  title: string;
  detail: string;
  /** The request this row is about, opened as a full card on tap. */
  requestId: string;
};

/** Most Gifted sums confirmed cents; Most Helped counts distinct recipients. */
export type RankingCategory = 'gifted' | 'helped';
/** Matches the backend's `month` and `all_time` periods. */
export type RankingPeriod = 'monthly' | 'overall';

export type AvatarIcon =
  | 'sun' | 'moon' | 'star' | 'leaf' | 'flower' | 'coffee' | 'heart' | 'cloud'
  | 'sparkles' | 'gift' | 'feather' | 'cherry' | 'bird' | 'sprout' | 'music' | 'cookie';

/** Public avatars are illustrations unless the person chose a photo. */
export type AliasAvatarSpec =
  | { kind: 'photo'; uri: string }
  | { kind: 'icon'; icon: AvatarIcon; background: string; foreground: string };

export type LeaderboardUser = {
  id: string;
  /** Public alias; real names are never shown on the board. */
  alias: string;
  avatar: AliasAvatarSpec;
  /** The member's own opt-out (`on_gifted_board` in the backend). */
  isLeaderboardVisible: boolean;
  /** Set by moderators (`leaderboard_excluded`). */
  leaderboardExcluded: boolean;
};

/** Mirrors the backend `gift_status` enum. */
export type GiftStatus = 'pending' | 'confirmed' | 'disputed' | 'cancelled';

export type GiftTransaction = {
  id: string;
  gifterId: string;
  recipientId: string;
  /** Money is always integer cents. */
  amountCents: number;
  status: GiftStatus;
  /** ISO time the receiver confirmed it; null unless confirmed. */
  confirmedAt: string | null;
  /** Seeded or test data that must never count. */
  isTest: boolean;
};

export type LeaderboardRow = {
  user: LeaderboardUser;
  /** Ties share a rank, as in the backend's get_leaderboard. */
  rank: number;
  /** Cents for Most Gifted, a head count for Most Helped. */
  value: number;
};

export type MyRank = {
  /** null means the user isn't on the board. */
  rank: number | null;
  category: string;
  period: string;
};

export type Person = {
  id: string;
  displayName: string;
  avatarUrl: string;
  isFollowing: boolean;
  followsMe: boolean;
  /** null means they keep this total private. */
  totalGiftedCents: number | null;
  peopleHelped: number;
  requestsPosted: number;
  /** Ids of this person's open requests. */
  wishlistIds: string[];
};
