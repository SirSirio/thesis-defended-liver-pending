---
phase: 04-photos
plan: 05
subsystem: photos
status: blocked
tags: [schema, storage, security, owner-action, device-pass]

requires:
  - phase 3's supabase/schema.sql sections 1 to 10, applied to project aplaxdplwnnlezffatal
  - the research probe of 2026-08-15 that proved the sixth-photo refusal on the wire
  - plan 04-01's config.js comment beside photos.maxFileSizeMb
provides:
  - storage.buckets.file_size_limit = 3145728 on party-photos, in the file
  - storage.buckets.allowed_mime_types = {image/jpeg} on party-photos, in the file
  - an updating conflict clause on the section 6 bucket insert
  - a header STATUS block that records the sixth-photo proof instead of calling it outstanding
  - a section 4 note tying the trigger's literal to photos.maxPerGuest
affects:
  - the live party-photos bucket, but only once the owner re-runs the file

tech-stack:
  added: []
  patterns:
    - "an idempotent insert that updates rather than skips, because the row it targets already exists"
    - "a schema comment that names which of two adjacent limits is a control and which is hygiene"
    - "a header changelog paragraph that states plainly it describes the file and not the database"

key-files:
  created: []
  modified:
    - supabase/schema.sql

decisions:
  - "The section 6 comment carries the honest framing in prose without naming the two column identifiers, because the plan's own gates require each identifier to appear exactly twice, once in the column list and once in the update set."
  - "The header paragraph about section 6 states explicitly that it describes the file and not the database, so a reader cannot mistake a written limit for an applied one."

metrics:
  duration: 21m
  tasks: 1
  commits: 2
  completed: null

actuals:
  tokens: 1600
  tasks: 1
  commits: 2
---

# Phase 04 Plan 05: The Bucket, the Cleanup and the Device Pass Summary

Interim summary. **Task 1 is complete and committed. Tasks 2 and 3 are outstanding**, both of them
blocked on a person: task 2 on the owner at the Supabase dashboard, task 3 on somebody holding a
phone. Neither can be satisfied from a terminal and neither was faked.

## What shipped

**Task 1 — section 6 gets two limits, and the header stops calling the trigger unproven** (`d65db5a`).

`supabase/schema.sql` section 6 now sets `file_size_limit` to `3145728`, which is three mebibytes in
the bytes the column actually stores, and `allowed_mime_types` to a single-element array holding the
JPEG type. Its conflict clause changed from the non-updating form to one that updates the public
flag, the size limit and the type list from the excluded row, in the same idempotent shape section 7
uses for the `withdrawn` column. The old form was the whole problem: it never touches a bucket that
already exists, and this bucket has existed since the first run, so the change had to be to the
clause as much as to the columns.

The section 6 comment says which of the two limits is which and refuses to blur them. The size
ceiling is counted on the bytes that arrive, so it holds against a request that never went near the
site. The type list is checked against the type the uploader declares rather than against the bytes,
so it stops accidents and casual junk and not a deliberate request, and the comment says in as many
words that it is not a control. The comment also carries the third number the file now has to keep
straight: `photos.maxFileSizeMb` is twelve megabytes and protects a phone's memory before the
shrink, this ceiling is three mebibytes and protects the bucket after it, two numbers doing two
jobs, not to be reconciled. And it carries the one surprise the owner is the only person who will
ever meet: with a type list set, creating a folder through the dashboard can be refused, because the
empty placeholder file a new folder makes is not a JPEG. Deleting is unaffected, which is the part
that matters this week.

The header STATUS block no longer says the sixth-photo refusal is unproven. In its place: six
inserts executed against this project on 2026-08-15 under a throwaway identity carrying the
`ZZTEST DeleteMe` marker, the first five accepted at 201 with empty bodies, the sixth refused at 400
with code `P0001` and the trigger's own message, **all five read back through `public.album`
afterwards**, which is what makes it proof rather than a status code, and a seventh insert under a
different identity accepted, which is what makes the limit per identity rather than global. Then the
ordering fact the same probe surfaced: the trigger is `before insert`, so it fires before the unique
constraint on `storage_path`, and a guest already at five receives the same code for a path
collision. That is why the client treats the code as being at the limit unconditionally and never
retries with a fresh path.

Section 4 gained the note tying its hard-coded literal to `photos.maxPerGuest` in `config.js`, in the
shape section 10 already uses for the guest count bound: they agree today, they must move together,
and raising the config value alone promises a guest six photographs and gives them five.

**Nothing in this commit is applied to the database.** The file describes a bucket; only the owner at
the SQL editor makes the bucket match the file. The header paragraph about section 6 says so in
writing rather than leaving it to be inferred, and the site works either way: an un-migrated bucket
accepts what it has always accepted, which is the state the site has shipped in since phase 3.

## Verification

All seven of task 1's automated gates were run and all seven pass.

