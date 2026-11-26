create unique index if not exists conversations_listing_id_buyer_id_key
  on public.conversations (listing_id, buyer_id);
