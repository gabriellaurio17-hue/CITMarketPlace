-- Hide rental listings while a rental is in progress and make them visible
-- again when the owner records the return.

create or replace function public.create_marketplace_transaction(
  p_listing_id uuid,
  p_buyer_id uuid,
  p_type text,
  p_start_date date default null,
  p_end_date date default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  item public.listings%rowtype;
  transaction_id uuid;
begin
  if not public.is_verified_cit_user() then
    raise exception 'Verified active CIT account required';
  end if;
  if p_type not in ('sale', 'rental') then
    raise exception 'Invalid transaction type';
  end if;
  if p_buyer_id = auth.uid() then
    raise exception 'You cannot transact with yourself';
  end if;

  select * into item
    from public.listings
   where id = p_listing_id
   for update;

  if item.id is null or item.owner_id <> auth.uid()
     or item.approval_status <> 'approved' or item.availability <> 'active' then
    raise exception 'Only the owner of an approved, active listing can record this transaction';
  end if;
  if (p_type = 'sale' and item.listing_type not in ('sale', 'both'))
     or (p_type = 'rental' and item.listing_type not in ('rent', 'both')) then
    raise exception 'Listing type does not allow this transaction';
  end if;
  if not exists (
    select 1 from public.profiles p
     where p.id = p_buyer_id and p.is_verified and p.account_status = 'active'
  ) then
    raise exception 'The other member must be verified and active';
  end if;
  if p_type = 'rental'
     and (p_start_date is null or p_end_date is null or p_end_date < p_start_date) then
    raise exception 'Valid rental start and end dates are required';
  end if;

  insert into public.transactions (
    listing_id, seller_id, buyer_id, type, start_date, end_date,
    deposit_amount, deposit_status
  ) values (
    p_listing_id, auth.uid(), p_buyer_id, p_type, p_start_date, p_end_date,
    case when p_type = 'rental' then item.deposit else 0 end,
    case when p_type = 'rental' and item.deposit > 0 then 'held' else 'none' end
  ) returning id into transaction_id;

  if p_type = 'rental' then
    update public.listings
       set availability = 'unavailable', updated_at = now()
     where id = p_listing_id;
  end if;

  insert into public.notifications (user_id, type, message, related_item_id)
  values (p_buyer_id, 'transaction_update',
    'A transaction was recorded for ' || item.title || '.', transaction_id);

  return transaction_id;
end;
$$;

create or replace function public.complete_rental_return(p_transaction_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  buyer uuid;
  listing uuid;
begin
  if not public.is_verified_cit_user() then
    raise exception 'Verified active CIT account required';
  end if;

  update public.transactions
     set status = 'completed',
         completed_at = now(),
         deposit_status = case when deposit_status = 'held' then 'returned' else deposit_status end
   where id = p_transaction_id
     and seller_id = auth.uid()
     and type = 'rental'
     and status = 'ongoing'
  returning buyer_id, listing_id into buyer, listing;

  if buyer is null then
    raise exception 'Ongoing rental not found for this owner';
  end if;

  if not exists (
    select 1 from public.transactions t
     where t.listing_id = listing and t.type = 'rental' and t.status = 'ongoing'
  ) then
    update public.listings
       set availability = 'active', updated_at = now()
     where id = listing and approval_status = 'approved';
  end if;

  insert into public.notifications (user_id, type, message, related_item_id)
  values (buyer, 'transaction_update',
    'Your rental was marked returned and completed.', p_transaction_id);
end;
$$;

grant execute on function public.create_marketplace_transaction(uuid, uuid, text, date, date) to authenticated;
revoke all on function public.create_marketplace_transaction(uuid, uuid, text, date, date) from public, anon;
grant execute on function public.complete_rental_return(uuid) to authenticated;
revoke all on function public.complete_rental_return(uuid) from public, anon;

-- Also hide any currently active listing that already has an ongoing rental.
update public.listings l
   set availability = 'unavailable', updated_at = now()
 where l.availability = 'active'
   and exists (
     select 1 from public.transactions t
      where t.listing_id = l.id and t.type = 'rental' and t.status = 'ongoing'
   );

notify pgrst, 'reload schema';
