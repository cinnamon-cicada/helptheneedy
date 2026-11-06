import type { AuthUser, Intent } from '../auth/types';
import { ApiError, db, rpc } from './client';
import { imageUrl } from './images';

/** Mirrors get_my_profile. */
type MyProfileRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_path: string | null;
  intent: Intent | null;
  is_onboarded: boolean;
  gifted_cents: number;
  received_cents: number;
};

export type MyAccount = {
  user: AuthUser;
  avatarUrl: string | null;
  giftedCents: number;
};

const ADJECTIVES = ['Kind', 'Sunny', 'Gentle', 'Bright', 'Golden', 'Warm', 'Lucky', 'Quiet', 'Honey', 'Maple', 'Peach', 'Cozy'];
const NOUNS = ['Comet', 'Sparrow', 'Lantern', 'Clover', 'Harbor', 'Meadow', 'Pebble', 'Ember', 'Willow', 'Biscuit', 'Otter', 'Breeze'];
const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/** A friendly alias for a new demo account, such as "SunnyOtter". */
export function generateAlias() {
  return `${pick(ADJECTIVES)}${pick(NOUNS)}`;
}

/** Usernames must match ^[a-z0-9_]{3,30}$; the suffix keeps them unique. */
function toUsername(alias: string, suffix: string) {
  const base = alias.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'gifter';
  return `${base.padEnd(3, '_')}_${suffix}`;
}

const randomSuffix = () => String(Math.floor(1000 + Math.random() * 9000));

async function readMyProfile(): Promise<MyAccount> {
  const rows = await rpc<MyProfileRow[]>('get_my_profile');
  const row = rows[0];
  if (!row) throw new ApiError('not_authenticated');
  return {
    user: {
      id: row.id,
      email: '',
      username: row.username ?? '',
      displayName: row.display_name ?? row.username ?? '',
      intent: row.intent ?? 'gifter',
    },
    avatarUrl: await imageUrl('avatars', row.avatar_path),
    giftedCents: Number(row.gifted_cents),
  };
}

/**
 * Signs in, creating an account the first time: an anonymous Supabase user,
 * onboarded with a generated alias. The session is saved on the device, so
 * the same account comes back on every visit. Demo accounts are adults by
 * definition; a real signup must ask.
 */
export function ensureDemoAccount(): Promise<MyAccount> {
  // One setup at a time: two at once (React runs effects twice in development)
  // would each create an anonymous user.
  inFlight ??= setUpAccount().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

let inFlight: Promise<MyAccount> | null = null;

async function setUpAccount(): Promise<MyAccount> {
  const auth = db().auth;
  const { data } = await auth.getSession();
  if (!data.session) {
    const { error } = await auth.signInAnonymously();
    if (error) throw new ApiError('network');
  }

  const account = await readMyProfile();
  if (account.user.username) return account;

  const alias = generateAlias();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await rpc('complete_onboarding', {
        p_username: toUsername(alias, randomSuffix()),
        p_display_name: alias,
        p_intent: 'gifter',
        p_is_adult_confirmed: true,
      });
      return await readMyProfile();
    } catch (e) {
      if (!(e instanceof ApiError && e.code === 'username_taken')) throw e;
    }
  }
  throw new ApiError('username_taken');
}

export function getMyAccount() {
  return readMyProfile();
}

/**
 * Saves a new name, and a new photo when it changed. The name the person types
 * is their public alias (display_name); the username is derived from it.
 */
export async function updateMyAccount(edits: { displayName: string; avatarUrl?: string }): Promise<MyAccount> {
  const current = await readMyProfile();
  const displayName = edits.displayName.trim();
  let avatarPath: string | undefined;

  if (edits.avatarUrl && edits.avatarUrl !== current.avatarUrl) {
    // A photo that can't be copied (offline, or a host that blocks downloads)
    // stays on this device only; the name still saves.
    avatarPath = await uploadAvatar(current.user.id, edits.avatarUrl).catch(() => undefined);
  }

  if (displayName && displayName !== current.user.displayName) {
    // complete_onboarding is the one RPC that can change the username; it keeps intent and age as they are.
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        await rpc('complete_onboarding', {
          p_username: toUsername(displayName, randomSuffix()),
          p_display_name: displayName,
          p_intent: current.user.intent,
          p_is_adult_confirmed: true,
          p_avatar_path: avatarPath ?? null,
        });
        avatarPath = undefined;
        break;
      } catch (e) {
        if (!(e instanceof ApiError && e.code === 'username_taken') || attempt === 4) throw e;
      }
    }
  }
  if (avatarPath) await rpc('update_profile', { p_avatar_path: avatarPath });
  return readMyProfile();
}

/** Copies an image into the avatars bucket under the user's own folder and returns its path. */
async function uploadAvatar(userId: string, sourceUrl: string): Promise<string> {
  const response = await fetch(sourceUrl);
  if (!response.ok) throw new ApiError('network');
  const blob = await response.blob();
  const type = ['image/jpeg', 'image/png', 'image/webp'].includes(blob.type) ? blob.type : 'image/jpeg';
  const path = `${userId}/avatar-${Date.now()}.${type.split('/')[1]}`;
  const { error } = await db().storage.from('avatars').upload(path, blob, { contentType: type, upsert: true });
  if (error) throw new ApiError('upload_failed');
  return path;
}
