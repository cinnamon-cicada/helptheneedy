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
