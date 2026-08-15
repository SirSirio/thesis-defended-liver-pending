---
phase: 03-enrollment-identity-and-the-group
plan: 07
subsystem: database
tags: [supabase, postgres, rls, row-level-security, views, ddl, schema]

# Dependency graph
requires:
  - phase: 03-enrollment-identity-and-the-group (plan 03-03)
    provides: "section 8, public.amend_enrollment, the security definer function that turned a guest_id into a bearer write credential and therefore made the open photos read path a live defect rather than a stylistic one"
  - phase: 01-foundation
    provides: "supabase/schema.sql sections 1 to 6, the enrollments and photos tables, and public.attendees, the projecting view whose pattern section 9 copies"
provides:
  - "public.album, a view over public.photos projecting first_name, storage_path and created_at, and nothing else"
  - "revoke select on public.photos from anon, narrow, so anon keeps the insert phase 4 needs"
  - "both over-broad policies gone from the live database: anon can view album on public.photos, and anon can amend own enrollment on public.enrollments"
  - "the guest count bound reconciled at 4 in the table declaration, in a named idempotent constraint, and in config.js"
  - "set search_path = '' on all three functions in the file, not one of three"
  - "a schema STATUS header that records sections 9 and 10 as applied and verified on the wire"
affects: [phase-04-photos, phase-04-album-read, supabase-schema, any-future-rls-change]

actuals:
  tokens: 1200
  tasks: 3
  commits: 2

tech-stack:
  added: []
  patterns:
    - "Projecting view as a trust boundary: what a view does not project cannot be asked for, which is a stronger statement than a policy predicate somebody can widen later"
    - "Narrow revoke: revoke select, never revoke all, when a role must keep another privilege on the same relation"
    - "Idempotent named constraint alter: drop constraint if exists then add constraint, naming the constraint in both halves, because create table if not exists will not change a check on an existing table"

key-files:
  created: []
  modified:
    - supabase/schema.sql
    - config.js
    - .planning/phases/03-enrollment-identity-and-the-group/COVERAGE.md

key-decisions:
  - "option-a, the projecting view plus a narrow revoke of the direct read, was AUTO-SELECTED by the executor under workflow.auto_advance: true. It was not chosen by a human. The human saw it at the blocking checkpoint in task 3 and did not object."
  - "The album read surface is promoted, not added alongside: public.album becomes the only read path and public.photos is demoted to write-only for anon, because the thing add-alongside would have added alongside is the defect itself"
  - "The guest count bound is reconciled downward, database 10 to 4, rather than config upward, because the host buys food against this number"
  - "The verification that public.enrollments now carries exactly one policy is recorded as a backstop, not as a wire-proved truth, because a PATCH answers 204 with zero rows both before and after the update policy is dropped"

patterns-established:
  - "A migration on this project is proved by a live probe with a stated non-200 expectation, never by the owner's report (D-07), because on this schema a blocked read answers [] with a 200 and a blocked delete answers 204"
  - "A whole-file re-run earns regression probes on the sections it was not meant to change"

requirements-completed: [ENR-03, ENR-08, ENR-13]

