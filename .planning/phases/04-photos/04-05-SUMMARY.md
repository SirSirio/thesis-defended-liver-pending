---
phase: 04-photos
plan: 05
subsystem: photos
status: complete
tags: [schema, storage, security, owner-action, device-pass]

requires:
  - phase 3's supabase/schema.sql sections 1 to 10, applied to project aplaxdplwnnlezffatal
  - the research probe of 2026-08-15 that proved the sixth-photo refusal on the wire
  - plan 04-01's config.js comment beside photos.maxFileSizeMb
  - the owner at the Supabase dashboard, twice: to run the file and to clear the artifacts
provides:
  - storage.buckets.file_size_limit = 3145728 on party-photos, applied and proved on the wire
  - storage.buckets.allowed_mime_types = {image/jpeg} on party-photos, applied and proved on the wire
  - an updating conflict clause on the section 6 bucket insert
  - a header STATUS block that records the sixth-photo proof and the bucket proof, neither of them outstanding
  - a section 4 note tying the trigger's literal to photos.maxPerGuest
  - .planning/phases/04-photos/04-DEVICE-PASS.md, the D-30 record sheet, authored and unwalked
affects:
  - the live party-photos bucket, which now refuses anything above three mebibytes
  - the live album, which is empty again

tech-stack:
  added: []
  patterns:
    - "an idempotent insert that updates rather than skips, because the row it targets already exists"
    - "a schema comment that names which of two adjacent limits is a control and which is hygiene"
    - "a refusal proved by reading the resulting state, never by the status code alone"
    - "a device pass sheet whose every row carries an expected result beside a Pending verdict, so a walker knows what they are looking at and a reader cannot mistake a prediction for an observation"

key-files:
  created:
    - .planning/phases/04-photos/04-DEVICE-PASS.md
  modified:
    - supabase/schema.sql

decisions:
  - "The section 6 comment carries the honest framing in prose without naming the two column identifiers, because the plan's own gates require each identifier to appear exactly twice, once in the column list and once in the update set."
  - "The header paragraph about section 6 now records the application and the two wire refusals, and states that the public read of the refused path also answered 400, because on this project a status code alone is not evidence."
  - "Every row of the device pass sheet reads Pending rather than being left blank, and the preamble defines Pending once as a row nobody has looked at, explicitly not a soft pass and never to be promoted by reading the source."

metrics:
  duration: 38m
  tasks: 3
  commits: 5
  completed: 2026-08-17

actuals:
  tokens: 6800
  tasks: 3
  commits: 5
---

# Phase 04 Plan 05: The Bucket, the Cleanup and the Device Pass Summary

The only server side control this phase has is now on the live bucket, proved by attempting a
refusal and then reading the resulting state rather than trusting a status code, and the research
artifacts three sessions of probing left behind are gone. The device pass sheet exists in full and
**not one of its rows has been walked**, because that needs a phone and this executor had none.

## What shipped

### Task 1, section 6 gets two limits and the header stops calling the trigger unproven (`d65db5a`)

`supabase/schema.sql` section 6 sets `file_size_limit` to `3145728`, three mebibytes in the bytes the
column actually stores, and `allowed_mime_types` to a single element array holding the JPEG type. Its
conflict clause changed from the non-updating form to one that updates the public flag, the size
limit and the type list from the excluded row, in the same idempotent shape section 7 uses for the
`withdrawn` column. The old form was the whole problem: it never touches a bucket that already
exists, and this bucket has existed since the first run, so the change had to be to the clause as
much as to the columns.

The section 6 comment says which of the two limits is which and refuses to blur them. The size
ceiling is counted on the bytes that arrive, so it holds against a request that never went near the
site. The type list is checked against the type the uploader declares rather than against the bytes,
so it stops accidents and casual junk and not a deliberate request, and the comment says in as many
words that it is not a control. The comment also keeps the third number straight:
`photos.maxFileSizeMb` is twelve megabytes and protects a phone's memory before the shrink, this
ceiling is three mebibytes and protects the bucket after it. Two numbers, two jobs, not to be
reconciled. And it carries the one surprise the owner is the only person who will ever meet: with a
type list set, creating a folder through the dashboard can be refused, because the empty placeholder
file a new folder makes is not a JPEG.

