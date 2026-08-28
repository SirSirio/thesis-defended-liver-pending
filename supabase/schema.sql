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
-- Section 4's photo limit function was corrected on 2026-08-15 to run with its
-- owner's rights, and the correction was applied to the same project the same
-- day. Section 9's revoke had left that function unable to read the table it
-- counts, so every anonymous photo insert was being refused with error 42501,
-- for a day, while every read probe in the phase passed. Nothing noticed
-- because no probe ever posted a photo.
--
-- Verified on the wire, not by reading: a POST to /rest/v1/photos with the
-- publishable key now reaches the not-null check on name and is refused with
-- error 23502, where before the correction the same request was refused with
-- 42501 before any column was looked at. That is the whole difference between
-- a trigger that can count and one that cannot, and it is provable without
-- writing a row, which is why it is the probe recorded here.
--
-- The other half of section 4 is proven too, as of 2026-08-15. Six inserts
-- were executed against this project under a throwaway guest_id, with name set
-- to ZZTEST DeleteMe, the same marker the previous cleanup used and the one the
-- owner already recognises. The first five were accepted with 201 and an empty
-- body. The sixth was refused with 400 and code P0001, which is
-- raise_exception, carrying the trigger's own message photo_limit_reached. All
-- five were then read back through public.album and all five were there, which
-- is what makes this proof rather than a status code. A seventh insert under a
-- different guest_id was accepted, so the limit is per identity and not global,
-- which is what the site has always claimed it is.
--
-- The same probe surfaced an ordering fact worth writing down. The trigger in
-- section 4 fires before insert, so it runs before the unique constraint on
-- storage_path is evaluated. A guest already at five therefore receives P0001
-- for a path collision as well, and cannot tell the two apart. The site treats
-- that code as being at the limit, unconditionally, and never retries with a
-- fresh path.
--
-- Section 6 was changed on 2026-08-16 and applied to project aplaxdplwnnlezffatal
-- on 2026-08-17. The party-photos bucket record carries a byte counted size
-- ceiling of three mebibytes and a list of one accepted declared type, and the
-- insert updates an existing bucket instead of stepping over it. Section 6's own
-- comment says which of those two is a control and which is hygiene, and does
-- not describe either as the other. The whole file was run rather than only the
-- changed section, so the earlier ones were proved again on the way past.
--
-- Verified on the wire, not by reading. Four megabytes of arbitrary bytes,
-- declared as a JPEG and posted straight at the storage API with the publishable
-- key, were refused with 413 EntityTooLarge carried inside a 400 response, and a
-- public read of that same path then answered 400 as well, so nothing landed.
-- That second half is the half that matters: on this project a blocked read
-- answers with an empty array and a blocked delete answers 204, so a status code
-- alone is not evidence. A second upload declaring a plain text type was refused
-- with 415 InvalidMimeType inside a 400 response. Neither request went anywhere
-- near the site, which is what makes the size ceiling the only control this
-- project has against a caller holding the publishable key, and the type list
-- hygiene rather than a wall.
--
-- The same day the owner removed what three sessions of probing had left behind:
-- every photos row carrying the ZZTEST DeleteMe marker, and the nine objects
-- under the zz-research folder in the bucket. Proved through public.album rather
-- than through the photos table, exactly as the phase 3 cleanup was proved: the
-- view returned an empty array, and a public read of each of the nine objects
-- answered 400.
--
-- SECTION 11 IS APPLIED. The paragraph below said it was not, and that was
-- true when it was written on 2026-08-17. Both bounds were confirmed live on
-- 2026-08-28: photos_name_check and photos_storage_path_check are on the table.
-- The stale warning is left standing underneath rather than deleted, because
-- the shape of it is what the next NOT YET APPLIED note should look like.
--
-- 2026-08-28, PHASE 04.1. Video. Applied to project aplaxdplwnnlezffatal and
-- verified on the wire from the untrusted position with the publishable key,
-- never from the dashboard, which runs as owner and would prove nothing.
--
--   photos.kind added, defaulted 'photo', NOT NULL, checked against two values.
--   The fifteen existing rows were correct with no backfill.
--
--   photos_storage_path_check widened from jpg to (jpg|mp4|mov). THIS WAS THE
--   FOURTH COPY of a contract the phase plan believed lived in three places,
--   and it is the one that bites hardest: it refuses the ROW after the OBJECT
--   has already uploaded, so a client widened without it strands an orphan that
--   nothing points at and nothing explains.
--
--   enforce_photo_limit now counts twice and raises two distinct names, because
--   a refusal that cannot say which ceiling was hit is one a guest cannot act
--   on. It also takes a row lock first: two rows posted in the same instant
--   would both see a count of zero and both pass, which was survivable at five
--   and is not at one.
--
--   public.album gained kind, appended so create or replace stayed legal and
--   the grant survived. It still does not carry guest_id and never will.
--
--   The bucket went from 3 MiB to 50 MiB, adding video/mp4 and video/quicktime.
--
-- Proved on the wire, with a synthetic guest destroyed in the same session so
-- none of the owner's fifteen photographs were touched at any point:
--
--   anon SELECT on public.photos          42501, still refused
--   first video row                       201
--   second video row                      400, P0001, video_limit_reached
--   four photos after the video           201 each, five total
--   a sixth row of any kind               400, P0001, photo_limit_reached
--   a .exe storage_path                   400, 23514, the path CHECK
--   public.album read as anon             kind present, guest_id absent
--   an mp4 object upload                  200, where it was refused before
--   an application/zip upload             400, 415 InvalidMimeType
--   55 MB against the 50 MiB ceiling      400, 413 EntityTooLarge
--   delete_own_photo, right guest         1
--   delete_own_photo, replayed            0
--   delete_own_photo, wrong guest         0, and the real row survived
--
-- A full end to end run was then done through the actual site against the real
-- database: a 70 second clip refused in the browser without touching the wire,
-- a 5 second clip uploaded and recorded with kind video, and a second clip
-- refused BY THE DATABASE with the control left open, which is the branch that
-- matters because closing it would refuse four photographs the register would
-- happily take. Every row and object created by that run was removed, and the
-- table is back at fifteen.
--
-- 2026-08-28, LATER THE SAME DAY. public.my_photos was added in
-- supabase/30-my-photos.sql and applied. It lets a guest recover the list of
-- their own storage paths from their guest_id, which is what makes their own
-- photographs removable again on a device whose photo_paths list is missing.
--
-- Five of the fifteen rows here were unreachable by the people who uploaded
-- them: addPhotoPath() did not exist until 2026-08-18, so anything uploaded
-- before that recorded a count on the device and no path. The owner reported
-- it about the guest named Miao, and it was five photographs, not one.
--
-- It is strictly weaker than delete_own_photo, which already lets a holder of
-- a guest_id destroy those same rows. Read the header of 30-my-photos.sql for
-- why that is the right comparison to make.
--
-- 2026-08-28, LATER STILL. The owner reported real photographs and real
-- videos being refused. Four causes, three of them ours:
--
--   Android content providers and cloud pickers hand back
--   application/octet-stream for ordinary photographs, and fileKind() refused
--   anything whose type was neither image/ nor video/. Same class of bug as
--   the empty-type one fixed earlier the same day, arriving through the check
--   written to fix that one. It now falls through to the name for ANY type
--   that did not settle it.
--
--   photos.maxFileSizeMb was 12, which refuses ordinary modern phone
--   photographs. Raised to 40. It costs the bucket nothing: everything is
--   downscaled and re-encoded before upload, so the stored object is
--   unchanged either way.
--
--   Only mp4 and quicktime were accepted. Android writes video/3gpp for
--   lower resolution capture. video/3gpp and video/webm are now accepted,
--   here and in the path constraint below and in config.js. It is a real
--   trade: webm does not play in Safari and 3gp does not play in Chrome.
--
--   The fourth is NOT ours and cannot be fixed here: image/heic cannot be
--   decoded by Chromium at all. iOS converts HEIC to JPEG when the guest
--   picks from the photo album, so this only bites files that arrive through
--   Files, a share sheet or a cloud provider. Every refusal now names the
--   type it refused, so this one identifies itself.
--
-- (Superseded note follows.)
-- NOT YET APPLIED: section 11 was added to this file on 2026-08-17 and has not
-- been run against project aplaxdplwnnlezffatal. Everything above this
-- paragraph is applied and verified; section 11 is not, and until the owner
-- runs this file again the two bounds it declares exist in the repository and
-- nowhere else. The live database still accepts a photos row with a name of any
-- length and a storage_path of any shape from any holder of the publishable
-- key, exactly as it did before.
--
-- It is the owner's one line: Dashboard > SQL Editor > New query > paste this
-- whole file > Run, the same way every section above was applied. Run the whole
-- file rather than section 11 alone, which is what has proved the earlier
-- sections again on every previous pass.
--
-- Two things to expect while doing it, both of them correct behaviour rather
-- than a problem with the file. The alter reads the rows already in the table
-- and stops with an error if any of them breaks the new bound, which is the
-- same property section 10 documents for the guest count; on this project the
-- photos table was emptied in the cleanup recorded above, so there should be
-- nothing to trip over, and if there is, the offending row is somebody's real
-- submission and is worth looking at rather than deleting. And the path shape
-- is the other half of a contract whose first half lives in app.js, so if that
-- regex is ever changed this constraint has to change in the same commit.
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
  created_at   timestamptz not null default now(),
  -- What kind of thing this row is. Added 2026-08-28 by 20-video.sql, which is
  -- also the file to read for why the limit trigger below now counts twice.
  -- Defaulted, so the fifteen rows that predate it are correct with no
  -- backfill to remember.
  kind         text not null default 'photo'
);

