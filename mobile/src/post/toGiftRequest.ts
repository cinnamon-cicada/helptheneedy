import { MOCK_PROFILE } from '../data/mockProfile';
import type { GiftRequest } from '../types';
import type { MyPost } from './types';

/** Recipient id for your own wishes; tapping it opens your Profile. */
export const MY_RECIPIENT_ID = 'me';

/**
 * A posted wish as a Discover card. Drafts return null: they aren't public and
 * may have no price or category yet.
 */
export function toGiftRequest(post: MyPost): GiftRequest | null {
  if (post.status !== 'open' || post.amountCents === null || !post.category) return null;
  return {
    id: post.id,
    recipient: {
      id: MY_RECIPIENT_ID,
      displayName: MOCK_PROFILE.username,
      username: MOCK_PROFILE.username.toLowerCase(),
      avatarUrl: MOCK_PROFILE.avatarUrl,
    },
    imageUrl: post.photo.uri,
    postPhoto: { photo: post.photo, filter: post.filter, overlays: post.overlays },
    title: post.title,
    description: post.description,
    category: post.category,
    amountCents: post.amountCents,
    comments: [],
    reactions: { hearts: 0, sparkles: 0 },
    saved: false,
    isMine: true,
  };
}
