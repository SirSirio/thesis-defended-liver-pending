---
phase: 03-enrollment-identity-and-the-group
plan: 03
subsystem: database
tags: [supabase, postgres, rls, security-definer, schema, config]
status: blocked
blocked_on: "Task 3, checkpoint:human-action. The owner must run supabase/schema.sql in the Supabase SQL editor. Probe confirms the migration is NOT applied."
requires:
  - "03-01 (app.js amendEnrollment() calls the function this plan defines)"
provides:
  - "public.enrollments.withdrawn column (idempotent alter)"
  - "public.attendees re-created with the withdrawn filter, anon grant preserved"
  - "public.amend_enrollment(uuid, text, smallint, text, text, boolean) returns integer, security definer, empty search path"
  - "revoke execute from public then grant execute to anon on that exact signature"
  - "owner closing block: head count excluding withdrawn rows, plus the who-dropped-out query"
affects:
  - "03-05 (edit and withdraw controls key off this function; must stay degraded until the probe passes)"
  - "04 (photo upload reads the same credentials from config.photos, deliberately not moved)"
tech-stack:
  added: []
  patterns:
    - "security definer function as the narrow alternative to a read policy"
    - "create or replace view to add a filter without dropping the anon grant"
    - "idempotent alter table add column if not exists"
key-files:
  created: []
  modified:
    - supabase/schema.sql
    - config.js
decisions:
  - "Adopted option-c: a security definer RPC satisfies ENR-06. No read policy is added, so D-02's one-way door stays shut."
  - "The function returns integer and never a row. The return type is the security boundary and the file says so in a comment."
  - "The withdrawn column is added by alter, not by re-declaring the table, so the file's safe-to-run-more-than-once promise survives."
  - "Supabase credentials stay under config.photos even though enrollment now uses them. Moving them would break enrollmentReady() and pre-break phase 4."
  - "The STATUS banner was split so it no longer claims sections 7 and 8 are applied."
metrics:
  duration: "~18 min to the blocking checkpoint"
  completed: 2026-08-14
  tasks_completed: 2
  tasks_total: 3
actuals:
  tokens: 6435
  tasks: 2
  commits: 2
---

# Phase 03 Plan 03: The Missing Schema Summary

A `withdrawn` flag and a `security definer` amend function are now written into
`supabase/schema.sql`, closing the zero-rows/204 gap that would have made edit and withdraw
silently do nothing, without adding the read policy that would republish every guest's note.
The migration is written but **not applied**, and the plan stops there by design.

## What Was Built

**`supabase/schema.sql` section 7, withdrawal.** `alter table ... add column if not exists
withdrawn boolean not null default false`, then `create or replace view public.attendees`
carrying the same three columns in the same order with the same types, plus a
`where withdrawn = false` filter. The `grant select on public.attendees to anon` line stays
immediately after the view, where a replace preserves it and a drop would not. A comment
records that the view reads with its owner's rights and that switching it to the visitor's
rights would make social proof go permanently and silently empty rather than error.

**`supabase/schema.sql` section 8, the amend function.**
`public.amend_enrollment(uuid, text, smallint, text, text, boolean) returns integer`,
`language plpgsql`, `security definer`, `set search_path = ''` with every relation in the body
schema-qualified. Five nullable parameters coalesce against the existing value, except `note`,
where null leaves it alone and an empty string clears it. The row count comes from
`get diagnostics`, so 1 means found and changed and 0 means no row carries that guest_id.
Execute is revoked from `public` before it is granted to `anon`, with the six-argument
signature repeated verbatim in both statements. A comment above the function names the return
type as the security boundary.

**The closing owner block, rewritten.** It previously counted withdrawn rows, so the owner's
head count would have disagreed with the number the site shows. It now carries the head count
with `where withdrawn = false` and the sum wrapped in a coalesce, and immediately adjacent to
it a second query naming who dropped out ordered by `updated_at desc`. The two sit adjacent so
neither can be found without seeing the other.

**`config.js`, comments only.** The quiz block said phase 4 and now says phase 5. The photos
block said phase 3 and now says phase 4. The credentials paragraph claimed enrollment and
photos "show a waiting message until both are filled in", which has been false since
2026-08-13; it now describes what the waiting message is *for*. A new paragraph records that
registration shares these two values and explains why they stay under `photos` rather than
moving. No key was added, removed, moved or renamed.

## Requirements Satisfied

| ID | Status | Note |
|---|---|---|
| ENR-06 | written, not live | Satisfied once the owner runs the file. The probe is the proof. |
| ENR-11 | complete | Both owner queries present and adjacent; head count matches the site. |
| ENR-13 | unchanged | `guest_id unique` remains the real cap, honestly scoped per D-30. |
| CFG-01 | complete | No new keys; every volatile value still lives in one file. |
| CFG-03 | complete | Comments corrected; graceful placeholder behaviour described accurately. |

## Deviations from Plan

### Auto-resolved

**1. [Task 1 checkpoint:decision] Auto-selected option-c rather than the first option**

- **Found during:** Task 1
- **Issue:** Auto mode is active (`workflow.auto_advance: true`) and the checkpoint carried
  `gate="blocking"`, so the default behaviour is to select the first option. The planner did not
  front-load the recommendation here: option-a is "add a permissive read policy", which is
  contradicted by this plan's own `must_haves.truths` ("No SELECT policy is added to
  `public.enrollments` by this plan or anywhere in this phase"), by threat T-03-16 whose
  disposition is `mitigate` with mitigation "None is added", by locked decisions D-02 and D-35,
  and by four of this plan's own verification gates. Selecting it would have made the plan
  unexecutable by construction.
