-- Restore the named RPC used by the Rentals and Dashboard forms.
-- Recreate the transaction implementation too, because the hosted database
-- currently does not have it.
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

  select *
    into item
    from public.listings
   where id = p_listing_id
   for update;

  if item.id is null
     or item.owner_id <> auth.uid()
     or item.approval_status <> 'approved'
     or item.availability <> 'active' then
    raise exception 'Only the owner of an approved, active listing can record this transaction';
  end if;

  if (p_type = 'sale' and item.listing_type not in ('sale', 'both'))
     or (p_type = 'rental' and item.listing_type not in ('rent', 'both')) then
    raise exception 'Listing type does not allow this transaction';
  end if;

  if not exists (
    select 1
      from public.profiles p
     where p.id = p_buyer_id
       and p.is_verified
       and p.account_status = 'active'
  ) then
    raise exception 'The other member must be verified and active';
  end if;

  if p_type = 'rental'
     and (p_start_date is null or p_end_date is null or p_end_date < p_start_date) then
    raise exception 'Valid rental start and end dates are required';
  end if;

  insert into public.transactions (
    listing_id,
    seller_id,
    buyer_id,
    type,
    start_date,
    end_date,
    deposit_amount,
    deposit_status
  )
  values (
    p_listing_id,
    auth.uid(),
    p_buyer_id,
    p_type,
    p_start_date,
    p_end_date,
    case when p_type = 'rental' then item.deposit else 0 end,
    case when p_type = 'rental' and item.deposit > 0 then 'held' else 'none' end
  )
  returning id into transaction_id;

  insert into public.notifications (user_id, type, message, related_item_id)
  values (
    p_buyer_id,
    'transaction_update',
    'A transaction was recorded for ' || item.title || '.',
    transaction_id
  );

  return transaction_id;
end;
$$;

grant execute on function public.create_marketplace_transaction(uuid, uuid, text, date, date) to authenticated;
revoke all on function public.create_marketplace_transaction(uuid, uuid, text, date, date) from public, anon;

create or replace function public.create_marketplace_transaction_by_email(
  p_listing_id uuid,
  p_buyer_email text,
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
  buyer uuid;
begin
  select id
    into buyer
    from public.profiles
   where lower(email) = lower(trim(p_buyer_email));

  if buyer is null then
    raise exception 'No marketplace account was found for that email';
  end if;

  return public.create_marketplace_transaction(
    p_listing_id,
    buyer,
    p_type,
    p_start_date,
    p_end_date
  );
end;
$$;

revoke all on function public.create_marketplace_transaction_by_email(uuid, text, text, date, date) from public, anon;
grant execute on function public.create_marketplace_transaction_by_email(uuid, text, text, date, date) to authenticated;

notify pgrst, 'reload schema';
