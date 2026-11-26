grant select on table public.reviews to anon, authenticated;

drop policy if exists "Marketplace reviews are readable" on public.reviews;
create policy "Marketplace reviews are readable"
  on public.reviews for select
  to anon, authenticated
  using (true);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'reviews'
    ) then
    alter publication supabase_realtime add table public.reviews;
  end if;
end
$$;
