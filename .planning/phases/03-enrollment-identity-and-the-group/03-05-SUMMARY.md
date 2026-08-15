---
phase: 03-enrollment-identity-and-the-group
plan: 05
subsystem: ui
tags: [postgrest, supabase, rpc, vanilla-js, css, i18n, a11y, focus-management, destructive-confirmation]

requires:
  - phase: 03-enrollment-identity-and-the-group
    plan: 01
    provides: "identity.get/save/clear, sbRequest() with its resolves-never-rejects contract and unconditional abort, amendEnrollment(), submitEnrollment() with its 409 conflict branch, buildForm(mode) already accepting a mode and writing data-mode, setFormState(), the .sweep bar, buildRecord(), buildSuccessPanel(), buildReturnPanel(), panelHeading(), renderEnrollment()'s branch chain and refreshEnrollmentState()"
  - phase: 03-enrollment-identity-and-the-group
    plan: 02
    provides: "the nudge bar's readiness gate reading the form's existence, and the delegated wiring shape in wireEnrollment()"
  - phase: 03-enrollment-identity-and-the-group
    plan: 03
    provides: "the withdrawn column, the attendees view re-created with a withdrawn = false filter, and public.amend_enrollment(uuid, text, smallint, text, text, boolean) returning an integer row count"
  - phase: 03-enrollment-identity-and-the-group
    plan: 04
    provides: "whatsappButton() owning the joined-flag write at the success panel's group position, and renderSocialProof() inside refreshEnrollmentState()"
provides:
  - "withdrawEnrollment(ident): the guest id and the withdrawn flag only, classifying ok / gone / pending / failed from the returned integer and the error code"
  - "saveAmendment(fields, ident): the edit controller, falling back to the insert when the amend function touches zero rows"
  - "buildWithdrawnPanel(): the session-only withdrawn body, containing no form"
  - "buildWithdrawConfirm(): the inline two-step confirmation with its in-flight state and its Escape binding"
  - "panelButton(), panelRow(), amendPendingLine(): the shared control, row and in-place-replacement primitives every panel now uses"
  - "enrolRow() / withdrawBox() / enrolAction(): closest-with-manual-fallback lookups for the delegated click listener"
  - "focusPanelHeading(id), focusNameField(), focusEnrolAction(action), focusAmendPending(scope): focus is handed somewhere deliberate on every path that destroys the control the guest pressed"
  - ".subtle-action, .panel__row, .panel__acts, .panel__edit, .panel__again, .panel__confirm, .withdraw-confirm and button.inline-link in CSS"
  - "the phase's final 14 copy keys, taking every table from 142 to 156 at identical key sets"
affects: [03-06-cleanup-and-device-pass, 04-photos, 05-degradation-arc]

# Actuals (#2632) - same estimateTokens scale as the plan's estimate (chars/4 over the realized diff).
actuals:
  tokens: 13824
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "A destructive confirmation is inline, two step and in place: it takes over the row of the control that summoned it and moves nothing else on the panel"
    - "An in-flight state is borrowed from the component that already has one rather than invented a second time; no new component and no new copy key"
    - "Every control lives in a row of its own, so an in-place replacement has a container it can empty without disturbing its neighbours"
    - "Three outcomes are read from a returned integer and an error code, never from a status code, on a project where a blocked read answers [] and a blocked delete answers 204"
    - "A state is prevented structurally by what a builder does not contain, rather than by a special case a later reader could delete as dead code"
    - "Every path that destroys the control the guest just pressed hands focus somewhere deliberate"

key-files:
  created: []
  modified:
    - "app.js"
    - "styles.css"
    - "copy.js"

