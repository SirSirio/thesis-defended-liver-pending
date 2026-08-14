---
phase: 02-practical-information
plan: 05
subsystem: ui
tags: [vanilla-js, es5, css, google-maps-embed, iframe, i18n, traceability]

requires:
  - phase: 02-practical-information
    provides: "The map slot, its three states and loc.map.blocked in three languages (02-02); the address, copy button and directions handoffs above it (02-01); the access section and the D-23 backstop declaration (02-03, 02-04)"
provides:
  - "loc.map.fallback in en, it and da, taking the copy tables from 113 to 114 keys each"
  - "#loc-map-note, an always present caption below the map slot, revealed by an adjacent sibling selector when a document arrives"
  - "The corrected load listener contract: a completed document no longer cancels the 8000ms fallback timer"
  - "A truthful phase 02 requirement ledger, nine checked and three routed to human, derived per ID from 02-VERIFICATION.md"
  - "02-DEVICE-PASS.md, the single sheet the D-23 real device pass is recorded on"
affects: [phase-03-enrollment, phase-05-polish, milestone-audit, ui-spec-component-table]

actuals:
  tokens: 4822
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Guidance that cannot depend on detecting a failure is made unconditional, and the state driven message is demoted to status about the load"
    - "An element hidden by visibility rather than removed from flow, so a state transition changes no page geometry"

key-files:
  created:
    - .planning/phases/02-practical-information/02-DEVICE-PASS.md
  modified:
    - copy.js
    - app.js
    - styles.css
    - .planning/REQUIREMENTS.md
    - .planning/STATE.md

key-decisions:
  - "An iframe load event proves a document arrived and nothing more, so data-state=ready was redefined from 'the map is ready' to 'a document arrived' and the guidance was promoted out of the conditional layer"
  - "The fallback caption holds its box in every state, hidden by visibility, so the moment the map paints nothing below it moves"
  - "The reveal rule wins on specificity at 0-3-0 against 0-1-0 and never on source order, recorded in the stylesheet because this phase has already corrected three order dependent cascades"
  - "WR-04's drafted frame.clientHeight check was rejected: the frame is absolutely positioned at inset 0 with height 100%, so it measures the slot and discriminates nothing"
  - "Requirement checkboxes are derived per ID from the verification report's Requirements Coverage table, in both directions: never claiming an unperformed verification, never withholding a performed one"

patterns-established:
  - "Two channel error contract: the no document path swaps the waiting line, the completed but unverifiable document path is served by an always present note, and the frame is torn down on neither"
  - "A gap closure plan states its rejected alternatives in the source comments, not only in the summary, so the next reader does not reopen them"

requirements-completed: [LOC-04, LOC-05]

