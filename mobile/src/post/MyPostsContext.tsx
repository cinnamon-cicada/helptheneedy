import { createContext, use, useMemo, useState } from 'react';

import type { MyPost } from './types';

type MyPostsState = {
  posts: MyPost[];
  addPost: (post: MyPost) => void;
};

const MyPostsContext = createContext<MyPostsState | null>(null);

/**
 * Posts made on this device, newest first. Local state only: nothing is
 * uploaded, and posts reset when the app reloads.
 */
export function MyPostsProvider({ children }: { children: React.ReactNode }) {
  const [posts, setPosts] = useState<MyPost[]>([]);
  const value = useMemo(() => ({ posts, addPost: (post: MyPost) => setPosts((p) => [post, ...p]) }), [posts]);
  return <MyPostsContext value={value}>{children}</MyPostsContext>;
}

export function useMyPosts() {
  const value = use(MyPostsContext);
  if (!value) throw new Error('useMyPosts must be used inside MyPostsProvider');
  return value;
}
