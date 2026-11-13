-- CIT Marketplace initial schema
-- Run in a development Supabase project before connecting marketplace screens.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text not null unique,
  role text not null default 'user' check (role in ('user', 'admin')),
  classification text not null default 'Student'
    check (classification in ('Student', 'Faculty/Staff')),
  account_status text not null default 'active' check (account_status in ('active', 'inactive')),
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid not null references public.categories(id),
  title text not null,
  description text not null,
  condition text not null check (condition in ('Like new', 'Good', 'Fair')),
  listing_type text not null check (listing_type in ('sale', 'rent', 'both')),
  price numeric(10,2) not null check (price > 0),
  rental_terms text,
  deposit numeric(10,2) not null default 0 check (deposit >= 0),
  location text not null,
  approval_status text not null default 'pending'
    check (approval_status in ('pending', 'approved', 'rejected')),
  availability text not null default 'active' check (availability in ('active', 'unavailable')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (length(trim(content)) > 0),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  seller_id uuid not null references public.profiles(id),
  buyer_id uuid not null references public.profiles(id),
  type text not null check (type in ('sale', 'rental')),
  status text not null default 'ongoing'
    check (status in ('ongoing', 'returned', 'completed', 'cancelled')),
  start_date date,
  end_date date,
  deposit_amount numeric(10,2) not null default 0 check (deposit_amount >= 0),
  deposit_status text not null default 'none'
    check (deposit_status in ('none', 'held', 'returned', 'kept')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  check (seller_id <> buyer_id),
  check (type <> 'rental' or (start_date is not null and end_date is not null and end_date >= start_date))
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null unique references public.transactions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_type text not null check (target_type in ('listing', 'user')),
  target_id uuid not null,
  reason text not null,
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  message text not null,
  related_item_id uuid,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id),
  action text not null check (action in ('approve', 'reject', 'delete', 'verify', 'resolve', 'dismiss')),
  target_type text not null check (target_type in ('listing', 'user', 'report')),
  target_id uuid not null,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists listings_search_idx on public.listings (category_id, listing_type, price, condition);
create index if not exists listings_visibility_idx on public.listings (approval_status, availability, created_at desc);
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists transactions_parties_idx on public.transactions (seller_id, buyer_id, status);
create index if not exists notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin' and p.account_status = 'active'
  );
$$;

create or replace function public.is_verified_cit_user()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from auth.users u
    join public.profiles p on p.id = u.id
    where u.id = (select auth.uid())
      and u.email_confirmed_at is not null
      and lower(u.email) like '%@cit.edu'
      and p.is_verified = true
      and p.account_status = 'active'
  );
$$;

create or replace function public.can_view_profile(profile_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select profile_id = (select auth.uid())
    or (select public.is_admin())
    or exists (select 1 from public.conversations c
      where (c.buyer_id = (select auth.uid()) and c.seller_id = profile_id)
         or (c.seller_id = (select auth.uid()) and c.buyer_id = profile_id))
    or exists (select 1 from public.transactions t
      where (t.buyer_id = (select auth.uid()) and t.seller_id = profile_id)
         or (t.seller_id = (select auth.uid()) and t.buyer_id = profile_id));
$$;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email, classification)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    lower(new.email),
    case when new.raw_user_meta_data ->> 'classification' in ('Student', 'Faculty/Staff')
      then new.raw_user_meta_data ->> 'classification' else 'Student' end
  ) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute procedure public.create_profile_for_new_user();

create or replace function public.protect_listing_moderation_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if session_user in ('postgres', 'supabase_admin')
    or current_user in ('postgres', 'supabase_admin') then return new; end if;
  if not public.is_admin() then
    if new.approval_status is distinct from old.approval_status or new.owner_id is distinct from old.owner_id then
      raise exception 'Only an administrator can change listing approval or ownership';
    end if;
    if new.category_id is distinct from old.category_id or new.title is distinct from old.title
      or new.description is distinct from old.description or new.condition is distinct from old.condition
      or new.listing_type is distinct from old.listing_type or new.price is distinct from old.price
      or new.rental_terms is distinct from old.rental_terms or new.deposit is distinct from old.deposit
      or new.location is distinct from old.location then
      new.approval_status := 'pending';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.protect_profile_privileged_fields()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if current_user in ('postgres', 'supabase_admin') then return new; end if;
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

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
  before update on public.profiles
  for each row execute procedure public.protect_profile_privileged_fields();

