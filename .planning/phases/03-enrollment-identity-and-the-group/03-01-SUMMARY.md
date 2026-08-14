---
phase: 03-enrollment-identity-and-the-group
plan: 01
subsystem: ui
tags: [postgrest, supabase, forms, localstorage, uuid, aria, i18n, vanilla-js, css]

requires:
  - phase: 01-foundation
    provides: "#enrol-body container, the .pending block, store, t(), pendingBlock(), the dormant nudge bar, enrollmentReady() and isEnrolled()"
  - phase: 02-practical-information
    provides: ".facts__row geometry, the map sweep bar and its keyframe, the persistent-child reconciliation shape in renderLocation(), the reduced-motion discipline"
provides:
  - "store extended with mem, ok and remove: an in-memory fallback behind the same interface, so a private-browsing guest keeps a working session"
  - "newGuestId(): a v4 uuid from randomUUID or a getRandomValues fallback, null when there is no crypto at all"
  - "identity module over the c03102 keys (guest_id, name, extra_guests, note) alongside phase 1's lang, enrolled, wa_joined"
  - "sbConfigured() and sbRequest(): the phase-wide PostgREST helper, apikey header only, text-then-parse body reading, unconditional abort, never rejects"
  - "submitEnrollment() and amendEnrollment(): the write path, with 409/23505 routed transparently into the amend RPC"
  - "renderEnrollment(): four of the five #enrol-body bodies (pending, form, success receipt, returning view)"
  - "refreshEnrollmentState(): the single re-render entry point for every enrollment mutation"
  - "the form component system in CSS: .field, .field__input/textarea/select, .segset/.seg, .enrol-actions, .panel, .facts--record, .form-alert, .sweep"
  - "validation layer: validateName/Guests/Note, showFieldError, wireField, validateAll"
  - "25 new copy keys in en, it and da at identical key sets (114 to 139 per table)"
  - "the nudge bar is live for the first time in this site's history, because #enrol-form now exists"
affects: [03-02-nudge-measurement, 03-03-schema-migration, 03-04-whatsapp-and-social-proof, 03-05-edit-withdraw-forget, 03-06-cleanup-and-device-pass, 04-photos]

# Actuals (#2632) — same estimateTokens scale as the plan's estimate (chars/4 over the realized diff).
actuals:
  tokens: 18212
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "One request helper for every PostgREST call in the phase, resolving and never rejecting"
    - "Bodies read as text and parsed conditionally, never handed to the JSON reader"
    - "Error classification on the PostgREST code field, never on the message string"
    - "The form is built once and persists; a language switch re-translates it through the existing data-i18n sweep"
    - "One data-state attribute drives the whole submit state machine; CSS reads it, JS sets it"
    - "Copy keys, not rendered strings, returned by every validator"
    - "--rule means structure, --ink-faint means editable"

key-files:
  created: []
  modified:
    - "app.js"
    - "styles.css"
    - "copy.js"

key-decisions:
  - "The key travels in the apikey header only. The bearer form hard-fails 401 alone and rides a documented exception clause when duplicated, so one header is sent."
  - "Prefer: return=minimal is never relaxed. Both read-back preferences answer 401/42501 AND fail to write the row, because the implied read has no policy to satisfy."
  - "The receipt echoes the guest's own note back from storage, because the database is structurally incapable of ever showing it to them again."
  - "A 409/23505 is not an error: it means this browser already holds a registration, and it routes into the amend path so the guest sees one success."
  - "renderEnrollment() is appended to the applyLanguage chain BEFORE renderNudge(), because the bar's gate reads #enrol-form's existence."
  - "enrollmentReady() is untouched. Rendering the form is what switches the bar on; nothing flips a flag."
  - "The guest-count control is a segmented radio group drawn with the adjacent sibling on the checked input, not the relational pseudo class, which did not ship until Safari 15.4."
  - "The 409-then-PGRST202 path writes the guest's answers to storage and surfaces enrol.amend.pending in the panel, because storage is the only place a receipt can come from and leaving it empty would loop the guest back to a blank form."