coverage:
  - id: D1
    description: "GET /rest/v1/photos with the publishable key is refused rather than answered, so the guest_id that section 8 made a bearer write credential is no longer published"
    requirement: ENR-03
    verification:
      - kind: integration
        ref: "probe A: curl $U/rest/v1/photos?select=* -H 'apikey: $K' -> HTTP 401, body code 42501 permission denied for table photos"
        status: pass
      - kind: unit
        ref: "task 2 source gate: revoke select on public.photos from anon occurs once, revoke all on public.photos occurs 0 times"
        status: pass
    human_judgment: false
  - id: D2
    description: "The album is readable through public.album, which projects first_name, storage_path and created_at and structurally cannot answer for guest_id or an unsplit name"
    requirement: ENR-08
    verification:
      - kind: integration
        ref: "probe B1: GET /rest/v1/album?select=first_name,storage_path,created_at -> HTTP 200 []"
        status: pass
      - kind: integration
        ref: "probe B2: GET /rest/v1/album?select=guest_id -> HTTP 400, body code 42703, column album.guest_id does not exist"
        status: pass
    human_judgment: false
  - id: D3
    description: "public.enrollments carries no UPDATE policy. The rule that granted anon UPDATE on every row with any values is gone from the live database"
    requirement: ENR-03
    verification:
      - kind: unit
        ref: "task 2 source gate: for update counts 0 over comment-stripped supabase/schema.sql; the drop policy if exists line survives exactly once"
        status: pass
      - kind: manual_procedural
        ref: "backstop only: owner read Authentication > Policies in project aplaxdplwnnlezffatal and confirmed public.enrollments lists exactly one policy, the insert one, and public.photos lists exactly one policy, the insert one"
        status: pass
    human_judgment: true
    rationale: "A dropped UPDATE policy has no wire signature on this schema. A PATCH against public.enrollments answers 204 with a zero row count both before and after the drop, because there is no SELECT policy for the WHERE clause to match against. Any probe claiming to prove this would be anchored to nothing. The source gate proves the file no longer creates the policy and does still drop it; only the dashboard proves the live database ran that drop, and only a human can read the dashboard."
  - id: D4
    description: "The extra_guests bound is one number declared in two places that agree, 4 in the database and 4 in config.js, documented at both sites"
    requirement: ENR-13
    verification:
      - kind: integration
        ref: "probe E: POST /rest/v1/enrollments with extra_guests 5 -> HTTP 400, code 23514, violates check constraint enrollments_extra_guests_check; rejected so no row was written, confirmed by a follow-up read of public.attendees still showing exactly one row"
        status: pass
      - kind: unit
        ref: "task 2 source gate: between 0 and 10 counts 0, between 0 and 4 counts 2, the alter names enrollments_extra_guests_check in both halves, and config.js loads under Node with maxGuestsPerPerson not greater than 4"
        status: pass
    human_judgment: false
  - id: D5
    description: "The change closed a path without breaking the ones that were already correct: enrollments stays blocked, attendees stays readable, and the amend function still answers after a whole-file re-run"
    verification:
      - kind: integration
        ref: "probe C1: GET /rest/v1/enrollments?select=* -> HTTP 200 []; probe C2: GET /rest/v1/attendees?select=* -> HTTP 200 with the live Sirio row"
        status: pass
      - kind: integration
        ref: "probe D: POST /rest/v1/rpc/amend_enrollment with a guest_id that matches nothing -> HTTP 200, body 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "supabase/schema.sql no longer asserts a security property its own policies contradict, and its STATUS header records sections 9 and 10 as applied and verified"
    verification:
      - kind: unit
        ref: "task 2 source gate: the phrase never appear on counts 0 in the raw file; task 3 statement diff: 10 added lines, all comment lines, 0 SQL statements changed"
        status: pass
    human_judgment: false

# Metrics
duration: ~15min executor time across two sessions, plus a human dashboard step between them
completed: 2026-08-15
status: complete
---

# Phase 03 Plan 07: Close the Published Amendment Credential Summary

**The direct anon read of `public.photos` is closed on the live database and the album re-opened through `public.album`, which projects a first name, a storage path and a date and structurally cannot answer for the `guest_id` that section 8 turned into a bearer write credential.**

## Performance

- **Duration:** approximately 15 minutes of executor time, split across two sessions with a blocking human step between them
- **Tasks:** 3 of 3
- **Files modified:** 3 source and planning files (`supabase/schema.sql`, `config.js`, `COVERAGE.md`), plus this summary

## Accomplishments

- `GET /rest/v1/photos` with the publishable key now answers **HTTP 401 / 42501** where it answered **HTTP 200 `[]`** before. That is the whole gap, closed before phase 4's first upload could arm it.
- `public.album` exists and answers, projecting `first_name`, `storage_path`, `created_at`. Asking it for `guest_id` is refused with **42703**, which is the only assertion about the projection that survives an empty table and is the one phase 4 will depend on.
- Both over-broad policies are gone from the live database: `anon can view album` on `public.photos`, and `anon can amend own enrollment` on `public.enrollments`, the latter having granted anon UPDATE on every row with any values and been held inert only by the unrelated absence of a read policy.
- The guest count bound is reconciled at 4. The database now refuses 5 with a check constraint violation, where it previously accepted up to 10 against a config bound the UI enforced alone.
- All three functions in the file pin `set search_path = ''`, so the file has one rule with no exceptions rather than one hardened function out of three.
- The file no longer states a security property its own policies contradict, and its STATUS header now records what is live.

## Task Commits

1. **Task 1: The photos read path (decision gate)** - no commit, no file change. `option-a` selected.
2. **Task 2: Read path closed and re-opened through a projection** - `a246dbc` (fix)
3. **Task 3: The owner re-runs the schema file, and the probes prove the new state** - the schema STATUS header edit, committed with this summary (docs)

## Files Created/Modified

- `supabase/schema.sql` - section 3 loses both `create policy` statements and keeps both drops; the false security paragraph corrected in section 3 and again in section 8; new section 9 (the album view, its adjacent grant, the narrow revoke); new section 10 (the named idempotent guest count constraint); `set search_path = ''` added to `touch_updated_at` and `enforce_photo_limit`; and, in task 3, ten comment lines added to the STATUS header recording sections 9 and 10 as applied and verified
- `config.js` - one comment beside `enrollment.maxGuestsPerPerson` naming the database bound as the floor underneath it. No key added, moved or removed.
- `.planning/phases/03-enrollment-identity-and-the-group/COVERAGE.md` - `GET /rest/v1/photos` and `GET /rest/v1/album` rows added, totals corrected, `public.album` named beside `public.amend_enrollment` in the closing section

