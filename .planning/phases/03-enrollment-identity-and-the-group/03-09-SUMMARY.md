---
phase: 03-enrollment-identity-and-the-group
plan: 09
subsystem: ui
tags: [vanilla-js, dom, intl, timezone, focus-management, requestAnimationFrame, gap-closure]

requires:
  - phase: 03-enrollment-identity-and-the-group
    provides: "The deadline and nudge region (03-02), forgetIdentity (03-04), the withdrawn panel and its own forget control (03-05), Table G and deferred-items.md (03-06), the app.js this plan edits (03-08)"
provides:
  - "deadlinePassed(): one close test, read by renderDeadline and by renderNudge above any day bucketing, so the hero line and the bar cannot describe the same fact differently"
  - "calendarDaysUntil(ms): one day function, a calendar day difference in Europe/Copenhagen built from date parts, replacing the millisecond daysUntil"
  - "A ladder in which every branch renders in the meaning its string claims, including nudge.enrol.today, which was previously unreachable in its intended meaning"
  - "forgetIdentity resets all four session flags it owns, and lands focus on the enrollment section heading when called from the withdrawn panel"
  - "nudgeShowFrame held at module scope and cancelled in hideNudge, so a bar asked to go down stays down"
  - "renderCountdown guards the six cached nodes it previously dereferenced unguarded"
  - "Table G's zero row re-anchored to intent, with the old anchoring written into the sheet as the seventh broken gate of the phase"
  - "A disposition ledger in deferred-items.md covering all nineteen review findings and both verification Info rows"
affects: [04-photos]

actuals:
  tokens: 5056
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "One question, one function, two callers: a fact described on two surfaces is read from a single predicate rather than tested independently at each site"
    - "Calendar arithmetic for calendar claims: a string that names a day is bucketed by date parts in a pinned zone, never by dividing milliseconds"
    - "A queued animation frame is held and cancelled exactly as a timer is, because both are continuations into a world that may have changed"

key-files:
  created: []
  modified:
    - "app.js"
    - "styles.css"
    - ".planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md"
    - ".planning/phases/03-enrollment-identity-and-the-group/deferred-items.md"

key-decisions:
  - "nudge.enrol.today was re-derived from the calendar rather than deleted. Deleting was smaller and wrong: with the close test added and the millisecond ladder kept, the real last day renders 'closes tomorrow', which is a second false statement printed on the day the pressure is supposed to peak."
  - "The day bucket is built from Intl date parts in Europe/Copenhagen, the zone formatDate already pins, with the old millisecond arithmetic kept only as a catch. The fallback can still yield negative zero and is harmless only because deadlinePassed() runs above every caller, which is said at the site."
  - "The close test sits above the bucketing in renderNudge and replaces the inline comparison in renderDeadline, so the two surfaces read one function rather than two equivalent expressions."
  - "forgetIdentity reads withdrawnShown before clearing anything, because the from-withdrawn case is the only one that needs a focus landing and clearing the flag is what makes it unreadable afterwards."
  - "The returning-panel case still moves focus nowhere. The existing comment's reasoning about the soft keyboard is correct there and was extended rather than replaced."
  - "nudgeShowFrame is compared against null rather than tested for truthiness, following the same reasoning 03-08 applied to both toast timers: a handle of 0 is falsy and would silently skip its own cancel."
  - "Table G's three surviving rows keep their Result cells as a historical record of what plan 03-06 performed, with a written caution that their recorded offsets were exercised against the deleted millisecond daysUntil. Rewriting them would erase the evidence; promoting them would be the same mistake this plan is closing."

patterns-established:
  - "A gate is proved to redden against the pre-change source before it is accepted as green, and the RED output is recorded"
  - "A gate whose result depends on the hour it is run at is a false-red waiting to happen, and is paired with a calendar-anchored equivalent"

requirements-completed: [ENR-05, NDG-04, NDG-06, NDG-07, NDG-08]

