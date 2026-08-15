---
phase: 03-enrollment-identity-and-the-group
plan: 03
subsystem: database
tags: [supabase, postgres, rls, security-definer, schema, config]
status: complete
requires:
  - "03-01 (app.js amendEnrollment() calls the function this plan defines)"
provides:
  - "public.enrollments.withdrawn column (idempotent alter), live"
  - "public.attendees re-created with the withdrawn filter, anon grant preserved, live"
  - "public.amend_enrollment(uuid, text, smallint, text, text, boolean) returns integer, security definer, empty search path, live"
  - "revoke execute from public then grant execute to anon on that exact signature"
  - "owner closing block: head count excluding withdrawn rows, plus the who-dropped-out query"
affects:
  - "03-05 (edit and withdraw controls key off this function; its precondition now passes)"
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
  - "The STATUS banner tracks the live database on every change: split at task 2 to disclaim sections 7 and 8, corrected at task 3 once the probe proved them applied."
metrics:
  duration: "~18 min to the blocking checkpoint, ~6 min to close it after the owner acted"
  completed: 2026-08-15
  tasks_completed: 3
  tasks_total: 3
actuals:
  tokens: 6466
  tasks: 3
  commits: 4
---

# Phase 03 Plan 03: The Missing Schema Summary

A `withdrawn` flag and a `security definer` amend function now exist in
`supabase/schema.sql` **and in the live database**, closing the zero-rows/204 gap that would
have made edit and withdraw silently do nothing, without adding the read policy that would
republish every guest's note. The migration is applied and proved by a wire probe rather than
by anyone's report.

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

**The migration, applied.** The owner pasted the whole file into the SQL editor for project
`aplaxdplwnnlezffatal` and ran it. Sections 7 and 8 are now in the database, confirmed by the
probes below.

## Requirements Satisfied

| ID | Status | Note |
|---|---|---|
| ENR-06 | complete | Function live and callable by `anon`. Probe returns `0` / `HTTP 200`. |
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
- **Result:** re-run at task 3 and still passing. `no select or delete policy on
  public.enrollments; only the two pre-existing album policies remain: public.photos for
  select | storage.objects for select`
- **Commit:** 4aac58a

**3. [Rule 2 - Missing critical correctness] The STATUS banner claimed applied-and-verified**

- **Found during:** Task 2
- **Issue:** `schema.sql`'s header block read "STATUS: applied to project aplaxdplwnnlezffatal
  on 2026-08-13, and verified against the live database." After appending sections 7 and 8 that
  sentence is false for the majority of the new content, and this plan's whole premise is that
  the migration is proved by a probe rather than asserted.
- **Fix:** Split the banner. Sections 1 to 6 keep the verified claim; a second paragraph states
  that sections 7 and 8 were added 2026-08-14, are not in the database yet, that a guest can
  still register perfectly well meanwhile, and that running the whole file installs them.
- **Commit:** 4aac58a

**4. [Rule 2 - Missing critical correctness] The same banner went stale the moment the owner ran the file**

- **Found during:** Task 3
- **Issue:** The disclaimer added by deviation 3 was correct for exactly one day. Once the
  owner applied the migration, the banner asserted that sections 7 and 8 were absent from the
  database and that "nobody can edit or withdraw a registration", both of which the task 3
  probe disproves. A file that lies about the state of the database in the *optimistic*
  direction is the failure this plan exists to prevent; lying in the pessimistic direction is
  the same defect pointed the other way, and it would send a future reader to re-run a
  migration they have already applied or to distrust a function that works.
- **Fix:** Replaced the disclaimer paragraph with an applied-and-verified paragraph in the same
  voice and shape as the sections 1 to 6 line above it: applied to the same project on
  2026-08-15, verified against the live database, followed by the consequences a reader can
  now rely on. The banner is now a two paragraph history of what is live, one paragraph per
  migration event, which is the shape that stays honest across the next change too.
- **Files modified:** `supabase/schema.sql`
- **Commit:** see final commit below

## Verification

Run from the repository root. All executed at task 3, all passing.

1. `config.js` loads under Node with all four enrollment keys, `whatsapp.inviteUrl` and both
   credential keys in their existing positions. **PASS** (`config keys unchanged`)
2. All eleven required schema substrings present, including the verbatim six-argument signature
   in both the revoke and the grant. **PASS** (`SUBSTRINGS_OK`)
3. Anon grant sits after the view and before section 8, asserted by index comparison; closing
   block carries both queries with the sum coalesced. **PASS** (`schema shape OK`)
4. `returns setof` = 0, `for delete` = 0, `security_invoker` = 0. **PASS**
5. No select or delete policy on `public.enrollments` (narrowed gate, see deviation 2). **PASS**
6. Zero em dashes and zero en dashes in both files. **PASS** (`dash scan clean`)
7. **The applied check. SATISFIED.**

### The acceptance probe, run first-hand at 2026-08-15T01:36Z

The plan's task 3 probe, executed from the repository root against the live project. This was
re-run in this session rather than inherited from the orchestrator's report, because the whole
point of the gate is that it is read from the wire.

