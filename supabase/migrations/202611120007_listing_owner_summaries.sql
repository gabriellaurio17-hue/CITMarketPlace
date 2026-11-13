-- Expose only the owner's display name for listings the caller is allowed to see.
-- This keeps public listing cards useful without exposing profile emails or other fields.
create or replace function public.get_listing_owner_summaries(p_listing_ids uuid[])
returns table (listing_id uuid, owner_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id, p.full_name
  from public.listings l
  join public.profiles p on p.id = l.owner_id
  where l.id = any(coalesce(p_listing_ids, array[]::uuid[]))
    and (
      (l.approval_status = 'approved' and l.availability = 'active')
      or l.owner_id = (select auth.uid())
      or (select public.is_admin())
    );
$$;

revoke all on function public.get_listing_owner_summaries(uuid[]) from public, anon, authenticated;
grant execute on function public.get_listing_owner_summaries(uuid[]) to anon, authenticated;
