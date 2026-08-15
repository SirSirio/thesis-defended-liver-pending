---
phase: 03-enrollment-identity-and-the-group
plan: 06
subsystem: verification
tags: [gates, falsifiability, mutation-testing, device-pass, config-branches, postgrest, requirements]

requires:
  - phase: 03-enrollment-identity-and-the-group
    plan: 01
    provides: "the form, the write path, the identity module and the 25 copy keys every gate below inspects"
  - phase: 03-enrollment-identity-and-the-group
    plan: 02
    provides: "measureNudge, the anchored enrollmentReady assertion this plan inherits in its corrected form, and the nudge bar this plan drives through all five branches"
  - phase: 03-enrollment-identity-and-the-group
    plan: 03
    provides: "the live withdrawn column, the re-created attendees view and public.amend_enrollment, plus the corrected for-select gate this plan had to re-apply"
  - phase: 03-enrollment-identity-and-the-group
    plan: 04
    provides: "the group section, the head count, and the select=* probe that replaced an unfalsifiable view contract check"
  - phase: 03-enrollment-identity-and-the-group
    plan: 05
    provides: "withdrawEnrollment and the re-anchored branch-presence assertion this plan re-runs"
provides:
  - "the phase-wide gate sweep, run as one pass: 44 source gate cases plus a byte-identity check plus four live wire probes"
  - "a falsifiability result for every gate, by mutation testing rather than by argument: 43 of 43 mutation cases go red"
  - "two more broken gates found and re-anchored, which is the fifth and sixth instance of the phase's recurring pattern"
  - "all five nudge ladder branches, the group state, the dismissal and the frequency claim, exercised against config really moved on disk"
  - "both guest-count branches exercised at maxima 0, 2, 4 and 5 against the shipped builders"
  - "a clean enrollments table, proved through the public view first-hand and paired with a raw-table control probe"
  - "the head count arithmetic re-established against the real one-row state by running the shipped renderSocialProof against the live wire body"
  - "03-DEVICE-PASS.md Table G complete, Tables A to F carrying explicit desk notes, and a Desk half record kept separate from the device Outcome"
  - "a requirement position per ID, derived from what was verified, with eleven IDs left deliberately unchecked"
  - "deferred-items.md recording a touch-target shortfall the sweep surfaced and deliberately did not fix"
affects: [03-verification, 04-photos]

# Actuals (#2632) - same estimateTokens scale as the plan's estimate (chars/4 over the realized diff).
actuals:
  # 10900 measured at the task 1 close, plus 12350 for the task 2 diff (49426 chars / 4).
  # Not netted down for the summary lines task 2 rewrote: both passes were real work.
  tokens: 23300
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "A gate is not verified by its exit code. It is verified by breaking the thing it protects and watching it go red."
    - "A branch that only config can reach is exercised by really moving config on disk, then restoring it and asserting the restoration rather than remembering it."
    - "A branch chain is driven by slicing the shipped function out of the source and instantiating it, so a change to the source changes the recorded result."
    - "A desk result and a device result are two kinds of evidence and are never written in the same column."
    - "A destructive result is proved by the one path allowed to see rows, and paired with a control probe on the blocked path, because otherwise a successful delete and a broken read produce the same output."

key-files:
  created:
    - ".planning/phases/03-enrollment-identity-and-the-group/deferred-items.md"
  modified:
    - ".planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md"
    - ".planning/WINDOWS.md"

key-decisions:
  - "The headline number is 42 gates passed AND capable of failing, not 42 gates passed. Those are different claims and four preceding plans proved the difference matters."
  - "Two inherited gates could never be satisfied and were re-anchored rather than worked around. No source was bent to make a gate green."
  - "The cleanup statement's row count is wrong in the plan, three rather than two, and the count was corrected. The predicate itself is provably narrow and was left exactly as STATE.md records it."
  - "Three touch targets are 4px under the UI contract. Found at the desk, not fixed: pre-existing, above the 44px floor, and out of this plan's declared scope, which touches no source file at all."
  - "The Outcome table on the device sheet stays empty and the desk half got its own block. A desk date in the device pass's own record would make the sheet read as finished."
  - "Requirement positions are stated in the summary and REQUIREMENTS.md is not edited, which is the discipline phase 2 set."
  - "ENR-10 moved from satisfied to pending the device pass at the task 2 close, reversing this summary's own earlier position. Its state machine is verified in source, but two of its rows on Table B are device rows and unrun, and WINDOWS entry 11 had it pending while this summary had it satisfied."
  - "The phase closes human_needed. Tables A to F are unrun, NDG-02 is among them, and no amount of desk evidence promotes that to passed."

patterns-established:
  - "Mutation testing as the standard for a closing sweep: copy the tree, break exactly what the gate claims to protect, confirm the gate reddens, and report any gate that does not as a finding even when it is green"
  - "A presence gate written as a substring match cannot tell --nudge-h from --nudge-height; when mutation testing one, rename to a token that does not contain the original or the test proves nothing"
  - "A record sheet that mixes desk evidence with device evidence is worse than an empty one, because a later reader inherits a confidence nobody earned"
  - "When a summary and the broken-windows ledger disagree about whether an ID is satisfied, resolve it in the unchecked direction and record the disagreement, because two artifacts drifting apart is how an ID gets ticked on evidence nobody ever produced"

requirements-verified: [NDG-06, NDG-07, NDG-08, DSG-06, LNG-06, CFG-01]