| Gate | Expected | Result |
|---|---|---|
| `grep -c 'allowed_mime_types'` | 2 | **2** |
| `grep -c 'file_size_limit'` | 2 | **2** |
| `grep -c '3145728'` | 1 | **1**, a bare integer |
| `grep -c 'do nothing'` | 0 | **0** |
| `grep -q 'do update'` | present | present, line 328 |
| `grep -c 'for delete'` | 0 | **0** |
| `grep -c 'public.photos for select'` | 0 | **0** |
| `grep -c 'security_invoker'` | 0 | **0** |
| `grep -q 'security definer'` | present | present (see deviation 3) |
| `grep -c 'revoke select on public.photos from anon'` | 1 | **1** |
| `grep -c 'still unproven'` | 0 | **0** |
| `grep -q 'P0001'` | present | 2 lines |
| `grep -c 'read back'` | present | **1** |
| en or em dash scan over the whole file | clean | **clean** |
| deletions in the commit | none | none |

The prose criteria hold as well: the comment states both that the size ceiling is counted on
arriving bytes and that the type list is checked against the declared type, and describes neither as
the other; it names the dashboard folder-creation consequence; and section 4 carries the
`maxPerGuest` note.

## Deviations from Plan

### 1. [Rule 3 - Blocking] The section 6 comment names the two limits in prose, not by identifier

**Found during:** Task 1
**Issue:** The plan requires research E6 to be copied "verbatim including its comment block", and E6's
comment opens two paragraphs with the literal identifiers `file_size_limit` and `allowed_mime_types`.
The plan separately gates `grep -c` of each of those identifiers at exactly 2, "once in the column
list and once in the update set". Copying the comment verbatim makes each count 3. The two
instructions cannot both be satisfied.
**Fix:** The comment says "The size ceiling is the real one" and "The type list is hygiene rather
than a wall". Every claim E6 makes survives word for word; only the two identifiers were lifted out,
and they sit four lines below in the statement itself. The gate's stated intent, that each limit
appears once in the column list and once in the update set, holds exactly. This is the same
resolution `04-01`'s deviation 1 reached for the same class of conflict.
**Files modified:** supabase/schema.sql
**Commit:** `d65db5a`

### 2. [Rule 3 - Blocking] The same conflict, for the phrase "do nothing"

