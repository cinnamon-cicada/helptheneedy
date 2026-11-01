-- Sends new notifications to the send-push Edge Function.
-- Needs vault secrets named project_url and push_webhook_secret. Without them,
-- notifications still reach open apps through Realtime.

create extension if not exists pg_net;

create function private.dispatch_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  url text;
  secret text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into secret from vault.decrypted_secrets where name = 'push_webhook_secret';
  if url is null or secret is null then
    return new;
  end if;
  perform net.http_post(
    url := url || '/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', secret),
    body := jsonb_build_object('notification_id', new.id)
  );
  return new;
exception
  when others then
    -- A push failure must never undo the action that caused the notification.
    raise warning 'dispatch_push failed: %', sqlerrm;
    return new;
end $$;

create trigger notifications_dispatch_push
  after insert on public.notifications
  for each row execute function private.dispatch_push();

-- Grants

revoke execute on all functions in schema public, private from public, anon;