- **Fix:** Selected option-c, which the planner marked `(recommended)` and which every other
  artifact in the phase assumes.
- **Commit:** 4aac58a

### Auto-fixed

**2. [Rule 3 - Blocking] The `for select` gate was unsatisfiable as written**

- **Found during:** Task 2 verification
- **Issue:** The plan asserts `grep -c 'for select' supabase/schema.sql` returns 0. It returns
  **2**, and both matches are pre-existing and load-bearing: `on public.photos for select` at
  line 122 (the album is public by design) and `on storage.objects for select` at line 187.
  The same task's action text explicitly forbids touching either ("Do not touch the existing
  policies, the timestamp trigger or the storage section"), and deleting them would break the
  phase 4 photo album. The gate's stated intent, given in the acceptance criteria on the same
  line, is "No read policy ... exists anywhere in the file" meaning on `public.enrollments`.
- **Fix:** Narrowed the assertion to its intent. The replacement parses every
  `on <relation> for select|delete` in the file, fails if any names `public.enrollments`, and
  additionally pins the full match set to exactly the two known album policies so a future
  read policy on any new relation still trips it. This is strictly stronger than the literal
  gate for the thing that matters and does not require deleting the album.
- **Result:** passes. `no select or delete policy on public.enrollments; only the two
  pre-existing album policies remain: public.photos for select | storage.objects for select`
- **Commit:** 4aac58a

**3. [Rule 2 - Missing critical correctness] The STATUS banner claimed applied-and-verified**

- **Found during:** Task 2
- **Issue:** `schema.sql`'s header block read "STATUS: applied to project aplaxdplwnnlezffatal
  on 2026-08-13, and verified against the live database." After appending sections 7 and 8 that
  sentence is false for the majority of the new content, and this plan's whole premise is that
  the migration is proved by a probe rather than asserted.
- **Fix:** Split the banner. Sections 1 to 6 keep the verified claim; a second paragraph states
  that sections 7 and 8 were added 2026-08-14, are NOT in the database yet, that a guest can
  still register perfectly well meanwhile, and that running the whole file installs them.
- **Commit:** 4aac58a

## Verification

Run from the repository root. All executed, all passing:

1. `config.js` loads under Node with all four enrollment keys, `whatsapp.inviteUrl` and both
   credential keys in their existing positions. **PASS** (`config keys unchanged`)
2. All eleven required schema substrings present, including the verbatim six-argument signature
   in both the revoke and the grant. **PASS**
3. Anon grant sits after the view and before section 8, asserted by index comparison; closing
   block carries both queries with the sum coalesced. **PASS** (`schema shape OK`)
4. `returns setof` = 0, `for delete` = 0, `security_invoker` = 0. **PASS**
5. No select or delete policy on `public.enrollments` (narrowed gate, see deviation 2). **PASS**
6. Zero em dashes and zero en dashes in both files. **PASS** (`dash scan clean`)
7. **The applied check. NOT SATISFIED, and only the owner can satisfy it.**

Probe run against the live project at 2026-08-14T18:53Z, before the owner's re-run:

```
POST https://aplaxdplwnnlezffatal.supabase.co/rest/v1/rpc/amend_enrollment
{"p_guest_id":"00000000-0000-4000-8000-000000000000"}

{"code":"PGRST202","details":"Searched for the function public.amend_enrollment with parameter
 p_guest_id or with a single unnamed json/jsonb parameter, but no matches were found in the
 schema cache.","hint":null,"message":"Could not find the function
 public.amend_enrollment(p_guest_id) in the schema cache"}
HTTP 404
```

This is exactly the "not done" shape the plan predicts. After the owner runs the file the same
call must answer `0` and `HTTP 200`.

## Known Stubs

None in code. One outstanding **owner action**, which is the plan's designed stop rather than a
stub: `supabase/schema.sql` sections 7 and 8 exist in the repository and not in the database.

Nothing downstream may assume the migration ran. Plan 05 carries a precondition asserting the
probe result, and per D-36 the client degrades to an honest pending line on `PGRST202` while
enrollment itself keeps working untouched.

## Threat Flags

None. No new security-relevant surface beyond what the plan's `<threat_model>` already
registers. T-03-14, T-03-15, T-03-16 and T-03-17 all carry disposition `mitigate` and all four
mitigations are implemented and gated:

| Threat | Mitigation in place |
|---|---|
| T-03-14 | Body bounded to `where guest_id = p_guest_id`, returns integer, empty search path, revoke before grant |
| T-03-15 | Comment names the return type as the boundary; gate asserts no set-returning form |
| T-03-16 | No read policy added; gate asserts none exists on `public.enrollments` |
| T-03-17 | Gate asserts the invoker setting appears nowhere; comment records the silent-empty consequence |

## For the Next Plan

- Plan 05 must not render edit or withdraw as working until the probe returns `0` / `HTTP 200`.
  `PGRST202` is a pending state, not an error state.
- A `0` body from a live function means the guest's storage and the database have diverged; the
  correct recovery is the insert path, not an error.
- Do not add `note` to the `attendees` view and do not add a read policy. Both are one-line
  changes with irreversible consequences.
</content>
</invoke>