coverage:
  - id: D1
    description: "Every gate the phase set is re-run as one pass, so a regression one plan introduced into another's work is caught before the phase closes"
    requirement: "DSG-06"
    verification:
      - kind: automated_ui
        ref: "44 gate cases run in one pass against the committed tree: 42 green, 2 red, and the 2 red are the known-broken original forms kept in the run deliberately"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every gate is capable of both passing and failing, established by breaking the thing it protects in a scratch copy and confirming it reddens"
    verification:
      - kind: automated_ui
        ref: "43 mutation cases over the 42 passing gates; 43 of 43 go red. Plus the enrollmentReady byte-identity check, which demonstrated its own falsifiability by correctly reporting CHANGED against the wrong baseline commit"
        status: pass
    human_judgment: false
  - id: D3
    description: "All five deadline outcomes have a recorded result rather than an argument from the source, and the escalation is in the copy only"
    requirement: "NDG-07"
    verification:
      - kind: automated_ui
        ref: "enrollment.deadline really moved on disk five times; the shipped renderNudge and daysUntil sliced from app.js and run against each. text / soon with {n} substituted / last / today / hidden. Four renderNudge call sites, all event driven, one setInterval in the file and it drives the countdown"
        status: pass
    human_judgment: false
  - id: D4
    description: "The bar shows at most once per load, stays down after a dismissal, and stops permanently once enrolled"
    requirement: "NDG-06, NDG-08"
    verification:
      - kind: automated_ui
        ref: "the session flag hid the bar on every combination run, including with a temporary link set; it is read on the first line of renderNudge, assigned in exactly one place and never reset. Enrolled hid the bar with the link null and with it set once wa_joined is 1"
        status: pass
    human_judgment: false
  - id: D5
    description: "The guest-count field's zero and overflow branches behave against real config values"
    verification:
      - kind: automated_ui
        ref: "maxGuestsPerPerson moved to 0, 4 and 5 on disk and the shipped buildForm run against each. At 0 the field is absent from the form entirely and readGuests returns 0 before it reads the DOM. At 5 the control is a native select over 0..5. At 4 it is still a three-plus-two segment radiogroup, so the documented boundary is where the spec says"
        status: pass
    human_judgment: false
  - id: D6
    description: "The config is back to its committed values, verified rather than remembered"
    requirement: "CFG-01"
    verification:
      - kind: automated_ui
        ref: "the three enrollment values asserted equal to their committed originals by the sweep, and git status on config.js clean after nine separate moves. Re-asserted at the task 2 close"
        status: pass
    human_judgment: false
  - id: D7
    description: "The live database still answers the way the phase's write paths assume"
    verification:
      - kind: e2e
        ref: "attendees select=* projects exactly first_name, extra_guests, created_at; raw enrollments returns [] to the publishable key while the view demonstrably returns a row; amend_enrollment answers 0 / HTTP 200 for a uuid matching no row"
        status: pass
    human_judgment: false
  - id: D8
    description: "Tables A to F of the device pass, which are the phase's real remaining verification"
    verification: []
    human_judgment: true
    rationale: "This executor had no browser of any kind, and the rows need a real notched iPhone and a real Android phone in any case. Each table now carries a desk note stating what the desk could and could not establish, so the gap is written down rather than inferred."
  - id: D9
    description: "Every Danish error string occupies one line at 320px inside the reserved box"
    requirement: "LNG-06"
    verification:
      - kind: automated_ui
        ref: "the source cap is gated: 36 characters or fewer in all three languages, longest Danish is 23. The rendered fit was bounded but not measured: 272px of content width at 320px against 250px at a pessimistic 0.75em per character"
        status: pass
    human_judgment: true
    rationale: "A bound is not a render. The no-reflow guarantee the reserved box exists for depends on a rendered one-line fit in a specific font, and the row on Table E stays unanswered."
  - id: D10
    description: "The test rows are removed and the removal is proved through the public view"
    verification:
      - kind: e2e
        ref: "the owner ran the delete; this executor then ran the acceptance probe first-hand. attendees?select=first_name,extra_guests returns [{first_name:Sirio,extra_guests:0}] HTTP 200, no ZZTEST entry. Paired with the control probe enrollments?select=* returning [] HTTP 200, which proves the delete did not open a read path"
        status: pass
    human_judgment: false
  - id: D11
    description: "The head count arithmetic holds against the real one-row state, not against the inflated fixture it was first checked on"
    requirement: "NDG-05, ENR-07"
    verification:
      - kind: automated_ui
        ref: "the shipped renderSocialProof and recordRow sliced from app.js and run against the live wire body. 1 row, count 1, below the configured threshold of 8, block correctly absent. Threshold lowered to 1 purely to read the value out: renders 1 and the single name Sirio. Same harness on the pre-delete four-row body renders 4 and Sirio, ZZTEST, ZZTEST, ZZTEST"
        status: pass
    human_judgment: false

duration: 43min
completed: 2026-08-15
status: complete
---

# Phase 3 Plan 06: The closing sweep Summary

**Forty-two gates pass, and all forty-two are capable of failing, which is a different and much
stronger claim than the first one. Two more gates turned out to be broken rather than the code,
bringing the phase's total to six. All five nudge branches and both guest-count branches were
exercised by really moving config on disk. The three test rows are gone, proved first-hand
through the public view and paired with a control probe on the blocked path, and the head count
now reads 1 against a threshold of 8. Table G of the device sheet is complete; Tables A to F are
unrun and say so in their own words. The phase closes `human_needed`.**

## Performance

- **Duration:** 34 min to the checkpoint, 9 min for the task 2 close
- **Tasks:** 2 of 2 complete
- **Files modified:** 3, none of them source

## The headline result

The plan's job was to re-run every gate the phase set. The instruction that mattered more was to
establish that each gate is **anchored**: that it inspects the construct it names and can both
pass and fail. Four of the five preceding plans found a gate that was itself broken, in two
distinct flavours, and `WINDOWS.md` entries 6 and 7 were addressed to this plan about exactly
that.

