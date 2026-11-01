import assert from "node:assert/strict";
import { test } from "node:test";
import { deliver, renderMessage, secretsMatch } from "../send-push/push.ts";

const message = { title: "t", body: "b" };

function expoResponse(tickets: unknown[]) {
  return new Response(JSON.stringify({ data: tickets }), { status: 200 });
}

test("reports only tokens Expo says are unregistered", async () => {
  const fetchFn = (async () =>
    expoResponse([
      { status: "ok" },
      { status: "error", details: { error: "DeviceNotRegistered" } },
      { status: "error", details: { error: "MessageRateExceeded" } },
    ])) as typeof fetch;
  assert.deepEqual(await deliver(["a", "b", "c"], message, {}, fetchFn), ["b"]);
});

test("splits large sends into batches of 100", async () => {
  const sizes: number[] = [];
  const fetchFn = (async (_url: string, init: RequestInit) => {
    const batch = JSON.parse(init.body as string);
    sizes.push(batch.length);
    return expoResponse(batch.map(() => ({ status: "ok" })));
  }) as typeof fetch;
  await deliver(Array.from({ length: 250 }, (_, i) => `t${i}`), message, {}, fetchFn);
  assert.deepEqual(sizes, [100, 100, 50]);
});

test("sends nothing without tokens", async () => {
  const fetchFn = (async () => assert.fail("should not call Expo")) as typeof fetch;
  assert.deepEqual(await deliver([], message, {}, fetchFn), []);
});

test("throws when Expo fails", async () => {
  const fetchFn = (async () => new Response("", { status: 500 })) as typeof fetch;
  await assert.rejects(deliver(["a"], message, {}, fetchFn));
});

test("has a message for known types only", () => {
  assert.ok(renderMessage("gift_recorded"));
  assert.equal(renderMessage("unknown"), null);
});

test("compares webhook secrets", () => {
  assert.equal(secretsMatch("abc", "abc"), true);
  assert.equal(secretsMatch("abd", "abc"), false);
  assert.equal(secretsMatch("ab", "abc"), false);
  assert.equal(secretsMatch(null, "abc"), false);
  assert.equal(secretsMatch("abc", undefined), false);
});
