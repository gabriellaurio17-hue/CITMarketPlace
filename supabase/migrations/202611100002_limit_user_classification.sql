-- Restrict regular user classifications to Student and Faculty/Staff.
-- Admin remains a separate value in profiles.role and is never selected at signup.

update public.profiles
set classification = 'Student'
where classification = 'School organization';

alter table public.profiles
  drop constraint if exists profiles_classification_check;

alter table public.profiles
  add constraint profiles_classification_check
  check (classification in ('Student', 'Faculty/Staff'));
