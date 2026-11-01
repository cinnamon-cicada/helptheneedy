export const BUCKETS = ["avatars", "post-photos"];
const PAGE_SIZE = 100;

export type StorageBucket = {
  list(folder: string, options: { limit: number }): Promise<{ data: { name: string }[] | null; error: unknown }>;
  remove(paths: string[]): Promise<{ error: unknown }>;
};

// Removes every file in the user's folder. Each removal shrinks the listing,
// so this keeps asking for the first page until it comes back empty.
export async function removeUserFiles(
  bucketFor: (bucket: string) => StorageBucket,
  userId: string,
): Promise<void> {
  for (const name of BUCKETS) {
    const bucket = bucketFor(name);
    while (true) {
      const { data, error } = await bucket.list(userId, { limit: PAGE_SIZE });
      if (error) throw error;
      if (!data || data.length === 0) break;
      const removal = await bucket.remove(data.map((file) => `${userId}/${file.name}`));
      if (removal.error) throw removal.error;
    }
  }
}
