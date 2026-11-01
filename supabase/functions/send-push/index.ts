import { createClient } from "npm:@supabase/supabase-js@2";
import { deliver, renderMessage, secretsMatch } from "./push.ts";

Deno.serve(async (req) => {
  if (!secretsMatch(req.headers.get("x-webhook-secret"), Deno.env.get("PUSH_WEBHOOK_SECRET"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const { notification_id: notificationId } = await req.json();

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: notification, error } = await db
    .from("notifications")
    .select("user_id, type, payload")
    .eq("id", notificationId)
    .maybeSingle();
  if (error) return new Response(error.message, { status: 500 });
  if (!notification) return new Response("Notification not found", { status: 404 });

  const message = renderMessage(notification.type);
  const { data: settings } = await db
    .from("privacy_settings")
    .select("push_enabled")
    .eq("user_id", notification.user_id)
    .maybeSingle();
  if (!message || !settings?.push_enabled) return new Response(null, { status: 204 });

  const { data: tokens } = await db
    .from("push_tokens")
    .select("expo_push_token")
    .eq("user_id", notification.user_id);
  const invalid = await deliver(
    (tokens ?? []).map((row) => row.expo_push_token),
    message,
    notification.payload,
  );
  if (invalid.length > 0) {
    await db.from("push_tokens").delete().in("expo_push_token", invalid);
  }
  return new Response(null, { status: 204 });
});