patterns-established:
  - "Absent, not broken: no crypto and no credentials both land in the same inherited pending block, and neither renders a form, so the nudge bar stays down with them"
  - "Two announcement channels: field errors are described through aria-describedby, submit failures are announced through the alert role. Never both, never swapped."
  - "The reserved 24px error box holds its space in every state, so a message appearing cannot move the submit button under a thumb"
  - "Every branch of the submit path terminates in a setFormState call, and the abort timer is unconditional, so the button cannot be left locked"

requirements-completed: [ENR-01, ENR-02, ENR-03, ENR-04, ENR-05, ENR-09, ENR-10, ENR-12, ENR-13, ID-01, ID-02, ID-03, ID-05, ID-06, CFG-03, DSG-05, DSG-06, DSG-07, LNG-06, LNG-07]

coverage:
  - id: D1
    description: "A typed name becomes a row in public.enrollments, proved by reading the first name back through the attendees view rather than by a status code"
    requirement: "ENR-03"
    verification:
      - kind: e2e
        ref: "POST /rest/v1/enrollments with Prefer: return=minimal returns 201, then GET /rest/v1/attendees?select=first_name,extra_guests contains the inserted name (TRACER_GATE_PASS, run twice against project aplaxdplwnnlezffatal)"
        status: pass
    human_judgment: false
  - id: D2
    description: "copy.js holds 139 keys per table at identical key sets across en, it and da, with every enrol.err.* string at 36 characters or fewer"
    requirement: "LNG-06"
    verification:
      - kind: automated_ui
        ref: "node parity and 36-character harness over window.PARTY_COPY"
        status: pass
    human_judgment: false
  - id: D3
    description: "The write path never infers success from a status code and never sends a shape the live probe proved broken: no bearer header, no table-targeted update, no read-back preference, no JSON reader on a response body"
    requirement: "ENR-03"
    verification:
      - kind: automated_ui
        ref: "grep gates in the plan's automated block: Authorization, 'PATCH', return=representation, return=headers-only, .json(), Math.random all return 0; return=minimal present"
        status: pass
    human_judgment: false
  - id: D4
    description: "renderEnrollment() runs before renderNudge() in the applyLanguage chain, so the nudge bar is not one render behind on first paint"
    requirement: "ENR-04"
    verification:
      - kind: automated_ui
        ref: "node index comparison of the two call sites in app.js"
        status: pass
    human_judgment: false
  - id: D5
    description: "No text control declares a font size below 16px, and the segmented control avoids the relational pseudo class, so neither iOS viewport zoom nor a silently unselectable control on Safari before 15.4 can ship"
    requirement: "DSG-05"
    verification:
      - kind: automated_ui
        ref: "font-size floor regex and ':has(' count over styles.css, both 0"
        status: pass
    human_judgment: false
  - id: D6
    description: "The rendered half of the tracer: the form reads as the course fact table, submitting swaps it for a receipt echoing the note back, a reload shows the returning view, the nudge bar appears pinned to the bottom, and a language switch mid-typing preserves every character and the caret"
    verification: []
    human_judgment: true
    rationale: "This project ships no build step and therefore no DOM or device harness. The wire half is proven by the live probe above; the rendered half, the 10-second phone target and the nudge bar's clearance are only observable on real hardware and are owed on 03-DEVICE-PASS.md."
  - id: D7
    description: "Validation timing and the two screen reader channels: an untouched empty field says nothing on blur, an error clears on the first corrected keystroke, a field error is described when focus reaches the control, and a submit failure interrupts"
    requirement: "ENR-09"
    verification: []
    human_judgment: true
    rationale: "Announcement politeness, focus order and the reserved-box no-reflow guarantee are runtime behaviours in a real assistive stack (VoiceOver, TalkBack) and no harness on this project can observe any of them."
  - id: D8
    description: "Reduced motion: the submitting sweep bar parks static at full width rather than being stranded mid travel, and the form-to-panel swap becomes instant"
    requirement: "DSG-07"
    verification:
      - kind: automated_ui
        ref: "exactly two prefers-reduced-motion blocks in styles.css, with .sweep carrying an explicit rule inside the second"
        status: pass
    human_judgment: false

