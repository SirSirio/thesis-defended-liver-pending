---
phase: 03-enrollment-identity-and-the-group
plan: 04
subsystem: ui
tags: [whatsapp, postgrest, supabase, social-proof, i18n, collation, xss, vanilla-js, css]

requires:
  - phase: 01-foundation
    provides: "the .section / .wrap / .section__h scaffolding, the wa.heading, wa.body and wa.cta copy keys seeded and unused, the nudge bar and its inline joined-flag write, t(), store, $, the .facts table and .mono"
  - phase: 02-practical-information
    provides: "the directions buttons' attribute-setting anchor idiom and the absent-not-disabled branch beside it, the .facts--notes modifier precedent, the coarse-pointer-minimums-go-after-the-base-class rule"
  - phase: 03-enrollment-identity-and-the-group
    plan: 01
    provides: "sbConfigured() and sbRequest() with its resolves-never-rejects contract and timeout argument, buildSuccessPanel() and its dim group position, recordRow(), .facts--record, .panel, refreshEnrollmentState()"
  - phase: 03-enrollment-identity-and-the-group
    plan: 02
    provides: "--nudge-h and the toast offset, so a toast fired with the bar up sits above it; the delegated wiring shape in wireEnrollment()"
provides:
  - "#wa: the persistent group section in static markup, shipping with the hidden attribute set, and #wa-body as its mount point"
  - "#enrol-proof: the social proof host inside the registration section, below the body"
  - "markGroupJoined(): the single writer of the joined flag, called from all three group CTAs"
  - "whatsappButton(labelKey, className): returns a configured anchor or null, so no call site owns a dead button"
  - "renderWhatsApp(): joined to the language chain beside the enrollment renderer and before the bar's"
  - "renderSocialProof(): one fetch of the attendees view, silent on failure, absent below the configured threshold"
  - "recordRow() extended with an optional value class, so the receipt and the proof block share one row builder"
  - ".facts--proof, .panel__wa, .wa__cta and .panel__handoff in CSS"
  - "enrol.proof.count.label and enrol.proof.list.label in en, it and da (140 to 142 keys per table)"
affects: [03-05-edit-withdraw-forget, 03-06-cleanup-and-device-pass, 04-photos, 05-degradation-arc]

# Actuals (#2632) - same estimateTokens scale as the plan's estimate (chars/4 over the realized diff).
actuals:
  tokens: 5886
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "One writer per stored flag, called from every affordance that sets it, so the string it writes appears once in the source"
    - "A builder that returns null rather than a disabled node, so absence is decided in one place and every call site inherits it"
    - "The hidden attribute in static markup is the shipping state; the renderer only ever removes it, and never puts it back"
    - "A non-blocking decoration gets a shorter timeout than the write path and renders nothing at all on failure"
    - "Guest data reaches the page only through the view's server-side truncation; no name is split in JS"

key-files:
  created: []
  modified:
    - "index.html"
    - "app.js"
    - "styles.css"
    - "copy.js"

key-decisions:
  - "The joined-flag write is centralised in whatsappButton() rather than repeated at each mount site, so a future fourth caller cannot forget it. The plan's count gate assumed per-site wiring; the arrangement is documented at the success panel instead."
  - "The newest-first ordering the wire offers is deliberately not requested. Asking for a sort that is thrown away is noise, and that ordering is the social-feed reading this block rejects."
  - "recordRow() took an optional value class rather than a second row builder being written for the proof block. The two components differ by one class on the value cell."
  - ".facts--proof joins the existing .facts--record grid declaration rather than writing a third literal copy of the narrow template, which is the drift R1 exists to stop."
  - "The success panel's framing line is its own class rather than the pending line's. They are never both rendered and they say opposite things."
  - "showAttendeeList is read as 'not false' rather than 'is true', following the spec's literal wording and the accepted disposition of T-03-25."

patterns-established:
  - "Three affordances for one intent are allowed only when each has a different job, and the fourth is refused in a comment at the site where it would be added"
  - "A gate that asserts presence by count can be satisfied by documentation as well as by code; when it is, say so in the summary rather than letting the number stand unexplained"
  - "A live contract check must probe the surface itself, not the projection the client happens to request"