-- Stated as its own statement rather than inline, so 20-video.sql can add
-- exactly this constraint, by name, to a database where the column already
-- exists. A check written inline here would be unreachable from there.
alter table public.photos drop constraint if exists photos_kind_check;
alter table public.photos add constraint photos_kind_check
  check (kind in ('photo', 'video'));

-- THE PATH CONTRACT'S FOURTH COPY.
--
-- The shape is written in four places and they change together: storagePath()
-- in app.js writes it, STORAGE_PATH_RE in app.js reads it back, album.js holds
-- a second copy of that regex by hand, and this is the database's own opinion.
-- It anchored '\.jpg$' until 2026-08-28, so a video insert was refused here no
-- matter what the client believed it was allowed to send.
alter table public.photos drop constraint if exists photos_storage_path_check;
alter table public.photos add constraint photos_storage_path_check check (
  storage_path ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|mp4|mov|3gp|webm)$'
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
--
-- The number below and photos.maxPerGuest in config.js agree today, and they
-- have to move together, which is the same arrangement section 10 describes for
-- the guest count bound. The site stops a guest at the config number and this
-- is the floor underneath it. Raise the config value alone and the database
-- refuses the sixth photograph anyway, so a guest is promised six and given
-- five. Raise this one first, then that one.
-- ============================================================================