key-decisions:
  - "A network failure on an edit keeps the form standing with every typed value intact and the retry label on the button, rather than taking the plan's amend-pending line. The pending line is for a thing that cannot work yet; the failure banner is for a thing that did not work this time, and it exists precisely to hold a guest's typed work through one bad moment of mobile data. Withdrawal takes the pending line on both, as the plan specifies, because a confirmation carries no typed state to lose."
  - "identity.clear() now removes the enrolled flag rather than setting it to the string 0. A flag left at 0 is a record that this device was once used to register, which is exactly the fact a guest handing their phone away asked to have removed. Every reader compares against the string 1, so absent reads as not enrolled everywhere."
  - "The amend-pending line carries no id. Two of them can stand at once, on the row the edit control vacated and on the row the leaving control vacated, and a shared id across two live nodes is invalid and would misdirect both focus calls. Focus is scoped to the row instead."
  - "The change-these-details affordance and the understated controls are buttons wearing the link classes rather than anchors. They act rather than navigate, and an anchor with no href is not keyboard reachable and announces as plain text. Only the browser's button chrome is reset; every visual property is the inherited class untouched."
  - "The confirm control carries no data-i18n, for the same reason the submit button carries none: its label depends on the block's state, and the language sweep would put 'Confirm withdrawal' back on a control that is mid request."
  - "The pending line and the two focusable panel headings take focus programmatically, so no path that removes the control the guest pressed drops focus to the document body."
  - "Entering and leaving edit mode deliberately rebuild the form rather than reconcile it. The mode is baked into the element, so a reconciled form would come back carrying the mode it was born with, prefilled from the wrong side of the change."

patterns-established:
  - "A gate whose failure condition includes a file-wide fallback cannot fail once the token exists anywhere in the file; re-anchor it to the unit under test before trusting a pass"
  - "A wire contract can be verified without residue by sending the exact argument list against an id that matches no row: a misspelled parameter resolves to no function at all and answers 404, while a correct one answers 200 with a row count of 0"
  - "Where a plan's literal text would discard a guest's typed work on a transient failure, the failure state that exists to preserve it wins, and the split is recorded"

requirements-completed: [ENR-05, ENR-06, ENR-10, ID-04, ID-05, DSG-05, DSG-06, LNG-06]

