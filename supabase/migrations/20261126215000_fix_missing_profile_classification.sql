create or replace function public.get_my_profile()
returns setof public.profiles
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  auth_user_row auth.users%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  select * into auth_user_row from auth.users where id = auth.uid();
  if not found then
    raise exception 'Authenticated user was not found';
  end if;

  insert into public.profiles (
    id, username, full_name, email, role, classification,
    account_status, verification_status, is_verified
  )
  values (
    auth_user_row.id,
    auth_user_row.raw_user_meta_data ->> 'username',
    coalesce(
      auth_user_row.raw_user_meta_data ->> 'full_name',
      auth_user_row.raw_user_meta_data ->> 'username',
      auth_user_row.email
    ),
    auth_user_row.email,
    'user',
    coalesce(
      nullif(trim(auth_user_row.raw_user_meta_data ->> 'classification'), ''),
      'Student'
    ),
    'active',
    'pending',
    false
  )
  on conflict (id) do nothing;

  return query select profile_row.* from public.profiles as profile_row where profile_row.id = auth.uid();
end
$$;
