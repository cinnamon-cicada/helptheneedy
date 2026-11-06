import { useCallback, useEffect, useMemo, useState } from 'react';

import { fetchOpenRequests } from '../api/posts';
import { useAuth } from '../auth/AuthContext';
import { mockRequests } from '../data/mockRequests';
import { useDemo } from '../demo/DemoProvider';
import { useMyPosts } from '../post/MyPostsContext';
import { toGiftRequest } from '../post/toGiftRequest';
import type { Comment, Filters, GiftRequest } from '../types';

export const DEFAULT_FILTERS: Filters = { category: 'All', maxAmountCents: null };

type ReactionKind = 'hearts' | 'sparkles';

/**
 * Business state for Discover. With Supabase configured, other people's
 * requests are the open posts there; otherwise they're mock data. Skips,
 * saves, reactions and comments stay in local state. Animation state stays
 * in the card components.
 */
export function useDiscoverState() {
  const { profile: me, online } = useDemo();
  const { account } = useAuth();
  const myId = account?.user.id ?? null;
  const [others, setOthers] = useState<GiftRequest[]>(online ? [] : mockRequests);
  // Bumped by Start over, which fetches the posts again with their new amounts.
  const [loadKey, setLoadKey] = useState(0);
  const fetchKey = `${myId}:${loadKey}`;
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const loading = online && loadedKey !== fetchKey;

  useEffect(() => {
    if (!online || !myId) return;
    let cancelled = false;
    fetchOpenRequests(myId)
      .then((cards) => !cancelled && setOthers(cards))
      .catch(() => undefined)
      .finally(() => !cancelled && setLoadedKey(fetchKey));
    return () => {
      cancelled = true;
    };
  }, [online, myId, fetchKey]);
  // Wishes you posted go to the front of the deck. Reactions and comments on
  // them are kept here, keyed by id, since the posts themselves live elsewhere.
  const { posts } = useMyPosts();
  const [mineEdits, setMineEdits] = useState<Record<string, GiftRequest>>({});
  const mine = useMemo(
    () =>
      posts.flatMap((p) => {
        const card = toGiftRequest(p);
        return card ? [mineEdits[card.id] ?? card] : [];
      }),
    [posts, mineEdits],
  );
  const requests = useMemo(() => [...mine, ...others], [mine, others]);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  // IDs the user has swiped past or gifted, in order.
  const [handledIds, setHandledIds] = useState<string[]>([]);
  const [myReactions, setMyReactions] = useState<Record<string, Partial<Record<ReactionKind, boolean>>>>({});

  const select = useCallback(
    (f: Filters) => {
      const handled = new Set(handledIds);
      return requests.filter(
        (r) =>
          !handled.has(r.id) &&
          (f.category === 'All' || r.category === f.category) &&
          (f.maxAmountCents === null || r.amountCents <= f.maxAmountCents),
      );
    },
    [requests, handledIds],
  );

  const queue = useMemo(() => select(filters), [select, filters]);
  const availableCategories = useMemo(() => [...new Set(requests.map((r) => r.category))], [requests]);
  const countFor = useCallback((f: Filters) => select(f).length, [select]);
  const filtersActive =
    filters.category !== DEFAULT_FILTERS.category || filters.maxAmountCents !== DEFAULT_FILTERS.maxAmountCents;

  const updateRequest = useCallback(
    (id: string, fn: (r: GiftRequest) => GiftRequest) => {
      const own = mine.find((r) => r.id === id);
      if (own) setMineEdits((prev) => ({ ...prev, [id]: fn(prev[id] ?? own) }));
      else setOthers((prev) => prev.map((r) => (r.id === id ? fn(r) : r)));
    },
    [mine],
  );

  const markHandled = useCallback((id: string) => {
    setHandledIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const toggleSaved = useCallback(
    (id: string) => updateRequest(id, (r) => ({ ...r, saved: !r.saved })),
    [updateRequest],
  );

  const toggleReaction = useCallback(
    (id: string, kind: ReactionKind) => {
      const wasOn = !!myReactions[id]?.[kind];
      setMyReactions((prev) => ({ ...prev, [id]: { ...prev[id], [kind]: !wasOn } }));
      updateRequest(id, (r) => ({
        ...r,
        reactions: { ...r.reactions, [kind]: r.reactions[kind] + (wasOn ? -1 : 1) },
      }));
    },
    [myReactions, updateRequest],
  );

  const toggleCommentLike = useCallback(
    (requestId: string, commentId: string) =>
      updateRequest(requestId, (r) => ({
        ...r,
        comments: r.comments.map((cm) =>
          cm.id === commentId
            ? { ...cm, likedByMe: !cm.likedByMe, likes: cm.likes + (cm.likedByMe ? -1 : 1) }
            : cm,
        ),
      })),
    [updateRequest],
  );

  const addComment = useCallback(
    (requestId: string, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const comment: Comment = {
        id: `local-${Date.now()}`,
        username: me.username,
        avatarUrl: me.avatarUrl,
        text: trimmed,
        minutesAgo: 0,
        likes: 0,
        likedByMe: false,
      };
      updateRequest(requestId, (r) => ({ ...r, comments: [comment, ...r.comments] }));
    },
    [me, updateRequest],
  );

  const startOver = useCallback(() => {
    setHandledIds([]);
    setLoadKey((n) => n + 1);
  }, []);

  return {
    queue,
    filters,
    setFilters,
    filtersActive,
    countFor,
    availableCategories,
    markHandled,
    toggleSaved,
    toggleReaction,
    myReactions,
    toggleCommentLike,
    addComment,
    startOver,
    loading,
  };
}

export type DiscoverState = ReturnType<typeof useDiscoverState>;