drop trigger if exists protect_listing_moderation_fields on public.listings;
create trigger protect_listing_moderation_fields
  before update on public.listings
  for each row execute procedure public.protect_listing_moderation_fields();

insert into public.categories (name) values
  ('Electronics'), ('Lab equipment'), ('Textbooks'), ('Other')
on conflict (name) do nothing;

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.transactions enable row level security;
alter table public.reviews enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_logs enable row level security;

drop policy if exists "profiles readable by signed-in members" on public.profiles;
create policy "profiles readable by signed-in members" on public.profiles
  for select to authenticated using ((select public.can_view_profile(id)));
drop policy if exists "users update own non-role profile" on public.profiles;
create policy "users update own non-role profile" on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
drop policy if exists "categories readable" on public.categories;
create policy "categories readable" on public.categories for select to anon, authenticated using (true);
drop policy if exists "admins manage categories" on public.categories;
create policy "admins manage categories" on public.categories
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "visible listings readable" on public.listings;
create policy "visible listings readable" on public.listings for select to anon, authenticated
  using ((approval_status = 'approved' and availability = 'active') or owner_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "verified users create own listings" on public.listings;
create policy "verified users create own listings" on public.listings for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.is_verified_cit_user()) and approval_status = 'pending');
drop policy if exists "owners update own listings" on public.listings;
create policy "owners update own listings" on public.listings for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));
drop policy if exists "admins delete listings" on public.listings;
drop policy if exists "owners and admins delete listings" on public.listings;
create policy "owners delete own listings" on public.listings for delete to authenticated
  using (owner_id = (select auth.uid()));

drop policy if exists "listing images readable with listing" on public.listing_images;
create policy "listing images readable with listing" on public.listing_images for select to anon, authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and ((l.approval_status = 'approved' and l.availability = 'active') or l.owner_id = (select auth.uid()) or (select public.is_admin()))));
drop policy if exists "owners manage listing images" on public.listing_images;
create policy "owners manage listing images" on public.listing_images for all to authenticated
  using (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = (select auth.uid()) or (select public.is_admin()))))
  with check (exists (select 1 from public.listings l where l.id = listing_id and (l.owner_id = (select auth.uid()) or (select public.is_admin()))));

drop policy if exists "conversation participants read" on public.conversations;
create policy "conversation participants read" on public.conversations for select to authenticated
  using (buyer_id = (select auth.uid()) or seller_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "verified buyers create conversations" on public.conversations;
create policy "verified buyers create conversations" on public.conversations for insert to authenticated
  with check (buyer_id = (select auth.uid()) and (select public.is_verified_cit_user()) and exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = seller_id and l.approval_status = 'approved' and l.availability = 'active'));

drop policy if exists "participants read messages" on public.messages;
create policy "participants read messages" on public.messages for select to authenticated
  using (exists (select 1 from public.conversations c where c.id = conversation_id and ((select auth.uid()) in (c.buyer_id, c.seller_id))));
drop policy if exists "verified participants send messages" on public.messages;
create policy "verified participants send messages" on public.messages for insert to authenticated
  with check (sender_id = (select auth.uid()) and (select public.is_verified_cit_user()) and exists (select 1 from public.conversations c where c.id = conversation_id and (select auth.uid()) in (c.buyer_id, c.seller_id)));

drop policy if exists "transaction parties read" on public.transactions;
create policy "transaction parties read" on public.transactions for select to authenticated
  using ((select auth.uid()) in (seller_id, buyer_id) or (select public.is_admin()));
drop policy if exists "verified seller creates transactions" on public.transactions;
drop policy if exists "transaction parties update" on public.transactions;

