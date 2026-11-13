-- Store the member's campus classification separately from the User/Admin role.
-- Public signups may classify as Student or Faculty/Staff; the role remains 'user'.

alter table public.profiles
  add column if not exists classification text not null default 'Student';

alter table public.profiles
  drop constraint if exists profiles_classification_check;

alter table public.profiles
  add constraint profiles_classification_check
  check (classification in ('Student', 'Faculty/Staff'));

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email, classification)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    lower(new.email),
    case when new.raw_user_meta_data ->> 'classification' in ('Student', 'Faculty/Staff')
      then new.raw_user_meta_data ->> 'classification' else 'Student' end
  ) on conflict (id) do nothing;
  return new;
end;
$$;
