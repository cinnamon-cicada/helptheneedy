import type { ProfileSection } from '../components/ProfileShortcutGrid';
import type { ActivityRecord, ProfileListItem, UserProfile } from '../types';

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

export const PROFILE_LISTS: Record<ProfileSection, { title: string; items: ProfileListItem[] }> = {
  'gifts-sent': {
    title: 'Gifts Sent',
    items: [
      { id: 's1', title: '$8.00 to Jamie', detail: '2 hours ago' },
      { id: 's2', title: '$15.00 to Riley', detail: '1 day ago' },
      { id: 's3', title: '$12.00 to Maya', detail: '5 days ago' },
      { id: 's4', title: '$25.00 to Noor', detail: '1 week ago' },
      { id: 's5', title: '$6.00 to Ben', detail: '2 weeks ago' },
    ],
  },
  'gifts-received': {
    title: 'Gifts Received',
    items: [
      { id: 'r1', title: '$20.00 from Alex', detail: '4 days ago' },
      { id: 'r2', title: '$10.00 from Ivy', detail: '2 weeks ago' },
      { id: 'r3', title: '$35.00 from Dev', detail: '1 month ago' },
    ],
  },
  'saved-requests': {
    title: 'Saved Requests',
    items: [
      { id: 'v1', title: 'New headphones', detail: 'Saved 1 day ago' },
      { id: 'v2', title: 'Friday night pizza', detail: 'Saved 3 days ago' },
      { id: 'v3', title: 'New sketchbook', detail: 'Saved 1 week ago' },
    ],
  },
  'my-posts': {
    title: 'My Posts',
    items: [
      { id: 'p1', title: 'Textbook for spring term', detail: '3 days ago' },
      { id: 'p2', title: 'Birthday dinner', detail: '12 days ago' },
      { id: 'p3', title: 'Bus pass for the month', detail: '3 weeks ago' },
      { id: 'p4', title: 'Winter boots', detail: '5 weeks ago' },
      { id: 'p5', title: 'Groceries this week', detail: '8 weeks ago' },
    ],
  },
};
