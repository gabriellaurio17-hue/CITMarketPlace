alter table public.moderation_logs
  drop constraint if exists moderation_logs_action_check;

alter table public.moderation_logs
  add constraint moderation_logs_action_check
  check (length(trim(action)) > 0);