```
POST https://aplaxdplwnnlezffatal.supabase.co/rest/v1/rpc/amend_enrollment
{"p_guest_id":"00000000-0000-4000-8000-000000000000"}

0
HTTP 200
```

That is the plan's "done looks like" shape exactly: the function exists, the anonymous role may
call it, and it correctly reports touching no row because that guest_id belongs to nobody. For
contrast, the same call at task 2, before the owner ran the file:

```
{"code":"PGRST202","details":"Searched for the function public.amend_enrollment with parameter
 p_guest_id or with a single unnamed json/jsonb parameter, but no matches were found in the
 schema cache.","hint":null,"message":"Could not find the function
 public.amend_enrollment(p_guest_id) in the schema cache"}
HTTP 404
```

### Two supporting probes, also first-hand

The view contract, confirming the `create or replace` preserved the projection and the anon
grant survived the replace. This is the re-run that WINDOWS.md entry 5 was opened to demand:

```
GET https://aplaxdplwnnlezffatal.supabase.co/rest/v1/attendees?select=*

[{"first_name":"ZZTEST","extra_guests":0,"created_at":"2026-08-14T09:27:50.022302+00:00"},
 {"first_name":"ZZTEST","extra_guests":0,"created_at":"2026-08-14T18:35:29.076904+00:00"},
 {"first_name":"ZZTEST","extra_guests":0,"created_at":"2026-08-14T18:40:46.587145+00:00"},
 {"first_name":"Sirio","extra_guests":0,"created_at":"2026-08-15T01:33:47.332041+00:00"}]
HTTP 200
```

Exactly `first_name`, `extra_guests`, `created_at` and nothing more. Note the fourth row: a
real registration landed between the owner's migration and this probe, which incidentally
demonstrates D-36 holding, enrollment kept working straight through the schema change.

The one-way door, confirming the migration did not quietly open the read path:

```
GET https://aplaxdplwnnlezffatal.supabase.co/rest/v1/enrollments?select=*

[]
HTTP 200
```

An empty array from a table that demonstrably holds four rows is this project's signature for a
blocked read, documented in `03-RESEARCH.md`. D-02 stays shut and no note is reachable with the
publishable key.

## Known Stubs

None. The plan's one outstanding owner action has been performed and proved. Nothing in this
plan's scope is stubbed, deferred or pending.

`.planning/WINDOWS.md` entry 5, the unrun post-migration view contract check, is marked
**fixed** by the `select=*` probe recorded above, which is the exact evidence the entry asked
for. No new ledger entries are owed by this plan.

## Threat Flags

None. No new security-relevant surface beyond what the plan's `<threat_model>` already
registers. T-03-14, T-03-15, T-03-16, T-03-17 and T-03-19 all carry disposition `mitigate` and
all five mitigations are implemented, gated, and now confirmed against the live database:

| Threat | Mitigation in place |
|---|---|
| T-03-14 | Body bounded to `where guest_id = p_guest_id`, returns integer, empty search path, revoke before grant. Live probe returns a bare `0`, not a row. |
| T-03-15 | Comment names the return type as the boundary; gate asserts no set-returning form |
| T-03-16 | No read policy added; gate asserts none exists on `public.enrollments`, and the live `enrollments` read still returns empty |
| T-03-17 | Gate asserts the invoker setting appears nowhere; live view still returns rows to the anon key, which it could not if the setting had flipped |
| T-03-19 | Closed. Acceptance was the live probe distinguishing `0`/200 from `PGRST202`/404, run first-hand, not the owner's report |

## For the Next Plan

- Plan 05's precondition ("the migration from plan 03-03 is applied") **now passes**. It appears
  at lines 169 and 266 of `03-05-PLAN.md` and keys off this same probe, so plan 05 may render
  edit and withdraw as working.
- `PGRST202` should still be handled as a pending state rather than an error state. The
  function is live now, but the degraded path is cheap and is the correct behaviour if the
  project is ever restored from an older schema.
- A `0` body from the live function means the guest's storage and the database have diverged;
  the correct recovery is the insert path, not an error.
- Do not add `note` to the `attendees` view and do not add a read policy. Both are one-line
  changes with irreversible consequences.
- The STATUS banner in `schema.sql` is now a per-migration history. Any future section appended
  to that file owes it a new paragraph, added when the section is written and corrected when it
  is applied.

## Self-Check: PASSED

Re-run in full at task 3 rather than carried over.

- FOUND `supabase/schema.sql`
- FOUND `config.js`
- FOUND `.planning/phases/03-enrollment-identity-and-the-group/03-03-SUMMARY.md`
- FOUND commit `4aac58a` (task 2), verified an ancestor of HEAD
- FOUND commit `6cbe62e` (summary at the checkpoint), verified an ancestor of HEAD
- FOUND commit `bf353f8` (summary self-check), verified an ancestor of HEAD
- CONFIRMED live: `public.amend_enrollment` answers `0` / `HTTP 200`
- CONFIRMED live: `public.attendees` projects three columns and no more
- CONFIRMED live: `public.enrollments` remains unreadable by the publishable key

`status: complete`. All three tasks are done, the human-action checkpoint was satisfied by the
owner and proved by probe, and the schema file's own account of the database is true as of
2026-08-15.