So the gates were not run and counted. They were run, and then each one was **mutation tested**:
the tree was copied into a scratch directory, the thing the gate claims to protect was broken,
and the gate was re-run to confirm it reddened. A gate that stays green under its own mutation
cannot fail, and a gate that cannot fail is a finding rather than a pass.

| Measure | Count |
|---|---|
| Gate cases run in one pass | **44** |
| Green | **42** |
| Red | **2**, and both are the known-broken original forms, kept in the run on purpose |
| Mutation cases over the 42 green gates | **43** |
| Mutation cases that reddened the gate | **43 of 43** |
| Gates that pass but cannot fail | **0** |
| Live wire probes | **6**, all green (4 at task 1, 2 more at the task 2 close) |

**42 passed, and 42 are capable of failing.** Those two numbers are equal, which is the outcome
this plan was told to report on and the one that was not guaranteed going in.

Three mutations initially failed to redden their gates and one failed to apply. All four were
**harness defects, not gate defects**, and fixing them is itself a finding worth recording:

- Mutations 24, 25 and 26 renamed `--grid-record`, `--nudge-h` and `scroll-padding-bottom` by
  appending a suffix. Those three gates are `grep -qF` substring presence checks, so the needle
  was still in the haystack and the gates stayed green. Renamed to a token that does not contain
  the original, all three reddened. The underlying observation stands and is worth keeping: a
  substring presence gate cannot tell `--nudge-h` from `--nudge-height`.
- Mutation 06 targeted a string that appears three times in `app.js`; re-anchored to the first
  occurrence after the declaration, which is the same class of fix as 03-02's.
- Mutation 39 blanked the header row of Table G, which the gate deliberately skips. Retargeted at
  a real ladder row.

## The two broken gates this plan found

Fifth and sixth instances of the pattern. Recorded as `WINDOWS.md` entry 9.

**1. The `for select` count, inherited from 03-03 in its uncorrected form.** The plan's block
asserts `grep -c 'for select' supabase/schema.sql` returns 0. It returns 2, and both matches are
pre-existing and load-bearing: `on public.photos for select` and `on storage.objects for select`,
which the phase forbids touching and which the phase 4 album depends on. **Vacuous: it can never
pass.** 03-03 already found this and narrowed it; the correction did not travel into 03-06's
block, which is exactly the failure mode a closing sweep exists to catch. Re-applied 03-03's
narrowed form, which parses every `on <relation> for select|delete`, fails if any names
`public.enrollments`, and additionally pins the full match set to the two known album policies.
Both mutations confirm it: a read policy on `enrollments` reddens it, and so does a read policy
on any other relation.

**2. The Table G parse, this plan's own.** The gate slices `03-DEVICE-PASS.md` from
`## Table G` **to the end of the file** and demands no unanswered rows. Everything after Table G
is the Outcome table, which is the device pass's own record of which phone was used and what
failed. That cannot be filled at a desk, by the plan's own account of what a desk can establish.
On the untouched sheet it reported 13 unanswered rows; after Table G was filled it still reported
6. **Over-broad: never satisfiable by the task that owns it.** Bounded to Table G's own section,
which is the gate's stated intent, with a floor of 7 rows so it cannot be satisfied by a section
that has lost its table. Re-run at the task 2 close against the sheet as it now stands: **8
answered rows, no unanswered ones**, and the new task 2 block that sits after Table G is
correctly outside the gate's slice rather than swallowed by it.

Both were fixed in the gate, never in the artifact. The Outcome table is still empty because it
is still true that no phone has answered anything.

**Entry 9 stays open deliberately.** The two corrections live in this executor run and in this
summary, not in `03-06-PLAN.md`, which still carries both broken gates in its `<verify>` block.
That is precisely the condition that made 03-03's fix fail to travel. Phase 3 will not run these
gates again so nothing is at risk inside this phase, but closing the entry would assert a
durability nobody established.

## Predecessors' corrections, honoured

Three gates were run in the corrected form a predecessor established, and this is recorded so a
reader knows the sweep did not quietly re-inherit the broken versions:

| Correction | Origin | Status in this sweep |
|---|---|---|
| `enrollmentReady` assertion anchored to its own declaration | 03-02 deviation 2 | Already corrected in 03-06's block. Run, green, mutation reddens it |
| `for select` narrowed to `public.enrollments` | 03-03 deviation 2 | **Not** carried into 03-06's block. Re-applied here |
| Withdraw branch presence scoped to the function body, no file-wide fallback | 03-05 deviation 4 | Run in the corrected form, green. Mutation removing `PGRST202` from inside `withdrawEnrollment` reddens it |
| The `attendees` view contract probed with `select=*` rather than a projection PostgREST guarantees | 03-04 deviation 3 | Run as the live probe below, green, and re-run after the delete |

## Two strengthenings, and one that caught something

**Quote and case agnostic verb gates.** `grep -c "'PATCH'"` catches only the single-quoted
uppercase literal; `method: "PATCH"` would sail through. Added case-insensitive quote-agnostic
counts for both verbs. Both return 0.

**`enrollmentReady()` byte-identity.** The plan's acceptance criterion says the function is
"byte-identical to its phase 1 body". The gate it ships checks three substrings, which a
rewritten function could satisfy. A byte comparison against the git object was added, and it
found something worth stating: the function is **not** identical to the commit that first
introduced it (`202bece`), because phase 1 itself changed it later in `b87926f`, the "Stop the
nudge bar pointing at a placeholder" commit that `STATE.md` records as the gotcha. Against
`b87926f`, and against the phase 3 baseline `94a1b7f`, it is byte-identical: 203 bytes, unchanged
by all five plans. This check demonstrated its own falsifiability by correctly reporting CHANGED
against the wrong baseline before reporting identical against the right one. Re-measured at the
task 2 close: still 203 bytes, still intact.

