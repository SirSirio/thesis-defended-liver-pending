-- ============================================================================
-- COURSE 03102: database setup
-- ----------------------------------------------------------------------------
-- Paste this whole file into the Supabase SQL editor and run it once.
-- Dashboard > SQL Editor > New query > paste > Run.
--
-- It is safe to run more than once.
--
-- After running, copy two values from Project Settings > API into config.js:
--   Project URL       ->  photos.supabaseUrl
--   publishable key   ->  photos.supabaseKey   (starts sb_publishable_, or on
--                                               older projects the anon JWT)
--
-- Never put a key starting sb_secret_ in config.js. It bypasses every rule
-- below.
--
-- STATUS: sections 1 to 6 were applied to project aplaxdplwnnlezffatal on
-- 2026-08-13, and verified against the live database. A guest can enroll, the
-- raw enrollments table is unreadable by the public key even when it holds
-- rows, the attendees view exposes first names only, and anonymous deletes are
-- refused.
--
-- Sections 7 and 8 were added on 2026-08-14 and are NOT in the database yet.
-- Until you run this file again, a guest can still register perfectly well,
-- but nobody can edit or withdraw a registration and the site says so plainly
-- instead of pretending otherwise. Running the whole file again installs them.
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
-- 7. WITHDRAWAL
-- ----------------------------------------------------------------------------
-- A guest who can no longer come marks themselves withdrawn. There is no
-- delete and there deliberately never will be, so this is a flag rather than a
-- removal. Withdrawn rows stop counting toward the head count on the site, and
-- they stay in the table, because knowing who dropped out is more useful than
-- not knowing.
--
-- The column is added with an alter rather than by editing the table back in
-- section 1, because create table if not exists will not add a column to a
-- table that already holds rows, and the promise at the top of this file that
-- it is safe to run more than once has to survive.
-- ============================================================================

alter table public.enrollments
  add column if not exists withdrawn boolean not null default false;

-- The same three columns as section 5, in the same order, with the same types.
-- Only the filter is new, which is the one kind of change create or replace
-- view accepts, and it is what keeps the grant on the next line intact.
-- Dropping the view and building it again would take that grant with it.
--
-- This view reads the table with its owner's rights rather than the visitor's,
-- and that is the only reason the site can show a head count at all. Change it
-- to read with the visitor's rights and social proof goes permanently and
-- silently empty, because nobody can read the table underneath.
create or replace view public.attendees as
  select
    split_part(trim(name), ' ', 1) as first_name,
    extra_guests,
    created_at
  from public.enrollments
  where withdrawn = false;

grant select on public.attendees to anon;


-- ============================================================================
-- 8. AMENDING A REGISTRATION
-- ----------------------------------------------------------------------------
-- Why this is a function and not just an update sent from the browser.
--
-- Postgres will not let anyone change a row they cannot read, because working
-- out which rows to change means reading them first. Nobody can read this
-- table, on purpose. So an update sent straight from the site matches nothing,
-- changes nothing, and still reports success, which is the worst of the three
-- outcomes available.
--
-- This function runs as its owner instead, so it can find the one row it was
-- asked for. It still cannot hand anything back, so the notes stay exactly as
-- private as they were.
--
-- Anyone who knows a guest_id can amend that registration. That is the same
-- trade already described in section 3 and it is unchanged: guest ids are
-- unguessable and never appear on the page.
-- ============================================================================

-- What this function gives back is the security boundary. It returns a count
-- and never a row. Any change to its arguments or to what it returns is a
-- security change and has to be treated as one: a function running with its
-- owner's rights that handed back rows would give every guest's note to
-- anyone who can guess a uuid, which leaks more than the open read rule this
-- whole design exists to avoid.
create or replace function public.amend_enrollment(
  p_guest_id     uuid,
  p_name         text     default null,
  p_extra_guests smallint default null,
  p_note         text     default null,
  p_lang         text     default null,
  p_withdrawn    boolean  default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.enrollments
     set name         = coalesce(p_name, name),
         extra_guests = coalesce(p_extra_guests, extra_guests),
         -- Leaving this out leaves the note alone. Sending an empty string
         -- clears it, which is how a guest removes a note they regret.
         note         = case when p_note is null then note else nullif(p_note, '') end,
         lang         = coalesce(p_lang, lang),
         withdrawn    = coalesce(p_withdrawn, withdrawn)
   where guest_id = p_guest_id;

  get diagnostics affected = row_count;
  return affected;   -- 1 if the registration was found, 0 if it was not
end $$;

-- Postgres lets everybody run a new function by default. For a function that
-- runs with its owner's rights that default is a genuine hole, so take it away
-- first and then hand it back to anonymous visitors only. The argument list is
-- repeated word for word in both lines on purpose: a function is identified by
-- its arguments, and a list that does not match quietly affects nothing at all.
revoke all on function public.amend_enrollment(uuid, text, smallint, text, text, boolean) from public;
grant execute on function public.amend_enrollment(uuid, text, smallint, text, text, boolean) to anon;


-- ============================================================================
-- DONE
-- ----------------------------------------------------------------------------
-- Your guest list lives in Dashboard > Table Editor > enrollments.
--
-- The note column is where dietary requirements and messages land. Nothing on
-- the website can read it. This table is the only place it exists.
--
-- Total head count including plus ones, ignoring anyone who withdrew. This is
-- the same number the site shows:
--
--   select count(*) + coalesce(sum(extra_guests), 0) as total
--     from public.enrollments
--    where withdrawn = false;
--
-- Who dropped out, most recent first:
--
--   select name, extra_guests, updated_at
--     from public.enrollments
--    where withdrawn = true
--    order by updated_at desc;
-- ============================================================================
