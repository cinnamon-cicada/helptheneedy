import { useMemo } from 'react';

import type { ProfileSection } from '../components/ProfileShortcutGrid';
import { findRequest, MOCK_ACTIVITY, MOCK_PROFILE, PROFILE_LISTS } from '../data/mockProfile';
import { useMyPosts } from '../post/MyPostsContext';
import { toGiftRequest } from '../post/toGiftRequest';
import type { ActivityRecord, GiftRequest, ProfileListItem, UserProfile } from '../types';
import { formatCents, formatTimeAgo } from '../utils/format';
import { type DemoGift, useDemo } from './DemoProvider';

const minutesSince = (at: number) => Math.max(0, Math.floor((Date.now() - at) / 60_000));

/** The signed-in profile: saved edits, plus demo gifts added to the mock totals. */
export function useMyProfile(): UserProfile {
  const { profile, gifts } = useDemo();
  return useMemo(() => {
    const giftedCents = gifts.reduce((sum, g) => sum + g.amountCents, 0);
    const newRecipients = new Set(gifts.map((g) => g.recipientId)).size;
    return {
      ...MOCK_PROFILE,
      ...profile,
      totalGiftedCents: MOCK_PROFILE.totalGiftedCents + giftedCents,
      peopleHelped: MOCK_PROFILE.peopleHelped + newRecipients,
    };
  }, [profile, gifts]);
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
  const { gifts } = useDemo();
  return useMemo(
    () => [...gifts.map(toActivity), ...MOCK_ACTIVITY].sort((a, b) => a.minutesAgo - b.minutesAgo),
    [gifts],
  );
}

/** The Profile lists, with demo gifts first in Gifts Sent and posts made on this device first in My Posts. */
export function useProfileLists(): typeof PROFILE_LISTS {
  const { gifts } = useDemo();
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
      [sentKey]: { ...PROFILE_LISTS[sentKey], items: [...sent, ...PROFILE_LISTS[sentKey].items] },
      [postsKey]: { ...PROFILE_LISTS[postsKey], items: [...mine, ...PROFILE_LISTS[postsKey].items] },
    };
  }, [gifts, posts]);
}

/** Finds a request to open as a full card, including wishes posted on this device. Drafts have no card. */
export function useFindRequest(): (id: string) => GiftRequest | undefined {
  const { posts } = useMyPosts();
  return useMemo(() => {
    const mine = posts.flatMap((p) => {
      const card = toGiftRequest(p);
      return card ? [card] : [];
    });
    return (id: string) => mine.find((r) => r.id === id) ?? findRequest(id);
  }, [posts]);
}
