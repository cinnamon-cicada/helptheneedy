import { db, rpc, toApiError } from './client';

/**
 * Logs a gift to a demo receiver. The backend records it as confirmed right
 * away, tagged with the giver and receiver, and the leaderboards update.
 * No money moves; the balance it comes out of stays on this device.
 */
export function sendDemoGift(postId: string, amountCents: number, anonymous: boolean): Promise<string> {
  return rpc<string>('demo_send_gift', {
    p_post_id: postId,
    p_amount_cents: amountCents,
    p_is_anonymous: anonymous,
  });
}

export type SentGift = {
  id: string;
  postId: string | null;
  recipientId: string;
  recipientName: string;
  amountCents: number;
  anonymous: boolean;
  /** Epoch milliseconds. */
  at: number;
};

type GiftRow = {
  id: string;
  post_id: string | null;
  receiver_id: string | null;
  amount_cents: number;
  is_anonymous: boolean;
  confirmed_at: string | null;
  created_at: string;
  receiver: { display_name: string | null; username: string | null } | null;
};

/** Your confirmed gifts, newest first. RLS returns only gifts you sent or received. */
export async function fetchMyGifts(userId: string): Promise<SentGift[]> {
  const { data, error } = await db()
    .from('gifts')
    .select(
      'id, post_id, receiver_id, amount_cents, is_anonymous, confirmed_at, created_at, receiver:profiles!gifts_receiver_id_fkey(display_name, username)',
    )
    .eq('gifter_id', userId)
    .eq('status', 'confirmed')
    .order('created_at', { ascending: false })
    .limit(200)
    .returns<GiftRow[]>();
  if (error) throw toApiError(error);
  return (data ?? []).map((g) => ({
    id: g.id,
    postId: g.post_id,
    recipientId: g.receiver_id ?? 'deleted',
    recipientName: g.receiver?.display_name ?? g.receiver?.username ?? 'Someone',
    amountCents: g.amount_cents,
    anonymous: g.is_anonymous,
    at: Date.parse(g.confirmed_at ?? g.created_at),
  }));
}
