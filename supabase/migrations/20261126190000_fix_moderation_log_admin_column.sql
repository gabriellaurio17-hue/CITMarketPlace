create or replace function public.write_moderation_log(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_admin_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  has_admin_id boolean;
  has_administrator_id boolean;
begin
  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'moderation_logs'
      and column_name = 'admin_id'
  ) into has_admin_id;

  select exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'moderation_logs'
      and column_name = 'administrator_id'
  ) into has_administrator_id;

  if has_admin_id and has_administrator_id then
    execute '
      insert into public.moderation_logs
        (action, target_type, target_id, admin_id, administrator_id, reason)
      values ($1, $2, $3, $4, $4, $5)'
      using p_action, p_target_type, p_target_id, p_admin_id, p_reason;
  elsif has_admin_id then
    execute '
      insert into public.moderation_logs
        (action, target_type, target_id, admin_id, reason)
      values ($1, $2, $3, $4, $5)'
      using p_action, p_target_type, p_target_id, p_admin_id, p_reason;
  elsif has_administrator_id then
    execute '
      insert into public.moderation_logs
        (action, target_type, target_id, administrator_id, reason)
      values ($1, $2, $3, $4, $5)'
      using p_action, p_target_type, p_target_id, p_admin_id, p_reason;
  else
    raise exception 'moderation_logs has no administrator ID column';
  end if;
end
$$;

create or replace function public.admin_set_profile_verification(
  target_user_id uuid,
  approve boolean
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  changed_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;

  update public.profiles
  set is_verified = approve,
      verification_status = case when approve then 'approved' else 'rejected' end,
      account_status = case when approve then 'active' else 'inactive' end,
      updated_at = now()
  where id = target_user_id
    and coalesce(role, 'user') <> 'admin'
    and coalesce(classification, '') <> 'Admin'
  returning id into changed_user_id;

  if changed_user_id is null then
    raise exception 'The account could not be found or cannot be moderated';
  end if;

  insert into public.notifications (user_id, type, message, is_read)
  values (
    changed_user_id,
    case when approve then 'account_verified' else 'account_rejected' end,
    case when approve
      then 'The administrator approved your marketplace account.'
      else 'The administrator rejected your account verification.'
    end,
    false
  );

  perform public.write_moderation_log(
    case when approve then 'accounts_verify' else 'accounts_decline' end,
    'accounts',
    changed_user_id,
    auth.uid(),
    case when approve then 'verify' else 'decline' end
  );
end
$$;

create or replace function public.record_admin_moderation_action(
  p_action text,
  p_target_type text,
  p_target_id uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;

  perform public.write_moderation_log(
    p_action,
    p_target_type,
    p_target_id,
    auth.uid(),
    p_reason
  );
end
$$;

revoke all on function public.write_moderation_log(text, text, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_profile_verification(uuid, boolean) to authenticated;
grant execute on function public.record_admin_moderation_action(text, text, uuid, text) to authenticated;
