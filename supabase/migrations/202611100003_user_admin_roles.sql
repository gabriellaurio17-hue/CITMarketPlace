-- Roles are User and Admin. Student/faculty/staff are kinds of User, not roles.
-- Public signup always creates the default 'user' role; an existing admin assigns 'admin'.

alter table public.profiles
  drop column if exists classification;

create or replace function public.create_profile_for_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    lower(new.email)
  ) on conflict (id) do nothing;
  return new;
end;
$$;
