create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text,
  full_name text,
  email text,
  role text not null default 'user',
  classification text,
  account_status text not null default 'active',
  verification_status text not null default 'pending',
  is_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  category_id uuid references public.categories(id),
  title text not null,
  description text not null,
  condition text,
  listing_type text not null check (listing_type in ('sale', 'rent', 'both')),
  price numeric(12,2) not null default 0,
  rental_terms text,
  deposit numeric(12,2) not null default 0,
  location text,
  approval_status text not null default 'pending',
  availability text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.listing_images (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  storage_path text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete set null,
  seller_id uuid not null references public.profiles(id),
  buyer_id uuid not null references public.profiles(id),
  type text not null check (type in ('sale', 'rental')),
  status text not null default 'pending',
  start_date date,
  end_date date,
  deposit_amount numeric(12,2) not null default 0,
  deposit_status text not null default 'not_applicable',
  accepted_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  returned_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  message text not null,
  is_read boolean not null default false,
  related_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_type text not null,
  target_id uuid not null,
  reason text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.transactions(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (transaction_id, reviewer_id)
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings(id) on delete cascade,
  title text,
  member_ids uuid[] not null default '{}',
  latest_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read_by uuid[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  target_type text,
  target_id uuid,
  administrator_id uuid references public.profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists classification text;
alter table public.profiles add column if not exists account_status text not null default 'active';
alter table public.profiles add column if not exists verification_status text not null default 'pending';
alter table public.profiles add column if not exists is_verified boolean not null default false;

alter table public.listings add column if not exists listing_type text;
alter table public.listings add column if not exists rental_terms text;
alter table public.listings add column if not exists deposit numeric(12,2) not null default 0;
alter table public.listings add column if not exists location text;
alter table public.listings add column if not exists approval_status text not null default 'pending';
alter table public.listings add column if not exists availability text not null default 'active';

alter table public.conversations add column if not exists listing_id uuid;
alter table public.conversations add column if not exists title text;
alter table public.conversations add column if not exists member_ids uuid[] not null default '{}';
alter table public.conversations add column if not exists latest_message text;
alter table public.conversations add column if not exists created_at timestamptz not null default now();
alter table public.conversations add column if not exists updated_at timestamptz not null default now();

alter table public.messages add column if not exists conversation_id uuid;
alter table public.messages add column if not exists sender_id uuid;
alter table public.messages add column if not exists content text;
alter table public.messages add column if not exists read_by uuid[] not null default '{}';
alter table public.messages add column if not exists created_at timestamptz not null default now();

alter table public.transactions add column if not exists listing_id uuid;
alter table public.transactions add column if not exists seller_id uuid;
alter table public.transactions add column if not exists buyer_id uuid;
alter table public.transactions add column if not exists type text;
alter table public.transactions add column if not exists status text not null default 'pending';
alter table public.transactions add column if not exists start_date date;
alter table public.transactions add column if not exists end_date date;
alter table public.transactions add column if not exists deposit_amount numeric(12,2) not null default 0;
alter table public.transactions add column if not exists deposit_status text not null default 'not_applicable';
alter table public.transactions add column if not exists accepted_at timestamptz;
alter table public.transactions add column if not exists completed_at timestamptz;
alter table public.transactions add column if not exists cancelled_at timestamptz;
alter table public.transactions add column if not exists returned_at timestamptz;
alter table public.transactions add column if not exists created_at timestamptz not null default now();

alter table public.notifications add column if not exists user_id uuid;
alter table public.notifications add column if not exists type text;
alter table public.notifications add column if not exists message text;
alter table public.notifications add column if not exists is_read boolean not null default false;
alter table public.notifications add column if not exists related_id uuid;
alter table public.notifications add column if not exists created_at timestamptz not null default now();

alter table public.reports add column if not exists reporter_id uuid;
alter table public.reports add column if not exists target_type text;
alter table public.reports add column if not exists target_id uuid;
alter table public.reports add column if not exists reason text;
alter table public.reports add column if not exists status text not null default 'open';
alter table public.reports add column if not exists created_at timestamptz not null default now();

alter table public.reviews add column if not exists transaction_id uuid;
alter table public.reviews add column if not exists reviewer_id uuid;
alter table public.reviews add column if not exists seller_id uuid;
alter table public.reviews add column if not exists rating integer;
alter table public.reviews add column if not exists comment text;
alter table public.reviews add column if not exists created_at timestamptz not null default now();

alter table public.moderation_logs add column if not exists action text;
alter table public.moderation_logs add column if not exists target_type text;
alter table public.moderation_logs add column if not exists target_id uuid;
alter table public.moderation_logs add column if not exists administrator_id uuid;
alter table public.moderation_logs add column if not exists reason text;
alter table public.moderation_logs add column if not exists created_at timestamptz not null default now();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.listings enable row level security;
alter table public.listing_images enable row level security;
alter table public.transactions enable row level security;
alter table public.notifications enable row level security;
alter table public.reports enable row level security;
alter table public.reviews enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.moderation_logs enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and (role = 'admin' or classification = 'Admin'));
$$;

create or replace function public.is_verified()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and is_verified);
$$;

drop policy if exists "Profiles are viewable" on public.profiles;
drop policy if exists "Users insert own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
drop policy if exists "Categories public read" on public.categories;
drop policy if exists "Listings public approved read" on public.listings;
drop policy if exists "Verified users create listings" on public.listings;
drop policy if exists "Owners update listings" on public.listings;
drop policy if exists "Owners delete listings" on public.listings;
drop policy if exists "Listing images public read" on public.listing_images;
drop policy if exists "Listing owners create images" on public.listing_images;
drop policy if exists "Listing owners delete images" on public.listing_images;
drop policy if exists "Participants read transactions" on public.transactions;
drop policy if exists "Verified users create transactions" on public.transactions;
drop policy if exists "Participants update transactions" on public.transactions;
drop policy if exists "Users read own notifications" on public.notifications;
drop policy if exists "Authenticated create notifications" on public.notifications;
drop policy if exists "Users update own notifications" on public.notifications;
drop policy if exists "Users create reports" on public.reports;
drop policy if exists "Admins read reports" on public.reports;
drop policy if exists "Admins update reports" on public.reports;
drop policy if exists "Public reviews read" on public.reviews;
drop policy if exists "Buyer review" on public.reviews;
drop policy if exists "Conversation participants read" on public.conversations;
drop policy if exists "Participants create conversations" on public.conversations;
drop policy if exists "Participants update conversations" on public.conversations;
drop policy if exists "Conversation participants read messages" on public.messages;
drop policy if exists "Conversation participants send messages" on public.messages;
drop policy if exists "Admins read moderation logs" on public.moderation_logs;
drop policy if exists "Admins create moderation logs" on public.moderation_logs;

create policy "Profiles are viewable" on public.profiles for select using (true);
create policy "Users insert own profile" on public.profiles for insert with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

create policy "Categories public read" on public.categories for select using (true);
create policy "Listings public approved read" on public.listings for select using (approval_status = 'approved' or owner_id = auth.uid() or public.is_admin());
create policy "Verified users create listings" on public.listings for insert with check (owner_id = auth.uid() and public.is_verified());
create policy "Owners update listings" on public.listings for update using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "Owners delete listings" on public.listings for delete using (owner_id = auth.uid() or public.is_admin());

create policy "Listing images public read" on public.listing_images for select using (true);
create policy "Listing owners create images" on public.listing_images for insert with check (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));
create policy "Listing owners delete images" on public.listing_images for delete using (exists (select 1 from public.listings l where l.id = listing_id and l.owner_id = auth.uid()));