requirements-completed: [ENR-07, ENR-08, WA-01, WA-02, WA-03, WA-04, WA-05, WA-06, NDG-05, CFG-01, CFG-03, DSG-06, LNG-06]

coverage:
  - id: D1
    description: "The group section exists in static markup after the registration section, ships with the hidden attribute set, adds no seventh topnav item and no new jump target, and its visibility is decided from one config value at render"
    requirement: "WA-04"
    verification:
      - kind: automated_ui
        ref: "GROUP_GATE_PASS: opening-tag parse for the hidden attribute and for section order, tabindex count still exactly 2, href to the new section count 0, the three i18n hooks present"
        status: pass
    human_judgment: false
  - id: D2
    description: "One writer sits under all three group CTAs: the joined-flag string appears exactly once in app.js, the bar's former inline write now routes through the helper, and the helper re-renders the bar so a guest who joins anywhere is never asked again"
    requirement: "WA-03"
    verification:
      - kind: automated_ui
        ref: "GROUP_GATE_PASS: the joined-flag write count is 1, the writer's symbol appears 4 times, the three new functions are declared"
        status: pass
    human_judgment: false
  - id: D3
    description: "The href is the configured value verbatim: no hardcoded group host, no short-link host and no app scheme appears anywhere in app.js, the opener-blocking attribute is on the constructed anchor, and the unused legacy class carrying the side stripe is not adopted"
    requirement: "WA-01"
    verification:
      - kind: automated_ui
        ref: "GROUP_GATE_PASS: three host and scheme counts all 0, legacy class count 0, noopener present"
        status: pass
    human_judgment: false
  - id: D4
    description: "renderWhatsApp() joins the language chain before the bar's renderer, so the section and the bar read the same config value in the same pass and cannot disagree on first paint"
    requirement: "WA-06"
    verification:
      - kind: automated_ui
        ref: "node index comparison of the two call sites in app.js (chain order OK)"
        status: pass
    human_judgment: false
  - id: D5
    description: "copy.js holds 142 keys per table at identical key sets across en, it and da, with the two social proof labels in all three and zero em or en dashes across the five source files"
    requirement: "LNG-06"
    verification:
      - kind: automated_ui
        ref: "PROOF_GATE_PASS: node parity harness (copy parity OK 142x3) plus the codepoint scan"
        status: pass
    human_judgment: false
  - id: D6
    description: "The threshold is read from config in exactly one place, no name is split in JS, and no markup assignment or adjacent-markup insertion exists anywhere in the file: the first-name truncation stays server side where a full name is structurally incapable of reaching another guest's browser"
    requirement: "ENR-08"
    verification:
      - kind: automated_ui
        ref: "PROOF_GATE_PASS: threshold read count exactly 1, JS split count 0, insertAdjacentHTML count 0, markup assignment count 0"
        status: pass
    human_judgment: false
  - id: D7
    description: "The live attendees view projects exactly first_name, extra_guests and created_at, and never a full name, a note or a guest id"
    requirement: "ENR-07"
    verification:
      - kind: e2e
        ref: "GET /rest/v1/attendees?select=first_name,extra_guests against project aplaxdplwnnlezffatal (view contract OK, 3 rows), plus an independent select=* probe of the view's full projection"
        status: pass
    human_judgment: false
    note: "Provisional. This ran against the pre-migration view: the owner has not re-run supabase/schema.sql, so public.attendees is still unfiltered. No row is withdrawn, so the arithmetic is identical either way, but the probe must be re-run after the migration to confirm the re-created view still projects the same three columns. Recorded in WINDOWS.md as entry 5."
  - id: D8
    description: "The sort is a locale-aware compare in the active language, so the Danish extra vowels order after z rather than by code point, duplicates are kept, and the separator carries no conjunction"
    requirement: "ENR-08"
    verification:
      - kind: unit
        ref: "node collation check over a mixed list: da gives Bo, Maria, maria, Zoe, AE, OE, AA at the end; en interleaves them near a"
        status: pass
    human_judgment: false
  - id: D9
    description: "The three amounts of nothing: with the invite link null the success panel reads as finished with one grey line where the button would be and the page order below registration is unchanged; below the threshold the head count block is absent rather than a zero; a blocked host leaves the block absent and nothing else on the page changes"
    verification: []
    human_judgment: true
    rationale: "Each of these renders a different amount of nothing, and the difference between deliberate absence and a broken block is a visual judgment no harness on this project can make. This is also the state the site will actually be in on the day this ships."
  - id: D10
    description: "One tap from either group CTA opens WhatsApp rather than a browser page, and after tapping either one the bar never mentions the group again"
    requirement: "WA-02"
    verification: []
    human_judgment: true
    rationale: "Whether a universal link opens the installed app is a real device behaviour, and it is unverifiable at all until the owner supplies a link, which config.js still holds as null. The code path is verifiable today against a temporary local value; the promise is not."

