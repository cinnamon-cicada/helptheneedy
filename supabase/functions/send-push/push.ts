const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

export type PushMessage = { title: string; body: string };

const MESSAGES: Record<string, PushMessage> = {
  match_request: { title: "Someone wants to help", body: "A gifter offered to help with your post." },
  match_created: { title: "It's a match", body: "You've matched on a post." },
  gift_recorded: { title: "Gift recorded", body: "A gifter says they sent you a gift. Please confirm it." },
  gift_confirmed: { title: "Gift confirmed", body: "Your gift was confirmed. Thank you." },
  gift_disputed: { title: "Gift disputed", body: "A receiver says they didn't get your gift." },
  new_follower: { title: "New follower", body: "Someone started following you." },
};

export function renderMessage(type: string): PushMessage | null {
  return MESSAGES[type] ?? null;
}

export function secretsMatch(given: string | null, expected: string | undefined): boolean {
  if (!given || !expected || given.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < given.length; i++) diff |= given.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}

// Sends through Expo and returns the tokens Expo says are no longer valid.
export async function deliver(
  tokens: string[],
  message: PushMessage,
  data: Record<string, unknown>,
  fetchFn: typeof fetch = fetch,
): Promise<string[]> {
  const invalid: string[] = [];
  for (let i = 0; i < tokens.length; i += EXPO_BATCH_SIZE) {
    const batch = tokens.slice(i, i + EXPO_BATCH_SIZE);
    const response = await fetchFn(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch.map((to) => ({ to, ...message, data }))),
    });
    if (!response.ok) throw new Error(`Expo push failed with status ${response.status}`);
    const { data: tickets } = await response.json();
    tickets.forEach((ticket: { status: string; details?: { error?: string } }, index: number) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        invalid.push(batch[index]);
      }
    });
  }
  return invalid;
}
