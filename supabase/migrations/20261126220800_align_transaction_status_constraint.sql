do $$
declare
  existing_check text;
begin
  select pg_get_expr(conbin, conrelid)
  into existing_check
  from pg_constraint
  where conrelid = 'public.transactions'::regclass
    and conname = 'transactions_status_check'
    and contype = 'c';

  alter table public.transactions
    drop constraint if exists transactions_status_check;

  if existing_check is null then
    alter table public.transactions
      add constraint transactions_status_check
      check (status in ('pending', 'accepted', 'approved', 'cancelled', 'completed', 'ongoing', 'overdue', 'returned'))
      not valid;
  else
    execute format(
      'alter table public.transactions add constraint transactions_status_check check ((%s) or status in (%L, %L, %L, %L, %L, %L, %L, %L)) not valid',
      existing_check,
      'pending',
      'accepted',
      'approved',
      'cancelled',
      'completed',
      'ongoing',
      'overdue',
      'returned'
    );
  end if;
end
$$;
