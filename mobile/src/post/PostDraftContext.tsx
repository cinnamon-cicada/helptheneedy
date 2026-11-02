import { createContext, use, useMemo, useState } from 'react';

import { NO_CROP } from './photo';
import type { DetailsDraft, Overlay, Photo, PhotoEdits } from './types';

const EMPTY_EDITS: PhotoEdits = { crop: NO_CROP, filter: 'none', overlays: [] };
export const EMPTY_DETAILS: DetailsDraft = {
  title: '',
  price: '',
  category: null,
  description: '',
  giftInstructions: '',
};

type Draft = {
  /** Exactly as taken or picked. */
  source: Photo | null;
  /** The source after crop/rotate; what overlays and filters sit on. */
  photo: Photo | null;
  edits: PhotoEdits;
  details: DetailsDraft;
};

function usePostDraftState() {
  const [draft, setDraft] = useState<Draft>({ source: null, photo: null, edits: EMPTY_EDITS, details: EMPTY_DETAILS });

  const actions = useMemo(
    () => ({
      /** New photo: edits start fresh, typed details are kept. */
      setSource: (photo: Photo) => setDraft((d) => ({ ...d, source: photo, photo, edits: EMPTY_EDITS })),
      /** Back to the live camera; typed details are kept. */
      clearPhoto: () => setDraft((d) => ({ ...d, source: null, photo: null, edits: EMPTY_EDITS })),
      setPhoto: (photo: Photo, crop: PhotoEdits['crop']) =>
        setDraft((d) => ({ ...d, photo, edits: { ...d.edits, crop } })),
      setFilter: (filter: PhotoEdits['filter']) => setDraft((d) => ({ ...d, edits: { ...d.edits, filter } })),
      addOverlay: (overlay: Overlay) =>
        setDraft((d) => ({ ...d, edits: { ...d.edits, overlays: [...d.edits.overlays, overlay] } })),
      updateOverlay: (id: string, patch: Partial<Overlay>) =>
        setDraft((d) => ({
          ...d,
          edits: { ...d.edits, overlays: d.edits.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)) },
        })),
      removeOverlay: (id: string) =>
        setDraft((d) => ({ ...d, edits: { ...d.edits, overlays: d.edits.overlays.filter((o) => o.id !== id) } })),
      setDetails: (patch: Partial<DetailsDraft>) => setDraft((d) => ({ ...d, details: { ...d.details, ...patch } })),
      reset: () => setDraft({ source: null, photo: null, edits: EMPTY_EDITS, details: EMPTY_DETAILS }),
    }),
    [],
  );

  return { draft, ...actions };
}

type PostDraftState = ReturnType<typeof usePostDraftState>;

const PostDraftContext = createContext<PostDraftState | null>(null);

/** Holds the post being created for the whole flow, so going back never loses input. */
export function PostDraftProvider({ children }: { children: React.ReactNode }) {
  const value = usePostDraftState();
  return <PostDraftContext value={value}>{children}</PostDraftContext>;
}

export function usePostDraft() {
  const value = use(PostDraftContext);
  if (!value) throw new Error('usePostDraft must be used inside PostDraftProvider');
  return value;
}

export function hasTypedDetails(details: DetailsDraft) {
  return Object.entries(details).some(([key, v]) => (key === 'category' ? v !== null : String(v).trim() !== ''));
}
