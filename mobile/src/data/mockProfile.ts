import type { ProfileSection } from '../components/ProfileShortcutGrid';
import type { ActivityRecord, GiftRequest, ProfileListItem, UserProfile } from '../types';
import { mockRequests } from './mockRequests';
import { LOCAL_USER_ID, PROFILE_AVATAR_CHOICES, requiredDemoAvatar } from './userAvatars';

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80&fm=jpg&fit=crop`;

/** Non-identifying demo photos also used by the Edit Profile sample picker. */
export const SAMPLE_AVATARS = PROFILE_AVATAR_CHOICES;

export const MOCK_PROFILE: UserProfile = {
  username: 'robin_24',
  avatarUrl: requiredDemoAvatar(LOCAL_USER_ID),
  totalGiftedCents: 21000,
  peopleHelped: 12,
  requestsPosted: 5,
};

const HOUR = 60;
const DAY = 24 * HOUR;

const ME_AS_RECIPIENT = {
  id: 'u-me',
  displayName: MOCK_PROFILE.username,
  username: 'robin_24',
  avatarUrl: requiredDemoAvatar(LOCAL_USER_ID),
};

/** Requests the signed-in user has posted. */
const MY_REQUESTS: GiftRequest[] = [
  {
    id: 'my-textbook',
    recipient: ME_AS_RECIPIENT,
    imageUrl: photo('1497633762265-9d179a990aa6'),
    title: 'Textbook for spring term',
    description: 'My statistics course switched textbooks last minute and the library copy is always checked out.',
    category: 'School',
    amountCents: 6000,
    reactions: { hearts: 42, sparkles: 9 },
    saved: false,
    comments: [],
  },
  {
    id: 'my-birthday-dinner',
    recipient: ME_AS_RECIPIENT,
    imageUrl: photo('1414235077428-338989a2e8c0'),
    title: 'Birthday dinner',
    description: 'Dinner with two friends for my birthday. Looking for $45 toward the bill.',
    category: 'Celebration',
    amountCents: 4500,
    reactions: { hearts: 96, sparkles: 31 },
    saved: false,
    comments: [],
  },
  {
    id: 'my-bus-pass',
    recipient: ME_AS_RECIPIENT,
    imageUrl: photo('1544620347-c4fd4a3d5957'),
    title: 'Bus pass for the month',
    description: 'A monthly pass gets me to class and my part-time job without walking an hour each way.',
    category: 'Bills',
    amountCents: 5500,
    reactions: { hearts: 37, sparkles: 6 },
    saved: false,
    comments: [],
  },
  {
    id: 'my-winter-boots',
    recipient: ME_AS_RECIPIENT,
    imageUrl: photo('1520639888713-7851133b1ed0'),
    title: 'Winter boots',
    description: 'My old boots split at the sole and the snow is already here. Looking for a sturdy pair that lasts.',
    category: 'Product',
    amountCents: 7000,
    reactions: { hearts: 58, sparkles: 14 },
    saved: false,
    comments: [],
  },
  {
    id: 'my-groceries',
    recipient: ME_AS_RECIPIENT,
    imageUrl: photo('1542838132-92c53300491e'),
    title: 'Groceries this week',
    description: 'Payday got pushed back a week, so a little help with groceries would get me through.',
    category: 'Food',
    amountCents: 3500,
    reactions: { hearts: 71, sparkles: 18 },
    saved: false,
    comments: [],
  },
];

const ALL_REQUESTS = [...mockRequests, ...MY_REQUESTS];

/** Finds a request from Discover or from the user's own posts. */
export function findRequest(id: string): GiftRequest | undefined {
  return ALL_REQUESTS.find((r) => r.id === id);
}

const ACTIVITY: ActivityRecord[] = [
  { id: 'a1', kind: 'gift_sent', amountCents: 800, recipientName: 'Jamie', minutesAgo: 2 * HOUR, requestId: 'req-jamie-matcha' },
  { id: 'a2', kind: 'gift_sent', amountCents: 1500, recipientName: 'Riley', minutesAgo: DAY, requestId: 'req-riley-dinner' },
  { id: 'a3', kind: 'request_posted', minutesAgo: 3 * DAY, requestId: 'my-textbook' },
  { id: 'a4', kind: 'gift_sent', amountCents: 1200, recipientName: 'Morgan', minutesAgo: 5 * DAY, requestId: 'req-morgan-sketchbook' },
  { id: 'a5', kind: 'gift_sent', amountCents: 2500, recipientName: 'Casey', minutesAgo: 8 * DAY, requestId: 'req-casey-flowers' },
  { id: 'a6', kind: 'request_posted', minutesAgo: 12 * DAY, requestId: 'my-birthday-dinner' },
  { id: 'a7', kind: 'gift_sent', amountCents: 600, recipientName: 'Sam', minutesAgo: 16 * DAY, requestId: 'req-sam-coffee' },
];

/** Newest first. */
export const MOCK_ACTIVITY = [...ACTIVITY].sort((a, b) => a.minutesAgo - b.minutesAgo);

/** How many rows the Profile dashboard shows before View All. */
export const RECENT_ACTIVITY_COUNT = 3;

export const PROFILE_LISTS: Record<ProfileSection, { title: string; items: ProfileListItem[] }> = {
  'gifts-sent': {
    title: 'Gifts Sent',
    items: [
      { id: 's1', title: '$8.00 to Jamie', detail: '2 hours ago', requestId: 'req-jamie-matcha' },
      { id: 's2', title: '$15.00 to Riley', detail: '1 day ago', requestId: 'req-riley-dinner' },
      { id: 's3', title: '$12.00 to Morgan', detail: '5 days ago', requestId: 'req-morgan-sketchbook' },
      { id: 's4', title: '$25.00 to Casey', detail: '1 week ago', requestId: 'req-casey-flowers' },
      { id: 's5', title: '$6.00 to Sam', detail: '2 weeks ago', requestId: 'req-sam-coffee' },
    ],
  },
  'gifts-received': {
    title: 'Gifts Received',
    items: [
      { id: 'r1', title: '$20.00 from Alex', detail: '4 days ago', requestId: 'my-textbook' },
      { id: 'r2', title: '$10.00 from Ivy', detail: '2 weeks ago', requestId: 'my-birthday-dinner' },
      { id: 'r3', title: '$35.00 from Dev', detail: '1 month ago', requestId: 'my-bus-pass' },
    ],
  },
  'saved-requests': {
    title: 'Saved Requests',
    items: [
      { id: 'v1', title: 'New headphones', detail: 'Saved 1 day ago', requestId: 'req-taylor-headphones' },
      { id: 'v2', title: 'Friday night pizza', detail: 'Saved 3 days ago', requestId: 'req-alex-pizza' },
      { id: 'v3', title: 'New sketchbook', detail: 'Saved 1 week ago', requestId: 'req-morgan-sketchbook' },
    ],
  },
  'my-posts': {
    title: 'My Posts',
    items: [
      { id: 'p1', title: 'Textbook for spring term', detail: '3 days ago', requestId: 'my-textbook' },
      { id: 'p2', title: 'Birthday dinner', detail: '12 days ago', requestId: 'my-birthday-dinner' },
      { id: 'p3', title: 'Bus pass for the month', detail: '3 weeks ago', requestId: 'my-bus-pass' },
      { id: 'p4', title: 'Winter boots', detail: '5 weeks ago', requestId: 'my-winter-boots' },
      { id: 'p5', title: 'Groceries this week', detail: '8 weeks ago', requestId: 'my-groceries' },
    ],
  },
};