coverage:
  - id: D1
    description: "After registration closes the bar requests no copy key at all and is not shown, at minus one hour, minus twelve hours, minus 23.9 hours, minus twenty-five hours and minus five days"
    requirement: "NDG-07"
    verification:
      - kind: unit
        ref: "node -e gate D1 (deadlinePassed, calendarDaysUntil, renderDeadline, renderNudge sliced from app.js)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The hero deadline line is hidden exactly when the bar is silent and visible exactly when the bar asks, on all ten offsets tested"
    requirement: "NDG-04"
    verification:
      - kind: unit
        ref: "node -e gate D2 (renderDeadline and renderNudge run in the same process, same deadline)"
        status: pass
    human_judgment: false
  - id: D3
    description: "nudge.enrol.today at plus eight and plus two hours, nudge.enrol.last at plus thirty hours, nudge.enrol.soon at plus three and a half days, nudge.enrol.text at plus thirty days"
    requirement: "NDG-07"
    verification:
      - kind: unit
        ref: "node -e gate D3, plus a calendar-anchored supplement pinning the deadline to 23:59 local on a named date"
        status: pass
    human_judgment: false
  - id: D4
    description: "daysUntil no longer exists in app.js, and the hero line's urgency threshold and the bar's ladder read the same day function"
    requirement: "NDG-04"
    verification:
      - kind: unit
        ref: "node -e gate D4 (source scan plus the day count read out of the ladder's own function)"
        status: pass
    human_judgment: false
  - id: F1
    description: "All four session flags read false after forgetIdentity, the three that already worked included"
    requirement: "ENR-05"
    verification:
      - kind: unit
        ref: "node -e gate F1 (forgetIdentity sliced from app.js with all four flags true)"
        status: pass
    human_judgment: false
  - id: F2
    description: "Forgetting from the withdrawn panel focuses the section heading; forgetting from the returning panel focuses nothing at all"
    requirement: "ENR-05"
    verification:
      - kind: unit
        ref: "node -e gate F2 (both directions asserted, either alone satisfiable by breaking the other)"
        status: pass
    human_judgment: false
  - id: F3
    description: "A frame queued by showNudge and cancelled by hideNudge does not set the show attribute when the scheduler is drained"
    requirement: "NDG-08"
    verification:
      - kind: unit
        ref: "node -e gate F3 (showNudge and hideNudge sliced from app.js against a fake frame scheduler)"
        status: pass
    human_judgment: false
  - id: C1
    description: "group-cta appears zero times across styles.css, app.js and index.html"
    verification:
      - kind: unit
        ref: "node -e gate C1 (count across all three files, so it asserts deadness rather than deletion)"
        status: pass
    human_judgment: false
  - id: C2
    description: "The three 48px touch-target declarations are still present and unchanged, so the device-pass item was not quietly pulled forward"
    verification:
      - kind: unit
        ref: "node -e gate C2 (fails if the fix is applied, deliberately)"
        status: pass
    human_judgment: false
  - id: C3
    description: "All nineteen review finding identifiers have a recorded disposition in deferred-items.md"
    verification:
      - kind: unit
        ref: "node -e gate C3 (presence of a decision, not agreement with it)"
        status: pass
    human_judgment: false
  - id: G1
    description: "renderCountdown still renders with every cached node present, and returns quietly with any one of the six absent"
    verification:
      - kind: unit
        ref: "node -e (renderCountdown sliced from app.js, run seven times with one node nulled each time)"
        status: pass
    human_judgment: false
  - id: H1
    description: "UI-SPEC E8 long-text: Danish nudge copy wrapping to two lines changes the bar height and the --nudge-h re-measure keeps the reserve correct on a language switch"
    verification: []
    human_judgment: true
    rationale: "Backstop in the plan's own must_haves. A rendered wrap cannot be measured from source; measureNudge's three call sites are unchanged by this plan."
  - id: H2
    description: "UI-SPEC E8 overflow: with the bar shown at 320x568, 375x667, 390x844 and 430x932 the countdown, the address value and the video slot can each be scrolled clear of it"
    verification: []
    human_judgment: true
    rationale: "Highest-risk item in the phase, never rendered on any device, and unchanged by this plan. Table A of 03-DEVICE-PASS.md."
  - id: H3
    description: "The re-anchored Table G zero row observed on a device rather than at a desk"
    verification: []
    human_judgment: true
    rationale: "Its Result cell was deliberately cleared so it is re-run rather than inherited. The desk gates prove the branch; nothing here proves a pixel."

