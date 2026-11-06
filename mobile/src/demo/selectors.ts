import { useMemo } from 'react';

import type { ProfileSection } from '../components/ProfileShortcutGrid';
import { MOCK_ACTIVITY, MOCK_PROFILE, PROFILE_LISTS } from '../data/mockProfile';
import type { ActivityRecord, ProfileListItem, UserProfile } from '../types';
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

export function useProfileLists(): typeof PROFILE_LISTS {
  const { gifts } = useDemo();
  return useMemo(() => {
    const sent: ProfileListItem[] = gifts.map((g) => ({
      id: g.id,
      title: `${formatCents(g.amountCents)} to ${g.recipientName}`,
      detail: formatTimeAgo(minutesSince(g.at)),
      requestId: g.requestId,
    }));
    const lists = { ...PROFILE_LISTS };
    const key: ProfileSection = 'gifts-sent';
    lists[key] = { ...lists[key], items: [...sent, ...lists[key].items] };
    return lists;
  }, [gifts]);
}
