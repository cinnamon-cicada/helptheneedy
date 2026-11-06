import { db } from './client';

export type Bucket = 'avatars' | 'post-photos';

const SIGNED_FOR_SECONDS = 60 * 60;
const cache = new Map<string, { url: string; expires: number }>();

/**
 * Turns stored image paths into URLs. Seeded demo data stores full https
 * URLs, which are used as they are; anything else is a path in a private
 * bucket and gets a signed URL. Missing or failed paths come back as null.
 */
export async function imageUrls(bucket: Bucket, paths: (string | null)[]): Promise<(string | null)[]> {
  const now = Date.now();
  const toSign = [
    ...new Set(
      paths.filter((p): p is string => !!p && !/^https?:\/\//.test(p) && !((cache.get(`${bucket}/${p}`)?.expires ?? 0) > now)),
    ),
  ];
  if (toSign.length > 0) {
    const { data } = await db().storage.from(bucket).createSignedUrls(toSign, SIGNED_FOR_SECONDS);
    for (const row of data ?? []) {
      // Refresh a few minutes early so a URL never expires while it's on screen.
      if (row.path && row.signedUrl) cache.set(`${bucket}/${row.path}`, { url: row.signedUrl, expires: now + (SIGNED_FOR_SECONDS - 300) * 1000 });
    }
  }
  return paths.map((p) => (!p ? null : /^https?:\/\//.test(p) ? p : (cache.get(`${bucket}/${p}`)?.url ?? null)));
}

export async function imageUrl(bucket: Bucket, path: string | null): Promise<string | null> {
  return (await imageUrls(bucket, [path]))[0];
}
