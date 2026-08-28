-- ============================================================================
-- 20-video.sql
-- Phase 04.1, plan 2, task 1.
--
-- One video per guest, up to one minute, spending one of the existing five
-- slots. Owner decisions D-1 to D-3 are recorded in
-- .planning/phases/04.1-the-upload-rebuilt-.../04.1-CONTEXT.md.
--
-- RUN THIS BEFORE SETTING config.photos.video.enabled TO true.
--
-- Until it has run, the site is correct and silent about video: the rules
-- strip says nothing about it, the picker refuses it, and no promise is made
-- that the database would break. Flipping the config flag first is the one
-- ordering that produces a guest picking a video and being refused by
-- Storage, which reads as the site being broken.
--
-- Safe to run twice. Every statement is idempotent.
--
-- To run it: Supabase dashboard, project aplaxdplwnnlezffatal, SQL Editor,
-- paste the whole file, Run. Or `supabase db execute -f supabase/20-video.sql`.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. WHAT KIND OF THING A ROW IS
-- ----------------------------------------------------------------------------
-- public.photos had no column naming this, so the renderer had nothing to read
-- and the limit trigger had nothing to count separately.
--
-- Defaulted to 'photo' and NOT NULL, so the fifteen rows already in the table
-- are correct the moment this runs and there is no backfill to forget.

alter table public.photos
  add column if not exists kind text not null default 'photo';

alter table public.photos
  drop constraint if exists photos_kind_check;

alter table public.photos
  add constraint photos_kind_check check (kind in ('photo', 'video'));


-- ----------------------------------------------------------------------------
-- 2. THE PATH CONTRACT, AND ITS FOURTH COPY
-- ----------------------------------------------------------------------------
-- The storage path shape is written in FOUR places and they change together:
--
--   storagePath()      in app.js     writes it
--   STORAGE_PATH_RE    in app.js     reads it back at render time
--   STORAGE_PATH_RE    in album.js   a second copy, maintained by hand
--   this CHECK                       the database's own opinion
--
-- The plan for this phase named the first three. This one was found by reading
-- the live schema, and it is the one that matters most: it anchors '\.jpg$',
-- so without this change every video insert is refused by the database no
-- matter what the client believes it is allowed to send.

alter table public.photos
  drop constraint if exists photos_storage_path_check;

alter table public.photos
  add constraint photos_storage_path_check check (
    storage_path ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|mp4|mov)$'
  );


-- ----------------------------------------------------------------------------
-- 3. TWO LIMITS, TWO MESSAGES
-- ----------------------------------------------------------------------------
-- Five of anything, and at most one of them a video.
--
-- Two counts rather than one, and two distinct exception names, because a
-- refusal that cannot say WHICH ceiling was hit is a refusal a guest cannot act
-- on. The client maps each name to its own sentence in three languages.
--
-- THE LOCK IS NOT DECORATION. Two videos posted in the same instant would both
-- see a count of zero and both pass. Photographs have always had that race and
-- it was survivable at five, because the worst case was a sixth photograph.
-- It is not survivable at one, where the worst case is the whole rule. So the
-- guest's rows are locked for the length of the transaction before either
-- count is taken.
--
-- The literal 5 agrees with photos.maxPerGuest in config.js, and config.js
-- already carries the note saying these two must be changed together.

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  current_count integer;
  video_count   integer;
begin
  perform 1 from public.photos where guest_id = new.guest_id for update;

  select count(*) into current_count
    from public.photos
   where guest_id = new.guest_id;

  if current_count >= 5 then
    raise exception 'photo_limit_reached';
  end if;

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
end $function$;


-- ----------------------------------------------------------------------------
-- 4. THE ALBUM VIEW LEARNS WHAT IT IS HANDING OUT
-- ----------------------------------------------------------------------------
-- kind is APPENDED and never inserted mid list, which is what makes CREATE OR
-- REPLACE legal here. The existing grants survive it.
--
-- guest_id is still not here and must never be. Section 9 of schema.sql exists
-- because reading the album off the raw table handed out the credential that
-- amends a registration and deletes a photograph.

create or replace view public.album as
  select split_part(trim(both from name), ' ', 1) as first_name,
         storage_path,
         created_at,
         kind
    from public.photos;


-- ----------------------------------------------------------------------------
-- 5. THE CEILING THAT ACTUALLY HOLDS
-- ----------------------------------------------------------------------------
-- Everything above is the database's opinion about rows. This is the only
-- control in the whole feature that survives a crafted request, because it is
-- counted on the bytes that ARRIVE rather than on anything a browser claims.
-- The client side duration and size checks are a courtesy to a guest who
-- picked the wrong clip; this is the rule.
--
-- 3 MiB to 50 MiB, and the two container types a phone actually produces:
-- video/mp4 from Android, video/quicktime from iOS.
--
-- 50 MiB IS A BILL AS WELL AS A LIMIT. The free tier is 1 GB of storage and
-- 5 GB of egress a month, so this is roughly twenty videos before the tier is
-- spent, and every view of the album page spends egress against it. Raising
-- this number raises that bill.
--
-- The insert updates an existing bucket rather than stepping over it, which is
-- the same on-conflict shape section 6 of schema.sql already uses.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('party-photos', 'party-photos', true, 52428800,
        array['image/jpeg', 'video/mp4', 'video/quicktime'])
on conflict (id) do update
  set file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;


-- ----------------------------------------------------------------------------
-- VERIFY AFTER RUNNING
-- ----------------------------------------------------------------------------
-- These are read-only and safe to paste after the migration.
--
--   select column_name, data_type, column_default
--     from information_schema.columns
--    where table_schema='public' and table_name='photos' and column_name='kind';
--
--   select conname, pg_get_constraintdef(oid)
--     from pg_constraint where conrelid='public.photos'::regclass and contype='c';
--
--   select id, file_size_limit, allowed_mime_types
--     from storage.buckets where id='party-photos';
--
--   select count(*), kind from public.photos group by kind;   -- expect 15 photo
--
-- The two refusals must then be proved FROM THE UNTRUSTED POSITION, with the
-- publishable key over HTTP, not from the dashboard. The dashboard runs as
-- owner and proves nothing about what a guest can do. Plant a synthetic row
-- for the negative test and delete it in the same session, exactly as the
-- 260818-rmv session did, so none of the owner's real photographs are touched.