duration: 41min
completed: 2026-08-14
status: complete
---

# Phase 3 Plan 01: The enrollment tracer Summary

**A guest types a name, the row lands in the live `public.enrollments` and is provably readable back through the `attendees` view, the form is replaced in place by a registration receipt that echoes their own note, a reload shows the returning view from storage, and the nudge bar built in phase 1 renders for the first time in this site's history.**

## Performance

- **Duration:** 41 min
- **Started:** 2026-08-14T18:05:00Z
- **Completed:** 2026-08-14T18:46:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- **The wire is proven, not assumed.** A fresh uuid inserted with `Prefer: return=minimal` returns 201 and the following read of the `attendees` view contains the inserted first name. Run twice against the live project. A 201 alone proves nothing here, because a blocked read answers with an empty array and a blocked delete answers 204, so both look like success.
- **The site's first form component system.** `styles.css` held zero `input`, `label`, `textarea`, `select` or `fieldset` rules before this commit. It now carries `.field` and its three control types, the segmented radio group, the action row, the panel region, the receipt modifier, the failure banner and the sweep bar, at zero new colour values, zero new type sizes, zero new weights and zero new spacing tokens.
- **Identity, and the honest degradation of it.** `store` gained an unconditionally-written in-memory map, an `ok` probe and a `remove`, so a private-browsing guest registers, sees their receipt and keeps the session, and nothing survives a reload, which is the correct outcome rather than a broken page. `newGuestId()` returns a real v4 uuid, and `null` rather than a colliding pseudo-random string when there is no crypto at all.
- **The nudge bar is live.** `enrollmentReady()` was not touched. It gates on `#enrol-form` existing, `renderEnrollment()` creates that element, and the bar switched itself on with no flag to remember to flip.
- **25 copy keys in three languages** at identical key sets, taking each table from 114 to 139, every `enrol.err.*` string at 36 characters or fewer in all three, zero em dashes and zero en dashes.

## Task Commits

1. **Task 1: End to end, one path. A typed name becomes a row, a receipt and a returning greeting** - `a4e5e9d` (feat)
2. **Task 2: Validation on blur, the failure state, and the two channels a screen reader needs** - `1872f8a` (feat)

## Files Created/Modified

- `app.js` - The identity module (`newGuestId`, `identity`, the extended `store`), the request layer (`sbConfigured`, `sbRequest`, `submitEnrollment`, `amendEnrollment`), the render layer (`renderEnrollment`, `refreshEnrollmentState`, `buildField`, `buildForm`, `buildRecord`, `buildSuccessPanel`, `buildReturnPanel`, `setFormState`, `syncFormLanguage`, `mountPanel`), the validation layer (`validateName`, `validateGuests`, `validateNote`, `showFieldError`, `wireField`, `validateAll`), and the wiring (`wireEnrollment` from `init()`, `renderEnrollment()` into the `applyLanguage` chain before `renderNudge()`)
- `styles.css` - R1 `--grid-record` token, adopted by both `.facts__row` and `.field`; R2 `@keyframes map-sweep` renamed to `sweep-x`; `[hidden] { display: none !important; }` in the Base block; the whole form component system, the panel region, the receipt modifier, the failure banner, the sweep bar, and two new rules inside the existing second reduced-motion block
- `copy.js` - 25 new keys in each of `en`, `it` and `da`, inserted into the existing `enrol.*` cluster at the same relative position and the same line ordering in all three tables

## Decisions Made

