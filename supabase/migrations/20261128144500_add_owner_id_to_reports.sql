alter table public.reports add column if not exists owner_id uuid references public.profiles(id);

update public.reports
set owner_id = listings.owner_id
from public.listings
where reports.target_type = 'listing'
  and reports.target_id = listings.id
  and reports.owner_id is null;