create or replace function public.enforce_photo_limit()
returns trigger language plpgsql
security definer            -- it reads the table it guards, and anon cannot
set search_path = ''
as $$
declare
  current_count integer;
  video_count   integer;
begin
  -- THE LOCK IS NOT DECORATION. Two rows posted in the same instant would both
  -- see a count of zero and both pass. Photographs have always had that race
  -- and it was survivable at five, because the worst case was a sixth
  -- photograph. It is not survivable at one, where the worst case is the whole
  -- video rule, so the guest's rows are locked before either count is taken.
  perform 1 from public.photos where guest_id = new.guest_id for update;

  select count(*) into current_count
    from public.photos
   where guest_id = new.guest_id;

  if current_count >= 5 then
    raise exception 'photo_limit_reached';
  end if;

  -- The second ceiling, and a SECOND NAME for it. A refusal that cannot say
  -- which limit was hit is a refusal a guest cannot act on: "five is the
  -- limit" is the wrong sentence for somebody who has posted two photographs
  -- and is trying to add a second video. The client maps each name to its own
  -- copy key, in three languages.
  if new.kind = 'video' then
    select count(*) into video_count
      from public.photos
     where guest_id = new.guest_id
       and kind = 'video';

    if video_count >= 1 then
      raise exception 'video_limit_reached';
    end if;
  end if;

  return new;
end $$;