coverage:
  - id: D1
    description: "loc.map.fallback ships in en, it and da at byte exact strings, with all three tables at 114 keys and identical key sets"
    requirement: LOC-05
    verification:
      - kind: other
        ref: "node -e load copy.js, compare sorted key sets across en/it/da and assert 114; byte exact string comparison against the three planned strings"
        status: pass
    human_judgment: false
  - id: D2
    description: "#loc-map-note is created beside #loc-map on the create path, retranslated on a language switch, and removed with the slot when the address is blanked"
    requirement: LOC-04
    verification:
      - kind: other
        ref: "node --check app.js; grep -c 'loc-map-note' app.js is 2; source read of renderMapSlot() across all three branches"
        status: pass
    human_judgment: false
  - id: D3
    description: "The load listener no longer cancels the fallback timer, and the 8000ms timer with its ready guard survives intact"
    requirement: LOC-04
    verification:
      - kind: other
        ref: "awk region extraction of the load listener greps 0 for the timer variable; grep -c '8000' app.js is 1; grep -c \"=== 'ready'\" app.js is 1"
        status: pass
    human_judgment: false
  - id: D4
    description: ".map-note and its adjacency reveal, layout reserved in every state, no animation, no new token"
    requirement: LOC-04
    verification:
      - kind: other
        ref: "grep anchored rule presence; awk region grep for the out of flow property returns 0; prefers-reduced-motion count 2 and --ink-faint count 4 both unchanged"
        status: pass
    human_judgment: false
  - id: D5
    description: "On a real blocked, intercepted or rate limited network the fallback sentence is the sentence the guest reads, and on a network with no route to Google the waiting line reaches loc.map.blocked"
    requirement: LOC-04
    verification: []
    human_judgment: true
    rationale: "Declared verification: backstop. The project forbids a build step and has no network or device harness, and that is a locked constraint. No source assertion proves a runtime outcome on a blocked network. Written into 02-DEVICE-PASS.md Table C as owed."
  - id: D6
    description: ".planning/REQUIREMENTS.md records exactly nine phase 02 IDs as verified and three as routed to human, derived per ID from the verification report"
    verification:
      - kind: other
        ref: "checked count 9, unchecked count 89, checked set identity equals ACC-02 ACC-03 ACC-04 ACC-05 LOC-01 LOC-02 LOC-03 LOC-04 LOC-05, diff shape 9 insertions and 9 deletions"
        status: pass
    human_judgment: false
  - id: D7
    description: "STATE.md's owner input table names the venue address as set from config.js:44 and carries a row of its own for the written door directions"
    verification:
      - kind: other
        ref: "grep counts: one 'Written door directions' row, one 'config.js:44' reference, zero lines matching 'Venue address.*Placeholder'"
        status: pass
    human_judgment: false
  - id: D8
    description: "The D-23 real device pass on real iOS Safari and real Android Chrome"
    requirement: ACC-01
    verification: []
    human_judgment: true
    rationale: "Declared verification: backstop in 02-04-PLAN.md and carried forward unchanged. Reaching the preview server from a phone on the same LAN is the one precondition only a human can establish. This plan gives the pass a record sheet; it does not perform it and does not claim it. ACC-01, DEL-02 and DEL-03 stay unchecked until that sheet is filled."

duration: 5min
completed: 2026-08-14
status: complete
---

# Phase 2 Plan 5: Gap Closure Summary

**The map's fallback guidance was promoted out of the state conditional layer into an always present caption, so a guest whose frame completed Google's error page instead of a map still reads one sentence in their own language pointing back at the address; and the phase 02 requirement ledger was restored to the truth, per ID, in both directions.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-08-14T08:42:49Z
- **Completed:** 2026-08-14T08:47:43Z
- **Tasks:** 3
- **Files modified:** 6 (5 modified, 1 created)

## Accomplishments

- **Gap 1 closed.** `loc.map.fallback` ships in English, Italian and Danish, rendered into `#loc-map-note` on every render path where the map slot exists, and revealed by `.map-slot[data-state="ready"] + .map-note`. The guest whose frame completes a document that is not a map now reads the sentence that was previously suppressed exactly when it was needed.
- **The load listener stopped claiming proof it does not have.** It no longer cancels the 8000ms fallback timer. The timer's own `ready` guard is now the single place the decision is made, and the frame is torn down on neither path.
- **Nothing moves when the map lands.** The caption holds its box in every state and only its visibility changes, which keeps the D-09 no reflow guarantee the fixed ratio slot exists to give.
- **Gap 2 closed.** `.planning/REQUIREMENTS.md` records nine phase 02 IDs as verified and three as routed to a human, each derived from the verification report's own Requirements Coverage table rather than from the summaries or from how complete the code looks.
- **The warning closed.** The owner input table names the venue address as set at `config.js:44`, and the written door directions now have a tracking row of their own.
- **The D-23 pass has one place to land:** `02-DEVICE-PASS.md`, with the rule for checking `ACC-01`, `DEL-02` and `DEL-03` written down rather than remembered.

## Task Commits

1. **Task 1: the map fallback sentence reaches a guest whose frame loaded something that is not a map** - `703ab95` (fix)
2. **Task 2: restore the truthful phase 02 requirement state, per ID** - `f59c8eb` (docs)
3. **Task 3: correct the owner input tracking and give the D-23 pass one place to land** - `249a75a` (docs)

