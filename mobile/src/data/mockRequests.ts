import type { Comment, GiftRequest } from '../types';
import { headshots } from './mockPeople';

const photo = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&q=80&fm=jpg&fit=crop`;
const portrait = (path: string) => `https://randomuser.me/api/portraits/${path}.jpg`;

const commenters = {
  alex: { username: 'alex.k', avatarUrl: portrait('men/32') },
  maya: { username: 'maya.t', avatarUrl: portrait('women/68') },
  lily: { username: 'lily.c', avatarUrl: portrait('women/12') },
  ryan: { username: 'ryan.p', avatarUrl: portrait('men/46') },
  noor: { username: 'noor.s', avatarUrl: portrait('women/90') },
  ben: { username: 'ben.w', avatarUrl: portrait('men/11') },
  ivy: { username: 'ivy.r', avatarUrl: portrait('women/26') },
  dev: { username: 'dev.m', avatarUrl: portrait('men/86') },
};

type Commenter = keyof typeof commenters;

let commentSeq = 0;
function c(who: Commenter, text: string, minutesAgo: number, likes: number): Comment {
  commentSeq += 1;
  return {
    id: `c${commentSeq}`,
    ...commenters[who],
    text,
    minutesAgo,
    likes,
    likedByMe: false,
  };
}

export const mockRequests: GiftRequest[] = [
  {
    id: 'req-jamie-matcha',
    recipient: {
      id: 'u-jamie',
      displayName: 'Jamie',
      username: 'jamie.lo',
      age: 20,
      avatarUrl: headshots.jamie,
    },
    imageUrl: photo('1515823064-d6e0c04616a7'),
    title: 'Matcha after midterms',
    description:
      'Just finished three midterms in two days and I am running on fumes. An iced matcha from the café by the library would honestly make my whole week.',
    category: 'Food',
    amountCents: 800,
    reactions: { hearts: 128, sparkles: 34 },
    saved: false,
    comments: [
      c('alex', 'need this fr', 12, 24),
      c('maya', 'girl same 😭', 38, 17),
      c('lily', 'hope you get it 🧡', 65, 9),
      c('ryan', 'midterms are brutal', 140, 6),
      c('noor', 'the library café matcha is elite', 260, 3),
    ],
  },
  {
    id: 'req-alex-pizza',
    recipient: {
      id: 'u-alex',
      displayName: 'Alex',
      username: 'alex.rv',
      age: 22,
      avatarUrl: headshots.alex,
    },
    imageUrl: photo('1513104890138-7c749659a591'),
    title: 'Friday night pizza',
    description:
      'My roommates and I do pizza night every Friday and it is my turn to buy. Rent hit harder than expected this month, so any help keeps the tradition alive.',
    category: 'Food',
    amountCents: 1900,
    reactions: { hearts: 86, sparkles: 12 },
    saved: false,
    comments: [
      c('ben', 'pizza night is sacred', 22, 14),
      c('ivy', 'pineapple or no pineapple', 54, 8),
      c('dev', 'protect the tradition 🍕', 180, 5),
    ],
  },
  {
    id: 'req-taylor-headphones',
    recipient: {
      id: 'u-taylor',
      displayName: 'Taylor',
      username: 'taylor.bk',
      age: 24,
      avatarUrl: headshots.taylor,
    },
    imageUrl: photo('1505740420928-5e560c06d30e'),
    title: 'New headphones',
    description:
      'My old pair finally died after four years. I commute an hour each way and edit podcasts on the side, so a decent pair of headphones would help a lot.',
    category: 'Product',
    amountCents: 8900,
    reactions: { hearts: 203, sparkles: 41 },
    saved: false,
    comments: [
      c('maya', 'an hour commute with no music?? 😭', 15, 31),
      c('ryan', 'what podcasts do you edit', 90, 7),
      c('lily', 'rooting for you', 300, 4),
    ],
  },
  {
    id: 'req-riley-dinner',
    recipient: {
      id: 'u-riley',
      displayName: 'Riley',
      username: 'riley.jn',
      age: 27,
      avatarUrl: headshots.riley,
    },
    imageUrl: photo('1504674900247-0877df9cc836'),
    title: 'Dinner after work',
    description:
      'Double shift today and nothing in the fridge. A warm dinner from the Thai place down the street would be the best end to a very long day.',
    category: 'Food',
    amountCents: 2200,
    reactions: { hearts: 64, sparkles: 9 },
    saved: false,
    comments: [
      c('noor', 'double shifts are no joke', 30, 11),
      c('alex', 'get the green curry', 75, 6),
    ],
  },
  {
    id: 'req-morgan-sketchbook',
    recipient: {
      id: 'u-morgan',
      displayName: 'Morgan',
      username: 'morgan.art',
      age: 19,
      avatarUrl: headshots.morgan,
    },
    imageUrl: photo('1513364776144-60967b0f800f'),
    title: 'New sketchbook',
    description:
      'I filled my last sketchbook cover to cover this semester. I am putting together a portfolio for an illustration program and need fresh pages.',
    category: 'Product',
    amountCents: 1500,
    reactions: { hearts: 152, sparkles: 58 },
    saved: false,
    comments: [
      c('ivy', 'post your portfolio when it is done!!', 18, 22),
      c('ben', 'artists deserve the good paper', 120, 9),
      c('maya', '🎨🧡', 400, 3),
    ],
  },
  {
    id: 'req-casey-flowers',
    recipient: {
      id: 'u-casey',
      displayName: 'Casey',
      username: 'casey.md',
      age: 23,
      avatarUrl: headshots.casey,
    },
    imageUrl: photo('1487070183336-b863922373d4'),
    title: 'Birthday flowers',
    description:
      'My grandma turns 85 on Sunday and she has always loved fresh flowers. I want to surprise her with a bouquet from the market near her place.',
    category: 'Celebration',
    amountCents: 2500,
    reactions: { hearts: 311, sparkles: 77 },
    saved: false,
    comments: [
      c('lily', 'this is so sweet', 8, 40),
      c('dev', 'happy birthday to grandma 🎉', 44, 19),
      c('noor', 'tulips! she will love tulips', 95, 7),
    ],
  },
  {
    id: 'req-sam-coffee',
    recipient: {
      id: 'u-sam',
      displayName: 'Sam',
      username: 'sam.oh',
      age: 21,
      avatarUrl: headshots.sam,
    },
    imageUrl: photo('1509042239860-f550ce710b93'),
    title: 'Coffee before finals',
    description:
      'First final is at 8am tomorrow. A flat white is the only thing standing between me and falling asleep on the exam.',
    category: 'Food',
    amountCents: 600,
    reactions: { hearts: 97, sparkles: 15 },
    saved: false,
    comments: [
      c('ryan', '8am finals should be illegal', 25, 28),
      c('ivy', 'good luck!!', 70, 5),
    ],
  },
  {
    id: 'req-jordan-textbook',
    recipient: {
      id: 'u-jordan',
      displayName: 'Jordan',
      username: 'jordan.ek',
      age: 20,
      avatarUrl: headshots.jordan,
    },
    imageUrl: photo('1497633762265-9d179a990aa6'),
    title: 'Textbook for class',
    description:
      'My organic chemistry class requires a textbook access code and the used copies do not include one. Homework is due through the code every week.',
    category: 'School',
    amountCents: 4500,
    reactions: { hearts: 74, sparkles: 11 },
    saved: false,
    comments: [
      c('ben', 'access codes are a scam honestly', 33, 36),
      c('maya', 'orgo survivor here, you got this', 160, 12),
    ],
  },
];

export const ME = {
  username: 'you',
  avatarUrl: portrait('women/33'),
};