coverage:
  - id: D1
    description: "Editing and registering are one screen: tapping edit re-mounts the same form prefilled from storage with data-mode edit, the Save changes label, and a discard control that sends nothing. Changing a name and changing a registration are the same act, so no separate change-your-name control exists anywhere on the site"
    requirement: "ID-04"
    verification:
      - kind: automated_ui
        ref: "EDIT_GATE_PASS: data-mode present, enrol.update / enrol.cancel present, node --check, the ES5 and markup-assignment gates at 0"
        status: pass
    human_judgment: false
  - id: D2
    description: "The edit path calls the amend function and branches on the returned row count and the error code, never on a status code: 1 saves to storage and routes back to the returning view with the toast, 0 falls back to the insert so a device whose storage and database have diverged experiences one success rather than a dead end, and PGRST202 replaces the tapped control's row with the amend-pending line and leaves the registration standing"
    requirement: "ENR-06"
    verification:
      - kind: automated_ui
        ref: "EDIT_GATE_PASS: rpc/amend_enrollment present, 'PATCH' count 0, 'DELETE' count 0, enrol.amend.pending present"
        status: pass
      - kind: e2e
        ref: "POST /rest/v1/rpc/amend_enrollment {p_guest_id: <uuid matching no row>} against project aplaxdplwnnlezffatal returns HTTP 200 with body 0, not 404 PGRST202: the migration is applied and the zero-row contract is the live behaviour"
        status: pass
    human_judgment: false
  - id: D3
    description: "The success panel gains the change-these-details link as its last item and still carries no leaving control, asserted by inspecting the builder body rather than the file. The success panel and the returning view stay two builders sharing one receipt, so no flag can put a withdraw button at the instant of celebration"
    requirement: "DSG-05"
    verification:
      - kind: automated_ui
        ref: "EDIT_GATE_PASS: builder-body slice contains enrol.success.amend and does not contain enrol.withdraw"
        status: pass
    human_judgment: false
  - id: D4
    description: "Withdrawal has a defined state between the tap and the answer: the confirm control disables, its label swaps to the form's existing submitting label, aria-busy goes on, and the same 2px sweep bar pins to the top of the confirmation block, under the same unconditional 12s abort every other write in the phase carries"
    requirement: "ENR-10"
    verification:
      - kind: automated_ui
        ref: "WITHDRAW_GATE_PASS: enrol.submitting and sweep both present in the file; setWithdrawState writes data-state, disables every button in the block and swaps the label"
        status: pass
    human_judgment: false
  - id: D5
    description: "Withdrawal has a defined state for every way it can fail. withdrawEnrollment classifies four outcomes from the returned integer and the error code: 1 is a real withdrawal, 0 means the database holds no registration under this guest id so the device is corrected the same way, PGRST202 and a dead wire both replace the confirmation in place with the amend-pending line and leave the registration standing. No path mounts the withdrawn body without having written the flag first"
    requirement: "ENR-06"
    verification:
      - kind: automated_ui
        ref: "WITHDRAW_GATE_PASS plus a re-anchored check: PGRST202 and the zero-row branch are both inside withdrawEnrollment's own body, not merely somewhere in the file; \"'enrolled', '0'\" present; 'PATCH' and 'DELETE' counts 0"
        status: pass
      - kind: e2e
        ref: "POST /rest/v1/rpc/amend_enrollment {p_guest_id: <uuid matching no row>, p_withdrawn: true} returns HTTP 200 with body 0: the exact argument list withdrawEnrollment sends resolves to the live function. A misspelled parameter would resolve to no function and answer 404 PGRST202 forever. Zero rows touched, zero residue"
        status: pass
    human_judgment: false
  - id: D6
    description: "The withdrawn body exists as its own session-only state, carrying a heading, the consequence, a register-again control and the forget control, and containing no registration form. The bar's readiness gate therefore finds nothing to point at and stays down, prevented by the shape of the body rather than by a special case"
    requirement: "ENR-05"
    verification:
      - kind: automated_ui
        ref: "WITHDRAW_GATE_PASS: builder-body slice contains enrol.withdrawn.again and enrol.identity.clear and does not contain the form's id"
        status: pass
    human_judgment: false
  - id: D7
    description: "The confirmation is inline, two step and in place. No native confirm dialog and no dialog element is constructed anywhere, Escape reverts it, and no timer exists on it"
    requirement: "DSG-05"
    verification:
      - kind: automated_ui
        ref: "WITHDRAW_GATE_PASS: window.confirm count 0, bare native confirm-call regex count 0, dialog-element construction count 0, Escape present; no setTimeout exists on the confirmation path"
        status: pass
    human_judgment: false
  - id: D8
    description: "Withdrawing clears the registration and not the identity: the flag goes to the string 0 while the guest id, name, guest count and note stay, because phase 4 attributes photos to them. Forgetting removes all five keys from storage and from the in-memory map behind it, so a subsequent load renders the empty form with no residue"
    requirement: "ID-05"
    verification:
      - kind: automated_ui
        ref: "EDIT_GATE_PASS: store.remove count 6 (>= 5); identity.clear removes guest_id, name, extra_guests, note and enrolled; doWithdraw writes only the flag"
        status: pass
    human_judgment: false
  - id: D9
    description: "copy.js closes the phase at 156 keys per table with identical key sets across en, it and da, which is the full 42-key budget the copy contract specifies, with zero em dashes and zero en dashes across the five source files"
    requirement: "LNG-06"
    verification:
      - kind: automated_ui
        ref: "WITHDRAW_GATE_PASS: node parity harness (copy parity OK 156x3) with an explicit presence check on all six task-2 keys in all three tables, plus the codepoint scan"
        status: pass
    human_judgment: false
  - id: D10
    description: "The understated controls are dim ink and underlined rather than the accent link treatment, sit 44px apart with a full spacing step between them, and the confirm control is the only ghost control on the page whose border and label are red at rest and the only one deliberately not full width at 480px"
    requirement: "DSG-06"
    verification: []
    human_judgment: true
    rationale: "Whether a control reads as reachable-without-inviting rather than as a broken link, and whether a red-outlined confirmation reads as deliberate rather than alarming, are visual judgments no source check on this project can make. The tokens and the geometry are asserted; the reading is not."
  - id: D11
    description: "An amendment and a withdrawal actually reach the database, and the head count on the site moves by that guest plus their plus-ones"
    verification:
      - kind: e2e
        ref: "GET /rest/v1/attendees?select=first_name,extra_guests returns the four live non-withdrawn rows; schema.sql section 7 re-creates the view with where withdrawn = false, so a flagged row leaves the projection and the count"
        status: pass
    human_judgment: true
    rationale: "The wire contract and the view filter are both proven, but that a real registration made from a real device is flagged and disappears from the count can only be seen from the dashboard and a reload, because D-02 makes the site structurally incapable of reading the row back. This is the exact failure the schema change exists to prevent, so it does not get to be inferred."
  - id: D12
    description: "Focus lands on the confirm control when the confirmation reveals, Escape reverts it, and the Danish confirmation question renders on at most two lines at 320px without displacing the confirm control below the fold"
    verification: []
    human_judgment: true
    rationale: "Focus movement, a key binding and a two-line wrap at a specific width are device-pass rows. Recorded on 03-DEVICE-PASS.md and in WINDOWS.md entry 8."

