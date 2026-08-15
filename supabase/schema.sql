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
-- Sections 7 and 8 were applied to the same project on 2026-08-15, and
-- verified against the live database. A guest can now change or withdraw a
-- registration, the amend function hands back a count of the rows it touched
-- and never any part of the row itself, withdrawn rows stop counting toward
-- the head count on the site, and the attendees view still exposes nothing but
-- a first name, a plus one count and a joining date.
--
-- Sections 9 and 10 were applied to the same project on 2026-08-15, and
-- verified against the live database. Reading the photos table directly is now
-- refused with error 42501 instead of being answered, the album view answers in
-- its place with a first name, a storage path and a date, and asking that view
-- for a guest_id is refused with error 42703 because the column is not there to
-- ask for. The whole file was run rather than only the new sections, so the
-- earlier ones were proved again on the way past: the amend function still
-- answers, and a registration bringing five extra people is now refused by the
-- guest count bound.
--
-- NOT YET APPLIED, unlike every paragraph above it: section 4's photo limit
-- function was corrected on 2026-08-15 to run with its owner's rights, because
-- section 9's revoke had left it unable to read the table it counts, and every
-- anonymous photo insert was being refused with error 42501. That correction
-- is in this file and is NOT in the live database. Run the whole file again to
-- apply it, then prove it on the wire rather than by reading: a POST to
-- /rest/v1/photos with the publishable key must answer 201 and not 401, and a
-- sixth photo under one guest_id must still be refused with
-- photo_limit_reached. Until both of those are seen, treat anonymous photo
-- upload as broken in the live project.
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
  -- Section 10 is where this bound is explained and where it is kept in step
  -- with config.js. A fresh database gets it right here; an existing one gets
  -- it corrected there.
  extra_guests smallint not null default 0 check (extra_guests between 0 and 4),
  note         text check (char_length(note) <= 500),
  lang         text check (lang in ('en', 'it', 'da')),

  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists enrollments_created_at_idx
  on public.enrollments (created_at desc);

-- Keep updated_at honest without trusting the browser to send it.
create or replace function public.touch_updated_at()
returns trigger language plpgsql
set search_path = ''
as $$
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
-- Identity is a random uuid held in the browser, the guest_id.
--
-- Since section 8, that id is the whole credential for changing a
-- registration. Anyone holding one can rename, re-count, re-note or withdraw
-- the guest it belongs to, and nothing else is asked for. It is a password
-- with no username in front of it.
--
-- So the id has to stay unread. It is an unguessable uuid, the site does not
-- render one into the page, and no read path in this file hands one out.
-- Section 9 is what keeps that last part true, because any table that carries
-- a guest_id and can be read is a table that gives the password away. For a
-- party guest list this is the right trade off. It would not be for anything
-- that matters.
--
-- What these policies do enforce:
--   - Nobody can read the raw enrollments table, so notes stay private to the
--     host. Public reads go through a view that exposes first names only.
--   - Nobody can read the raw photos table either, for the same reason and one
--     more: it carries a guest_id. The album is read through the view in
--     section 9.
--   - Nobody can update or delete anything directly. Changing a registration
--     goes through the function in section 8, and withdrawal is a flag rather
--     than a removal.
--   - The five photo limit is enforced in the database, not just in the UI.
-- ============================================================================

alter table public.enrollments enable row level security;
alter table public.photos      enable row level security;

-- Anyone may register.
drop policy if exists "anon can enroll" on public.enrollments;
create policy "anon can enroll"
  on public.enrollments for insert
  to anon with check (true);

-- Amending a registration moved to public.amend_enrollment in section 8, so
-- the rule that used to stand here is dropped, and the drop stays in the file
-- so a database that still carries the rule loses it on the next run.
--
-- It was worse than nothing. It let anonymous visitors change every row in
-- this table to any values at all, and the only thing holding it still was the
-- unrelated fact that nothing here can be read. Adding any read rule later,
-- including the one Supabase offers as a single click, would have turned it in
-- one step into anyone being able to rewrite every guest's name and note.
drop policy if exists "anon can amend own enrollment" on public.enrollments;

-- Deliberately no read rule on the raw table. Notes are for the host only,
-- readable in the Supabase dashboard.

-- Anyone may add a photo, up to the limit.
drop policy if exists "anon can add photos" on public.photos;
create policy "anon can add photos"
  on public.photos for insert
  to anon with check (true);

-- The album moved to public.album in section 9, so the rule that used to read
-- this table straight is dropped, and the drop stays in the file so a database
-- that still carries the rule loses it on the next run.
--
-- Reading the album off this table handed out a guest_id, which section 8 had
-- just turned into a credential, next to a full unsplit name, which is the one
-- thing the view in section 5 exists to keep off the page.
drop policy if exists "anon can view album" on public.photos;


