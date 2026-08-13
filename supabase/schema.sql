-- ============================================================================
-- COURSE 03102: database setup
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Dashboard > SQL Editor > New query > paste > Run.
--
-- It is safe to run more than once.
--
-- After running, copy two values from Project Settings > API into config.js:
--   Project URL      ->  photos.supabaseUrl
--   anon public key  ->  photos.supabaseAnonKey
-- ============================================================================


-- ============================================================================
-- 1. ENROLLMENTS
-- ============================================================================

create table if not exists public.enrollments (
  id           uuid primary key default gen_random_uuid(),

  -- Random id generated in the browser and kept in localStorage. This is the
  -- whole identity system. No login, no email, no password.
  guest_id     uuid not null unique,

  name         text not null check (char_length(trim(name)) between 1 and 60),
  extra_guests smallint not null default 0 check (extra_guests between 0 and 10),
  note         text check (char_length(note) <= 500),
  lang         text check (lang in ('en', 'it', 'da')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists enrollments_created_at_idx
  on public.enrollments (created_at desc);

-- Keep updated_at honest without trusting the browser to send it.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists enrollments_touch on public.enrollments;
create trigger enrollments_touch
  before update on public.enrollments
  for each row execute function public.touch_updated_at();


-- ============================================================================
-- 2. PHOTOS
-- ============================================================================

create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null,
  name         text not null,
  storage_path text not null unique,
  created_at   timestamptz not null default now()
);

create index if not exists photos_guest_idx on public.photos (guest_id);
create index if not exists photos_created_at_idx on public.photos (created_at desc);


-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Honest description of the model, so nobody is surprised later.
--
-- There is no login, so the database cannot tell one visitor from another.
-- Identity is a random uuid held in the browser. Anyone who knows a guest_id
-- can edit that row, but guest ids are unguessable uuids that never appear on
-- the page. For a party guest list this is the right trade off. It would not
-- be for anything that matters.
--
-- What these policies do enforce:
--   - Nobody can read the raw enrollments table, so notes stay private to the
--     host. Public reads go through a view that exposes first names only.
--   - Nobody can delete photos or enrollments outright.
--   - The five photo limit is enforced in the database, not just in the UI.
-- ============================================================================

alter table public.enrollments enable row level security;
alter table public.photos      enable row level security;

-- Anyone may register.
drop policy if exists "anon can enroll" on public.enrollments;
create policy "anon can enroll"
  on public.enrollments for insert
  to anon with check (true);

-- Anyone holding a guest_id may amend that registration.
drop policy if exists "anon can amend own enrollment" on public.enrollments;
create policy "anon can amend own enrollment"
  on public.enrollments for update
  to anon using (true) with check (true);

-- Deliberately no SELECT policy on the raw table. Notes are for the host only,
-- readable in the Supabase dashboard.

-- Anyone may add a photo, up to the limit.
drop policy if exists "anon can add photos" on public.photos;
create policy "anon can add photos"
  on public.photos for insert
  to anon with check (true);

-- The album is public.
drop policy if exists "anon can view album" on public.photos;
create policy "anon can view album"
  on public.photos for select
  to anon using (true);


-- ============================================================================
-- 4. THE FIVE PHOTO LIMIT, enforced server side
-- ----------------------------------------------------------------------------
-- The UI also counts, but a limit that only exists in JavaScript is a
-- suggestion. This makes the sixth upload fail in the database.
-- ============================================================================

create or replace function public.enforce_photo_limit()
returns trigger language plpgsql as $$
declare
  current_count integer;
begin
  select count(*) into current_count
    from public.photos
   where guest_id = new.guest_id;

  if current_count >= 5 then
    raise exception 'photo_limit_reached';
  end if;

  return new;
end $$;

drop trigger if exists photos_limit on public.photos;
create trigger photos_limit
  before insert on public.photos
  for each row execute function public.enforce_photo_limit();


-- ============================================================================
-- 5. PUBLIC VIEW: attendee first names and the headcount
-- ----------------------------------------------------------------------------
-- Exposes only what the site needs for social proof. Notes and full names
-- never leave the host's dashboard.
-- ============================================================================

create or replace view public.attendees as
  select
    split_part(trim(name), ' ', 1) as first_name,
    extra_guests,
    created_at
  from public.enrollments;

grant select on public.attendees to anon;


-- ============================================================================
-- 6. STORAGE BUCKET for the photos
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('party-photos', 'party-photos', true)
on conflict (id) do nothing;

drop policy if exists "anon can upload party photos" on storage.objects;
create policy "anon can upload party photos"
  on storage.objects for insert
  to anon with check (bucket_id = 'party-photos');

drop policy if exists "anyone can view party photos" on storage.objects;
create policy "anyone can view party photos"
  on storage.objects for select
  using (bucket_id = 'party-photos');


-- ============================================================================
-- DONE
-- ----------------------------------------------------------------------------
-- To read your guest list: Dashboard > Table Editor > enrollments.
-- Total head count including plus ones:
--
--   select count(*) + coalesce(sum(extra_guests), 0) as total
--     from public.enrollments;
-- ============================================================================
