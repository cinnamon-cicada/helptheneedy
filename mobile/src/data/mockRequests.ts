import type { Comment, GiftRequest } from '../types';
import { headshots } from './mockPeople';
import { demoPortraits, demoRequestPhotos } from './demoPhotos';


const commenters = {
  alex: { username: 'alex.k', avatarUrl: demoPortraits.alex },
  maya: { username: 'maya.t', avatarUrl: demoPortraits.taylor },
  lily: { username: 'lily.c', avatarUrl: demoPortraits.morgan },
  ryan: { username: 'ryan.p', avatarUrl: demoPortraits.riley },
  noor: { username: 'noor.s', avatarUrl: demoPortraits.jordan },
  ben: { username: 'ben.w', avatarUrl: demoPortraits.sam },
  ivy: { username: 'ivy.r', avatarUrl: demoPortraits.jamie },
  dev: { username: 'dev.m', avatarUrl: demoPortraits.casey },
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
    imageUrl: demoRequestPhotos.matcha,
    title: 'Matcha after midterms',
    description:
      'I have two exams left this week. Asking for $8 for an iced matcha at the library cafe.',
    category: 'Food',
    amountCents: 800,
    reactions: { hearts: 8, sparkles: 1 },
    saved: false,
    comments: [
      c('alex', 'Is that the cafe on the ground floor?', 12, 2),
      c('noor', 'It closes at 4 on Fridays.', 260, 0),
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
    imageUrl: demoRequestPhotos.pizza,
    title: 'Friday night pizza',
    description:
      'Ordering pizza with my roommates on Friday. My share is $19, including delivery.',
    category: 'Food',
    amountCents: 1900,
    reactions: { hearts: 3, sparkles: 0 },
    saved: false,
    comments: [
      c('ivy', 'Which place are you ordering from?', 54, 1),
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
    imageUrl: demoRequestPhotos.headphones,
    title: 'New headphones',
    description:
      'The left side of my headphones stopped working. This pair is $89; I use them on the train and for editing audio.',
    category: 'Product',
    amountCents: 8900,
    reactions: { hearts: 17, sparkles: 2 },
    saved: false,
    comments: [
      c('ryan', 'Do you need a mic on these?', 90, 2),
      c('maya', 'I have the wired version. The cable is quite short.', 180, 0),
      c('lily', 'Worth checking the refurbished ones too.', 300, 1),
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
    imageUrl: demoRequestPhotos.dinner,
    title: 'Dinner after work',
    description:
      'I finish work at 9 tonight. Asking for $22 for takeout on the way home.',
    category: 'Food',
    amountCents: 2200,
    reactions: { hearts: 2, sparkles: 0 },
    saved: false,
    comments: [
      c('alex', 'The green curry there is good.', 75, 1),
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
    imageUrl: demoRequestPhotos.sketchbook,
    title: 'New sketchbook',
    description:
      'My sketchbook is full. The A5 one I use costs $15 at the art supply shop.',
    category: 'Product',
    amountCents: 1500,
    reactions: { hearts: 6, sparkles: 1 },
    saved: false,
    comments: [
      c('ben', 'What paper weight do you use?', 120, 0),
      c('ivy', 'The student discount worked for me last month.', 220, 3),
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
    imageUrl: demoRequestPhotos.flowers,
    title: 'Birthday flowers',
    description:
      'Picking up flowers for my grandma on Sunday. The market has a $25 bouquet.',
    category: 'Celebration',
    amountCents: 2500,
    reactions: { hearts: 4, sparkles: 0 },
    saved: false,
    comments: [
      c('noor', 'Are you picking them up or getting delivery?', 95, 0),
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
    imageUrl: demoRequestPhotos.coffee,
    title: 'Coffee before finals',
    description:
      'Coffee before my 8am exam tomorrow. A flat white at the place near campus is $6.',
    category: 'Food',
    amountCents: 600,
    reactions: { hearts: 0, sparkles: 0 },
    saved: false,
    comments: [],
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
    imageUrl: demoRequestPhotos.textbook,
    title: 'Textbook for class',
    description:
      'I need a $45 access code for chemistry homework. The used textbook did not come with one.',
    category: 'School',
    amountCents: 4500,
    reactions: { hearts: 11, sparkles: 0 },
    saved: false,
    comments: [
      c('ben', 'Does the department have a spare code?', 33, 1),
      c('maya', 'The library has the book, but not the online access.', 160, 0),
    ],
  },
];

export const ME = {
  username: 'you',
  avatarUrl: demoPortraits.jamie,
};