-- ============================================================================
-- 4. THE FIVE PHOTO LIMIT, enforced server side
-- ----------------------------------------------------------------------------
-- The UI also counts, but a limit that only exists in JavaScript is a
-- suggestion. This makes the sixth upload fail in the database.
--
-- This function counts the rows in the table it guards, so it has to be able
-- to read that table. Section 9 takes the read away from anonymous visitors,
-- and a trigger function without its owner's rights runs as whoever issued the
-- insert, which for a request from the site is the anonymous role. Without
-- security definer below, every anonymous upload therefore fails with error
-- 42501 before the row is ever written, and the failure looks like a rule
-- about inserts rather than like a missing read.
--
-- Re-granting the read to anonymous visitors is not the alternative fix. It
-- would hand back the guest_id and the full name that section 9 exists to keep
-- off the page, and it would not even work: section 3 drops the last select
-- rule on this table, so a count made with the visitor's rights would be
-- filtered by row security down to zero for every guest, forever, and the
-- limit would stop being a limit while still appearing to be one.
-- ============================================================================

create or replace function public.enforce_photo_limit()
returns trigger language plpgsql
security definer            -- it reads the table it guards, and anon cannot
set search_path = ''
as $$
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

-- The same discipline section 8 applies to its own definer function: take the
-- default away before handing anything back. Nothing can call this one by name
-- in any case, because it errors outside a trigger, but the file should have
-- one rule about definer functions and no exceptions to it.
revoke all on function public.enforce_photo_limit() from public;

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
-- trade already described in section 3 and it is unchanged: the id is an
-- unguessable uuid, the site does not render one into the page, and no read
-- path in this file hands one out. Section 9 is what keeps that last part
-- true, and it is not optional now that this function exists.
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
-- 9. THE ALBUM READ PATH
-- ----------------------------------------------------------------------------
-- The album is public. The id that says who uploaded is not, and neither is
-- anybody's surname. Both of those live in the photos table, and the photos
-- table is not the album, so the site reads the album through this view and
-- never through the table underneath it. That is the same arrangement section
-- 5 already uses for the guest list, applied at last to the other table.
--
-- A view is a stronger promise than a rule about rows. A rule says who may
-- read a column. A view means the column is not there to ask for, so nothing
-- anybody adds later can widen it by accident.
--
-- This view reads the table with its owner's rights rather than the visitor's,
-- and that is the only reason the album can be shown at all. Change it to read
-- with the visitor's rights and the album goes permanently and silently empty,
-- because nobody can read the table underneath. Supabase will warn about the
-- owner's rights in its own checks. That warning is expected here, for the
-- same reason it is expected on the guest list view, and it is not a fault.
--
-- For phase 4, which will write the rows this view reads: the storage bucket
-- in section 6 is public, so a storage_path is every bit as readable as a
-- column. Put a guest_id inside a file name and you have published, straight
-- through this view, the exact credential this section stopped publishing.
-- Name the uploads something that says nothing.
-- ============================================================================

create or replace view public.album as
  select
    split_part(trim(name), ' ', 1) as first_name,
    storage_path,
    created_at
  from public.photos;

-- This grant sits on the line after the view rather than somewhere tidier,
-- because create or replace keeps it and dropping the view takes it away, and
-- that is far easier to remember when the two things are next to each other.
grant select on public.album to anon;

-- Reading, and only reading. The insert rule in section 3 and the insert
-- privilege behind it are untouched, so anonymous visitors keep the right to
-- add a photo, which is how phase 4 will upload anything at all.
--
-- What this line does take away is the read the photo limit trigger needs.
-- That trigger counts the rows in this table, and a trigger runs with the
-- rights of whoever issued the insert unless it is told otherwise, so with the
-- read gone the count is refused and the insert fails with error 42501 before
-- anything is written. The earlier version of this comment claimed the revoke
-- could not reach the upload path. It could, it did, and nothing noticed
-- because no probe ever posted a photo. Section 4 answers it, at the trigger
-- rather than here, by giving that one function its owner's rights.
--
-- So this line is safe to keep only while section 4 carries security definer.
-- Remove it there and the album read is closed while the upload path silently
-- goes with it.
revoke select on public.photos from anon;


-- ============================================================================
-- 10. THE GUEST COUNT BOUND
-- ----------------------------------------------------------------------------
-- The site lets one guest bring a few extra people along. How many is
-- enrollment.maxGuestsPerPerson in config.js, and this is the floor
-- underneath it. Keep this bound at or above the config value: the site stops
-- a guest at the config number, and the database stops anyone who goes around
-- the site at this one. A bound that only exists in JavaScript is a
-- suggestion, which is exactly the argument section 4 makes for the photo
-- limit, and which nobody had made for its sibling.
--
-- Raise maxGuestsPerPerson above this bound and registrations start failing
-- with a constraint error instead of being quietly accepted. Raise this bound
-- first, then that one.
--
-- The bound is re-stated here with an alter rather than by editing section 1
-- alone, because create table if not exists will not change a check on a table
-- that already exists. The constraint is named in both halves on purpose, so
-- the drop and the add cannot end up pointing at two different things.
--
-- The alter reads the rows already in the table and stops with an error if any
-- of them holds more extra guests than the bound allows. That is correct and
-- worth knowing while you are looking at the SQL editor: the offending row is
-- somebody's real registration, and the answer is to talk to them rather than
-- to lower the bound until the error goes away.
-- ============================================================================

alter table public.enrollments
  drop constraint if exists enrollments_extra_guests_check,
  add constraint enrollments_extra_guests_check check (extra_guests between 0 and 4);


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