duration: 28min
completed: 2026-08-14
status: complete
---

# Phase 3 Plan 04: The group handoff and the head count Summary

**Three group affordances now exist with one writer between them, the persistent section ships hidden and inert rather than broken while the invite link is still null, and the head count and class list render in the fact table's own grammar once the number is worth showing.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-08-14T18:52:00Z
- **Completed:** 2026-08-14T19:20:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- **The linkless state was built as the real state.** `whatsapp.inviteUrl` is `null` and will be on the day this lands, so the shipping configuration is the one that was designed and verified first. The section carries the `hidden` attribute in static markup and `renderWhatsApp()` only ever removes it, never adds it back. Nothing flashes, nothing shifts, nothing needs tearing down, and the page order below registration is byte-identical to what it was before this plan. The success panel keeps its one dim line where the button would be. One config line turns the whole feature on.
- **One writer under three CTAs.** `markGroupJoined()` is the only thing in the file that writes the joined flag, and the string it writes appears exactly once. The bar's former inline write now routes through it, and the two new CTAs inherit it from the shared builder rather than each wiring their own. The helper re-renders the bar, which is what takes it down: the bar's second state is gated on the flag it just wrote.
- **Absent, never disabled, decided in one place.** `whatsappButton()` returns `null` on a falsy link, so both mount sites build nothing rather than each carrying a disabled-button branch. The success panel's `else` is the dim line; the section's is an early return that leaves the attribute alone.
- **The head count reads as a register, not a feed.** Two labelled rows in the fact table's grammar, the total in the mono family with tabular figures, the names sorted alphabetically through a locale-aware compare rather than served newest-first. Duplicates kept, no conjunction before the last name, and no sentence reconciling the two figures: the labels are worded so they already mean different things.
- **The project's first genuinely exploitable output surface is closed by construction.** Every name reaches the page through `createElement` and `textContent`, and no name is split in JS: the view truncates to the first token server side, which is what makes a full name structurally incapable of arriving rather than merely unlikely to. Gates assert zero markup assignment, zero adjacent-markup insertion and zero JS-side split across the whole file.
- **The live view was probed for what it actually exposes.** `select=*` returns exactly `first_name`, `extra_guests` and `created_at`. No note, no full name, no guest id.

## Task Commits

1. **Task 1: The persistent group section, the three CTAs, and the one writer between them** - `1336f79` (feat)
2. **Task 2: The head count and the class list, absent until they are worth showing** - `2d59acf` (feat)

## Files Created/Modified