# Metrics
duration: 41min
completed: 2026-08-15
status: complete
---

# Phase 3 Plan 05: Edit, Withdraw and Forget Summary

**A registration a guest can change and a registration a guest can leave, both through the security-definer function, with a defined state between the tap and the answer and a defined state for every one of the four ways each can fail.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-08-15T01:31Z
- **Completed:** 2026-08-15T02:12Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **Editing and registering are one screen.** Tapping edit re-mounts the same form prefilled from storage with `data-mode="edit"`, the Save changes label and a discard control. Changing a name and changing a registration are the same act, which is why no separate change-your-name control exists anywhere on the site.
- **Both specification gaps the UI probe found are closed with code, not prose.** The confirmation now has an in-flight state borrowed from the form's own submitting grammar, and every way a withdrawal can fail has a named, non-silent state.
- **Every amend path distinguishes its outcomes from the integer the function returns and from its error code, never from a status code.** On this project a blocked read answers `[]` and a blocked delete answers `204`, so a status code proves nothing. A row count of 0 on edit falls back to the insert; a row count of 0 on withdrawal means the database already holds no registration and the device is corrected the same way.
- **The nudge bar cannot nudge someone who just left.** The withdrawn body contains no form, so the readiness gate is false and the bar stays down structurally, rather than by a special case a later reader could delete as dead code.
- **The phase's copy closes at 156 keys per table** at identical key sets across the three languages, which is the full 42-key budget the copy contract specifies.
- **The wire contract was verified against the live function with zero residue.** Sending the exact `{p_guest_id, p_withdrawn}` argument list against a uuid matching no row returns HTTP 200 with body `0`. A misspelled parameter would have resolved to no function at all and answered 404 forever, silently.

## Task Commits

1. **Task 1: The edit path, which is also the change-your-name path** - `dfb16a0` (feat)
2. **Task 2: Withdrawing, with a defined in-flight state and a defined state for every failure** - `fc58c2b` (feat)

## Files Created/Modified

- `app.js` - `withdrawEnrollment()`, `saveAmendment()`, `handleAmend()`, `buildWithdrawConfirm()`, `buildWithdrawnPanel()`, the seven panel-control handlers, the shared `panelButton` / `panelRow` / `amendPendingLine` primitives, the four focus helpers, the delegated click listener, the `editing` and `withdrawnShown` session flags, and the withdrawn branch in `renderEnrollment()`
- `styles.css` - `.subtle-action` with its disabled and coarse-pointer blocks, `.panel__row` / `.panel__acts` / `.panel__row--cta`, `.panel__edit` / `.panel__again` / `.panel__confirm`, the `.withdraw-confirm` block with its question line and its submitting gate, and the `button.inline-link` chrome reset
- `copy.js` - the plan's 14 keys in all three tables, 142 to 156

## Decisions Made

The seven in the frontmatter's `key-decisions`. The two that change behaviour rather than shape:

**A network failure on an edit keeps the form.** The plan's task 1 text groups "the request never arrived" with the not-recordable case and sends both to the amend-pending line. That is right for withdrawal, where the confirmation holds no typed state, and it is wrong for an edit, where the guest has just retyped their name and their note on a phone outdoors. `data-state="failure"` exists to hold exactly that work, and E2's contract already says every typed value is retained on a failed submit. So `PGRST202` takes the pending line and a dead wire takes the failure banner with the retry label. Four outcomes on the edit path, none of them silent, none of them losing work.

**`identity.clear()` removes the enrolled flag rather than blanking it.** The plan's truth for edge ID-04 says forgetting removes the flag along with the other four keys. The shipped `clear()` set it to the string `0`. A flag sitting at `0` is a record that this device was once used to register, which is the fact a guest handing their phone to somebody else asked to have removed. Every reader compares against the string `1`, so absent and `0` are equivalent to all of them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The amend-pending line carried a fixed `id` that two live nodes could share**

- **Found during:** Task 2 (self-review before commit)
- **Issue:** `amendPendingLine()` set `id="enrol-amend-pending"` so the line could be focused. Two of those lines can stand at once: one on the row the edit control vacated after an edit-pending, one on the row the leaving control vacated after a withdraw-pending. Duplicate ids are invalid, and `getElementById` would have sent both focus calls to whichever happened to be first in the document, so a guest confirming a withdrawal would have had focus thrown up the page to a sentence about a different control.
- **Fix:** Dropped the id. Focus now goes through `focusAmendPending(scope)`, which selects `.panel__pending[tabindex="-1"]` inside the row that was actually replaced.
- **Files modified:** `app.js`
- **Verification:** `WITHDRAW_GATE_PASS`; both call sites now pass a scope, and the withdrawal path passes the row it just wrote.
- **Committed in:** `fc58c2b`

**2. [Rule 2 - Missing critical] Focus was dropped on every path that destroys the control the guest pressed**