## How the migration was applied, and by whom

**Claude did not apply the DDL and could not have.** This project has no Supabase CLI, no migrations directory, and the `service_role` key was disabled by the owner after it was exposed. Nothing available to the executor applies DDL to project `aplaxdplwnnlezffatal`.

The **human** opened the Supabase SQL editor, pasted the whole of `supabase/schema.sql`, ran it, and then read Authentication > Policies by eye. Task 3 was a `checkpoint:human-action` with `gate="blocking"`, and the executor halted at it rather than proceeding. This is the correct division and it is recorded here because a summary that said "applied the schema" without saying who would be false.

Every source gate in task 2 passed while the database was still completely unchanged. That false positive is exactly what task 3 existed to prevent, and it is why acceptance here is the wire and not the file.

## Probe evidence: before and after

Run from the repository root with the publishable key from `config.js`. The before column is from `03-VERIFICATION.md`, probed first-hand against the same project before this plan.

| Probe | Before | After | Verdict |
|---|---|---|---|
| **A.** `GET /rest/v1/photos?select=*` | `HTTP 200` `[]` | `HTTP 401` `{"code":"42501","message":"permission denied for table photos"}` | **pass**, and this is the gap itself closing. Not 200 was the acceptance, because `[]` with a 200 is what both an open read of an empty table and a blocked read look like |
| **B1.** `GET /rest/v1/album?select=first_name,storage_path,created_at` | `HTTP 404` `PGRST205` (no such relation) | `HTTP 200` `[]` | **pass**. Empty because the table is empty, which is correct |
| **B2.** `GET /rest/v1/album?select=guest_id` | `HTTP 404` `PGRST205` | `HTTP 400` `{"code":"42703","message":"column album.guest_id does not exist"}` | **pass**. The only claim about the projection that survives an empty table |
| **C1.** `GET /rest/v1/enrollments?select=*` | `HTTP 200` `[]` | `HTTP 200` `[]` | **pass**, control. D-02's door still shut, the free-text note still unreadable |
| **C2.** `GET /rest/v1/attendees?select=*` | `HTTP 200`, one row | `HTTP 200` `[{"first_name":"Sirio","extra_guests":0,"created_at":"2026-08-15T01:33:47.332041+00:00"}]` | **pass**, control. Without C1 and C2 a passing A could equally mean the project stopped answering |

All five were re-run independently by this continuation executor after the human's step, and all five reproduced the results above verbatim.

### Two extra probes, run beyond the plan

The plan specified five probes. Two more were run, and both matter:

- **D. `POST /rest/v1/rpc/amend_enrollment` with a `guest_id` matching nothing** returns `0`, `HTTP 200`. **Why it was added:** the instruction to the owner was to run the *whole file*, not only sections 9 and 10. A whole-file re-run touches section 8, which contains a `revoke all on function ... from public` followed by a `grant execute ... to anon` whose argument lists must match word for word. If that pair had gone wrong on the re-run, amendment would have silently died and nothing in the plan's five probes would have noticed. It is a zero-row call by construction, so it proves the function answers without touching a real registration.
- **E. `POST /rest/v1/enrollments` with `extra_guests: 5`** returns `HTTP 400`, `{"code":"23514","message":"...violates check constraint \"enrollments_extra_guests_check\""}`. **Why it was added:** section 10's alter is the only part of this plan whose effect the five specified probes could not see at all. The source gate proves the alter is written; only this proves it took. The insert is rejected, so no probe row was written, and a follow-up read of `public.attendees` confirmed still exactly one row.

### The one truth with no wire probe

**`public.enrollments` lists exactly one policy, the insert one.** This is recorded as a **backstop** verification, not as a wire-proved truth, and the distinction is deliberate.

A `PATCH` against `public.enrollments` answers `204` with a zero row count both before and after the UPDATE policy is dropped, because there is no SELECT policy for the `WHERE` clause to match rows against. There is no request whose response differs across the drop. Inventing a probe that appeared to prove it would be a gate anchored to nothing, which is the pattern this phase has already recorded six times in WINDOWS.

What is proved, and by what:
- The **file** no longer creates the policy and does still carry its `drop policy if exists`: proved by the task 2 source gate (`for update` counts 0 over comment-stripped source, the drop survives exactly once).
- The **live database** ran that drop: proved only by the owner reading Authentication > Policies and confirming one policy on `public.enrollments` and one on `public.photos`. That is a human eyeball check and it is reported as such.

## Decisions Made