duration: 41 min
completed: 2026-08-15
status: complete
---

# Phase 3 Plan 9: One Clock, One Close Test, and the Seventh Broken Gate Summary

**The nudge bar and the hero deadline line now answer the same question through the same function, the day bucket counts calendar days in Europe/Copenhagen instead of dividing milliseconds, and Table G's zero row is re-anchored to the intent it was always supposed to assert, with the old anchoring written down rather than quietly corrected.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-08-15T12:52:00Z
- **Completed:** 2026-08-15T13:33:00Z
- **Tasks:** 3
- **Files modified:** 4 (2 source, 2 planning)

## Accomplishments

- **Gap 3 of `03-VERIFICATION.md` is closed.** `deadlinePassed()` is now the only test for whether registration is open, and it has two callers. `renderDeadline` calls it in place of its inline `Date.now() > deadlineMs`, and `renderNudge` calls it inside the not-enrolled branch **above any bucketing**. On 2026-09-27, against the configured deadline of 2026-09-26, the bar will be silent instead of telling every unregistered guest that registration closes today while the hero line beside it has already hidden itself for being past.
- **`daysUntil` is gone and `calendarDaysUntil` has taken both of its call sites.** The new function reads the year, month and day parts in `Europe/Copenhagen` through `Intl.DateTimeFormat.formatToParts`, the same zone `formatDate` already pins, and differences the two dates. `formatDate`'s shape is followed exactly: the zone is pinned through `Intl`, the whole thing is wrapped in a `try`, and the catch degrades to the old millisecond arithmetic on a platform that cannot answer the better question. The file now carries **one** day function with two readers, so the hero line's seven-day urgency threshold cannot drift from the bar's ladder.
- **`nudge.enrol.today` is reachable in the meaning it claims.** It was not before, and this is the corollary that was worse than the bug: under `Math.ceil((deadline - now) / 86400000)` no positive offset can produce zero, so the string only ever rendered *after* the day it names was over. Gate D3 now asserts it at plus eight hours and plus two hours, and a calendar-anchored supplement asserts it against a deadline pinned to 23:59 local on the current date. Deleting the key was the smaller fix offered by the verification report and was rejected: with the close test in place and the millisecond ladder kept, the actual last day renders "Registration closes tomorrow", which is a second false statement printed on the day the pressure is meant to peak. All 156 copy keys are untouched in all three tables.
- **Table G's zero row is re-anchored, and the old anchoring is on the record.** The row previously read `exactly 0` and was exercised with the deadline moved to **one hour in the past**, a deadline that has already closed. It recorded Pass because the shipped ladder really did render `nudge.enrol.today` there, for the worst possible reason. Its expectation had been read off the implementation rather than off intent. The sheet now says so in full, names it the **seventh instance** of the pattern `WINDOWS.md` entries 6, 7 and 9 record, and explains why the phase's 43-case mutation sweep could not have caught it: mutation testing proves a gate *can* fail, not that it is asserting the right thing.
- **WR-06 closed.** `forgetIdentity` reads `withdrawnShown` before it clears anything, then resets it alongside the three flags it already reset. The identity is gone, so there is no registration left to have withdrawn from; left true, `renderEnrollment` re-selected the withdrawn body and rebuilt the panel underneath the button the guest had just pressed. In that one case focus is now handed to the enrollment section heading, made programmatically focusable first, the same idiom `focusEnrolAction` and `focusAmendPending` already use. From the returning panel focus still moves nowhere, and the existing comment explaining why was extended rather than replaced: its reasoning about the soft keyboard is correct there, and is precisely why the withdrawn panel, which has no name field, needed a different answer.
- **WR-07 closed.** `nudgeShowFrame` is held at module scope beside `nudgeHideTimer`, cancelled before a new frame is requested, nulled inside the callback, and cancelled and nulled at the top of `hideNudge`. The comment names the reachable trace rather than the principle: `registerAgain()` re-renders, the bar is ready and not enrolled so a frame is queued, `focusNameField()` dispatches `focusin` synchronously and hides the bar, and the stale frame then slid it in over the keyboard that focus call had just raised, carrying a message pointed at the form the guest was already typing into.
- **IN-02 closed, proved dead rather than trusted.** `group-cta` was counted across `styles.css`, `app.js` and `index.html` before deletion: one occurrence, the rule itself. The rule is gone, its now-empty section header went with it, and the `app.js` comment that existed only to warn readers away from it was rewritten so the sentence no longer points at something that does not exist.
- **IN-07 closed.** `renderCountdown` guards `els.d`, `els.h`, `els.m`, `els.s`, `els.status` and `els.note` beside the root check it already had. No arithmetic and no state logic changed, and the function was exercised seven times with one node nulled each time to confirm it returns quietly rather than throwing.
- **Every one of the nineteen review findings now has a written disposition.** `deferred-items.md` gains a second section that opens by saying plainly that it is a decision record and not a backlog. Four items are declined with reasons (IN-01, IN-03, IN-06 and the `enrol.withdrawn.body` wording on the `gone` branch), the touch-target item is restated as still deferred by reference rather than duplication, twelve are recorded as fixed with the plan and task each landed in, and the four database findings owned by plan 03-07 are recorded as assigned and open rather than as closed.