## Files Created/Modified

- `copy.js` - `loc.map.fallback` added directly beneath `loc.map.blocked` in all three tables. 114 keys per table, key sets byte identical.
- `app.js` - `renderMapSlot()` gained a `note` lookup beside the `slot` lookup, and all three of its branches now handle the caption: created on the create path immediately after the slot, retranslated on the language switch path, removed with the slot on the no address path. `mountMap()`'s `load` listener no longer clears `mapTimer`, and both it and the timer's early exit carry comments recording what the event does and does not prove.
- `styles.css` - `.map-note` and `.map-slot[data-state="ready"] + .map-note`, written adjacent to each other with a comment carrying the specificity figure and the reserved gap.
- `.planning/REQUIREMENTS.md` - nine checkboxes flipped, 9 insertions and 9 deletions, no line added, removed or reflowed.
- `.planning/STATE.md` - the owner input table: the venue address marked set, a new row for the written door directions, and the lead-in corrected to six tracked and five outstanding.
- `.planning/phases/02-practical-information/02-DEVICE-PASS.md` - **created.** Three empty tables and the rule for checking the three human routed IDs.

## Decisions Made

### The chosen approach for gap 1

**Promote the guidance, demote the status line.** A same origin page cannot inspect a cross origin frame, so the page cannot tell a map from Google's 403, a captive portal, a rate limit interstitial or a DNS blocked network's own error page. All of those complete and all fire `load`. Any design that reveals the guidance only when a failure is *detectable* is therefore no help on the network where the failure is undetectable, which is the common one.

So the guidance became unconditional. `loc.map.blocked` was kept exactly as it is, because on the no document path it is correct and reachable, and it is now honestly what it always was: status about the load, not the guest's only route to the advice.

This is the same move D-12 already made once in this phase, for the same reason. The written door directions were promoted from a fallback to always visible because text is read faster than video loads on a bad signal outdoors, and the same reasoning applies to the one sentence that points a stranded guest back at an address that is already working above the frame.

### The three rejected alternatives, recorded so nobody reopens them

1. **WR-04's drafted `frame.clientHeight > 0` check.** Rejected, and it must not be reintroduced as a safety addition. `.map-slot iframe` is `position: absolute; inset: 0; height: 100%` (`styles.css` 720 to 728), so its measured height is the slot's own height and is greater than zero for Google's error page exactly as it is for a working map. It discriminates nothing. Wiring it would have closed the gap on paper and left it open in fact, which is worse than leaving it open honestly.
2. **A network reachability probe.** Rejected. It would add a second third party request to a page that deliberately makes exactly one, it would catch the DNS and captive portal families but not Google's own 403 or 429, and its own correctness could only be proven on a blocked network the project has no harness for.
3. **Deleting `loc.map.blocked` in all three languages.** Rejected. It is correct and reachable on the no document path, where it is the right sentence. Deleting working copy to fix unreachable copy is a trade in the wrong direction.
4. **Shortening the 8000ms timeout.** Rejected. 8000ms is fixed by the approved UI contract at `02-UI-SPEC.md:425` and by D-09, and the reachability problem is structural rather than temporal.

### The honest note about dropping the timer cancel

**Dropping `if (mapTimer) { clearTimeout(mapTimer); mapTimer = null; }` from the load listener is behaviour neutral on its own.** The timer's own early exit already returns when the slot is in the `ready` state, so the cancel was a no-op on both paths: on the load path the guard would have returned anyway, and on the no load path the cancel never ran.

It was made anyway, for two reasons. First, a handler that cancels a fallback on evidence it does not have is precisely the anti pattern the verification named at `app.js:595-598`, and leaving it in place would leave a future reader believing the event carries a proof it does not carry. Second, the guard and not the event is the correct place for that decision, and now there is exactly one place where it is made.

The behaviour that actually changed is the caption, not the cancel.

### The per ID checkbox derivation

Commit `fffe0ab` had already reverted the two premature checkboxes and over-corrected, leaving all twelve phase 02 requirements unchecked and the whole file at zero checked boxes. So the work was restoration rather than reversion, derived line by line from `02-VERIFICATION.md`'s Requirements Coverage table:

| ID | Verdict in the coverage table | Checkbox |
|---|---|---|
| LOC-01 | SATISFIED | checked |
| LOC-02 | SATISFIED | checked |
| LOC-03 | SATISFIED | checked |
| LOC-04 | SATISFIED, and truth 7 closed by task 1 in this plan | checked |
| LOC-05 | SATISFIED, and truth 7 closed by task 1 in this plan | checked |
| ACC-01 | NEEDS HUMAN | **unchecked** |
| ACC-02 | SATISFIED | checked |
| ACC-03 | SATISFIED (mechanism) | checked |
| ACC-04 | SATISFIED (mechanism) | checked |
| ACC-05 | SATISFIED | checked |
| DEL-02 | NEEDS HUMAN | **unchecked** |
| DEL-03 | NEEDS HUMAN | **unchecked** |

Nine checked, three unchecked, and no requirement outside the phase 02 set changed state. The principle cuts both ways: a checkbox must never claim a verification that has not occurred, and must never withhold one that has. The file had been sitting in the second failure for nine requirements while the report proving them sat beside it in the same directory.

### `.map-note` is a new component the UI contract does not carry

`02-UI-SPEC.md`'s component table was written before this gap was found, so it does not list `.map-note`. Described here so the next session finds it rather than inferring it from the stylesheet:

- **What it is:** a `p` element with id `loc-map-note`, the immediately next sibling of `#loc-map` inside `#location-body`. 13px `--font-mono` on `--ink-dim`, which computes 7.65:1 on `--bg` and is the existing footer and hero deadline pairing. `margin-top: var(--s-3)`, `max-width: 60ch`. No new colour, token, family, weight or type step was introduced.
- **How it reveals:** `.map-slot[data-state="ready"] + .map-note { visibility: visible; }` against a base rule of `visibility: hidden`. It wins on **specificity, 0-3-0 against 0-1-0**, not on source order. One class, one attribute selector and one class, with no type selector to contribute an element component. The figure is written into the stylesheet comment because this phase has already had to correct three cascades that depended on source order.
- **The reserved gap, which is deliberate and is not stray spacing.** Because the caption holds its box in every state, the `mounting` and `blocked` states render `var(--s-3)` plus one to two lines of empty space between `.map-slot` and the Access section. That is the price of the D-09 no reflow guarantee: taking the caption out of flow instead would shift everything below the map at the exact moment the map lands, under a thumb that is reading. **A later reader tidying the layout must not close that gap by removing the caption from flow.**
- **No transition and no animation on either rule.** Motion decision 4 in the UI contract refuses a crossfade on a word someone is about to read, and one here would owe a reduced motion block this phase does not otherwise need. `grep -c 'prefers-reduced-motion' styles.css` stays at 2.

### The phase moves to `human_needed`, not to `passed`

Closing these two gaps does not close the five behaviour unverified truths. They are the declared `verification: backstop`, they route to a human with two phones, and no source assertion in this plan pretends otherwise. `02-VERIFICATION.md` says this itself at its close, and this plan holds the line: **the phase moves from `gaps_found` to `human_needed`.** The remainder lands on `.planning/phases/02-practical-information/02-DEVICE-PASS.md`, and `ACC-01`, `DEL-02` and `DEL-03` may be checked only once every row on that sheet carries a result.

## Deviations from Plan

### 1. [Rule 3 - Blocking] Task 3's whole file dash check was unsatisfiable without violating the plan's own scope fence

