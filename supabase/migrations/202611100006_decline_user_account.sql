-- Allow an administrator to decline an unverified account and remove it from the active queue.

alter table public.moderation_logs
  drop constraint if exists moderation_logs_action_check;

alter table public.moderation_logs
  add constraint moderation_logs_action_check
  check (action in ('approve', 'reject', 'delete', 'verify', 'decline', 'resolve', 'dismiss'));

create or replace function public.admin_decline_profile(p_user_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  update public.profiles set is_verified = false, account_status = 'inactive' where id = p_user_id;
  if not found then raise exception 'Profile not found'; end if;
  insert into public.moderation_logs (admin_id, action, target_type, target_id, note)
  values (auth.uid(), 'decline', 'user', p_user_id, coalesce(p_note, 'Account verification declined'));
  insert into public.notifications (user_id, type, message)
  values (p_user_id, 'account_status', 'Your CIT Marketplace account could not be verified. Please contact an administrator if you believe this is an error.');
end;
$$;

grant execute on function public.admin_decline_profile(uuid, text) to authenticated;
revoke all on function public.admin_decline_profile(uuid, text) from public, anon;