## Task Commits

Each task was committed atomically:

1. **Task 1 (tracer): One close test, one day function, and a ladder whose every branch means what its string says** - `5da7e87` (fix)
2. **Task 2: Two things left behind after a render, in the region the bar lives in** - `14558ea` (fix)
3. **Task 3: The last two cheap fixes, and a written disposition for every finding this pass declines** - `eeb40b6` (chore)

## Files Created/Modified

- `app.js` - `deadlinePassed()` and `calendarDaysUntil()` added, `daysUntil` deleted, `renderDeadline` and `renderNudge` moved onto both, the ladder corrected with its history written above it, `forgetIdentity` (fourth flag plus a focus landing), `nudgeShowFrame` in `showNudge` and `hideNudge`, a node guard in `renderCountdown`, and the `renderWhatsApp` comment that pointed at the deleted CSS rule.
- `styles.css` - the dead `.group-cta` rule and its now-empty section header removed. The three `min-height: 48px` declarations are untouched and gate C2 fails if they are not.
- `.planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md` - Table G's zero row re-anchored, the `negative` row's expectation strengthened to "no copy key is requested at all", the condition column header renamed off the deleted function, and a note recording the broken gate. Tables A to F, the method paragraph, the Desk half and the Outcome table are untouched.
- `.planning/phases/03-enrollment-identity-and-the-group/deferred-items.md` - section 2, the disposition ledger. Section 1 is byte-identical.

**Not touched, as required by the parallel wave and by the plan:** `supabase/schema.sql`, `config.js`, `copy.js`, `index.html`, `COVERAGE.md`, `.planning/STATE.md`, `.planning/ROADMAP.md`. `enrollmentReady()` is unmodified per D-13. `git diff --name-only` against the wave base returns exactly the four files listed above and nothing else, and no commit in this plan deletes a tracked file.

## Verification Results

All twelve plan-level checks were run from the repository root against the final committed file.

| # | Check | Result |
|---|---|---|
| 1 | D1: no copy key requested and no bar shown at -1h, -12h, -23.9h, -25h and -5d | PASS |
| 2 | D2: the hero line is hidden exactly when the bar is silent, on all ten offsets | PASS |
| 3 | D3: `today` at +8h and +2h, `last` at +30h, `soon` at +3.5d, `text` at +30d | PASS |
| 4 | D4: `daysUntil` no longer exists; both surfaces read one day function | PASS |
| 5 | Table G's slice, `## Table G` to `## Desk half`, no longer contains `-1h` and records why the row was re-anchored | PASS |
| 6 | F1: all four session flags read false after `forgetIdentity` | PASS |
| 7 | F2: focus lands on the section heading from the withdrawn panel, and moves nowhere from the returning panel | PASS |
| 8 | F3: a frame queued by `showNudge` and cancelled by `hideNudge` sets no show attribute | PASS |
| 9 | C1: `group-cta` appears zero times across `styles.css`, `app.js` and `index.html` | PASS |
| 10 | C2: the three 48px declarations are still present | PASS |
| 11 | C3: all nineteen review finding identifiers appear in `deferred-items.md` | PASS |
| 12 | `node --check app.js`; zero forbidden constructs and debt markers in `app.js`; zero em or en dashes across all five guest-facing files; all three copy tables at 156 keys with identical key sets | PASS |