- `index.html` - The `#wa` section after `#enrol`, shipping with `hidden` set, `data-zone="slipping"`, both strings wired through `data-i18n` with English defaults, and an empty `#wa-body`. The `#enrol-proof` host inside the registration section, below the body. Two block comments recording why the section ships hidden, why the proof host sits below rather than above, and why no topnav entry was added.
- `app.js` - `markGroupJoined()`, `whatsappButton()` and `renderWhatsApp()` in a new group-handoff block; `renderWhatsApp()` into the `applyLanguage` chain between the enrollment renderer and the bar's; `buildSuccessPanel()`'s group position rewritten to hold the framing line and the button when a link exists; `wireNudge()`'s CTA handler routed through the shared writer; `renderSocialProof()` and its section comment; `recordRow()` extended with an optional value class; `renderSocialProof()` added to `refreshEnrollmentState()`; a refusal comment at `buildReturnPanel()`.
- `styles.css` - `.facts--proof` joined to the existing `.facts--record` grid declaration and its 640px collapse, its own 48px top margin and `overflow-wrap` on its value cell; `.panel__wa` and `.wa__cta` touch minimums and the 480px full-bleed stack, written after the base button block; `.panel__handoff` for the framing line.
- `copy.js` - `enrol.proof.count.label` and `enrol.proof.list.label` in `en`, `it` and `da`, at the same relative position in each table (140 to 142 keys).

## Decisions Made

- **The joined-flag listener is wired inside `whatsappButton()`, not at each mount site.** The must-have is that the flag cannot be set on one path and missed on another. Centralising the wiring in the builder makes that true by construction: a future fourth caller gets the behaviour whether or not its author remembers. Wiring per mount site would have produced the literal three call sites the plan's count gate expected, at the cost of the guarantee the gate exists to protect. The arrangement, and the instruction not to add a second writer at the panel, are recorded in a comment there.
- **The newest-first ordering the wire offers is not requested.** `order=created_at.desc` is available and the research example includes it, but the rows are sorted here into a register instead, so asking the database for an ordering that is immediately discarded would be a request parameter that means nothing. The refusal is commented at the call, because the wire contract makes it look like an omission.
- **`recordRow()` gained a third optional argument rather than a second builder being written.** The receipt row and the proof row differ by exactly one class on the value cell. Existing two-argument callers are unaffected.
- **`.facts--proof` shares `.facts--record`'s grid declaration.** See the deviation below: the plan asked for "the narrower label column from the shared grid token" and no such token exists. Grouping the two selectors keeps the narrow template to the two copies already in the file rather than adding a third.
- **`showAttendeeList` is tested as "not false".** The UI spec's partial row is written as an equality against `false`, and T-03-25 records the exposure as deliberately accepted, so a missing key showing the list is consistent with both. Recorded because the opposite default is defensible and someone will wonder.
- **The framing line is its own class rather than the pending line's.** `.panel__pending` says the group does not exist yet; `.panel__handoff` says what the group is for. They are never both rendered, and sharing the class would have been a naming lie for one of them.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan asked for a grid token that does not exist**

- **Found during:** Task 2
- **Issue:** The action says to build `.facts--proof` with "the narrower label column from the shared grid token". R1 created exactly one token, `--grid-record: minmax(180px, 260px) 1fr`, and it is the **wide** course-facts template used by `.facts__row` and `.field`. The narrow template the receipt and the notes list both want is written as a literal in two separate places. Following the instruction literally was impossible; writing a third literal copy is the drift R1 was created to stop.
- **Fix:** `.facts--proof .facts__row` was added as a second selector on the existing `.facts--record .facts__row` declaration, and on its 640px collapse. One declaration now serves both of this phase's receipt-grammar tables. `.facts--notes` (phase 2 code) was left untouched rather than pulled into an unlisted refactor of shipped CSS.
- **Files modified:** `styles.css`
- **Verification:** `.facts--proof` present, the collapse rule carries both selectors, gate passes.
- **Committed in:** `2d59acf`

**2. [Rule 2 - Missing Critical] The framing line and the phone stack were not covered by "only the coarse-pointer height overrides"**

