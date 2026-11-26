alter table public.moderation_logs
  drop constraint if exists moderation_logs_target_type_check;

alter table public.moderation_logs
  add constraint moderation_logs_target_type_check
  check (target_type is null or length(trim(target_type)) > 0);