Two checks beyond the plan, both additive:

| Check | Result |
|---|---|
| Table G calendar-anchored supplement: deadline pinned to 23:59 local on today, tomorrow, +4d and +30d, plus yesterday for the closed case | PASS |
| `renderCountdown` renders with every node present and returns quietly with any one of the six absent | PASS |

**Every gate was proved to redden against the pre-change source before the fix landed.** `HEAD:app.js`, `HEAD:styles.css` and `HEAD:deferred-items.md` were exported to a scratch directory outside the repository and the identical assertion sets were run against them.

- **Task 1 RED** (the assertion set run against the pre-change `daysUntil` / `renderDeadline` / `renderNudge`): `D0 daysUntil still exists`; `D1 the bar still requested copy key nudge.enrol.today after registration closed` at -1h, -12h and -23.9h, with `the bar was shown` alongside each; `D3 at +8.0h expected nudge.enrol.today, the bar requested nudge.enrol.last`; the same at +2.0h; `D3 at +30.0h expected nudge.enrol.last, the bar requested nudge.enrol.soon`; `D4 reachability: got 1`. Eleven failures. The paired controls stayed green: -25h and -5d were already hidden, and D2 held on the closed offsets, which is the point of the pairing rather than a weakness in it. The contradiction D2 exists to catch is D1 and D2 together, and the RED output shows exactly that shape: the hero line correctly hidden while the bar was still asking.
- **Table G supplement RED:** eight failures against the pre-change source, including `the deadline falls on today's calendar date, expected nudge.enrol.today, the bar requested nudge.enrol.last` and `TG negative: the bar requested nudge.enrol.today on a deadline that closed yesterday`.
- **Task 2 RED:** `F1 forgetting from the withdrawn panel leaves withdrawnShown true`, `F2 forgetting from the withdrawn panel does not move focus`, `F3 a queued show frame ran after hide`. Three failures, with both paired controls green: the three flags that already worked stayed reset, and the from-returning case still moved focus nowhere.
- **Task 3 RED:** `C1` counted one `group-cta` reference in the pre-change `styles.css` against a required zero, and `C3` found **19 of 19** finding identifiers missing from the pre-change `deferred-items.md`. `C2`'s control read three 48px declarations before and after, which is what it is for.

No file was added to the repository by any gate. All scratch artifacts live outside the repository and `git status` is clean.

**03-08's work is intact.** Confirmed by source scan on the final file: `setWithdrawState` present, `AbortController` present, `stillMounted` present, and `renderSocialProof`'s `if (seq !== proofSeq) return;` guard present. `renderNudge`'s occurrence count in `app.js` is unchanged at 8 (one definition, seven call sites), `setInterval` is unchanged at 1 and `setTimeout` at 6, so nothing here introduced a timer, an interval or a frequency variable. NDG-07's escalation remains in the copy only.

## Decisions Made

