alter table public.conversations
  add column if not exists buyer_id uuid references public.profiles(id),
  add column if not exists seller_id uuid references public.profiles(id);

create unique index if not exists conversations_listing_id_buyer_id_key
  on public.conversations (listing_id, buyer_id);