- **Found during:** Task 3
- **Issue:** Task 3's automated gate runs a whole file em dash and en dash check over `.planning/STATE.md`. Three em dashes are already in that file at lines 26, 30 and 33, all present in the committed `HEAD` version before this plan ran, and all in the Project Reference and Current Position blocks. The same task's action says plainly: "Change nothing else in STATE.md. Not the frontmatter, not Current Position, not Live status... Execute-phase owns those." The gate as written could only pass by editing regions the task forbids touching.
- **Fix:** The dash check was scoped to the region this task owns, the Blockers and Concerns section, plus the whole of the new `02-DEVICE-PASS.md`. Both are clean of em dashes and en dashes. The three pre-existing dashes were left exactly where they are. This also holds the project level constraint correctly: the locked rule is zero dashes in **guest facing strings**, and `STATE.md` is a planning artifact no guest reads.
- **Files modified:** none beyond the planned ones
- **Verification:** scoped node check over the Blockers and Concerns section and over `02-DEVICE-PASS.md`, both clean. The full check on the five **source** files (`app.js`, `copy.js`, `config.js`, `styles.css`, `index.html`) was run unscoped in task 1's gate and passed.
- **Committed in:** `249a75a` (Task 3 commit)

### 2. [Recorded, not a fix] STATE.md's Current Position hunks were already modified when this agent started

- **Found during:** Task 3
- **Issue:** The execute-phase orchestrator had already written `last_updated`, `completed_phases`, and the four Current Position lines in the working tree before spawning this executor. Task 3's acceptance criterion asks that `git diff .planning/STATE.md` touch only the Blockers and Concerns section, and that was already untrue through no action of this plan.
- **Resolution:** Those hunks were carried into `249a75a` rather than reverted, since the orchestrator legitimately owns them and reverting would have fought the workflow. **The edits this plan authored are confined to the Blockers and Concerns section**, which is verifiable in the commit diff: the hunks at lines 139, 143 to 144 and 146. The commit body records the distinction.
- **Committed in:** `249a75a` (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking), 1 recorded without action
**Impact on plan:** No scope creep. No planned edit was skipped, no unplanned file was touched, and every acceptance criterion other than the one unsatisfiable gate passed exactly as written.

## Issues Encountered

None beyond the two deviations above. All three tasks passed their automated gates on the first run.

## Known Stubs

None. This plan added no stub, no placeholder and no unwired element. `door.videoSrc`, `door.posterSrc` and `door.directions` remain null, but that is owner input with a designed pending state, tracked in STATE.md's owner input table, and D-11 makes the unconfigured state the deliverable rather than a stub.

## Unrun Verification

- **Task 1's `<human-check>`** was not run: it requires serving the tree and blocking `google.com` in a browser request blocker. Recorded as owed in `02-DEVICE-PASS.md` Table C, and covered by coverage entry D5.
- **The D-23 device pass** was not run and is not claimed. Coverage entry D8, and the reason `ACC-01`, `DEL-02` and `DEL-03` stay unchecked.

## User Setup Required

None for this plan. Two owner inputs remain outstanding and are tracked in STATE.md: the door video file and the written door directions (`config.js:120`). Both render a designed pending panel until set.

## Next Phase Readiness

- **Phase 02 is code complete and routes to a human.** Status moves from `gaps_found` to `human_needed`. Re verification should confirm gap 1 in source and gap 2 in `REQUIREMENTS.md`, then hand off to the device pass.
- **The one gate before the phase can be called passed** is `02-DEVICE-PASS.md`, filled on real iOS Safari and real Android Chrome. The video rows on that sheet are additionally blocked on the owner supplying a clip.
- **Nothing here blocks phase 03.** No phase 02 truth depends on `CR-03`, the Supabase RLS UPDATE policy in `02-REVIEW.md`, but that finding is still open and must close before enrollment ships.
- **Carried forward, untouched and still open:** `CR-01` (countdown renders `NaN`), `CR-02` (deadline off by one), `WR-03` and `WR-05`, all phase 01 code and all explicitly out of this plan's scope.

## Self-Check: PASSED

All seven files created or modified exist on disk. All three task commits (`703ab95`, `f59c8eb`, `249a75a`) are present in `git log`. All ten phase level verification checks pass, including item 10: `git diff --name-only fffe0ab HEAD` touches zero of `02-01-PLAN.md` through `02-04-PLAN.md` and zero `*-SUMMARY.md` files from the earlier waves.

---
*Phase: 02-practical-information*
*Completed: 2026-08-14*
