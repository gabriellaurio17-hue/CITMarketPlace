-- Allow trusted SQL Editor/database administrator sessions to bootstrap the
-- first admin account. App requests still require the existing admin check.

create or replace function public.protect_profile_privileged_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if session_user in ('postgres', 'supabase_admin')
    or current_user in ('postgres', 'supabase_admin') then
    return new;
  end if;

  if not public.is_admin() and (
    new.role is distinct from old.role
    or new.is_verified is distinct from old.is_verified
    or new.account_status is distinct from old.account_status
    or new.email is distinct from old.email
  ) then
    raise exception 'Only an administrator can change role or verification status';
  end if;

  return new;
end;
$$;