Section 4 gained the note tying its hard-coded literal to `photos.maxPerGuest` in `config.js`, in the
shape section 10 already uses for the guest count bound.

Full detail is unchanged from the interim summary this file replaces.

### Task 2, the owner ran the file and cleared the artifacts (`613398a`)

The owner ran the whole of `supabase/schema.sql` in the SQL editor for project `aplaxdplwnnlezffatal`
on 2026-08-17, then deleted the `ZZTEST DeleteMe` rows and the `zz-research` folder. The whole file
was run rather than only the changed section, so the earlier sections were proved again on the way
past, which is the property the file's opening line has always claimed and which is worth nothing
unless somebody exercises it.

The header STATUS block's closing paragraph used to say, in as many words, that it described the file
and not the database. It no longer does. In its place: the date of application, the two refusals in
the terms the wire actually answered with, the second half that makes them evidence, and the cleanup
proved through the view.

**The gap the interim summary tabulated is closed.**

| | File | Live project, before | Live project, now |
|---|---|---|---|
| Bucket size ceiling | 3145728 bytes | none | **3145728 bytes** |
| Bucket declared-type list | `{image/jpeg}` | none | **`{image/jpeg}`** |
| Research rows in `public.photos` | n/a | 7 | **0** |
| Research objects in `party-photos` | n/a | 9 | **0** |

### Task 3, the device pass sheet (`13e2927`)

`.planning/phases/04-photos/04-DEVICE-PASS.md`, in the shape phases 02 and 03 used: a preamble that
says the sheet closes nothing, preconditions, ten tables with a verdict column, a findings section
and an outcome table at the foot. It carries every line of the UI spec's D-30 verification checklist
as its own row, plus all 31 `<human-check>` observations the four earlier plans deferred under
`human_verify_mode: end-of-phase`, plus the two research assumptions that were routed to a device
because no probe could settle them.

| Table | What it covers | Rows | Source |
|---|---|---|---|
| A | Orientation and the camera roll, including HEIC | 6 | D-17 as refined, D-30 |
| B | The picker, multi-select and the first tile | 6 | plan 04-01's 4 carried observations |
| C | The queue transcript at 320px in Danish | 7 | plan 04-02's 7 carried observations |
| D | The gate ladder and the upload control | 11 | plan 04-03's 11 carried observations |
| E | Failure, retry and the quota | 11 | plan 04-04's 9 carried observations |
| F | A throttled connection, and backgrounding mid upload | 5 | D-30, plan cross-cutting row 7 |
| G | The sixth photograph, refused with the joke | 4 | PH-06, D-30 |
| H | Touch target geometry, measured | 5 | UI-SPEC Touch Target Geometry |
| I | Reduced motion, VoiceOver and TalkBack | 9 | DSG-05, DSG-08, D-29 |
| J | Sharpness and memory | 3 | research assumptions A1 and A2 |

Table A row 1 is marked as the phase's blocking row and the preamble says why: whether a portrait
iPhone photograph lands the right way up is the single most visible way this phase can fail, and it
is the one claim in the design contract that no probe and no emulator can settle. If it fails the
remedy is named in `04-RESEARCH.md ## THE ORIENTATION REFINEMENT` and is confined to one function.

Table H carries a Declared column read from `styles.css` at the desk on 2026-08-17 and labelled as a
source reading rather than a measurement, following the phase 03 precedent. Unlike phase 03's Table
D, **every declared value clears the contract**: `.uploader__acts .btn` is 52px rising to 56px on a
coarse pointer, the gate body button the same, and `.uploader__acts .uploader__retry` is 48px rising
to 52px, which are exactly the numbers the UI spec's geometry table asks for. A measurement can still
come in under a declaration, so no row is answered by that.

## Verification

### Task 1's seven schema gates, re-run after the header edit

The header rewrite in task 2 touched the same file, so all seven were run again rather than inherited.