- **Found during:** Task 1
- **Issue:** The CSS instruction is "add only the coarse-pointer height overrides the two group CTAs need over the base button". With no other rule, the framing line reusing `wa.body` would have sat flush against the receipt above it and flush against the button below it, and both group CTAs would have kept an auto width on a phone. The UI spec's own touch-geometry section requires both WhatsApp CTAs at `width: 100%` below 480px, and the plan's task text asks for the success-panel one explicitly.
- **Fix:** Added `.panel__handoff` (dim ink, `--s-6` above, `--s-5` below, 62ch cap) and one `max-width: 480px` rule giving both CTAs full width. Every value is a token from the existing scale; no new colour, size or spacing token was introduced.
- **Files modified:** `styles.css`
- **Verification:** Read against the UI spec's spacing table and touch-target table; no literal pixel value added.
- **Committed in:** `1336f79`

**3. [Rule 1 - Bug] The live view contract gate cannot detect the thing it claims to**

- **Found during:** Task 2
- **Issue:** The gate's stated intent is "if the view ever widens, this gate fails before the data reaches a page". As written it requests `select=first_name,extra_guests` and then asserts that the returned objects carry no `note`, `name` or `guest_id`. PostgREST returns only the requested columns, so those assertions are true by construction and would stay true the day someone adds `note` to the view. The check as shipped proves the two columns exist, and nothing about what else the view exposes.
- **Fix:** The gate was left intact and run as written (it passes), and an independent `select=*` probe of the view's full projection was run alongside it. That returns exactly `first_name`, `extra_guests` and `created_at`, which is the assertion the gate was reaching for. Recorded here so plan 06 or the phase verifier can strengthen the gate rather than trusting it.
- **Files modified:** none (verification only)
- **Verification:** `curl .../attendees?select=*` returns three keys per object and no others.
- **Committed in:** n/a (no source change)

**4. [Gate arithmetic] The writer-count gate assumed per-CTA wiring**

- **Found during:** Task 1
- **Issue:** The acceptance criterion reads "`markGroupJoined` appears at least four times: the declaration plus the three CTAs". Three CTAs exist, but only two wiring sites: the shared builder serves both new anchors, and the bar's static anchor is wired in `wireNudge()`. A correct implementation therefore has three code occurrences, not four. This is the same class of off-by-one the plan 01 and plan 02 gates hit, and per this phase's standing rule the source was not bent to satisfy it.
- **Fix:** No behavioural change. The count reaches four because the success panel carries a comment naming the arrangement and forbidding a second writer at that site, which is house style and is the exact place someone would later add one. Stated plainly here rather than left as an unexplained number: three of the four occurrences are code, one is documentation.
- **Files modified:** `app.js` (comment only)
- **Verification:** `grep -n markGroupJoined app.js` returns four lines: one comment at the panel, the declaration, the builder's listener, the bar's handler.
- **Committed in:** `1336f79`

---

**Total deviations:** 4 (1 blocking, 1 missing critical, 1 bug in a verification gate, 1 gate arithmetic). Two required no source change.
**Impact on plan:** No scope change and nothing pulled forward from plan 05 or 06. Deviation 2 is the only addition to the delivered surface and it is two spacing rules the UI spec already required.

## Provisional Results

Called out because the plan-03 migration is an open owner checkpoint and has not been applied.

| Result | Status |
|---|---|
| The attendees view projects exactly three columns and never a note, a full name or a guest id | **Verified today, provisional after migration.** `public.attendees` is still the OLD unfiltered view. Plan 03 re-creates it with a `withdrawn = false` filter, and the probe must be re-run afterwards. Recorded in `WINDOWS.md` as entry 5. |
| The head count arithmetic against live data | **Verified, and unaffected by the migration.** Three live rows, all `ZZTEST` fixtures, each with `extra_guests` 0, so the total is 3 against a configured threshold of 8 and the block is correctly absent today. No row is withdrawn, so the filtered and unfiltered views return the same set. |
| Everything else in this plan | Not dependent on the migration. This plan declares `depends_on: ["03-02"]` and touches no schema. |

## Known Stubs

None introduced. The one open stub this plan **closes** is `WINDOWS.md` entry 3: `buildSuccessPanel()` rendering nothing at the group position when a link exists. It now renders the framing line and the button. The orchestrator should resolve that entry.

Two things that are deliberately inert rather than stubbed:

