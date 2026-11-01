import { createClient } from "npm:@supabase/supabase-js@2";
import { removeUserFiles } from "./account.ts";

// Removes the caller's files and account. Foreign keys remove their personal
// data and keep anonymized gift records.
Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: { user }, error: authError } = await admin.auth.getUser(token);
  if (authError || !user) return new Response("Unauthorized", { status: 401 });

  await removeUserFiles((bucket) => admin.storage.from(bucket), user.id);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
});