| Gate | Expected | Result |
|---|---|---|
| `grep -c 'allowed_mime_types'` | 2 | **2** |
| `grep -c 'file_size_limit'` | 2 | **2** |
| `grep -c '3145728'` | 1 | **1**, a bare integer |
| `grep -c 'do nothing'` | 0 | **0** |
| `grep -q 'do update'` | present | present |
| `grep -c 'for delete'` | 0 | **0** |
| `grep -c 'public.photos for select'` | 0 | **0** |
| `grep -c 'security_invoker'` | 0 | **0** |
| `grep -q 'security definer'` | present | present, 4 lines (see deviation 3) |
| `grep -c 'revoke select on public.photos from anon'` | 1 | **1** |
| `grep -c 'still unproven'` | 0 | **0** |
| `grep -q 'P0001'` | present | present |
| en or em dash scan over the whole file | clean | **clean** |
| deletions in either commit | none | none |

The phrase the header used to carry, that the paragraph describes the file and not the database, now
returns 0. That was the point of task 2.

### Task 2's three probes, verbatim

Run from the repository root against the live project by the orchestrator after the owner reported
the work done, because a report is not evidence.

```
───── PROBE 1: size ceiling (4 MiB declared as image/jpeg) ─────
{"statusCode":"413","error":"Payload too large","message":"The object exceeded the maximum allowed size","code":"EntityTooLarge"}
HTTP 400
public read of big.jpg: HTTP 400

───── PROBE 2: declared type list (text/plain) ─────
{"statusCode":"415","error":"invalid_mime_type","message":"mime type text/plain is not supported","code":"InvalidMimeType"}
HTTP 400

───── PROBE 3: the album is empty ─────
[]
```

All nine `zz-research` objects were additionally confirmed gone: a public read of each of
`probe-post.jpg`, `probe-cache.jpg`, `probe-cors.jpg`, `probe-spoof.jpg`, `probe-not-an-image.txt`,
`probe-html.html`, `probe-svg.svg`, `probe-noct.bin` and `tracer-0401.jpg` under
`party-photos/zz-research/` answered HTTP 400. No `zz-gate` object exists, because both attempts to
create one were refused.

**Probe 1's second line is the one that matters.** The refusal status alone proves nothing on this
project: a blocked read answers with an empty array and a blocked delete answers 204, and both look
like success. The public read of the refused path answering 400 is what establishes that the object
did not land. The same logic is why probe 3 reads `public.album` rather than `public.photos`, which
is refused to the publishable key and would answer an empty array whether or not the rows were gone.

**Research assumption A4 is now settled.** `04-RESEARCH.md` assumed the rejection shape for a
violated type list would be an HTTP error carrying a message of the form `mime type X is not
supported`, and marked it unprobed because it could not be tested without applying the migration.
Probe 2 returned exactly that message. The assumption was correct and can be marked so.

### Task 3's four automated gates

| Gate | Expected | Result |
|---|---|---|
| the sheet exists | present | **present** |
| every required row token present (`portrait`, `HEIC`, `multi-select`, `throttl`, `320px`, `reduced motion`, `VoiceOver`, `TalkBack`, `refused`) | all 9 | **all 9** |
| unfilled placeholder scan (`to be filled`, `TBD`, `TODO`) | 0 | **0** |
| en or em dash scan | clean | **clean** |

Task 3's `<human-check>` was **not performed**. See Outstanding.

### Plan-level verification

| # | Item | Result |
|---|---|---|
| 1 | All seven schema gates print their success lines | **pass** |
| 2 | The blocking handoff completed and all three probes pasted verbatim | **pass**, above |
| 3 | Probe 1 shows the upload refused and the public read returning 400 | **pass** |
| 4 | Probe 2 shows the plain-text upload refused | **pass** |
| 5 | Probe 3 prints exactly `[]` | **pass** |
| 6 | The sheet exists, every required row present, none blank or deferred | **pass** |
| 7 | `git diff --stat` shows exactly two files touched | **pass**, `supabase/schema.sql` and the new sheet, plus this summary |

## Deviations from Plan

The first three are carried forward verbatim from the interim summary this file replaces. They were
found and resolved during task 1 and none of them changed.

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
**Issue:** E6's comment explains the change by quoting the clause it replaces, and the gate requires
`grep -c 'do nothing'` to return 0 across the whole file.
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
file: two declarations, plus two explanatory comment lines, one in section 4 and one in section 9.
Both comments were written in phase 3 and both are load-bearing prose.
**Fix:** Nothing changed. The plan's action text is explicit that section 4's owner rights and
section 9's revoke must not be touched, and rewording two comments to make a count land on 2 would be
editing exactly what the plan forbids editing, to satisfy a number the planner miscounted. The
executable gate is `grep -q`, presence, and it passes. The criterion's intent, "the trigger keeps
owner rights and the revoke is intact", is asserted and holds.
**Files modified:** none
**Commit:** n/a