## The nudge ladder, exercised rather than read

`enrollment.deadline` was really rewritten in `config.js` once per branch, and the shipped
`renderNudge()` and `daysUntil()` were sliced out of `app.js` by brace matching and run against
the moved file in a fresh process. Stubs stand in only for the browser objects the bar closes
over. No branch condition was re-typed, so a change to the ladder in `app.js` changes these
results, which is what makes the exercise capable of failing.

| Deadline moved to | `daysUntil` | Shown | `data-state` | Key requested | Rendered |
|---|---|---|---|---|---|
| +30d | 30 | yes | `enrol` | `nudge.enrol.text` | You have not registered yet. |
| +3.5d | 4 | yes | `enrol` | `nudge.enrol.soon` | Registration closes in 4 days. |
| +12h | 1 | yes | `enrol` | `nudge.enrol.last` | Registration closes tomorrow. |
| -1h | 0 | yes | `enrol` | `nudge.enrol.today` | Registration closes today. |
| -5d | -5 | no | none written | none requested | nothing |

The middle branch is the one reachable for a six day window in the whole life of the site, and it
is the one that proves `{n}` is really substituted rather than rendered as a literal.

Four further readings of the same function, three of which needed `whatsapp.inviteUrl` moved too:

| Condition | Result |
|---|---|
| `enrolled === '1'`, link null (the shipping state) | hidden |
| `enrolled === '1'`, temporary link, not joined | shown, `data-state="group"`, `nudge.group.text` / `nudge.group.cta`, href verbatim from config |
| `enrolled === '1'`, temporary link, `wa_joined === '1'` | hidden |
| session dismissed, in all three of the above | hidden |
| readiness gate false | hidden, and no copy key requested at all |

**The frequency claim, which is the substance of NDG-07.** `renderNudge()` has exactly four call
sites and every one is event driven: the language chain, `refreshEnrollmentState()`, the focusout
restore, and `markGroupJoined()`. `app.js` contains one `setInterval` and it drives the countdown.
The bar's one `setTimeout` is the 240ms hide teardown. There is no frequency variable anywhere in
the bar, so the escalation cannot be anything but the copy. The flagged planner assumption for
NDG-07 was that the absence of a frequency mechanism is the requirement being met rather than a
gap; that reading is unchanged and is now backed by a call-site count rather than by a claim.

## The guest-count branches

`maxGuestsPerPerson` really moved to 0, 4 and 5, and the shipped `buildForm()`,
`buildGuestsControl()` and `readGuests()` were run against each.

| Maximum | Field present | Control | Options | `readGuests` sends |
|---|---|---|---|---|
| 0 | **no** | none | none | **0** |
| 2 (committed) | yes | radiogroup | 0,1,2 | 1 |
| 4 | yes | radiogroup | 0,1,2,3,4 | 1 |
| 5 | yes | **native select** | 0..5 | see note |

At zero the guest field is absent from the form entirely rather than rendering a one-option
control, and `readGuests()` returns 0 on its first line before it looks at the DOM at all, so
the zero really is sent rather than merely defaulted. At five the documented overflow branch
takes over and produces a native select over the whole range. Four is still segmented, so the
boundary is where the spec puts it.

**One honest note on the select row.** The harness reported `readGuests` sending 0 at maximum 5.
That is a harness artifact, not a source defect: the shipped code reads `control.value`, which a
real `<select>` derives from its selected option and the DOM shim used here does not. The builder
correctly marks option 1 selected. Recorded rather than quietly dropped, because a number in a
results table that means something other than what it looks like is the exact thing this plan was
sent to find.

## Task 2: the cleanup, and the head count against real data

The owner ran the pre-flight `select` and then the delete against project `aplaxdplwnnlezffatal`.
**This executor did not accept that as the result.** The plan is explicit that the removal is
proved by reading the public view back rather than by the owner's report, so the acceptance probe
was re-run first-hand from the repository root.

**The acceptance probe, verbatim.**

```
GET /rest/v1/attendees?select=first_name,extra_guests
[{"first_name":"Sirio","extra_guests":0}]
HTTP 200
```

No entry whose first name is `ZZTEST`. All three test rows are gone and the owner's own
registration survived, which is what the exact-equality predicate on the full name guaranteed and
what deviation 4 at task 1 established in advance rather than after the fact.

**The control probe, which is the half that makes the acceptance probe mean anything.**

```
GET /rest/v1/enrollments?select=*
[]
HTTP 200
```

The raw table still answers `[]` to the publishable key at the same moment the view returns a
row. A delete that had somehow relaxed the policy would show up here as rows appearing, and it
does not. D-02 is intact and the delete opened nothing.

The projection contract was re-read after the delete as well, because the view had never been
observed against a single-row table:

```
GET /rest/v1/attendees?select=*
[{"first_name":"Sirio","extra_guests":0,"created_at":"2026-08-15T01:33:47.332041+00:00"}]
HTTP 200
```

Exactly `first_name`, `extra_guests`, `created_at`. No `name`, no `guest_id`, no `note`, no
`withdrawn`. The truncation still happens server side.

### The head count, re-established against the real state

The arithmetic had only ever been checked against the inflated four-row fixture. It was
re-established by slicing the shipped `renderSocialProof()` and `recordRow()` out of `app.js` by
brace matching and running them against the **live wire body above**, with stubs standing in only
for the DOM. The count is not re-typed anywhere in the harness, so a change to `app.js` changes
these numbers.

