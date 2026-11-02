import type { Category } from '../types';

export type Photo = { uri: string; width: number; height: number };

export type CropAspect = 'original' | 'card' | 'square' | 'portrait' | 'landscape';
export type CropSpec = { aspect: CropAspect; rotation: 0 | 90 | 180 | 270 };

export type FilterId = 'none' | 'warm' | 'golden' | 'soft' | 'cool' | 'mono';

/**
 * Text or a sticker placed on the photo. Positions and sizes are fractions of
 * the photo, so the overlay lands in the same place at any display size.
 */
export type Overlay = {
  id: string;
  kind: 'text' | 'sticker';
  content: string;
  /** Centre, 0–1 across and down the photo. */
  x: number;
  y: number;
  /** Font size as a fraction of the photo's width. */
  size: number;
  color: string;
};

/** A photo with its on-device edits, as a card draws it. */
export type PostPhoto = { photo: Photo; filter: FilterId; overlays: Overlay[] };

/** Edits are stored as data and drawn over the photo, never baked in. */
export type PhotoEdits = { crop: CropSpec; filter: FilterId; overlays: Overlay[] };

export type DetailsDraft = {
  title: string;
  price: string;
  category: Category | null;
  description: string;
  giftInstructions: string;
};

export type MyPost = {
  id: string;
  /** Photo after crop/rotate; the camera or library original is untouched. */
  photo: Photo;
  filter: FilterId;
  overlays: Overlay[];
  title: string;
  /** Money is always integer cents; null on a draft saved without a price. */
  amountCents: number | null;
  category: Category | null;
  description: string;
  hashtags: string[];
  /** Ids of mentioned friends. */
  mentionIds: string[];
  /** 'open' once every required field is filled in; otherwise a draft. */
  status: 'draft' | 'open';
  createdAt: number;
};
