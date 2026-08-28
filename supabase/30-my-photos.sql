-- ============================================================================
-- 30-my-photos.sql
--
-- A guest can find their own photographs again.
--
-- ALREADY APPLIED to project aplaxdplwnnlezffatal on 2026-08-28 and verified
-- on the wire. This file is the record and the re-runnable copy.
--
-- THE BUG. The removal strip under the uploader is drawn from photo_paths in
-- the guest's own browser, and addPhotoPath() did not exist until the removal
-- feature shipped on 2026-08-18. Every photograph uploaded before that day
-- left a COUNT on the device and NO PATH. Those guests see the count go up,
-- see an empty strip, and cannot take their own photographs back out of the
-- album. Five of the fifteen rows in this table are in exactly that state,
-- which is how it was found: the owner reported it about the guest named Miao.
--
-- It also covers the general case that will keep happening: a photo_paths list
-- lost, truncated, or written by an older version of app.js, while the
-- guest_id survives.
--
-- WHY THIS IS SAFE. The guest_id is the credential, exactly as it is for
-- delete_own_photo and amend_enrollment. This function is strictly WEAKER than
-- delete_own_photo, which already lets a holder of a guest_id DESTROY these
-- same rows, so being able to list them adds no capability that was not there.
--
-- The storage paths are not secret either: public.album hands every one of
-- them to anybody who opens the album page. What is secret is the MAPPING from
-- a guest_id to its paths, and a guest_id is never published, which is the
-- whole reason public.album does not carry that column.
--
-- It returns no name, no guest_id and no id. A caller learns which public
-- paths belong to the credential they already hold, and nothing else.
-- ============================================================================

create or replace function public.my_photos(p_guest_id uuid)
returns table (storage_path text, kind text, created_at timestamptz)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  -- Oldest first, so the order the strip draws matches the order the
  -- photographs were taken, and matches what a returning guest expects.
  return query
    select p.storage_path, p.kind, p.created_at
      from public.photos p
     where p.guest_id = p_guest_id
     order by p.created_at asc;
end;
$function$;

-- The same discipline every other definer function gets: take the default
-- away, then hand back exactly what is needed.
--
-- Revoked from anon and authenticated EXPLICITLY as well as from public,
-- because Supabase grants those two directly through default privileges and a
-- revoke aimed at the PUBLIC pseudo-role does not touch an explicit grant.
-- That trap cost this project a false claim in schema.sql for two weeks; see
-- the note at enforce_photo_limit.
revoke execute on function public.my_photos(uuid) from public;
revoke execute on function public.my_photos(uuid) from anon;
revoke execute on function public.my_photos(uuid) from authenticated;
grant  execute on function public.my_photos(uuid) to anon;


-- ----------------------------------------------------------------------------
-- VERIFIED ON THE WIRE, 2026-08-28, with the publishable key
-- ----------------------------------------------------------------------------
--   a real guest_id        returned exactly that guest's five paths, oldest
--                          first, with kind and created_at
--   an unknown guest_id    [] and HTTP 200, never an error, so the function
--                          cannot be used to ask whether an id exists
--   the response body      contains no guest_id and no name
--
-- And in the browser, against this database, reproducing the exact broken
-- state: guest_id and photo_count set, photo_paths absent. The strip went from
-- empty to five frames with five working Remove controls.