- **Re-derive `nudge.enrol.today` rather than delete it.** The plan made this call and execution confirmed it against the code: with the close test added and the millisecond bucket kept, a deadline at 23:59 today read from 13:00 today gives fifteen hours, `Math.ceil` of which is 1, so the real last day would render "Registration closes tomorrow". Deleting the key trades one false statement for another and costs a key out of three tables besides.
- **`formatToParts` rather than a formatted string.** `en-CA` would have produced `YYYY-MM-DD` and a one-line parse, but that is a bet on a locale's output shape. `formatToParts` names the parts, so the function reads year, month and day by type and cannot be broken by a locale-data change.
- **`Math.round` on the day difference, not `Math.floor`.** Both operands are already midnight-anchored UTC day boundaries, so the quotient is a whole number in every case except a DST-shifted arithmetic edge, where rounding is the correct recovery and flooring would be off by one.
- **The millisecond fallback is kept and documented as a degradation.** It can still return negative zero, which is the exact defect this plan closes, and the comment says so and says why it is harmless: `deadlinePassed()` runs above every caller of the bucket.
- **Table G's surviving rows keep their Result cells.** Their recorded offsets were exercised against the deleted `daysUntil` and are no longer guaranteed to land in the buckets they landed in then. Rewriting them would erase the record of what was actually performed; leaving them without comment would let a reader take them as claims about current code. They are kept with a written caution, and this plan's own gates re-prove all four branches against the current file.
- **`nudgeShowFrame !== null` rather than a truthiness test**, following 03-08's reasoning about both toast timers. A frame handle of `0` is falsy and would silently skip its own cancel, which is the whole bug this fix exists to close.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's task 2 gate harness built a fake nudge bar with no `getAttribute`**

