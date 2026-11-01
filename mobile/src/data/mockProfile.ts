import type { ActivityRecord, UserProfile } from '../types';

const portrait = (path: string) => `https://randomuser.me/api/portraits/${path}.jpg`;

/** Cycled through by the photo placeholder in the Edit Profile sheet. */
export const SAMPLE_AVATARS = [portrait('women/65'), portrait('women/33'), portrait('men/52')];

export const MOCK_PROFILE: UserProfile = {
  username: 'SunsetGifter',
  avatarUrl: SAMPLE_AVATARS[0],
  totalGiftedCents: 21000,
  peopleHelped: 12,
  requestsPosted: 5,
};

const HOUR = 60;
const DAY = 24 * HOUR;

const ACTIVITY: ActivityRecord[] = [
  { id: 'a1', kind: 'gift_sent', amountCents: 800, recipientName: 'Jamie', minutesAgo: 2 * HOUR },
  { id: 'a2', kind: 'gift_sent', amountCents: 1500, recipientName: 'Riley', minutesAgo: DAY },
  { id: 'a3', kind: 'request_posted', minutesAgo: 3 * DAY },
  { id: 'a4', kind: 'gift_sent', amountCents: 1200, recipientName: 'Maya', minutesAgo: 5 * DAY },
  { id: 'a5', kind: 'gift_sent', amountCents: 2500, recipientName: 'Noor', minutesAgo: 8 * DAY },
  { id: 'a6', kind: 'request_posted', minutesAgo: 12 * DAY },
  { id: 'a7', kind: 'gift_sent', amountCents: 600, recipientName: 'Ben', minutesAgo: 16 * DAY },
];

/** Newest first. */
export const MOCK_ACTIVITY = [...ACTIVITY].sort((a, b) => a.minutesAgo - b.minutesAgo);

/** How many rows the Profile dashboard shows before View All. */
export const RECENT_ACTIVITY_COUNT = 3;