create policy "Participants read transactions" on public.transactions for select using (seller_id = auth.uid() or buyer_id = auth.uid() or public.is_admin());
create policy "Verified users create transactions" on public.transactions for insert with check (public.is_verified() and (seller_id = auth.uid() or buyer_id = auth.uid()));
create policy "Participants update transactions" on public.transactions for update using (seller_id = auth.uid() or buyer_id = auth.uid() or public.is_admin());

create policy "Users read own notifications" on public.notifications for select using (user_id = auth.uid() or public.is_admin());
create policy "Authenticated create notifications" on public.notifications for insert with check (auth.uid() is not null);
create policy "Users update own notifications" on public.notifications for update using (user_id = auth.uid());

create policy "Users create reports" on public.reports for insert with check (reporter_id = auth.uid());
create policy "Admins read reports" on public.reports for select using (public.is_admin());
create policy "Admins update reports" on public.reports for update using (public.is_admin());

create policy "Public reviews read" on public.reviews for select using (true);
create policy "Buyer review" on public.reviews for insert with check (reviewer_id = auth.uid());

create policy "Conversation participants read" on public.conversations for select using (auth.uid() = any(member_ids) or public.is_admin());
create policy "Participants create conversations" on public.conversations for insert with check (auth.uid() = any(member_ids));
create policy "Participants update conversations" on public.conversations for update using (auth.uid() = any(member_ids));

create policy "Conversation participants read messages" on public.messages for select using (exists (select 1 from public.conversations c where c.id = conversation_id and (auth.uid() = any(c.member_ids) or public.is_admin())));
create policy "Conversation participants send messages" on public.messages for insert with check (sender_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() = any(c.member_ids)));

create policy "Admins read moderation logs" on public.moderation_logs for select using (public.is_admin());
create policy "Admins create moderation logs" on public.moderation_logs for insert with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

drop policy if exists "Listing images are publicly readable" on storage.objects;
drop policy if exists "Verified users upload listing images" on storage.objects;
drop policy if exists "Listing owners update listing images" on storage.objects;
drop policy if exists "Listing owners delete listing images" on storage.objects;

create policy "Listing images are publicly readable"
on storage.objects for select
using (bucket_id = 'listing-images');

create policy "Verified users upload listing images"
on storage.objects for insert
with check (bucket_id = 'listing-images' and auth.uid() is not null and public.is_verified());

create policy "Listing owners update listing images"
on storage.objects for update
using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Listing owners delete listing images"
on storage.objects for delete
using (bucket_id = 'listing-images' and (storage.foldername(name))[1] = auth.uid()::text);