drop policy if exists "reviews readable" on public.reviews;
create policy "reviews readable" on public.reviews for select to anon, authenticated using (true);
drop policy if exists "buyers review completed transactions" on public.reviews;
create policy "buyers review completed transactions" on public.reviews for insert to authenticated
  with check (reviewer_id = (select auth.uid()) and (select public.is_verified_cit_user()) and exists (select 1 from public.transactions t where t.id = transaction_id and t.buyer_id = (select auth.uid()) and t.seller_id = seller_id and t.status = 'completed'));

drop policy if exists "reporters read own reports" on public.reports;
create policy "reporters read own reports" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "verified users submit reports" on public.reports;
create policy "verified users submit reports" on public.reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));
drop policy if exists "admins update reports" on public.reports;

drop policy if exists "users read own notifications" on public.notifications;
create policy "users read own notifications" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists "users mark own notifications read" on public.notifications;
create policy "users mark own notifications read" on public.notifications for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

drop policy if exists "admins read moderation logs" on public.moderation_logs;
create policy "admins read moderation logs" on public.moderation_logs for select to authenticated
  using ((select public.is_admin()));
drop policy if exists "admins insert moderation logs" on public.moderation_logs;
create policy "admins insert moderation logs" on public.moderation_logs for insert to authenticated
  with check (admin_id = (select auth.uid()) and (select public.is_admin()));