- **`apikey` only, no bearer header.** The live probe showed a bearer-only request hard-fails 401, and duplicating the value into both headers works today only under a documented exception clause whose own wording reads like it is describing a future rejection. One header, verified working, correct for both the publishable and the legacy anon key formats `config.js` promises the owner, and one fewer header from a phone on mobile data.
- **The 409-then-`PGRST202` path saves and shows the receipt.** The plan says to surface `enrol.amend.pending` and leave the registration as it is. That is unambiguous about the database and silent about storage. Storage is the only place a receipt can ever come from on this project, and leaving it empty would return a guest who is provably registered (the 409 proved it) to a blank form on every load. So the typed values are written, the success panel mounts, and the `enrol.amend.pending` line sits in it saying plainly that the change itself is not recorded yet. Recorded here because it is a judgement call the plan did not make.
- **The `<select>` overflow branch takes a real `<label for>`, not `aria-labelledby`.** The plan specifies the labelled-by pattern for the radiogroup, where a `<legend>` inside a grid container has documented Safari layout bugs. That reasoning does not apply to a native select, which is a real form control and takes a real label. Passing `group: max <= 4` keeps each branch with the correct labelling mechanism; the alternative would have shipped an unlabelled select on the day the owner raises `maxGuestsPerPerson` above four.
- **Field listeners are attached at build time, not from `wireEnrollment()`.** The stacking hazard the plan warns about comes from attaching listeners inside a function that re-renders. This form is built exactly once and persists for the life of the page, so per-field wiring cannot stack. The submit handler is still delegated from the stable `#enrol-body` and wired once from `init()`, because the form node can be replaced by a panel and restored.
- **`.enrol-form` carries `border-top`.** `.facts` draws its own top hairline. Without the matching rule the first field row would have had no rule above it and the form would not have read as the same table.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The `<select>` overflow branch would have rendered an unlabelled control**

- **Found during:** Task 1
- **Issue:** `buildForm` passed `group: true` for the guest-count field unconditionally, which makes `buildField` emit a `<p class="field__label">` with an `id` and no `for`. That is correct for the radiogroup, which points at it with `aria-labelledby`, and wrong for the `maxGuestsPerPerson > 4` branch, where the control is a native `<select>` that carries no `aria-labelledby` and would therefore have had no accessible name at all.
- **Fix:** `group: max <= 4`, so the radiogroup keeps the labelled-by pattern and the select gets a real `<label for="enrol-guests">`.
- **Files modified:** `app.js`
- **Verification:** Read back against the UI spec's markup contract for both branches; the select branch has one label node with a `for` matching the control id, the radiogroup branch has one `<p>` with an id matching its `aria-labelledby`.
- **Committed in:** `a4e5e9d`

**2. [Rule 1 - Bug] The segment stacking context had no effect**

- **Found during:** Task 1
- **Issue:** `.seg + .seg { margin-left: -1px; }` collapses the doubled borders of adjacent segments, which means the selected segment's `--accent-lit` border is drawn underneath its neighbour's `--ink-faint` one. The `z-index: 1` written to lift it was inert, because the base `.seg > span` was statically positioned and `z-index` does nothing without a position.
- **Fix:** `position: relative; z-index: 0;` on the base, `z-index: 1` on the checked state, `z-index: 2` on the focus ring, so the selected border and the focus outline both draw above the collapsed edge.
- **Files modified:** `styles.css`
- **Verification:** The selected state's border colour is one of the three signals carrying it (the fill alone is 2.06:1 and below the 3:1 floor), so a border that cannot be seen would have reduced the state to two signals.
- **Committed in:** `a4e5e9d`

**3. [Rule 3 - Blocking] Three comments tripped their own verification gates**

- **Found during:** Tasks 1 and 2
- **Issue:** The plan's gates are literal greps over whole files, so prose explaining *why* a construct is banned counted as the construct. Comments naming `map-sweep`, `.seg:has(input:checked)` and `aria-errormessage` made `grep -c 'map-sweep' styles.css`, `grep -c ':has(' styles.css` and `grep -c 'aria-errormessage' app.js` return non-zero.
- **Fix:** Reworded all three to describe the banned construct rather than spell it, keeping the full rationale intact. The comments still record the Safari 15.4 reasoning, the naming-lie reasoning and the screen-reader-support reasoning.
- **Files modified:** `styles.css`, `app.js`
- **Verification:** All three counts return 0; no explanation was lost.
- **Committed in:** `a4e5e9d`, `1872f8a`

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking)
**Impact on plan:** All three were necessary for correctness or to pass the plan's own gates. No scope creep, and nothing from a later plan was pulled forward.

## Known Stubs