-- The same discipline section 8 applies to its own definer function: take the
-- default away before handing anything back. Nothing can call this one by name
-- in any case, because it errors outside a trigger, but the file should have
-- one rule about definer functions and no exceptions to it.
--
-- REVOKING FROM public ALONE DID NOT DO IT, and that was found by the linter on
-- 2026-08-28 rather than by reading, because the claim above reads as true.
-- Supabase grants EXECUTE on functions in the public schema to anon and
-- authenticated DIRECTLY, through default privileges, and a revoke aimed at the
-- PUBLIC pseudo-role does not touch an explicit grant. So anon held EXECUTE on
-- a SECURITY DEFINER function for as long as this file has existed.
--
-- The exposure was nil in practice: PostgREST does not put trigger functions in
-- its schema cache, so /rest/v1/rpc/enforce_photo_limit answers PGRST202. The
-- three lines below are worth it anyway, because the next person will read the
-- paragraph above and believe it.
--
-- None of this can break the trigger. Postgres does not check EXECUTE on a
-- trigger function when the trigger fires; the executor calls it as the table
-- owner. Verified after the revoke by inserting a second video and watching
-- video_limit_reached still come back.
revoke execute on function public.enforce_photo_limit() from public;
revoke execute on function public.enforce_photo_limit() from anon;
revoke execute on function public.enforce_photo_limit() from authenticated;

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
-- ----------------------------------------------------------------------------
-- Two limits on the bucket record itself, and they are the only rules here that
-- a crafted request cannot walk around. Everything the website checks before an
-- upload protects a guest from picking the wrong file; none of it protects this
-- bucket, because the key is public by design and anyone holding it can talk to
-- the API directly.
--
-- The size ceiling is the real one. It is counted on the bytes that arrive, so
-- it holds against anything, including a request that never went near the site.
-- Three mebibytes, written below in bytes because that is what the column
-- stores. That is roughly ten times what the website produces after it shrinks
-- a photo, and small enough that nobody fills the free tier.
--
-- It is not the same number as photos.maxFileSizeMb in config.js and the two
-- must not be reconciled into one. That one is twelve megabytes and it stops a
-- phone from trying to decode something that would kill the tab, before the
-- shrink. This one is three mebibytes and it stops this bucket from being
-- filled, after the shrink. Two numbers, two jobs.
--
-- The type list is hygiene rather than a wall. Supabase checks the type the
-- uploader DECLARES, not the bytes, so anyone can claim a photo and send
-- something else. It still earns its line: it stops accidents and casual junk,
-- and it keeps the album to one format, which is what the site produces anyway.
-- It is not a control and nothing here should be written as if it were.
--
-- The insert below used to end by stepping silently over a bucket that already
-- exists, which meant it applied nothing at all here, because this bucket has
-- existed since the first run. So it updates instead, in the same idempotent
-- shape section 7 uses for the withdrawn column.
--
-- One thing to know before you meet it: with a type list set, making a folder
-- through the dashboard can be refused, because the empty placeholder file it
-- creates is not a jpeg. Deleting is unaffected.
-- ============================================================================

-- 50 MiB and three types since 2026-08-28, for one minute of video per guest.
--
-- This is the ONLY control in the whole feature that survives a crafted
-- request, because it counts the bytes that ARRIVE rather than anything a
-- browser claims. The duration and size checks in app.js are a courtesy to a
-- guest who picked the wrong clip; this is the rule.
--
-- It is also a bill. The free tier is 1 GB of storage and 5 GB of egress a
-- month, so this is roughly twenty videos, and every view of the album page
-- spends egress against it. Raising this number raises that bill.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('party-photos', 'party-photos', true, 52428800,
        array['image/jpeg', 'video/mp4', 'video/quicktime', 'video/3gpp', 'video/webm'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

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
    created_at,
    -- Appended and never inserted mid list, which is what keeps create or
    -- replace legal and the grant below intact. guest_id is still not here and
    -- must never be: this whole view exists because reading the album off the
    -- raw table handed out the credential that amends and deletes.
    kind
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
-- 11. THE PHOTO COLUMN BOUNDS
-- ----------------------------------------------------------------------------
-- PENDING. This section is in the file and is not in the database. See the
-- NOT YET APPLIED paragraph in the STATUS block at the top.
--
-- Section 1 bounds every piece of guest supplied text in enrollments: a name
-- is between one and sixty characters and a note is at most five hundred.
-- Section 2 bounds none of the two in photos, and photos is the table whose
-- name column is rendered into every other guest's browser through
-- public.album. The insert policy is with check (true), so the only thing
-- standing between the publishable key and an arbitrarily long string in
-- everybody's album is a length check in a JavaScript file, and a client side
-- check is a courtesy to a guest rather than a rule about a stranger. This
-- section writes the rule on the side of the wire that can enforce it.
--
-- The name bound is the enrollments bound, character for character, because it
-- is the same name: the site copies it from the registration it was typed
-- into, so any other number here would be a second opinion about one value.
--
-- The path bound is STORAGE_PATH_RE from app.js, read forwards. That regex is
-- the render time allowlist that keeps a database supplied string from
-- steering an href, and app.js already says the two halves of the path
-- contract must change together in one commit. This is now a third half, and
-- the same sentence applies to it: change the shape and this constraint, the
-- regex, and storagePath() all move in the same commit or new photographs stop
-- being insertable, renderable, or both.
--
-- Both are written as alters rather than by editing section 2, for section
-- 10's reason: create table if not exists will not add a check to a table that
-- already exists. Each constraint is named in both halves so the drop and the
-- add cannot end up pointing at two different things, and the pair is safe to
-- run as many times as the file is.
--
-- Neither of these is a moderation tool and neither is claimed as one. Anyone
-- holding the publishable key can still write a row, and this file has never
-- pretended otherwise. What they do is take the shape of that row out of the
-- browser's hands.
-- ============================================================================

alter table public.photos
  drop constraint if exists photos_name_check,
  add constraint photos_name_check check (char_length(trim(name)) between 1 and 60);

alter table public.photos
  drop constraint if exists photos_storage_path_check,
  add constraint photos_storage_path_check check (
    storage_path ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$'
  );


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
