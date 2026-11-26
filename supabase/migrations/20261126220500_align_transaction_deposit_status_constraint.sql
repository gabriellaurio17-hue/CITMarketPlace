do $$
declare
  existing_check text;
begin
  select pg_get_expr(conbin, conrelid)
  into existing_check
  from pg_constraint
  where conrelid = 'public.transactions'::regclass
    and conname = 'transactions_deposit_status_check'
    and contype = 'c';

  alter table public.transactions
    drop constraint if exists transactions_deposit_status_check;

  if existing_check is null then
    alter table public.transactions
      add constraint transactions_deposit_status_check
      check (deposit_status in ('not_applicable', 'pending', 'held', 'returned'))
      not valid;
  else
    execute format(
      'alter table public.transactions add constraint transactions_deposit_status_check check ((%s) or deposit_status in (%L, %L, %L, %L)) not valid',
      existing_check,
      'not_applicable',
      'pending',
      'held',
      'returned'
    );
  end if;
end
$$;