| Reading | Before the delete | After the delete |
|---|---|---|
| Rows in `public.attendees` | 4 | **1** |
| Head count computed by the shipped code | 4 | **1** |
| Configured `showCountFrom` | 8 | 8 |
| Social proof block | absent, 4 < 8 | **absent, 1 < 8** |
| Names the list row would render | `Sirio, ZZTEST, ZZTEST, ZZTEST` | **`Sirio`** |

Four harness cases, all against the shipped function:

| Case | Wire body | Threshold | Block | Count | List |
|---|---|---|---|---|---|
| The real state today | 1 row, 0 extra | 8 (committed) | **absent** | n/a | n/a |
| The same, threshold dropped to 1 to read the value out | 1 row, 0 extra | 1 | shown | **1** | `Sirio` |
| The pre-delete state, for the record | 4 rows, 0 extra | 1 | shown | **4** | `Sirio, ZZTEST, ZZTEST, ZZTEST` |
| Summation branch, synthetic | 1 row, **2 extra** | 1 | shown | **3** | `Sirio` |

Three things worth stating plainly:

1. **The block is correctly absent.** 1 is below 8, and NDG-05's requirement is that the count
   only appears once the number is not embarrassing. One guest is exactly the case the threshold
   exists for.
2. **The cleanup removed more than a wrong number.** The pre-delete row shows the list would have
   rendered the literal string `ZZTEST` three times into every guest's browser had the count ever
   reached the threshold. That is T-03-37 stated more sharply than the register stated it.
3. **The `extra_guests` summation branch is not exercised by the real state**, because the only
   real row carries 0. It was driven synthetically to confirm the arithmetic is
   `rows.length + sum(extra_guests)` and not `rows.length`, and that case is marked synthetic in
   the table above rather than presented as a live reading.

## The live database, read first-hand

Six probes in total against project `aplaxdplwnnlezffatal`, four at task 1 and two at the close.

| Probe | Result |
|---|---|
| `attendees?select=*` (task 1) | exactly `first_name`, `extra_guests`, `created_at`. Three `ZZTEST` rows and one `Sirio` row |
| `attendees?select=first_name,extra_guests` (task 1) | the same four rows, the plan's literal projection |
| `enrollments?select=*` (task 1) | `[]` from a table that demonstrably held four rows. D-02 intact |
| `rpc/amend_enrollment` with a uuid matching no row (task 1) | body `0`, HTTP 200. Zero rows touched, zero residue |
| **`attendees?select=first_name,extra_guests` (task 2, the acceptance probe)** | **one row, `Sirio`, no `ZZTEST`** |
| **`enrollments?select=*` (task 2, the control)** | **`[]` while the view returns a row. The delete opened no read path** |

## The device sheet

**Table G is complete**, all seven rows plus an eighth added for the frequency claim, each with
the recorded result and each marked as a desk result. A note above the table states exactly how
they were performed and, more importantly, what they do not establish: nothing about how the bar
looks or behaves on a screen.

**Tables A to F are entirely unrun**, and each now carries a desk note in its own words saying
what the desk could and could not establish. This executor had no browser of any kind, so no row
that needs a rendered pixel was answered, guessed at, or filled with a source reading dressed up
as a measurement.

**The Outcome table stays empty.** A desk date in the device pass's own record would make the
sheet read as finished. A separate **Desk half** block records what was performed, by what
method, and what is still owed, and a new **Cleanup and the head count** block records task 2's
probes verbatim alongside the recomputed arithmetic.

### What the desk added under each table

- **A.** Nothing, and nothing can be. Every row depends on the safe-area inset, which is 0 on a
  desktop, or on iOS Safari's collapsing toolbar, which does not exist there. Still the highest
  risk item in the phase.
- **B.** The two guest-count branches, recorded above, so the phone is not asked to establish
  them twice.
- **C.** The bar stops asking about the group the moment `wa_joined` is `'1'`, which is the
  branch condition rather than the tap. Whether a real tap opens the app is untouched.
- **D.** A **Declared** column, which is a source reading and answers no row. It surfaced a
  finding, below.
- **E.** The Danish error strings bounded, not measured: longest is 23 characters against a 36
  cap, and 250px at a pessimistic 0.75em per character against 272px of content width at 320px.
  A bound is not a render and the row stays unanswered.
- **F.** The sweep bar and the panel swap carry explicit reduced-motion rules; the `:active`
  scale and the bar's slide rely on the universal clamp. None of the four is observed, and
  nothing at all is established for the six assistive-technology and keyboard rows.

## Deviations from Plan

### Gate corrections

**1. [Rule 1 - Broken gate, not broken code] The `for select` count could never pass**

- **Found during:** Task 1, the first sweep run
- **Issue:** Detailed above. Inherited from 03-03 in its uncorrected form; returns 2 against an
  asserted 0, and both matches are policies the same phase forbids touching.
- **Fix:** 03-03's narrowed form re-applied and mutation tested in two directions.
- **Files modified:** none. The source was not touched.
- **Recorded:** `WINDOWS.md` entry 9

**2. [Rule 1 - Broken gate, not broken code] The Table G parse demands the device pass Outcome**

- **Found during:** Task 1, filling the sheet
- **Issue:** Detailed above. Slices to end of file, so it also requires the rows only a phone can
  answer. Reported 13 unanswered rows on the untouched sheet and 6 on the filled one.
- **Fix:** Bounded to Table G's own section with a row-count floor, so it cannot be satisfied by a
  section whose table has gone missing. Re-run at the close: 8 answered rows, none unanswered.
- **Files modified:** none.
- **Recorded:** `WINDOWS.md` entry 9

### Corrections to the plan's own text

**3. [Rule 1 - Bug] The cleanup targets three rows, not two**