### 4. [Rule 3 - Blocking] Every device pass row reads `Pending`, and the sheet defines what that means

**Found during:** Task 3
**Issue:** The plan's action says "Fill it in by running the pass", and its acceptance criteria say
every row must carry a verdict of passed, failed, or not tested with a reason, and that no row may
say it will be filled in later. Running the pass needs a physical iPhone and a physical Android
phone. This executor has neither, and the one thing a device pass must never do is record an
observation nobody made. The two other readings available were both worse: leaving rows blank, which
phase 03's sheet did and which reads as an oversight rather than a decision, or marking rows from the
source, which is precisely the failure this sheet exists to prevent.
**Fix:** Every row carries `Pending` beside an explicit **expected result**, and the preamble defines
`Pending` once, in its own paragraph: a row nobody has looked at, not a soft pass, never to be
promoted by reading the source, and to be overwritten with `Pass`, `Fail` or `Not tested` plus a
reason. This is the "not tested with a reason" branch of the criterion with the reason stated once at
the top rather than repeated 67 times. The automated gate that enforces the criterion, a scan for
`to be filled`, `TBD` and `TODO`, returns 0.
**Files modified:** .planning/phases/04-photos/04-DEVICE-PASS.md
**Commit:** `13e2927`

### 5. [Rule 3 - Blocking] Task 3's precondition could not be checked from a terminal, and is recorded in the sheet instead

**Found during:** Task 3
**Issue:** The task's precondition is that the site is reachable on a phone, either through
`node tools/preview.js` on the LAN or through the live Pages URL serving current code. Whether a
phone on a LAN can reach a host address is not a fact any read-only check available here can
establish, and phase 03's sheet already recorded it as "the one step only a human can establish".
**Fix:** Recorded as precondition 1 and 2 at the head of the sheet, with the Pages alternative
carrying the caveat that it is only valid once this phase's commits are pushed, otherwise the phone
is testing the previous phase. The precondition gates the walk, not the authoring, and the authoring
is what this task could deliver.
**Files modified:** .planning/phases/04-photos/04-DEVICE-PASS.md
**Commit:** `13e2927`

### 6. [Rule 2 - Missing critical] The sheet gained rows the checklist implies but does not list

**Found during:** Task 3
**Issue:** Walking the sheet as written would have left three things unrecorded that the phase
depends on. The UI spec's row "a 12MP photograph does not look soft at four columns" cannot be walked
on a phone at all: `.album` is two columns below 560px and four only from 900px, so a phone can never
show the four column case the row names. Nothing anywhere told the walker that the photographs they
upload during the pass are permanent, public and undeletable from a phone. And the cross-cutting
backstop row about backgrounding the tab mid upload on iOS had no home in the checklist.
**Fix:** Row J1 states plainly that it is walked on a tablet in landscape or at a desk browser
widened to 900px, and says why. A precondition and a "Cleanup owed after the pass" section at the
foot state the permanence and give the owner the dashboard steps and the read-back proof. Table F
rows F3 and F4 carry the backgrounding and locked-screen cases with the 60 second timeout as the
expected terminator.
**Files modified:** .planning/phases/04-photos/04-DEVICE-PASS.md
**Commit:** `13e2927`

## Outstanding

### The device pass itself, all 67 rows

`.planning/phases/04-photos/04-DEVICE-PASS.md` is authored and entirely unwalked. It needs a real
iPhone and a real Android phone, a real camera roll with a portrait photograph and an HEIC image, a
320px viewport, network throttling, operating system reduced motion, VoiceOver and TalkBack. Recorded
in `.planning/WINDOWS.md` as entry 13, kind `unrun-verify`, status open.

