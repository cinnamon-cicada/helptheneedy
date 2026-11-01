import assert from "node:assert/strict";
import { test } from "node:test";
import { removeUserFiles, type StorageBucket } from "../delete-account/account.ts";

function fakeStorage(files: Record<string, string[]>) {
  const removed: string[] = [];
  const bucketFor = (name: string): StorageBucket => ({
    list: async (_folder, { limit }) => ({
      data: (files[name] ?? []).slice(0, limit).map((file) => ({ name: file })),
      error: null,
    }),
    remove: async (paths) => {
      removed.push(...paths.map((path) => `${name}:${path}`));
      files[name] = (files[name] ?? []).filter((file) => !paths.some((path) => path.endsWith(`/${file}`)));
      return { error: null };
    },
  });
  return { bucketFor, removed };
}

test("removes every file across buckets and pages", async () => {
  const many = Array.from({ length: 150 }, (_, i) => `p${i}.jpg`);
  const { bucketFor, removed } = fakeStorage({ avatars: ["a.jpg"], "post-photos": many });
  await removeUserFiles(bucketFor, "user-1");
  assert.equal(removed.length, 151);
  assert.ok(removed.includes("avatars:user-1/a.jpg"));
  assert.ok(removed.includes("post-photos:user-1/p149.jpg"));
});

test("stops on a listing error", async () => {
  const bucketFor = (): StorageBucket => ({
    list: async () => ({ data: null, error: new Error("boom") }),
    remove: async () => ({ error: null }),
  });
  await assert.rejects(removeUserFiles(bucketFor, "user-1"), /boom/);
});
