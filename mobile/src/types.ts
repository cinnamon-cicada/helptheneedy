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

export type ActivityRecord = { id: string; minutesAgo: number } & (
  | { kind: 'gift_sent'; amountCents: number; recipientName: string }
  | { kind: 'request_posted' }
);

export type LeaderboardEntry = {
  id: string;
  username: string;
  giftedCents: number;
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
