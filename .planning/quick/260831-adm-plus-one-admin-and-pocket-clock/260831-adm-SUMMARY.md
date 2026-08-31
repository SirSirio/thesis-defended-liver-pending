---
id: 260831-adm
slug: plus-one-admin-and-pocket-clock
kind: quick
created: 2026-08-31
completed: 2026-08-31
status: complete
mode: inline
versions: v22, v23, v24 (v21 shipped 2026-08-29, recorded in STATE.md)
files_modified:
  - app.js
  - album.js
  - album.html
  - index.html
  - check.html
  - config.js
  - copy.js
  - styles.css
  - admin.html (new)
  - supabase/schema.sql (sections 12 and 13 appended)
---

# Quick task 260831-adm: summary

One session, four deploys, all owner-requested. Everything below is live,
proved from the untrusted position where the database is involved and in
real Chrome at phone width where the page is.

## v22: the plus one, the schedule, and the admin

**The plus one is a person, not a number.** `maxGuestsPerPerson` is 1 (the
owner removed +2). Choosing 1 reveals a required name field; the name rides
the insert as `plus_one_name`, the amend as `p_plus_one` (empty clears, as
the note), the receipt as its own row, and `public.attendees` as
`plus_one_first` (first token only), so the participant list lists people.
**The old six-argument `amend_enrollment` was DROPPED, not overloaded**:
two overloads with defaults make PostgREST refuse to choose. Schema
section 12.

**The schedule.** `photos.opensAt` restored: uploads open 2026-10-03 16:00
Copenhagen. The hero's second button reads "Get directions" (was "Which
door"), and objective six now demands the intake of at least 10 grams of
fun, measured by any accredited method.

**The admin.** `admin.html`, unlisted and linked from nothing. A PIN
(bcrypt hash only, in `public.admin_secret`, RLS + zero grants; rotation
SQL in schema section 13; **the PIN itself is 4 digits at the owner's
insistence and lives nowhere in this public repo**) unlocks two powers
through PIN-checked security definer RPCs:

- `admin_set_uploads` writes `public.settings.uploads_override`
  ('open' / 'closed' / null = follow the schedule). Every guest page reads
  the row at load and every five minutes and obeys in both directions; a
  failed fetch leaves the schedule in charge; the admin-paused portal has
  its own sentence (`photos.paused.body`, three languages).
- `admin_remove_photo` deletes the row (the album forgets it everywhere at
  once); admin.html then deletes the object through the storage API under
  a policy that permits deleting **orphans only** (`is_orphan_object`,
  security definer, because anon cannot read `public.photos` and a plain
  policy subquery therefore errors). The storage API is the only door that
  purges the CDN; edges may serve the dead URL for up to ~a minute.

Proved untrusted: settings readable/unwritable, secret unreadable, wrong
PIN refused everywhere with nothing changed, a live object undeletable by
anon, an admin removal killing row then file, attendees still refusing
name and note. Driven in Chrome: 22 checks across form, five gate
combinations, admin page; the v21 upload pipeline re-run unregressed.

## v23: the pocket clock and the album door

The scheduled-closed photos panel carries a small countdown in the hero
clock's grammar (`.minicd`: number over mono label, accent colons, tabular
digits), reusing the hero's `countdown.*` label keys so three languages
cost nothing, updated by `tickMiniCountdown()` on the existing one second
tick, filled before first paint. Absent under the admin pause (no moment
to count to) and under the open portal.

The album's "Add yours" ships `hidden`; `album.js syncAddYours()` shows it
only when schedule + override say the portal takes something. The schedule
is read synchronously from config so the common case never flashes.

## v24: the lede tells the truth about dinner

`enrol.lede` claimed the host buys food. Now, in three languages: dinner
is ordered as takeaway and the order follows the headcount; snacks and
some drinks are provided; bringing a bottle is part of the coursework.
A WhatsApp invitation message was drafted for the owner (chat only).

## Operational notes for the next session

- Asset version is **?v=24** on every page including check.html and
  admin.html. Bump on every deploy.
- The portal is schedule-closed until the party. To retest the Android
  first pick (still the one unproven case from v21), the owner opens
  admin.html, taps Open now, tests, then Follow the schedule.
- The 4-digit PIN is brute-forceable by a patient scripter against the
  public RPC oracle; accepted by the owner. Worst case: paused uploads or
  deleted photos. Rotation is one paste in the SQL editor.
- Harnesses for all of it live in the session scratchpad (run1..run4.js):
  real Chrome, stubbed wire, phone viewport. Rebuild from the summaries if
  needed; they are not committed.

## Addendum, same day: the register under the PIN

admin.html gained a third section: the register. `admin_list_enrollments`,
`admin_edit_enrollment`, `admin_delete_enrollment` (schema section 14), all
PIN-checked, rows addressed by the enrollment's own id and never guest_id.
A name edit rewrites `public.photos.name` for that guest, so the album's
attribution follows the register; proved on the wire with a first token
that actually changed. A delete cannot reach the guest's device: their
phone keeps showing its receipt and quietly re-registers them under the
same guest_id the next time they touch the form; their photographs stay.
The PIN now also guards the private notes, which with a four digit PIN is
an accepted trade, said to the owner in as many words. UI proved in real
Chrome: list with notes and heads count, edit posting both names, delete
armed by a second tap that names the person.