| Inert | Why |
|---|---|
| The whole group feature builds nothing at runtime | `whatsapp.inviteUrl` is `null`. That is the shipping state (D-37, WA-06), not a gap. Both branches exist; only one is reachable today. |
| The social proof block renders nothing at runtime | Three live rows against a configured threshold of 8. Correct behaviour (D-20), and the same code renders the block the moment the number is worth showing. |

## Threat Flags

None. Every surface this plan touches was already in the plan's threat register: the stored name reaching other browsers (T-03-21, mitigated by `createElement` plus `textContent` and asserted by gate), the view widening (T-03-22, gate plus the strengthened probe above), reverse tabnabbing (T-03-23, the opener-blocking attribute asserted by gate), href rewriting (T-03-24, three host and scheme counts at zero), the accepted head-count exposure (T-03-25) and the bounded fetch (T-03-26, an 8 second unconditional abort inherited from `sbRequest`).

## Issues Encountered

- **A gate whose assertions are true by construction.** Deviation 3 is the more interesting of the two gate problems in this plan. Plans 01 and 02 each found a gate that could never pass; this one found a gate that can never fail. Both are the same root cause, a harness written from the outside without running it, and the second is worse because it reports success.
- **The writer-count arithmetic.** Deviation 4. Third plan in a row to hit a counting gate that assumed a different code shape than the one the plan's own prose describes.
- **Nothing in the group half of this plan is observable today.** Both CTA branches, the section's visibility and the one-tap handoff all sit behind a config value that is `null`. The linkless branches are the ones that run, and they were verified structurally; the configured branches were verified by reading, and are owed on the device pass with a temporary local link.

## User Setup Required

None new from this plan. Two owner actions remain outstanding elsewhere and both are already tracked:

- `whatsapp.inviteUrl` in `config.js` is `null`. Setting it is the one line that turns this entire plan's group half on. Until then the site is deliberately quiet about the group, which is the designed state rather than a defect.
- Re-running `supabase/schema.sql` is plan 03's open checkpoint and is not required by anything this plan built.

## Next Phase Readiness

**Ready:**

- `whatsappButton()` is the one place any future group affordance should come from, and it already carries the null branch, the verbatim href, the opener-blocking attribute and the flag write.
- `markGroupJoined()` is the single writer, so plan 05's controls must never touch the flag directly.
- `recordRow(labelKey, value, valueClass)` is now a three-argument builder shared by the receipt and the proof block. Plan 05's withdrawn state can use it unchanged.
- `renderSocialProof()` is already called from `refreshEnrollmentState()`, so plan 05's withdraw path re-reads the head count for free the moment it lands.
- The `.facts--record` grid declaration now carries both modifiers. A fourth receipt-grammar table should join that selector list rather than write the template again.

**Owed:**

- `03-DEVICE-PASS.md` Table C. Recorded in `WINDOWS.md` as entry 4: the linkless panel reading as deliberate, both CTAs opening WhatsApp on one tap with a temporary local link, the bar going quiet afterwards, and the four social-proof states.
- The post-migration re-probe of the attendees view. `WINDOWS.md` entry 5.
- The three `ZZTEST` rows are still live and still inflate the head count. Plan 06 removes them.

**Not touched, deliberately:** `STATE.md`, `ROADMAP.md` and `REQUIREMENTS.md`. This plan ran in a worktree as a parallel executor; the orchestrator owns those writes after the wave merges. `WINDOWS.md` **was** written, because this plan is alone in wave 3 and there was no concurrent appender to conflict with.

## Self-Check: PASSED

- `FOUND: .planning/phases/03-enrollment-identity-and-the-group/03-04-SUMMARY.md`
- `FOUND: 1336f79` (Task 1)
- `FOUND: 2d59acf` (Task 2)
- `FOUND: index.html`, `app.js`, `styles.css`, `copy.js`
- `GROUP_GATE_PASS` and `PROOF_GATE_PASS` both re-run against the committed tree.
- No deletions in either task commit. No untracked files.

---
*Phase: 03-enrollment-identity-and-the-group*
*Completed: 2026-08-14*