- **Found during:** Task 1
- **Issue:** Edit, discard, register-again, keep, confirm and both pending answers all remove the control that was just activated. The plan and the UI spec specify focus movement only for the success panel and the confirmation reveal. Everywhere else focus would have fallen to `<body>`, sending the next Tab back to the top of the page and telling a screen reader guest nothing about what happened.
- **Fix:** `focusPanelHeading(id)` generalised from the success-only helper, plus `focusNameField()`, `focusEnrolAction(action)` and `focusAmendPending(scope)`. Every handler ends in one of them. `panelHeading()` now takes a focus id rather than a boolean, so the withdrawn body's heading can be focused the way the success panel's already was. The one deliberate exception is forgetting, where the only focusable target left is the name field and putting a caret in it would throw the soft keyboard up in the face of the person the phone was just handed to; the toast is a polite live region and announces it instead.
- **Files modified:** `app.js`, `styles.css` (the `:focus:not(:focus-visible)` suppression on the pending line, matching the panel heading's existing treatment)
- **Verification:** `EDIT_GATE_PASS` and `WITHDRAW_GATE_PASS`; every handler traced by reading.
- **Committed in:** `dfb16a0`, `fc58c2b`

**3. [Rule 2 - Missing critical] The discard control had no disabled treatment**

- **Found during:** Task 1
- **Issue:** The discard control sits inside the form, so `setFormState` disables it during a submit, but nothing said so on screen. It kept its underline and its pointer cursor while inert.
- **Fix:** `.subtle-action:disabled` drops the underline and the pointer. The colour deliberately does not move: dimming 14.5px grey further would put it under the body-text floor, which is the arithmetic that got the opacity-based disabled state rejected for the fields.
- **Files modified:** `styles.css`
- **Verification:** Contrast reasoning inherited from the spec's rejected-approaches table; the hover rule was narrowed to `:not(:disabled)` at the same time.
- **Committed in:** `dfb16a0`

### Gate corrections

**4. [Rule 1 - Broken gate, not broken code] Task 2's "withdraw branches present" assertion cannot fail**

- **Found during:** Task 2
- **Issue:** The gate's condition is `body.indexOf(k) < 0 && s.indexOf(k) < 0`. `PGRST202` has been present file-wide since plan 01's `amendEnrollment`, so the file-wide fallback satisfies it no matter what `withdrawEnrollment` contains. This is the fourth instance of the pattern WINDOWS.md entry 6 records, and prior-wave note 2 predicted it.
- **Fix:** The source was not bent to fit. The gate was re-anchored to the unit under test and re-run: `PGRST202` and the zero-row branch are both inside `withdrawEnrollment`'s own body, confirmed by slicing from its declaration. It passes genuinely.
- **Files modified:** none (the plan's gate text is left as written; the corrected assertion is recorded here and in the plan-level verification script)
- **Verification:** `PGRST202 inside withdrawEnrollment body: true`, `gone branch inside: true`
- **Recorded:** WINDOWS.md entry 7, addressed to 03-06

---

**Total deviations:** 4 (1 bug, 2 missing critical, 1 broken gate)
**Impact on plan:** No scope creep. Three are correctness fixes on paths the plan specifies; the fourth changed no source at all. The one place the plan's literal text was not followed (a network failure on an edit) is argued in Decisions Made rather than smuggled.

## Issues Encountered

- **`supabase/schema.sql` appears at first read to leave the attendees view unfiltered.** Section 5 creates it without a `withdrawn` clause. Section 7 re-creates it with `where withdrawn = false`, and the file runs top to bottom, so section 7's definition is the one that lands. Confirmed against the live view, which returns the four expected non-withdrawn rows. Not a bug; noted because the same first read will happen again.
- **No jsdom and no test runner on this project by design,** so nothing in this plan is covered by a unit test. Every automated assertion is a source or wire check. The behavioural claims that need a browser are on 03-DEVICE-PASS.md and in WINDOWS.md entry 8.

## Known Stubs

None. Every control this plan renders has a handler, every handler terminates in a defined state, and no path returns without writing one.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change. `withdrawEnrollment` calls the same RPC plan 03 shipped, with a strictly narrower argument list than `amendEnrollment` already sends (T-03-32 mitigated by omission rather than by validation: the function coalesces every omitted argument against the existing value, so an unsent parameter cannot blank a column).

## User Setup Required

None for this plan. The migration this plan depends on was already applied by the owner and was verified on the wire before either task ran.

## Next Phase Readiness

- **03-06 can run its phase-wide gate sweep.** It should heed WINDOWS.md entries 6 and 7: this plan's task 2 contributes a fourth gate whose exit code does not mean what it looks like, so 03-06 must check anchoring rather than exit codes.
- **The live table still holds the three ZZTEST fixtures and the owner's real "Sirio" row.** This plan added none: both wire probes used a uuid matching no row and touched zero rows. Plan 06's cleanup arithmetic is unchanged.
- **Phase 4 can attribute photos to a guest who has withdrawn.** The guest id and the name survive a withdrawal by design; only forgetting the device removes them.
- **Owed on real hardware,** and blocking nothing in code: that an amendment and a withdrawal reach the database, focus movement and the Escape binding on the confirmation, the Danish confirmation question at 320px, and that the bar stays down for the rest of the session after a withdrawal.

## Self-Check: PASSED

- Files claimed and found: `app.js`, `styles.css`, `copy.js`, `.planning/phases/03-enrollment-identity-and-the-group/03-05-SUMMARY.md`, `.planning/WINDOWS.md`
- Commits claimed and found: `dfb16a0`, `fc58c2b`, `c80c1ea`
- Plan-level verification: all nine items pass (syntax and the four ES5 / markup gates at 0, 156 keys x 3 at identical key sets, PATCH and DELETE at 0, no native confirm and no dialog element, success panel carries the amend link and no leaving control, withdrawn body carries no form, `store.remove` at 6, the not-recordable and zero-row branches inside `withdrawEnrollment` itself, zero em and en dashes across five files)
- Shared orchestrator artifacts untouched: `STATE.md` and `ROADMAP.md` show no modification in any of this plan's three commits
- Live database: no row added, no row modified, no row removed. Both wire probes used a uuid matching no row and returned a row count of 0

---
*Phase: 03-enrollment-identity-and-the-group*
*Completed: 2026-08-15*