- **The task 1 decision gate was auto-selected, not chosen.** `workflow.auto_advance` is `true` on this project, so the executor selected `option-a` (projecting view plus revoke the direct read) as the first and recommended option and continued without stopping. **No human picked it at the gate.** The human's first sight of the decision was at task 3's blocking checkpoint, where the schema file was already written and presented for them to run, and they did not object. That is consent to proceed, but it is weaker than a considered selection among four options and it is recorded that way so nobody later reads "option-a selected" as a deliberated choice. Options b, c and d were never weighed by a person.
- The album read surface is **promoted** rather than added alongside, because add-alongside would have added alongside the defect: leaving the table readable leaves the credential published whether or not phase 4 prefers the view.
- The guest count bound is reconciled **downward** (database 10 to 4) rather than upward, because the host buys food against this number and a bound that only exists in JavaScript is a suggestion.
- The verification of the dropped UPDATE policy is classified `backstop` rather than promoted to a probe, for the reason above.

## Deviations from Plan

Two additions, both verification-side. Neither changed the plan's output.

**1. [Rule 2 - Missing Critical] Two regression probes added beyond the specified five**
- **Found during:** Task 3
- **Issue:** The plan's five probes could not detect two live failure modes. A whole-file re-run could have disturbed section 8's `revoke`/`grant execute` pair on `amend_enrollment`, killing amendment silently. And section 10's constraint alter had no wire assertion at all, so a source gate proving it was *written* was being read as proof it had *taken*.
- **Fix:** Added probe D (zero-row `amend_enrollment` call, harmless by construction) and probe E (an `extra_guests: 5` insert designed to be rejected, so nothing is written). Both pass. Probe E's rejection was confirmed non-writing by a follow-up read of `public.attendees`.
- **Files modified:** none, these are probes
- **Verification:** documented in the probe section above
- **Committed in:** recorded here, no code change

**2. [Rule 2 - Missing Critical] The schema STATUS header extended to record sections 9 and 10**
- **Found during:** Task 3
- **Issue:** The file's STATUS header recorded sections 1 to 6 (2026-08-13) and 7 to 8 (2026-08-15) as applied, and stopped there. That header is the only thing in the repository telling the next person what is live in the database, and leaving it two sections behind would have left a reader to assume sections 9 and 10 were still pending.
- **Fix:** Added one paragraph in the header's existing voice recording what was applied, when, against which project, and what was verified on the wire: the 42501 on the direct photos read, the album view answering with no `guest_id` to ask for, the amend function still answering, and the bound now refusing 5.
- **Files modified:** `supabase/schema.sql`, comment-only
- **Verification:** the task 2 automated gate re-run and passed unchanged after the edit; a statement-level diff confirms 10 added lines, all comment lines, and 0 SQL statements changed
- **Committed in:** the commit carrying this summary

---

**Total deviations:** 2 auto-fixed (both Rule 2, missing critical verification and missing critical documentation)
**Impact on plan:** No scope creep. Neither deviation changed a single SQL statement or any guest-facing behaviour. Both close gaps between what the plan proved and what it claimed.

## Issues Encountered

None. The owner's re-run succeeded with no error, which also means no existing registration held more extra guests than the new bound of 4 (the alter validates existing rows and would have failed loudly otherwise).

## User Setup Required

**This plan's central step was user setup and it is done.** The owner applied `supabase/schema.sql` in full to project `aplaxdplwnnlezffatal` on 2026-08-15 and confirmed the policy lists by eye. No further dashboard work is outstanding for this plan.

## Next Phase Readiness

- **Phase 4 reads the album through `public.album` and never through `public.photos`.** The table's select grant is revoked from anon; a direct read will fail with 42501. Phase 4's first plan must carry a precondition asserting probe A is not 200 and probe B2 is 400 with 42703, because phase 4's read call site is the thing this plan exists to make correct.
- **Anon keeps INSERT on `public.photos`.** The revoke was deliberately narrow so phase 4's upload works from its first line. A future `revoke all on public.photos` would break it and nothing would notice until phase 4 ran.
- **T-03-41 is transferred to phase 4, not mitigated here.** The storage bucket in section 6 is public, so a `storage_path` is as readable as a column. Putting a `guest_id` into an uploaded file name republishes, straight through `public.album`, the exact credential this plan stopped publishing. This is written into section 9 as a comment addressed to phase 4 and carried in the threat register so the phase 4 planner inherits it rather than rediscovers it.
- **Do not add a SELECT policy to `public.enrollments`**, including via Supabase's one-click read-access template. D-02's one-way door and the privacy of the free-text note both stand on its absence.
- `supabase/schema.sql` remains idempotent and safe to run again.

---
*Phase: 03-enrollment-identity-and-the-group*
*Completed: 2026-08-15*