- **Found during:** Task 1, preparing the checkpoint
- **Issue:** Task 2 says "Two rows named `ZZTEST DeleteMe` exist in `public.enrollments`", one from
  the researcher and one from the tracer. The tracer gate ran **twice**, and 03-01's own summary
  records three: `f613a2e2-...`, `7342c3fc-...` and the researcher's `b5254bde-...`. The live view
  returned three `ZZTEST` rows.
- **Fix:** The count is corrected everywhere it appears in the checkpoint. **The statement itself
  was not changed**, because it is already correct: it is exact equality on the full name and all
  three rows carry that exact name, so one statement still removes all three.
- **Confirmed at task 2:** one statement removed all three. The acceptance probe returns a single
  row and it is the owner's.
- **Files modified:** none.

**4. [Threat check, T-03-37] The cleanup predicate is provably narrow and the owner's real row cannot be caught**

- **Found during:** Task 1
- **Issue:** The plan's cleanup runs on a table that now holds a real registration made by the
  owner on 2026-08-15. A predicate written even slightly broadly would take it.
- **Result:** It cannot. The predicate is `name = 'ZZTEST DeleteMe'`, exact equality on the full
  column. `public.attendees` projects `split_part(trim(name), ' ', 1) as first_name`, and the
  owner's row projects `Sirio`; a row whose `name` equalled `ZZTEST DeleteMe` would project
  `ZZTEST`. The two are mutually exclusive by construction, so no narrowing was needed and none
  was applied. A pre-flight `select` was added to the checkpoint anyway, so the owner sees the
  three rows before deleting them rather than after.
- **Borne out:** the owner's row survived, with its original `created_at` of
  `2026-08-15T01:33:47.332041+00:00` unchanged.
- **Files modified:** none.

### Out of scope, logged not fixed

**5. [Scope boundary] Three touch targets are declared 4px under the UI contract**

- **Found during:** Task 1, filling Table D
- **Issue:** `03-UI-SPEC.md` asks 52px at a coarse pointer for the text input, the guest-count
  segment and the select overflow branch. `styles.css` declares `min-height: 48px` for
  `.field__input`, `.field__select` and `.seg > span` with no coarse-pointer block. Every other
  row of the touch-target table is declared correctly.
- **Not fixed, deliberately:** it is not a regression, it has been the shipped state since 03-01,
  48px clears the 44px floor so it is a contract shortfall rather than an accessibility failure,
  this plan modifies no source file by design, and its own threat register (T-03-34) is about not
  touching shipped values on a repository that deploys on push. Changing touch geometry at phase
  close with the device pass unrun swaps a measured 4px for an unmeasured change.
- **Recorded:** `deferred-items.md`, the Declared column of Table D, and `WINDOWS.md` entry 10.

### Found at the task 2 close

**6. [Rule 1 - Bug] This summary and the ledger disagreed about ENR-10**

- **Found during:** Task 2, finalising the per-ID ledger
- **Issue:** The task 1 form of this summary listed **ENR-10 as satisfied**, on the reasoning that
  the four submit states and the four withdrawal outcomes all terminate in a defined state. But
  `WINDOWS.md` entry 11 listed ENR-10 as **pending the device pass**, and the device sheet's own
  frontmatter lists it too. Two rows on Table B are ENR-10 rows and both are unrun: that the
  submitting state shows the sweep bar and always terminates, and that submitting with airplane
  mode on lands in the failure state with every typed value still present.
- **Fix:** Resolved in the **unchecked** direction. ENR-10's state machine is verified in source;
  its no-silent-failure guarantee under a real network failure on a real phone is not. Moved to
  the pending list below. A summary and a ledger drifting apart on a checkbox is how an ID gets
  ticked on evidence nobody produced, which is the thing this plan exists to prevent.
- **Files modified:** `.planning/WINDOWS.md` entry 11, whose ID list was also missing NDG-01,
  WA-04 and WA-06.

---

**Total deviations:** 6. Two broken gates, one correction to the plan's prose, one threat check
that came back clean, one out-of-scope finding logged rather than fixed, and one disagreement
between two of this phase's own artifacts, resolved conservatively. **No source file was modified
by this plan.**

## Requirement positions, derived per ID

Derived from what was verified, not from how complete the code looks. `.planning/REQUIREMENTS.md`
is **not edited by this plan**. `STATE.md` records the phase 2 precedent in as many words:
"Requirement checkboxes are derived per ID from the verification report, never from the summaries
or from how complete the code looks. Nine phase 02 IDs checked, three left unchecked pending the
D-23 device pass." The verifier derives the ticks from this report; this plan states positions and
stops there.

### Satisfied

| ID | On what evidence |
|---|---|
| ENR-01 | The form builds name and guest count; exercised at four different maxima |
| ENR-02 | The note field builds with a 500 bound and sends `null` rather than `''` |
| ENR-03 | Proved on the wire in 03-01 and still visible: the inserted rows read back through the view |
| ENR-04 | No separate name prompt exists anywhere on the site |
| ENR-05 | The returning view renders from storage; the branch chain is deterministic and gated |
| ENR-06 | The live function answers `0` / 200 for both argument lists the client sends |
| ENR-08 | The exposure guarantee: the view truncates server side and no name is split in JS. Re-confirmed post-delete against a single-row table |
| ENR-11 | Both owner queries present and adjacent in the schema file |
| ENR-12 | The unconfigured path lands in the inherited pending block |
| ENR-13 | `guest_id unique`, honestly scoped per D-30 |
| ID-01, ID-02, ID-03, ID-04, ID-05 | Identity captured by the form, uuid and name persisted, edit and clear both built, and the interface phase 4 reads is in place |
| ID-06 | The in-memory fallback is written and unconditional |
| WA-01 | One config value, read verbatim, no hardcoded host anywhere |
| WA-05 | The copy frames the group as the course announcement channel |
| NDG-03 | Two hero actions, register is the primary. Read, not touched |
| NDG-04 | The deadline line renders, hides once enrolled or past, and goes urgent at 7 days |
| **NDG-05** | The threshold is read in exactly one place, and the block is correctly absent at the real count of 1 against 8. Re-established post-delete by running the shipped `renderSocialProof()` against the live wire body |
| **NDG-06** | **Verified by this plan.** Enrolled hid the bar in every combination run |
| **NDG-07** | **Verified by this plan.** All five branches, plus a call-site count for the frequency claim |
| **NDG-08** | **Verified by this plan.** Dismissed hid the bar in every combination; flag read first, set once, never reset |
| CFG-01 | No new keys anywhere in the phase; every volatile value still in one file |
| CFG-03 | Every placeholder path renders the deliberate state rather than an error |
| DSG-06 | Gated: zero em dashes and zero en dashes across all six source files |
| DSG-07 | Countdown, address and video are behind no animation |
| LNG-06 | Gated: 156 keys per table at identical key sets across the three languages |
| LNG-07 | `t()` falls back to English for any missing key |