| Stub | File | Reason |
|---|---|---|
| The success panel's group-CTA position renders nothing when `whatsapp.inviteUrl` is truthy | `app.js`, `buildSuccessPanel` | `inviteUrl` is `null` and that is the shipping state (D-37), which renders the `enrol.success.group.pending` line and is complete. Plan 04 owns `whatsappButton()` and fills the configured case. Recorded in `.planning/WINDOWS.md` as entry 3. |
| `buildForm(mode)` accepts `'edit'` and writes `data-mode`, but no edit path reaches it | `app.js` | The attribute is this plan's artifact per the registry; plan 05 adds the edit, withdraw and forget controls that use it. |
| `identity.clear()` is implemented and unused | `app.js` | Plan 05's "Forget my details on this device" is its only caller. |
| `amendEnrollment()` targets an RPC that does not exist in the live database | `app.js` | By design (D-36). Plan 03 adds `public.amend_enrollment` to `supabase/schema.sql` and the owner must re-run it. Until then the function returns a clean `404 PGRST202`, which is handled as a pending state. Enrollment itself is unaffected and works today, which is the whole point of D-36. |
| The withdrawn body (E) is not implemented | `app.js`, `renderEnrollment` | `#enrol-body` ships four of the five bodies in the layout contract. Plan 05 adds the fifth. |

None of these prevents the plan's goal. The shipping configuration (`inviteUrl` null, schema not yet re-run) renders complete and deliberate on every path.

## Issues Encountered

- **The plan's own verification gates are whole-file literal greps.** Three comments explaining why a construct is forbidden were counted as uses of it. Resolved by rewording rather than by deleting the rationale. Worth knowing for plans 02 to 06 in this phase: do not spell a banned token inside a comment in a gated file.
- **The `attendees` view already contained a `ZZTEST` row** from the researcher's 2026-08-14 probe before this plan ran. Two more `ZZTEST DeleteMe` rows were added by the tracer gate (`f613a2e2-...` and `7342c3fc-...`). All three are covered by the single cleanup statement plan 06 already owns, and they are named for exactly that reason. They do currently inflate the count `enrollment.showCountFrom` gates on, which matters once plan 04 ships social proof.

## User Setup Required

None for enrollment itself, which works against the live project today. Plan 03 introduces the one owner action for this phase (re-running `supabase/schema.sql` for the `withdrawn` column and the `amend_enrollment` function), and this plan is deliberately built to be correct in the un-migrated state.

## Next Phase Readiness

**Ready for the rest of phase 3:**

- `sbRequest()` is the shared helper plan 04's social proof fetch and phase 4's storage calls both consume. It already carries the timeout, the header shape and the error classification.
- `refreshEnrollmentState()` is the single mutation entry point plans 04 and 05 call instead of re-running three renderers by hand.
- `#enrol-form` exists, so plan 02 can now measure a nudge bar that actually renders. That measurement is the highest-risk unverified item in the phase: the shipped 76px reserve is short by up to 27px on a notched iPhone, and until this commit the defect was unobservable.
- `identity.get()` / `identity.save()` / `identity.clear()` are the interface phase 4 reads `guest_id` and `name` from (ID-05).
- The `.panel` region, `.facts--record` receipt and `.subtle-action` slot are in place for plan 05's returning-guest controls.

**Owed:**

- `03-DEVICE-PASS.md` is unfilled. The rendered half of this tracer, the 10-second phone target, the iOS zoom check, the nudge bar clearance and both assistive-technology checks are all real-hardware items. Recorded in `.planning/WINDOWS.md` as entry 2.
- Three `ZZTEST` rows are live in `public.enrollments`. Plan 06 removes them.

**Not touched, deliberately:** `STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md`. This plan ran in a worktree as a parallel executor; the orchestrator owns those writes after the wave merges. `requirements-completed` above lists the IDs this plan satisfies, but several of them (ENR-05 edit paths, ENR-13's full surface) are only completed in combination with plans 03 to 05, so the orchestrator should mark them at phase close rather than per plan.

---
*Phase: 03-enrollment-identity-and-the-group*
*Completed: 2026-08-14*
