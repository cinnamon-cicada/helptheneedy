import { Asset } from 'expo-asset';

export const LOCAL_USER_ID = 'me';

// Licensed photo sources and hashes: assets/demo-photos/sources.json.
const photo = (module: number) => {
  const asset = Asset.fromModule(module);
  return asset.localUri ?? asset.uri;
};

const photos = {
  cat: photo(require('../../assets/demo-photos/avatar-cat.jpg')),
  dog: photo(require('../../assets/demo-photos/avatar-dog.jpg')),
  daisies: photo(require('../../assets/demo-photos/avatar-daisies.jpg')),
  sea: photo(require('../../assets/demo-photos/avatar-sea.jpg')),
  mountains: photo(require('../../assets/demo-photos/avatar-mountains.jpg')),
  night: photo(require('../../assets/demo-photos/avatar-night.jpg')),
  candid: photo(require('../../assets/demo-photos/person-jamie.jpg')),
  museum: photo(require('../../assets/demo-photos/person-casey.jpg')),
  sketchbook: photo(require('../../assets/demo-photos/request-sketchbook.jpg')),
  coffee: photo(require('../../assets/demo-photos/request-coffee.jpg')),
  flowers: photo(require('../../assets/demo-photos/request-flowers.jpg')),
  headphones: photo(require('../../assets/demo-photos/request-headphones.jpg')),
  matcha: photo(require('../../assets/demo-photos/request-matcha.jpg')),
  textbook: photo(require('../../assets/demo-photos/request-textbook.jpg')),
};

/** One avatar per fictional user ID. Never derive identity from a display name. */
const avatars: Record<string, string> = {
  'me': photos.cat,
  'u-jamie': photos.candid,
  'u-alex': photos.dog,
  'u-taylor': photos.daisies,
  'u-riley': photos.sea,
  'u-morgan': photos.sketchbook,
  'u-casey': photos.museum,
  'u-sam': photos.night,
  'u-jordan': photos.mountains,
  'comment-alex': photos.headphones,
  'comment-maya': photos.flowers,
  'comment-lily': photos.matcha,
  'comment-ryan': photos.mountains,
  'comment-noor': photos.sea,
  'comment-ivy': photos.daisies,
  'k1': photos.cat,
  'k2': photos.dog,
  'k3': photos.daisies,
  'k4': photos.sea,
  'k5': photos.mountains,
  'k6': photos.night,
  'k7': photos.candid,
  'k8': photos.museum,
  'k9': photos.sketchbook,
  'k10': photos.coffee,
  'k11': photos.flowers,
  'k12': photos.headphones,
  'k13': photos.matcha,
  'k14': photos.textbook,
  'k15': photos.cat,
  'k16': photos.dog,
  'k17': photos.daisies,
  'k18': photos.sea,
  'k19': photos.mountains,
  'k20': photos.night,
  'k21': photos.candid,
  'k22': photos.museum,
};

// Supabase seed IDs alias the same demo identity, rather than defining another photo.
const seededUsers: Record<string, string> = {
  '3cf6dbc4-d1c2-bd4f-68fb-ea86ab9a8b11': 'k1',
  '040438be-a901-1549-becc-8dcd883c0e05': 'k2',
  '31d713fe-f788-a500-6f8e-3e04a20dc4bc': 'k3',
  'bd634ecb-5082-8c9c-6290-bfbaa2299da9': 'k4',
  'a9f0db92-0f42-3998-e54b-d62ea8fb72de': 'k5',
  '0bae76b7-ed30-6664-1b34-92d3bb39ee8b': 'k6',
  '14a5d128-0e92-2a1a-df7e-6d81d722e608': 'k7',
  '235f7ce9-7249-6893-9575-cb1a2bc818a6': 'k8',
  '476e9d3b-f4c9-60bc-9a5d-e1bdf6051793': 'k9',
  '921837fd-5616-cc92-a327-6d3371f24709': 'k10',
  '9592dacd-edec-33f5-e6f4-c829a8294dbd': 'k12',
  'be6a25e0-14ee-ef08-2fcc-a170e7172c70': 'k14',
  '9bd1934c-512a-dd19-247f-bb8e557d37e0': 'k16',
  '588e73ed-c849-46cd-9ae9-8a531e0c705d': 'k17',
  'e4669acb-c8c8-657b-07af-8d93a2f6fc0b': 'u-jamie',
  '3be54d70-103c-e9f6-4c20-cd1cca2d37f8': 'u-alex',
  'eacca14e-1129-afe0-9197-0d882f3934e7': 'u-taylor',
  '75efbeb0-6474-60cb-7524-9753c829d752': 'u-riley',
  '17b9d810-1071-a174-22ad-c6ca7cafb323': 'u-morgan',
  'caf239af-ee1d-f0d1-86ce-4dc2e63d2dfc': 'u-casey',
  '1bad0cb4-5491-762d-04bf-27246e9f7673': 'u-sam',
  '3890f461-e003-2887-eadc-fc31d913123b': 'u-jordan',
};

export function demoAvatarFor(userId: string): string | undefined {
  return avatars[seededUsers[userId] ?? userId];
}

/** Fixtures use this; runtime current-user edits resolve through DemoProvider. */
export function requiredDemoAvatar(userId: string): string {
  const uri = demoAvatarFor(userId);
  if (!uri) throw new Error(`Missing demo avatar for ${userId}`);
  return uri;
}

export const PROFILE_AVATAR_CHOICES = [photos.cat, photos.dog, photos.daisies, photos.sea, photos.mountains, photos.night];

/** Refresh bundled demo choices saved under an older Metro host or asset hash. */
export function restoreAvatarUri(uri: string): string {
  const choices: Record<string, string> = {
    'avatar-cat': photos.cat, 'avatar-dog': photos.dog, 'avatar-daisies': photos.daisies,
    'avatar-sea': photos.sea, 'avatar-mountains': photos.mountains, 'avatar-night': photos.night,
    'person-jamie': photos.cat,
    'person-alex': photos.dog, 'person-taylor': photos.daisies, 'person-riley': photos.sea,
  };
  // These were the old built-in picker samples, never user uploads.
  const legacySamples: Record<string, string> = {
    '1534528741775-53994a69daeb': photos.cat,
    '1524504388940-b1c1722653e1': photos.dog,
    '1506277886164-e25aa3f4ef7f': photos.daisies,
    '1531123897727-8f129e1688ce': photos.sea,
  };
  const oldSample = uri.match(/^https:\/\/images\.unsplash\.com\/photo-([^?]+)/)?.[1];
  if (oldSample && legacySamples[oldSample]) return legacySamples[oldSample];
  let decoded = uri;
  try { decoded = decodeURIComponent(uri); } catch { /* Preserve malformed or custom upload URIs. */ }
  const file = decoded.includes('assets/demo-photos/')
    ? decoded.match(/(?:^|[/])((?:avatar|person)-[a-z]+)\./)?.[1]
    : undefined;
  return (file && choices[file]) || uri;
}