### Pending the device pass, and therefore unchecked

| ID | What is missing |
|---|---|
| **NDG-02** | The bar's clearance over the countdown, the address and the video, at four viewport sizes, with the iOS toolbar collapsing. **The phase's highest risk item.** The bar had never rendered on any device before this phase, and the shipped 76px reserve was short by up to 27px |
| NDG-01 | Both states are driven and confirmed in code, but nothing has been seen pinned to the bottom of a real screen |
| ENR-09 | A field error described on focus and a submit failure announced immediately are runtime behaviours in VoiceOver and TalkBack |
| **ENR-10** | **Moved here at the task 2 close, see deviation 6.** The state machine is verified in source and every branch terminates, but the two Table B rows that would prove no silent failure under a real network fault are unrun: the sweep bar always terminating, and airplane-mode submission landing in the failure state with every typed value still present |
| DEL-02 | iOS Safari and Android Chrome, both untested |
| DEL-03 | The 10 second target on mobile data, on a mid-range phone |
| DSG-05 | Declared correctly and gated at two blocks; the observed half needs the OS setting on and a screen |

### Pending the owner supplying the group link

| ID | What is missing |
|---|---|
| WA-02 | The one tap handoff at the moment of success. Both code branches exist and the configured branch was driven with a temporary local value, but `whatsapp.inviteUrl` is `null` |
| WA-03 | Whether a universal link opens the installed app rather than a browser page. Needs a real phone **and** a real link |
| WA-04 | The `#wa` section ships hidden and correct; it cannot be shown to anyone until the link exists |
| WA-06 | The absent-not-broken state is structurally verified and is the shipping state; whether it reads as deliberate rather than as a gap is a visual judgment nobody has made yet |

### Built but not yet demonstrable

| ID | Why |
|---|---|
| ENR-07 | The confirmed count is built and correct, and it is correctly invisible. The live count is now **1** against a threshold of 8, verified by running the shipped code against the real wire body. It cannot be seen on the page until eight people register, which is the requirement working rather than failing |

**Eleven IDs stay unchecked**: NDG-01, NDG-02, ENR-09, ENR-10, DEL-02, DEL-03 and DSG-05's
observed half on the device pass; WA-02, WA-03, WA-04 and WA-06 on the group link. ENR-07 is a
twelfth that is correct but undemonstrable. None of these is rounded up.

### The phase's headline sentence

"A guest on a phone enrols in under 10 seconds, lands in the WhatsApp group with one more tap,
and is never nudged again." The third clause is verified. The first is unmeasured and needs a
phone on mobile data. The second **cannot be demonstrated end to end at all** until the owner
supplies `whatsapp.inviteUrl`, even though every code path for it is built and every one of them
was driven against a temporary value. The sentence is not yet true as a demonstration, and the
phase should not be recorded as though it were.

## Phase position: `human_needed`, not `passed`

Stated as its own section because it is the plan's stated purpose and the easiest thing to let
slide at the end of a green run.

Forty-two gates pass and every one of them can fail. That establishes a great deal about the
source and **nothing at all about a rendered pixel**. Tables A to F of the device sheet are
entirely unrun, because this executor had no browser of any kind, and among the rows they carry
is NDG-02: whether the nudge bar covers the countdown, the address or the door video on a real
notched iPhone. That is the highest-risk item in the phase by the planner's own assessment, the
bar had never rendered on any device in the life of this site before this phase, and the shipped
reserve was short by up to 27px before 03-02 replaced the guess with a measurement that has
itself never been observed.

A phase that reported `passed` on this evidence would be asserting something nobody checked.
`human_needed` is the accurate state, and it stays that way until `03-DEVICE-PASS.md` carries
results from a real iOS Safari and a real Android Chrome.

## Known Stubs

None introduced. This plan writes no source. The one open shortfall it surfaced is the
touch-target declaration above, which is logged in `deferred-items.md` rather than left in code
as a silent gap.

## Broken-windows ledger

Final state: **7 open, 4 fixed, 11 total.**

- **Entry 6 marked fixed** (task 1). It asked 03-06 to verify gate anchoring rather than exit
  codes. It did, by mutation testing all 43 cases, and it found two more broken gates doing so.
- **Entry 7 marked fixed** (task 1). It asked 03-06 to re-check 03-05's withdraw gate. Re-run in
  the anchored form, green, and the mutation that removes `PGRST202` from inside
  `withdrawEnrollment` reddens it.
- **Entry 9 added, and deliberately left open.** The two broken gates this plan found. The
  corrections live in this run and in this summary, not in `03-06-PLAN.md`, which still carries
  both broken forms. Closing it would assert a durability nobody established, and re-inheriting a
  correction that did not travel is the exact failure this entry documents.