- **Found during:** Task 2, before any source change.
- **Issue:** The task 2 `<verify>` command builds `var bar={attrs:{},hidden:true,setAttribute:...,removeAttribute:...}` and then asserts `bar.getAttribute('data-show')!==null`. The object has no `getAttribute`, so the harness threw `TypeError: bar.getAttribute is not a function` before either F-gate result could be printed. The gate was unrunnable against **any** version of the code, pre-change or post-change, and its crash was indistinguishable from a real failure. Precisely the shape of 03-08's single deviation.
- **Fix:** Added `getAttribute:function(k){return k in bar.attrs?bar.attrs[k]:null}` to the fake bar, which is the identical idiom the plan's own task 1 harness already uses for its fake bar, so nothing was invented. The F1, F2 and F3 assertions, the fake scheduler and the show-then-hide sequence are byte-identical to the plan's. No shipped function was changed to accommodate the harness.
- **Files modified:** None. The change is to a `node -e` invocation, not to repository source.
- **Verification:** With the amendment the gate reddened on all three findings against the pre-change source and passes against the fix, which is exactly what the plan specifies for it.
- **Committed in:** n/a (gates add no file to the repository, by the plan's own contract)

### Additions beyond the plan, each additive and none weakening

**2. [Rule 2 - Missing critical verification] The plan's D3 gate is anchored to offsets from the run hour, which makes it a false red waiting to happen**

- **Found during:** Task 1, while checking the gate's assumptions before running it.
- **Issue:** D3 asserts `nudge.enrol.today` at now plus eight hours. Under a calendar bucket that is the same calendar day only when the gate is run before roughly 16:00 Copenhagen; run at 17:00 it buckets to 1 and the gate goes red against correct code. The same applies to the plus thirty hours row. This run happened at 13:06 Copenhagen, so the gate passed as written, and it was run as written and recorded above. But a gate that goes red on correct code depending on the hour is the mirror image of the mistake this whole plan exists to close, and shipping one without saying so would be the same failure in the other direction.
- **Fix:** The plan's gate was run **verbatim and unmodified**, and a supplementary gate was added beside it that pins the deadline to 23:59 local on a named calendar date, exactly as the re-anchored Table G row now describes. It is hour independent, it asserts the same intent, and it also covers the closed case with a deadline at 23:59 yesterday. It reddened eight times against the pre-change source.
- **Files modified:** None in the repository. The supplement is a scratch script run against the shipped file.
- **Committed in:** n/a

**3. [Rule 2 - Missing critical verification] `renderCountdown`'s new guard had no gate at all**

- **Found during:** Task 3.
- **Issue:** The plan's task 3 gate asserts C1, C2, C3, `node --check`, the house rules and copy parity, but nothing at all about the guard it asks for. A guard that returns early on a node that is present would break the countdown silently and pass every gate in the task.
- **Fix:** Added a gate that slices `renderCountdown` out of `app.js`, runs it once with every cached node present and asserts the day cell was written, then runs it six more times with one node nulled each time and asserts no throw.
- **Files modified:** None in the repository.
- **Committed in:** n/a

---

**Total deviations:** 1 auto-fixed blocking, 2 additive verification gaps closed.
**Impact on plan:** No scope creep and no weakening. The blocking deviation repairs a gate the plan could not have run as written; the two additions cover assertions the plan asks for in prose but does not gate. Every intent the plan states is asserted, and no shipped code was bent to satisfy a harness.

## TDD Gate Compliance

Task 2 carries `tdd="true"`. This project has no test runner and, by the plan's explicit contract, gates add no file to the repository, so there is no `test(...)` commit to make: the RED artifact is a `node -e` invocation, not a file.

RED was observed and recorded before the fix, against `HEAD:app.js` exported to a scratch directory outside the repository: `F1 flag reset`, `F2 focus landing` and `F3 stale frame` all failed, with both paired controls green. GREEN: `14558ea`.

Task 1 is the tracer, and its feedback gate was run before either expansion task began. Auto mode is active (`workflow.auto_advance: true`), so the gate was the end-to-end re-run the tracer contract specifies rather than a human checkpoint: the full D1 to D4 gate plus the Table G gate and `node --check` passed on the committed tracer, and the same assertion set was separately proved to redden eleven times on the pre-change source. Task 3 is not a TDD task; its C1 and C3 gates were nonetheless run against the pre-change artifacts first and both reddened.

## Issues Encountered

- The task 2 gate harness could not run as written. Documented in full under Deviations.
- Two intents the plan states in prose were not covered by any gate it wrote. Both are now gated. Documented under Deviations.
- No other issue. The fix-attempt limit was never approached; every gate passed on its first run after the corresponding edit.

## User Setup Required

None. No external service configuration, no schema change, no config value moved. Unlike plan 03-06's Table G method, this plan never wrote to `config.js`: the gate harness declares `deadlineMs` in the evaluated scope and hands it to the sliced functions directly, so there was no window in which a committed value was wrong and there is no restoration to assert.

## Next Phase Readiness

- **Gap 3 of `03-VERIFICATION.md` is closed**, which leaves gap 1 (CR-02, the `guest_id` disclosure) to plan 03-07, still open at a human checkpoint. Gap 2 was closed by plan 03-08.
- **Owed to the ledger, and deliberately not written by this plan.** `.planning/WINDOWS.md` entry 9 should gain the **seventh instance** of the broken-gate pattern that this plan found and recorded. It was not appended here because `WINDOWS.md` is a shared cross-phase file and plan 03-07 is executing in the same wave; a write from two worktrees is a merge conflict at best. The instance is written in full into `03-DEVICE-PASS.md` under Table G, which is where a reader of that gate will find it. **The orchestrator or the phase verifier should carry it into `WINDOWS.md` after the wave merges.**
- **Still owed after this plan:** the whole of `03-DEVICE-PASS.md` Tables A to F, and NDG-02 above all. The nudge bar has never rendered on any device in the life of this site, and this plan changed what the bar says without observing it say anything. Table G's re-anchored zero row is a desk record with a cleared Result cell and is waiting to be re-run. WINDOWS entries 1, 2, 4, 8, 9, 10 and 11 stay open.
- **No new stub and no skipped test** was introduced by this plan. Every `<verify>` in the plan was run, and two more were added.

## Self-Check: PASSED

- All four modified files exist on disk and are the only files changed against the wave base `3af1985`: `git diff --name-only` returns `app.js`, `styles.css`, `03-DEVICE-PASS.md` and `deferred-items.md`, nothing else.
- All three task commits present: `5da7e87`, `14558ea`, `eeb40b6`.
- `git diff --diff-filter=D` against the wave base returns nothing: no commit in this plan deletes a tracked file.
- Working tree clean, no untracked files.
- `supabase/schema.sql`, `config.js`, `copy.js`, `index.html`, `COVERAGE.md`, `STATE.md` and `ROADMAP.md` untouched, as required for the parallel wave.
- 03-08's changes verified intact on the final file: `setWithdrawState`, `stillMounted`, `AbortController` and `renderSocialProof`'s generation guard all present.

---
*Phase: 03-enrollment-identity-and-the-group*
*Completed: 2026-08-15*
