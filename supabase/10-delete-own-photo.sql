-- ==========================================================================
-- 10. LETTING A GUEST DELETE THEIR OWN PHOTOGRAPH
--
-- Run this in the Supabase SQL editor. Nothing in the site can do it for you,
-- and until it is applied the delete control in the page will fail cleanly
-- and say so rather than pretending to have worked.
--
-- WHAT THIS REVERSES
--
-- Two things were deliberate and are being changed on purpose:
--
--   1. The site could not delete anything. Section 5's policies grant anon
--      insert on public.photos and nothing else, and STATE.md records that
--      anonymous delete is refused. That was the right default while nobody
--      had asked for the feature.
--   2. The uploader tells every guest, in three languages, that "anything you
--      submit stays in the album for everyone. It cannot be taken back from
--      here." That sentence stops being true the moment this runs, so the
--      copy has to change with it. A promise quietly withdrawn is worse than
--      one never made.
--
-- WHAT THIS DOES NOT DO
--
-- It deletes the ROW, not the object in storage. Removing the row takes the
-- photograph out of public.album, which is the only thing the site reads, so
-- it disappears from every page immediately and from everybody's view.
--
-- The JPEG itself stays in the bucket, unreferenced, exactly like the accepted
-- orphan D-19 already describes. That is deliberate: a storage delete policy
-- reachable by the publishable key is a much larger blast radius than a row
-- delete guarded by a guest_id, and the upside is disk space on a free tier
-- for one evening. Purge the bucket from the dashboard afterwards if you care.
--
-- WHY A FUNCTION RATHER THAN A POLICY
--
-- Same reasoning as amend_enrollment in section 8. A delete policy on
-- public.photos would need the guest to hold a readable row to match against,
-- and section 8 deliberately made that table unreadable because it carries
-- guest_id. A security definer function takes the credential as an argument,
-- checks it server side, and never hands the table back.
-- ==========================================================================

create or replace function public.delete_own_photo(
  p_guest_id uuid,
  p_storage_path text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  -- Both must match. Holding the storage path alone is not enough: those are
  -- public URLs and anybody who has looked at the album has all of them. The
  -- guest_id is the credential, exactly as it is for amending a registration.
  delete from public.photos
   where guest_id = p_guest_id
     and storage_path = p_storage_path;

  get diagnostics removed = row_count;

  -- 0 rather than an error for a photograph that is not there or not theirs.
  -- The caller cannot tell those two cases apart, which is the point: this
  -- must not become a way to ask whether a given path belongs to a given id.
  return removed;
end;
$$;

revoke all on function public.delete_own_photo(uuid, text) from public;
grant execute on function public.delete_own_photo(uuid, text) to anon;

-- ==========================================================================
-- VERIFY, on the wire rather than by reading
--
-- 1. Take a real storage_path from public.album and the guest_id from the
--    browser that uploaded it (localStorage, key c03102.guest_id).
--
--    curl -s -X POST "$URL/rest/v1/rpc/delete_own_photo" \
--      -H "apikey: $KEY" -H "Authorization: Bearer $KEY" \
--      -H "Content-Type: application/json" \
--      -d '{"p_guest_id":"<the id>","p_storage_path":"<the path>"}'
--
--    Expect 1. Then read public.album again and confirm it is gone.
--
-- 2. Repeat with a guest_id that did not upload it. Expect 0, and confirm the
--    row is still in public.album. If that returns 1, stop and do not ship the
--    delete control: any guest could remove anybody's photograph.
-- ==========================================================================