- **Entry 10 added, open.** The touch-target shortfall. The right moment to fix it is the moment
  Table D is answered.
- **Entry 11 added, open, and corrected at the task 2 close.** Its ID list omitted NDG-01, WA-04
  and WA-06, and it disagreed with this summary about ENR-10. Both halves reconciled; the entry
  now names all eleven unchecked IDs.
- **Nothing was closed by task 2.** The cleanup discharged a threat-register item (T-03-37), not
  a ledger entry, and every remaining open entry is either the device pass (1, 2, 4, 8, 11) or a
  finding whose fix has not travelled anywhere durable (9, 10).

## Threat Flags

None new. Every surface this plan touched is in its own register and all seven `mitigate`
dispositions are now discharged or explicitly carried:

| Threat | Position |
|---|---|
| T-03-34, a test config value left committed | **Discharged.** Nine config moves, every one written back, restoration asserted by the sweep and by a clean `git status`, and re-asserted at the task 2 close |
| T-03-35, a requirement ticked because the code looks complete | **Discharged.** Positions derived per ID above, eleven left unchecked, `REQUIREMENTS.md` untouched, and one ID moved from satisfied to pending when two artifacts disagreed |
| T-03-36, a desk result recorded as a device result | **Discharged.** Desk results carry the word desk, live in their own column or their own block, and the Outcome table is still empty |
| T-03-37, test rows inflating the head count | **Discharged at task 2.** Three rows removed by the owner, proved through the public view first-hand, paired with a control probe on the blocked path, and the head count recomputed by the shipped code against the live body |
| T-03-38, the bar covering the address on an untested device | **Carried, and not pretended otherwise.** Abstains to human review; the phase is `human_needed` |
| T-03-39, a regression one plan introduced into another's work | **Discharged.** No regression found. What was found instead was a gate that had been corrected once and then re-inherited broken, which is the same failure wearing different clothes |
| T-03-SC, dependency supply chain | **Accepted.** Nothing installed, no package manager, no lockfile |

## User Setup Required

**The blocking owner action is done.** Three rows named `ZZTEST DeleteMe` were deleted from
`public.enrollments` and the acceptance probe was read back from the public view by this executor
rather than accepted as a report. The owner's own registration, first name `Sirio`, survived
untouched. `STATE.md` has carried an "Outstanding cleanup" note about those rows since phase 2 and
it can now be retired; this plan does not edit `STATE.md`, so the orchestrator owns that removal.

Two long-standing inputs remain outstanding and neither blocks this plan:

- `whatsapp.inviteUrl` is `null`. One line turns the entire group half on, and four requirement
  IDs are waiting on it.
- The D-33 device pass on real iOS Safari and real Android Chrome. Tables A to F, and seven
  requirement IDs.

## Next Phase Readiness

- **The gate sweep is reusable.** The falsifiability discipline it establishes should be applied
  to phase 4's gates as they are written, not after the fact. Six broken gates in one phase is a
  planning-time problem, not an execution-time one: every one of them was written from the
  outside without being run.
- **Phase 4 inherits a clean table, and the head count has lost its only fixture.** There is now
  exactly one row in `public.enrollments`, the owner's. Anything phase 4 needs to verify against
  multiple real rows must either insert its own fixture and remove it in the same plan, or say up
  front that it cannot be verified against real data.
- **The count is 1 against a threshold of 8**, so the social proof block is absent and will stay
  absent. Any phase 4 work that expects to see it rendered must move `showCountFrom` locally and
  restore it, and assert the restoration, which is the pattern this plan used nine times.
- **`03-DEVICE-PASS.md` is the phase's outstanding verification** and Table A is where to start.
- **Not touched, deliberately:** `STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md`. This plan ran in
  a worktree as a parallel executor; the orchestrator owns those writes. `WINDOWS.md` **was**
  written, because this plan is alone in wave 5.

## Self-Check: PASSED

Re-run at the task 2 close against the final tree, not inherited from the checkpoint.

**Files exist:**
- `FOUND: .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md`
- `FOUND: .planning/phases/03-enrollment-identity-and-the-group/03-06-SUMMARY.md`
- `FOUND: .planning/phases/03-enrollment-identity-and-the-group/deferred-items.md`
- `FOUND: .planning/WINDOWS.md`

**Commits exist, verified with `git cat-file -t` rather than assumed:**
- `FOUND: 732d4dd` (Task 1, the sweep and the desk half)
- `FOUND: 838b870` (the ledger)
- `FOUND: 060c97b` (the summary at the checkpoint)

**Gates re-run at the close:**
- `node --check app.js` clean; copy parity **156x3** with the error cap holding in all three
  languages
- The three enrollment config values equal their committed originals: deadline
  `2026-09-26T23:59:00+02:00`, maximum 2, threshold 8
- `enrollmentReady()` still **203 bytes** and intact
- Table G bounded parse: **8 answered rows, zero unanswered**
- `.planning/WINDOWS.md` JSON block parses; 7 open, 4 fixed, 11 total, matching its own
  frontmatter counts

**Wire probes re-run at the close:** the acceptance probe, the control probe and the projection
probe, all recorded verbatim above.

**Discipline checks:**
- No source file modified: `git status` shows `app.js`, `styles.css`, `index.html`, `config.js`,
  `copy.js` and `supabase/schema.sql` all clean, after nine config moves at task 1 and none at
  task 2
- `STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md` show no modification in any of this plan's four
  commits
- No deletions in any commit

---
*Phase: 03-enrollment-identity-and-the-group*
*Closed 2026-08-15. Phase position: `human_needed`, pending the D-33 device pass.*
