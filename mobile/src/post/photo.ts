import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { CropAspect, CropSpec, FilterId, Photo } from './types';

/** Wish cards are 3:4 portrait, so the camera frames and crops to that. */
export const CARD_RATIO = 3 / 4;

export const CROP_RATIOS: Record<Exclude<CropAspect, 'original'>, number> = {
  card: CARD_RATIO,
  square: 1,
  portrait: 4 / 5,
  landscape: 16 / 9,
};

export const NO_CROP: CropSpec = { aspect: 'original', rotation: 0 };

/** Where an image of `w`×`h` lands inside a box, for contain or cover. */
export function fitRect(boxW: number, boxH: number, w: number, h: number, mode: 'contain' | 'cover') {
  const scale = mode === 'contain' ? Math.min(boxW / w, boxH / h) : Math.max(boxW / w, boxH / h);
  const width = w * scale;
  const height = h * scale;
  return { x: (boxW - width) / 2, y: (boxH - height) / 2, width, height };
}

/** Centred crop of a `w`×`h` image to `ratio` (width / height). */
export function centerCrop(w: number, h: number, ratio: number) {
  if (w / h > ratio) {
    const width = Math.round(h * ratio);
    return { originX: Math.round((w - width) / 2), originY: 0, width, height: h };
  }
  const height = Math.round(w / ratio);
  return { originX: 0, originY: Math.round((h - height) / 2), width: w, height };
}

/**
 * Applies a rotate + crop to the original photo with expo-image-manipulator.
 * Always starts from the original, so repeated edits never lose quality.
 */
export async function renderCrop(source: Photo, spec: CropSpec): Promise<Photo> {
  if (spec.aspect === 'original' && spec.rotation === 0) return source;
  const context = ImageManipulator.manipulate(source.uri);
  try {
    if (spec.rotation) context.rotate(spec.rotation);
    const turned = spec.rotation % 180 !== 0;
    const w = turned ? source.height : source.width;
    const h = turned ? source.width : source.height;
    if (spec.aspect !== 'original') context.crop(centerCrop(w, h, CROP_RATIOS[spec.aspect]));
    const image = await context.renderAsync();
    try {
      const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.92 });
      return { uri: saved.uri, width: saved.width, height: saved.height };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}

type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light' | 'saturation';
export type FilterLayer = { color: string; opacity: number; blend: BlendMode };

/**
 * Photo filters as colour layers composited over the image with blend modes
 * (native on iOS and Android, CSS on web). They stay editable and are drawn
 * wherever the post is shown.
 */
export const FILTERS: { id: FilterId; label: string; layers: FilterLayer[] }[] = [
  { id: 'none', label: 'Original', layers: [] },
  { id: 'warm', label: 'Warm', layers: [{ color: '#F29B65', opacity: 0.22, blend: 'soft-light' }] },
  { id: 'golden', label: 'Golden', layers: [{ color: '#F5C85C', opacity: 0.3, blend: 'overlay' }] },
  { id: 'soft', label: 'Soft', layers: [{ color: '#FFF6EA', opacity: 0.28, blend: 'screen' }] },
  { id: 'cool', label: 'Cool', layers: [{ color: '#8FB3D9', opacity: 0.22, blend: 'soft-light' }] },
  { id: 'mono', label: 'Mono', layers: [{ color: '#808080', opacity: 1, blend: 'saturation' }] },
];

export const filterLayers = (id: FilterId) => FILTERS.find((f) => f.id === id)?.layers ?? [];
