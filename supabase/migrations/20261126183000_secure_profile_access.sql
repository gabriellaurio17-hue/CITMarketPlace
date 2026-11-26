alter table public.profiles add column if not exists updated_at timestamptz not null default now();

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
  loop
    execute format('drop policy %I on public.profiles', existing_policy.policyname);
  end loop;
end
$$;

revoke all on table public.profiles from anon, authenticated;
grant select (id, username, full_name, classification)
  on table public.profiles to anon, authenticated;

create policy "Profiles expose public fields only"
  on public.profiles for select using (true);

create or replace function public.prevent_listing_owner_approval()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() = old.owner_id
    and not public.is_admin()
    and new.approval_status is distinct from old.approval_status
    and new.approval_status <> 'pending' then
    raise exception 'Listing owners cannot approve or reject their own listings';
  end if;
  return new;
end
$$;

drop trigger if exists listing_owner_cannot_approve on public.listings;
create trigger listing_owner_cannot_approve
  before update on public.listings
  for each row execute function public.prevent_listing_owner_approval();

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'reviews'
  loop
    execute format('drop policy %I on public.reviews', existing_policy.policyname);
  end loop;
end
$$;

create policy "Completed buyers can review sellers"
  on public.reviews for insert
  with check (
    reviewer_id = auth.uid()
    and exists (
      select 1
      from public.transactions t
      where t.id = public.reviews.transaction_id
        and t.buyer_id = auth.uid()
        and t.seller_id = public.reviews.seller_id
        and t.status = 'completed'
    )
  );
create policy "Reviews are publicly readable"
  on public.reviews for select using (true);

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

create or replace function public.admin_list_profiles()
returns table (
  id uuid,
  username text,
  full_name text,
  email text,
  role text,
  classification text,
  account_status text,
  verification_status text,
  is_verified boolean,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator access is required';
  end if;

  return query
    select p.id, p.username, p.full_name, p.email, p.role, p.classification,
      p.account_status, p.verification_status, p.is_verified, p.created_at
    from public.profiles p
    order by p.created_at desc;
end
$$;

create or replace function public.find_marketplace_member_by_email(p_email text)
returns table (id uuid, full_name text, is_verified boolean)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() and not public.is_verified() then
    raise exception 'A verified marketplace account is required';
  end if;

  return query
    select p.id, p.full_name, p.is_verified
    from public.profiles p
    where lower(p.email) = lower(trim(p_email))
    limit 1;
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

  insert into public.moderation_logs (action, target_type, target_id, administrator_id, reason)
  values (
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

  insert into public.moderation_logs (action, target_type, target_id, administrator_id, reason)
  values (p_action, p_target_type, p_target_id, auth.uid(), p_reason);
end
$$;

revoke all on function public.get_my_profile() from public, anon;
revoke all on function public.admin_list_profiles() from public, anon;
revoke all on function public.find_marketplace_member_by_email(text) from public, anon;
revoke all on function public.admin_set_profile_verification(uuid, boolean) from public, anon;
revoke all on function public.record_admin_moderation_action(text, text, uuid, text) from public, anon;
grant execute on function public.get_my_profile() to authenticated;
grant execute on function public.admin_list_profiles() to authenticated;
grant execute on function public.find_marketplace_member_by_email(text) to authenticated;
grant execute on function public.admin_set_profile_verification(uuid, boolean) to authenticated;
grant execute on function public.record_admin_moderation_action(text, text, uuid, text) to authenticated;

do $$
declare
  table_name text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach table_name in array array['listings', 'conversations', 'messages', 'notifications']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = table_name
      ) then
        execute format('alter publication supabase_realtime add table public.%I', table_name);
      end if;
    end loop;
  end if;
end
$$;