**Found during:** Task 1, running the gates
**Issue:** E6's comment explains the change by quoting the clause it replaces: `The insert below used
to end "do nothing"`. The gate requires `grep -c 'do nothing'` to return 0 across the whole file.
**Fix:** The sentence became "The insert below used to end by stepping silently over a bucket that
already exists, which meant it applied nothing at all here, because this bucket has existed since the
first run." Same fact, same emphasis, and the gate's intent, that no non-updating conflict clause
survives anywhere in the file, is what the count now actually measures.
**Files modified:** supabase/schema.sql
**Commit:** `d65db5a`

### 3. [Rule 3 - Blocking] `grep -c 'security definer'` returns 4, not the 2 the criterion predicts

**Found during:** Task 1, running the gates
**Issue:** The acceptance criterion reads "`grep -c 'security definer'` returns 2, the photo limit
trigger and the amend function, both unchanged". It returns 4, and did before this plan touched the
file: two declarations at lines 215 and 356, plus two explanatory comment lines, one in section 4
("Without security definer below, every anonymous upload therefore fails...") and one in section 9
("So this line is safe to keep only while section 4 carries security definer"). Both comments were
written in phase 3 and both are load-bearing prose.
**Fix:** Nothing changed. The plan's action text is explicit that section 4's owner rights and
section 9's revoke must not be touched, and rewording two comments to make a count land on 2 would be
editing exactly what the plan forbids editing, to satisfy a number the planner miscounted. The
executable gate is `grep -q`, presence, and it passes. The criterion's intent, "the trigger keeps
owner rights and the revoke is intact", is asserted and holds: both declarations are present and
`revoke select on public.photos from anon` returns 1.
**Files modified:** none
**Commit:** n/a

## The gap between the file and the database

Stated plainly, because this is threat `T-04-27` and the whole reason task 2 is a blocking gate:

| | File | Live project |
|---|---|---|
| Bucket size ceiling | 3145728 bytes | **none**, up to the 50MB free-tier ceiling |
| Bucket declared-type list | `{image/jpeg}` | **none**, any type accepted |
| Research rows in `public.photos` | n/a | **7**, all `ZZTEST DeleteMe` |
| Research objects in `party-photos` | n/a | **9**, under `zz-research/` |

Until the owner re-runs the file, the top two rows of that table are a claim and not a fact. Nothing
in this repository can close the gap: there is no Supabase CLI here, no migrations directory, and the
service key was disabled by the owner after it was exposed.

## Outstanding

### Task 2, blocking, the owner at the dashboard

Not done. Two actions at one visit to the Supabase dashboard for project `aplaxdplwnnlezffatal`:

**Part one, apply the bucket limits.** SQL Editor, New query, paste the whole of
`supabase/schema.sql`, run it. The whole file, not only section 6: it is safe to run more than once
and running it whole is what keeps the file and the database honest with each other. Expect success
with no rows returned.

**Part two, remove what three sessions of probing left behind.**

`delete from public.photos where name = 'ZZTEST DeleteMe';` clears all seven rows: the six from the
research session (five `zz-research/limit-N.jpg` under one identity, one `zz-research/other-1.jpg`
under a second) plus `zz-research/tracer-0401.jpg` written by plan `04-01`'s terminal probe. Then
Storage, `party-photos`, delete the whole `zz-research` folder, which holds nine objects:
`probe-post.jpg`, `probe-cache.jpg`, `probe-cors.jpg`, `probe-spoof.jpg`, `probe-not-an-image.txt`,
`probe-html.html`, `probe-svg.svg`, `probe-noct.bin` and `tracer-0401.jpg`.

Plans `04-02`, `04-03` and `04-04` ran no wire probe at all, so they added nothing to this inventory.

If the dashboard then refuses to create a folder, that is expected and it is written in the section 6
comment. It does not affect deleting.

**Then three probes, and every one reads a resulting state rather than a status code**, because on
this project a blocked read answers with an empty array and a blocked delete answers 204 and both
look like success. The exact commands are in `04-05-PLAN.md` task 2 under `<how-to-verify>`. Expected
after the re-run: a four megabyte upload declared as JPEG is refused and the public read of that
object returns 400, a plain-text declared type is refused, and
`GET /rest/v1/album?select=first_name,storage_path` prints exactly `[]`.

### Task 3, the device pass

Not started. `.planning/phases/04-photos/04-DEVICE-PASS.md` does not exist yet. It needs a real iPhone
and a real Android phone, and its central row, whether a portrait iPhone photograph lands the right
way up in the album, is the one claim in the whole design contract that no probe and no emulator can
settle.

It also carries every `<human-check>` deferred by the four earlier plans, because
`human_verify_mode` is `end-of-phase`:

- **From `04-01`:** the tracer path end to end on a phone.
- **From `04-02`:** the queue transcript observations.
- **From `04-03`:** eleven gate-ladder observations.
- **From `04-04`:** nine observations, listed in that summary's `## Outstanding verification`, of
  which 3, 4, 5, 6, 7 and 9 are already proved logically by a harness that drove the shipped source
  and counted storage writes on both sides of a retry. What remains for a device is typography,
  layout at 320px in Danish, and the 220ms opacity swap actually running.

## Known Stubs

None in code. This plan wrote no JavaScript and no CSS.

The one thing that could be mistaken for a stub is the gap in the table above, and it is not a stub:
it is a deliberate handoff, gated, stated in the file's own header, and it is threat `T-04-27`'s
entire mitigation.

## Threat Flags

None. No new security surface beyond the plan's `<threat_model>` register. Of its seven rows:

- **T-04-27** (the file claiming a limit the project does not have, high): mitigated as designed. Task
  1's commit message, the header paragraph and this summary all state that nothing is applied, and
  task 2 is a blocking gate whose acceptance is a refused upload followed by a failed public read of
  that object, not a status code. **Not yet discharged**, because the gate has not been passed.
- **T-04-28** (storage exhaustion by anyone holding the publishable key, high): the ceiling is written.
  It becomes a control at the moment the owner runs the file and not before.
- **T-04-29** (a future run reconciling the twelve megabyte check and the three mebibyte ceiling into
  one, medium): **discharged**. Both comments now exist and each names the other. `config.js` says
  "two different numbers doing two different jobs"; section 6 says "Two numbers, two jobs".
- **T-04-30** (the type list described as protection it is not, medium): **discharged**. The comment
  says Supabase checks the declared type rather than the bytes, and says outright that it is not a
  control.
- **T-04-31** (a read or delete rule added while touching this file, high): **discharged**. Zero delete
  policies, zero select policies on the photos table, zero invoker views, both `security definer`
  declarations intact, section 9's revoke intact. All asserted together.
- **T-04-32** (test rows attributed to a fictional guest in a public album, medium): **not yet
  discharged**, task 2 owns it. The exposure stays bounded meanwhile: `04-01`'s path allowlist skips
  every `zz-research/` row, so none of the seven renders in the album even today.
- **T-04-SC**: accepted, nothing installed.

## Self-Check: PASSED

- `supabase/schema.sql` present and modified
- commit `d65db5a` found in `git log`
- `git diff --diff-filter=D HEAD~1 HEAD` shows no deletions
- `.planning/phases/04-photos/04-05-SUMMARY.md` present
- `.planning/phases/04-photos/04-DEVICE-PASS.md` **absent**, correctly, because task 3 has not run
