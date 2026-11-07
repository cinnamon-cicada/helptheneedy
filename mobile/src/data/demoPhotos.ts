import { Asset } from 'expo-asset';
import { requiredDemoAvatar } from './userAvatars';

// Licensed, non-identifying demo photography. Source records live in assets/demo-photos/sources.json.
const localPhoto = (module: number) => {
  const asset = Asset.fromModule(module);
  return asset.localUri ?? asset.uri;
};

export const demoRequestPhotos = {
  matcha: localPhoto(require('../../assets/demo-photos/request-matcha.jpg')),
  pizza: localPhoto(require('../../assets/demo-photos/request-pizza.jpg')),
  headphones: localPhoto(require('../../assets/demo-photos/request-headphones.jpg')),
  dinner: localPhoto(require('../../assets/demo-photos/request-dinner.jpg')),
  sketchbook: localPhoto(require('../../assets/demo-photos/request-sketchbook.jpg')),
  flowers: localPhoto(require('../../assets/demo-photos/request-flowers.jpg')),
  coffee: localPhoto(require('../../assets/demo-photos/request-coffee.jpg')),
  textbook: localPhoto(require('../../assets/demo-photos/request-textbook.jpg')),
} as const;

// Only the fixed seeded demo posts receive these overrides; real user uploads are untouched.
export const seededDemoPhotos: Record<string, { imageUrl: string; avatarUrl: string }> = {
  'ac300c68-eff7-cc9e-2851-160a1013c698': { imageUrl: demoRequestPhotos.matcha, avatarUrl: requiredDemoAvatar('u-jamie') },
  '201648dc-d2ea-0205-9819-f00ff300dc75': { imageUrl: demoRequestPhotos.pizza, avatarUrl: requiredDemoAvatar('u-alex') },
  '508d4bf4-10ab-e6cb-5390-8013321720e7': { imageUrl: demoRequestPhotos.headphones, avatarUrl: requiredDemoAvatar('u-taylor') },
  'ae9dc295-34fd-4c2b-2084-3333cec1f6db': { imageUrl: demoRequestPhotos.dinner, avatarUrl: requiredDemoAvatar('u-riley') },
  'b26014fa-4451-a694-02f0-cf2aa1a46624': { imageUrl: demoRequestPhotos.sketchbook, avatarUrl: requiredDemoAvatar('u-morgan') },
  '5f29bdaa-08cd-b7a7-b714-6dff1bd40104': { imageUrl: demoRequestPhotos.flowers, avatarUrl: requiredDemoAvatar('u-casey') },
  '9bb24532-31d8-6477-afe2-f53cb292b19c': { imageUrl: demoRequestPhotos.coffee, avatarUrl: requiredDemoAvatar('u-sam') },
  '72055f17-235c-cd91-7af6-fa65fbece8b7': { imageUrl: demoRequestPhotos.textbook, avatarUrl: requiredDemoAvatar('u-jordan') },
};