create or replace function public.admin_moderate_listing(p_listing_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  listing_owner uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_decision not in ('approve', 'reject', 'delete') then raise exception 'Invalid moderation action'; end if;
  select owner_id into listing_owner from public.listings where id = p_listing_id for update;
  if listing_owner is null then raise exception 'Listing not found'; end if;
  insert into public.moderation_logs (admin_id, action, target_type, target_id, note)
  values (auth.uid(), p_decision, 'listing', p_listing_id, p_note);
  if p_decision = 'delete' then
    if exists (select 1 from public.transactions where listing_id = p_listing_id) then
      update public.listings set approval_status = 'rejected', availability = 'unavailable', updated_at = now() where id = p_listing_id;
    else
      delete from public.listings where id = p_listing_id;
    end if;
  else
    update public.listings set approval_status = case when p_decision = 'approve' then 'approved' else 'rejected' end,
      updated_at = now() where id = p_listing_id;
  end if;
  insert into public.notifications (user_id, type, message, related_item_id)
  values (listing_owner, 'listing_status',
    case p_decision when 'approve' then 'An administrator approved your listing.'
      when 'reject' then 'An administrator rejected your listing.' else 'An administrator removed your listing.' end,
    p_listing_id);
end;
$$;

create or replace function public.admin_verify_profile(p_user_id uuid, p_verified boolean, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_verified and not exists (
    select 1 from auth.users u where u.id = p_user_id
      and u.email_confirmed_at is not null and lower(u.email) like '%@cit.edu'
  ) then raise exception 'The account must confirm a @cit.edu email before verification'; end if;
  update public.profiles set is_verified = p_verified where id = p_user_id;
  if not found then raise exception 'Profile not found'; end if;
  insert into public.moderation_logs (admin_id, action, target_type, target_id, note)
  values (auth.uid(), 'verify', 'user', p_user_id, coalesce(p_note, case when p_verified then 'Verified account' else 'Verification revoked' end));
  insert into public.notifications (user_id, type, message)
  values (p_user_id, 'account_status', case when p_verified then 'Your CIT account has been verified.' else 'Your CIT verification has been revoked.' end);
end;
$$;

create or replace function public.admin_resolve_report(p_report_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  reporter uuid;
begin
  if not public.is_admin() then raise exception 'Administrator access required'; end if;
  if p_status not in ('resolved', 'dismissed') then raise exception 'Invalid report status'; end if;
  update public.reports set status = p_status where id = p_report_id returning reporter_id into reporter;
  if reporter is null then raise exception 'Report not found'; end if;
  insert into public.moderation_logs (admin_id, action, target_type, target_id, note)
  values (auth.uid(), case p_status when 'resolved' then 'resolve' else 'dismiss' end, 'report', p_report_id, p_note);
  insert into public.notifications (user_id, type, message, related_item_id)
  values (reporter, 'report_status', 'Your report was ' || p_status || '.', p_report_id);
end;
$$;

create or replace function public.create_marketplace_transaction(
  p_listing_id uuid, p_buyer_id uuid, p_type text,
  p_start_date date default null, p_end_date date default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  item public.listings%rowtype;
  transaction_id uuid;
begin
  if not public.is_verified_cit_user() then raise exception 'Verified active CIT account required'; end if;
  if p_type not in ('sale', 'rental') then raise exception 'Invalid transaction type'; end if;
  if p_buyer_id = auth.uid() then raise exception 'You cannot transact with yourself'; end if;
  select * into item from public.listings where id = p_listing_id for update;
  if item.id is null or item.owner_id <> auth.uid() or item.approval_status <> 'approved' or item.availability <> 'active' then
    raise exception 'Only the owner of an approved, active listing can record this transaction';
  end if;
  if (p_type = 'sale' and item.listing_type not in ('sale', 'both'))
    or (p_type = 'rental' and item.listing_type not in ('rent', 'both')) then
    raise exception 'Listing type does not allow this transaction';
  end if;
  if not exists (select 1 from public.profiles p where p.id = p_buyer_id and p.is_verified and p.account_status = 'active') then
    raise exception 'The other member must be verified and active';
  end if;
  if p_type = 'rental' and (p_start_date is null or p_end_date is null or p_end_date < p_start_date) then
    raise exception 'Valid rental start and end dates are required';
  end if;
  insert into public.transactions (listing_id, seller_id, buyer_id, type, start_date, end_date, deposit_amount, deposit_status)
  values (p_listing_id, auth.uid(), p_buyer_id, p_type, p_start_date, p_end_date,
    case when p_type = 'rental' then item.deposit else 0 end,
    case when p_type = 'rental' and item.deposit > 0 then 'held' else 'none' end)
  returning id into transaction_id;
  insert into public.notifications (user_id, type, message, related_item_id)
  values (p_buyer_id, 'transaction_update', 'A transaction was recorded for ' || item.title || '.', transaction_id);
  return transaction_id;
end;
$$;

create or replace function public.create_marketplace_transaction_by_email(
  p_listing_id uuid, p_buyer_email text, p_type text,
  p_start_date date default null, p_end_date date default null
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  buyer uuid;
begin
  select id into buyer from public.profiles where lower(email) = lower(trim(p_buyer_email));
  if buyer is null then raise exception 'No marketplace account was found for that email'; end if;
  return public.create_marketplace_transaction(p_listing_id, buyer, p_type, p_start_date, p_end_date);
end;
$$;

create or replace function public.complete_rental_return(p_transaction_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  buyer uuid;
begin
  if not public.is_verified_cit_user() then raise exception 'Verified active CIT account required'; end if;
  update public.transactions set status = 'completed', completed_at = now(),
    deposit_status = case when deposit_status = 'held' then 'returned' else deposit_status end
  where id = p_transaction_id and seller_id = auth.uid() and type = 'rental' and status = 'ongoing'
  returning buyer_id into buyer;
  if buyer is null then raise exception 'Ongoing rental not found for this owner'; end if;
  insert into public.notifications (user_id, type, message, related_item_id)
  values (buyer, 'transaction_update', 'Your rental was marked returned and completed.', p_transaction_id);
end;
$$;

create or replace function public.complete_sale_transaction(p_transaction_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  buyer uuid;
  listing uuid;
begin
  if not public.is_verified_cit_user() then raise exception 'Verified active CIT account required'; end if;
  update public.transactions set status = 'completed', completed_at = now()
  where id = p_transaction_id and seller_id = auth.uid() and type = 'sale' and status = 'ongoing'
  returning buyer_id, listing_id into buyer, listing;
  if buyer is null then raise exception 'Ongoing sale not found for this seller'; end if;
  update public.listings set availability = 'unavailable', updated_at = now() where id = listing;
  insert into public.notifications (user_id, type, message, related_item_id)
  values (buyer, 'transaction_update', 'Your sale has been marked complete.', p_transaction_id);
end;
$$;

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.listings, public.listing_images, public.reviews to anon, authenticated;
grant select, insert, update, delete on public.profiles, public.categories, public.listings,
  public.listing_images, public.conversations, public.messages, public.transactions,
  public.reviews, public.reports, public.notifications, public.moderation_logs to authenticated;
revoke insert, update, delete on public.reports, public.moderation_logs from authenticated;
grant select, insert on public.reports to authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_verified_cit_user() to anon, authenticated;
grant execute on function public.can_view_profile(uuid) to authenticated;
grant execute on function public.admin_moderate_listing(uuid, text, text) to authenticated;
grant execute on function public.admin_verify_profile(uuid, boolean, text) to authenticated;
grant execute on function public.admin_resolve_report(uuid, text, text) to authenticated;
grant execute on function public.create_marketplace_transaction(uuid, uuid, text, date, date) to authenticated;
grant execute on function public.create_marketplace_transaction_by_email(uuid, text, text, date, date) to authenticated;
grant execute on function public.complete_rental_return(uuid) to authenticated;
grant execute on function public.complete_sale_transaction(uuid) to authenticated;
revoke all on function public.admin_moderate_listing(uuid, text, text) from public, anon;
revoke all on function public.admin_verify_profile(uuid, boolean, text) from public, anon;
revoke all on function public.admin_resolve_report(uuid, text, text) from public, anon;
revoke all on function public.create_marketplace_transaction(uuid, uuid, text, date, date) from public, anon;
revoke all on function public.create_marketplace_transaction_by_email(uuid, text, text, date, date) from public, anon;
revoke all on function public.complete_rental_return(uuid) from public, anon;
revoke all on function public.complete_sale_transaction(uuid) from public, anon;
revoke all on function public.can_view_profile(uuid) from public, anon;
grant execute on function public.can_view_profile(uuid) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-images', 'listing-images', false, 10485760, array['image/jpeg', 'image/png'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public can view listing images" on storage.objects;
drop policy if exists "members view allowed listing images" on storage.objects;
create policy "members view allowed listing images" on storage.objects
  for select to anon, authenticated using (
    bucket_id = 'listing-images' and exists (
      select 1 from public.listing_images li join public.listings l on l.id = li.listing_id
      where li.storage_path = name and ((l.approval_status = 'approved' and l.availability = 'active')
        or l.owner_id = (select auth.uid()) or (select public.is_admin()))
    )
  );
drop policy if exists "verified members upload own listing images" on storage.objects;
create policy "verified members upload own listing images" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'listing-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.is_verified_cit_user())
  );
drop policy if exists "owners and admins delete listing images" on storage.objects;
create policy "owners and admins delete listing images" on storage.objects
  for delete to authenticated using (
    bucket_id = 'listing-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create or replace function public.notify_conversation_recipient()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  recipient uuid;
begin
  select case when new.sender_id = c.buyer_id then c.seller_id else c.buyer_id end
    into recipient from public.conversations c where c.id = new.conversation_id;
  insert into public.notifications (user_id, type, message, related_item_id)
  values (recipient, 'new_message', 'You received a new marketplace message.', new.conversation_id);
  return new;
end;
$$;

drop trigger if exists message_notification_trigger on public.messages;
create trigger message_notification_trigger after insert on public.messages
  for each row execute procedure public.notify_conversation_recipient();

create or replace function public.protect_notification_content()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.id is distinct from old.id or new.user_id is distinct from old.user_id
    or new.type is distinct from old.type or new.message is distinct from old.message
    or new.related_item_id is distinct from old.related_item_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Only the read status of a notification may be updated';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_notification_content on public.notifications;
create trigger protect_notification_content before update on public.notifications
  for each row execute procedure public.protect_notification_content();

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null;
end;
$$;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end;
$$;