**Phase 04 therefore closes `human_needed` rather than `passed`**, on the phase 02 and 03 precedent.
The requirement IDs that stay unchecked on that account are PH-01, PH-02, PH-03, PH-05, PH-06, PH-07,
DEL-02, DEL-03, DSG-05 and DSG-08. Requirements were deliberately not marked complete in
`REQUIREMENTS.md`, following all four earlier plans of this phase.

The single row to walk first is **Table A row 1**. If a portrait iPhone photograph lands sideways in
the album, everything else in this phase is decoration.

### Research assumptions, after this plan

| # | Claim | Status now |
|---|---|---|
| A1 | One step 2.5x reduction gives acceptable sharpness | Still open. Table J row J1 |
| A2 | Five sequential 12MP decodes stay inside mobile Safari's budget | Still open. Table J rows J2 and J3 |
| A3 | `public.album` has no implicit row cap at party volumes | Still open, and the album is now empty, so the next chance to observe it is the party |
| A4 | The violated type list answers `mime type X is not supported` | **Settled by probe 2.** The message came back in exactly that form |
| A5 | Supabase's `text/html` downgrade and SVG attachment behaviour are stable platform behaviour | Still an assumption, and now less load-bearing: the declared type list refuses both at the door on the happy path |
| A6 | Postgres grants `execute` to `PUBLIC` by default | Unchanged, harmless either way |

### The timing claim from plan 04-01

The refetch after a successful upload is not delayed, so whether a just-written object is readable at
that instant is still untested. It is Table B row B3's note. If a guest's own tile is briefly broken,
`img.onerror` already hides it and the remedy is a short delay in one function.

## Known Stubs

None in code. This plan wrote no JavaScript and no CSS.

The device pass sheet's `Pending` verdicts are not stubs. A stub is a placeholder standing where
behaviour should be; those cells are the honest state of an observation nobody has made, they are
defined as such in the sheet's own preamble, and they are registered in `.planning/WINDOWS.md` so the
ship gate sees them. Recording them any other way would be the failure, not the record.

## Threat Flags

None. No new security surface beyond the plan's `<threat_model>` register. Of its seven rows, six are
now discharged and one is accepted.

- **T-04-27** (the file claiming a bucket limit the live project does not have, high): **discharged**.
  The blocking gate was passed and its acceptance was a refused four megabyte upload followed by a
  failed public read of that object, not a status code. The header records both.
- **T-04-28** (storage exhaustion by anyone holding the publishable key, high): **discharged as far as
  it can be**. The byte counted ceiling is live and refuses four megabytes on the wire. It is a
  ceiling per object, not per project: the free tier's one gigabyte and the owner's dashboard remain
  the recourse against volume, which `REQUIREMENTS.md` already accepted.
- **T-04-29** (a future run reconciling the twelve megabyte check and the three mebibyte ceiling into
  one, medium): **discharged**. Both comments exist and each names the other.
- **T-04-30** (the type list described as protection it is not, medium): **discharged**. Both the
  section 6 comment and the header now say the check is against the declared type, and the header
  adds the word hygiene beside it.
- **T-04-31** (a read or delete rule added while touching this file, high): **discharged**. Zero
  delete policies, zero select policies on the photos table, zero invoker views, both
  `security definer` declarations intact, section 9's revoke intact. Re-asserted after the header
  edit rather than inherited from task 1.
- **T-04-32** (test rows attributed to a fictional guest in a public album, medium): **discharged**.
  `public.album` returns an empty array and all nine objects answer 400 to a public read.
- **T-04-SC**: accepted, nothing installed.

One new operational note, not a threat: every photograph uploaded during the device pass will be
permanent and public and removable only by the owner at the dashboard. The sheet says so in its
preconditions and carries the cleanup steps at its foot.

## Self-Check: PASSED

- `supabase/schema.sql` present and modified
- `.planning/phases/04-photos/04-DEVICE-PASS.md` present, 286 lines
- commit `d65db5a` found in `git log` (task 1, already on main)
- commit `613398a` found in `git log` (task 2)
- commit `13e2927` found in `git log` (task 3)
- no deletions in either new commit, checked with `git diff --diff-filter=D`
- `.planning/WINDOWS.md` entry 13 written, kind `unrun-verify`, phase 04, status open
- `STATE.md` and `ROADMAP.md` untouched, as instructed
