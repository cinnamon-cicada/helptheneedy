import { mockRequests } from '../data/mockRequests';
import type { Category, GiftRequest } from '../types';
import { db, toApiError } from './client';
import { imageUrls } from './images';

type PostRow = {
  id: string;
  receiver_id: string;
  title: string;
  story: string;
  category: string;
  goal_cents: number;
  raised_cents: number;
  post_photos: { storage_path: string; position: number }[];
  receiver: { id: string; username: string | null; display_name: string | null; avatar_path: string | null } | null;
};

const CATEGORIES: Category[] = ['Food', 'Product', 'Bills', 'School', 'Celebration'];

// Comments and reactions have no tables yet, so posts that match a mock request keep its sample ones.
const sampleByTitle = new Map(mockRequests.map((r) => [r.title, r]));

// Cards fetched this session, so Profile and Activity rows can open them as full cards.
const known = new Map<string, GiftRequest>();

export function knownRequest(id: string): GiftRequest | undefined {
  return known.get(id);
}

/**
 * Open posts other than your own, newest first, as Discover cards. The card's
 * amount is what's still needed, so a gift can never go past the goal.
 * RLS already hides posts from people you've blocked.
 */
export async function fetchOpenRequests(myId: string): Promise<GiftRequest[]> {
  const { data, error } = await db()
    .from('posts')
    .select(
      'id, receiver_id, title, story, category, goal_cents, raised_cents, post_photos(storage_path, position), receiver:profiles!posts_receiver_id_fkey(id, username, display_name, avatar_path)',
    )
    .eq('status', 'open')
    .neq('receiver_id', myId)
    .order('created_at', { ascending: false })
    .limit(50)
    .returns<PostRow[]>();
  if (error) throw toApiError(error);
  const rows = (data ?? []).filter((p) => p.goal_cents > p.raised_cents);

  const photos = await imageUrls(
    'post-photos',
    rows.map((p) => [...p.post_photos].sort((a, b) => a.position - b.position)[0]?.storage_path ?? null),
  );
  const avatars = await imageUrls('avatars', rows.map((p) => p.receiver?.avatar_path ?? null));

  const cards = rows.map((p, i): GiftRequest => {
    const sample = sampleByTitle.get(p.title);
    const name = p.receiver?.display_name ?? p.receiver?.username ?? 'Someone';
    return {
      id: p.id,
      recipient: {
        id: p.receiver_id,
        displayName: name.split(' ')[0],
        username: p.receiver?.username ?? '',
        age: sample?.recipient.age,
        avatarUrl: avatars[i] ?? sample?.recipient.avatarUrl ?? '',
      },
      imageUrl: photos[i] ?? sample?.imageUrl ?? '',
      title: p.title,
      description: p.story,
      category: (CATEGORIES.find((c) => c.toLowerCase() === p.category.toLowerCase()) ?? 'Product') as Category,
      amountCents: p.goal_cents - p.raised_cents,
      comments: sample?.comments ?? [],
      reactions: sample?.reactions ?? { hearts: 0, sparkles: 0 },
      saved: false,
    };
  });
  for (const card of cards) known.set(card.id, card);
  return cards;
}
