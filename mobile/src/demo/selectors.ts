import { useMemo } from 'react';

import type { ProfileSection } from '../components/ProfileShortcutGrid';
import { findRequest, MOCK_ACTIVITY, MOCK_PROFILE, PROFILE_LISTS } from '../data/mockProfile';
import { useMyPosts } from '../post/MyPostsContext';
import { knownRequest } from '../api/posts';
import { toGiftRequest } from '../post/toGiftRequest';
import type { ActivityRecord, GiftRequest, ProfileListItem, UserProfile } from '../types';
import { formatCents, formatTimeAgo } from '../utils/format';
import { type DemoGift, useDemo } from './DemoProvider';

const minutesSince = (at: number) => Math.max(0, Math.floor((Date.now() - at) / 60_000));

/**
 * The signed-in profile. Online, totals come from the account's gifts in
 * Supabase. Offline, demo gifts are added to the mock totals.
 */
export function useMyProfile(): UserProfile {
  const { profile, gifts, online, giftedCents } = useDemo();
  return useMemo(() => {
    const sentCents = gifts.reduce((sum, g) => sum + g.amountCents, 0);
    const recipients = new Set(gifts.map((g) => g.recipientId)).size;
    return {
      ...MOCK_PROFILE,
      ...profile,
      totalGiftedCents: online ? (giftedCents ?? sentCents) : MOCK_PROFILE.totalGiftedCents + sentCents,
      peopleHelped: online ? recipients : MOCK_PROFILE.peopleHelped + recipients,
    };
  }, [profile, gifts, online, giftedCents]);
}

function toActivity(g: DemoGift): ActivityRecord {
  return {
    id: g.id,
    kind: 'gift_sent',
    amountCents: g.amountCents,
    recipientName: g.recipientName,
    minutesAgo: minutesSince(g.at),
    requestId: g.requestId,
  };
}

/** Newest first. */
export function useMyActivity(): ActivityRecord[] {
  const { gifts, online } = useDemo();
  return useMemo(
    // Online, the mock history would disagree with the real totals, so only real gifts show.
    () => [...gifts.map(toActivity), ...(online ? [] : MOCK_ACTIVITY)].sort((a, b) => a.minutesAgo - b.minutesAgo),
    [gifts, online],
  );
}

/** The Profile lists, with demo gifts first in Gifts Sent and posts made on this device first in My Posts. */
export function useProfileLists(): typeof PROFILE_LISTS {
  const { gifts, online } = useDemo();
  const { posts } = useMyPosts();
  return useMemo(() => {
    const sent: ProfileListItem[] = gifts.map((g) => ({
      id: g.id,
      title: `${formatCents(g.amountCents)} to ${g.recipientName}`,
      detail: formatTimeAgo(minutesSince(g.at)),
      requestId: g.requestId,
    }));
    const mine: ProfileListItem[] = posts.map((p) => ({
      id: p.id,
      title: p.title,
      detail: [p.amountCents !== null ? formatCents(p.amountCents) : null, p.status === 'draft' ? 'Draft' : 'In Discover']
        .filter(Boolean)
        .join(' · '),
      requestId: p.id,
    }));
    const sentKey: ProfileSection = 'gifts-sent';
    const postsKey: ProfileSection = 'my-posts';
    return {
      ...PROFILE_LISTS,
      [sentKey]: { ...PROFILE_LISTS[sentKey], items: online ? sent : [...sent, ...PROFILE_LISTS[sentKey].items] },
      [postsKey]: { ...PROFILE_LISTS[postsKey], items: [...mine, ...PROFILE_LISTS[postsKey].items] },
    };
  }, [gifts, posts, online]);
}

/** Finds a request to open as a full card, including wishes posted on this device. Drafts have no card. */
export function useFindRequest(): (id: string) => GiftRequest | undefined {
  const { posts } = useMyPosts();
  return useMemo(() => {
    const mine = posts.flatMap((p) => {
      const card = toGiftRequest(p);
      return card ? [card] : [];
    });
    return (id: string) => mine.find((r) => r.id === id) ?? knownRequest(id) ?? findRequest(id);
  }, [posts]);
}
