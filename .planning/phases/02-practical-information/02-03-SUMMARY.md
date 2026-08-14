---
phase: 02-practical-information
plan: 03
subsystem: access-text
tags: [access, directions, notes, i18n, progressive-disclosure, empty-states, xss-discipline]
status: complete
requires:
  - "plan 02-01: pendingBlock(), the renderer contract, the #location-body ownership split"
  - "plan 02-02: nothing directly. #loc-map is untouched by this plan"
  - "phase 1 design system (tokens, .pending recipe, .facts list, .objectives counter)"
  - "copy.js three language tables, and the existing access.pending.* keys"
provides:
  - "app.js renderAccess(), joined to the applyLanguage() re-render chain"
  - "app.js subHeading(key), buildDirections(), buildNotes()"
  - "app.js NOTE_KEYS, the fixed render order for the notes list"
  - "config.js venue.notes, seven fixed keys, all null"
  - "copy.js access.dir.heading, access.dir.pending.title, access.dir.pending.body"
  - "copy.js access.notes.heading plus notes.entrance through notes.arrive"
  - ".sub-h .steps .dir-prose .facts--notes CSS"
  - "the module-scope re-append rule that plan 04's video element depends on"
affects:
  - "plan 04 deletes the interim pendingBlock append and puts the real .video-slot in its place"
  - "plan 04 appends its heading, slot and back link into the same fixed sequence"
  - "any later change to venue.notes now renders with no code change"
tech-stack:
  added: []
  patterns:
    - "one renderer owns one container and clears it, mirroring renderLocation()"
    - "a builder returns the pending panel itself, and the caller reads its class to decide whether a heading belongs above it"
    - "a builder returns null when it produced nothing, so the caller omits the heading too"
    - "fixed literal key array instead of Object.keys, so render order is a property of app.js"
    - "translated labels from copy.js beside untranslated owner values from config.js"
    - "createElement plus textContent for every owner-authored string, including every list item"
key-files:
  created: []
  modified:
    - config.js
    - copy.js
    - app.js
    - styles.css
decisions:
  - "With door.directions null the pending panel carries the block and no access.dir.heading renders, which reconciles the ACC-04 resolved edge against UI-SPEC section 9 instead of picking one"
  - "renderAccess() ends by re-appending pendingBlock('access.pending.title', 'access.pending.body') so this commit is deployable on its own, since clearing #access-body destroys the static panel that is live now"
  - ".facts--notes restates the 640px single-column collapse, because a two-class selector outside a media query beats the shared one-class rule inside it at every width"
  - "buildDirections() and buildNotes() type-check every value, so a number, an object or a blank string degrades to the pending panel or to no row rather than rendering [object Object]"
metrics:
  duration: 13m
  completed: 2026-08-14
actuals:
  tokens: 4607
  tasks: 2
  commits: 2
---

# Phase 02 Plan 03: Written Directions and Practical Notes Summary

The access section now carries its text half: written directions that accept a sentence or a
numbered walking sequence and are always visible above the video, and a practical notes list
that shows exactly the rows the host filled in and vanishes entirely when none are.

## What Was Built

`renderAccess()` owns `#access-body` the way `renderLocation()` owns `#location-body`. It clears
the container, discarding the static pending markup on first run, and appends its blocks in one
fixed order: written directions, practical notes, video, back link. Text sits above the video
because text is read faster than video loads (D-12, D-15). It joins the `applyLanguage()`
re-render chain beside `renderLocation()`, from exactly one call site, so a language switch
rebuilds the section with no page reload and attaches no listener at all.

**Written directions, three shapes from one config value.**

| `door.directions` | What renders |
|---|---|
| An array of many | `h3.sub-h` over `ol.steps`, numbered 01, 02, 03 in red mono against a hairline rule, reusing the learning objectives counter outright |
| An array of one | The same, as a single row numbered `01`. Slightly formal, exactly the register |
| A non-empty string | `h3.sub-h` over `p.dir-prose` at 17px on a 60ch measure |
| `null`, blank, empty array, or a list with nothing usable in it | One `.pending` panel titled "Door instructions pending", and **no sub-heading above it** |

**Practical notes.** `venue.notes` ships seven keys, all null. `buildNotes()` walks a literal
ordered array rather than `Object.keys`, so the render order is a property of `app.js` and not of
what the owner did to the config file. Each non-empty string becomes one `.facts__row` with a
translated `dt` and the owner's own words in the `dd`. A null or blank value contributes no row
at all, and if nothing was produced the function returns `null` and the caller appends neither
the heading nor the list (D-16).

**The interim placeholder, and why it exists.** Clearing `#access-body` destroys the static
`.pending` panel that is live on the deployed page right now, and this site deploys from `main`
with no build step. So `renderAccess()` ends by re-appending
`pendingBlock('access.pending.title', 'access.pending.body')` in the video position. A guest
loading the site between this plan and plan 04 sees exactly the panel that ships there today,
rather than an access section whose video slot silently disappeared. It costs no copy key: both
strings have been live in all three languages since phase 1. Plan 04 task 1 deletes that one
line as it adds the real `.video-slot`; the two must never both render.

| Task | Name | Commit | Key files |
|---|---|---|---|
| 1 | renderAccess and written directions in three shapes | `99a6660` | config.js, copy.js, app.js, styles.css |
| 2 | Practical notes as a definition list echoing the course fact table | `dafaf00` | config.js, copy.js, app.js, styles.css |

## Verification Results

Both task gates pass (`DIRECTIONS_GATE_PASS`, `NOTES_GATE_PASS`) and all seven plan-level
verification items pass.

| # | Check | Result |
|---|---|---|
| 1 | `node --check app.js` | exit 0 |
| 2 | `venue.notes` shape | 7 keys, fixed order, all null |
| 3 | copy.js parity | 111 keys, three identical key sets |
| 4 | U+2014 and U+2013 codepoint scan across all five files | 0 |
| 5 | `enrol-form` tripwire | exactly 2, `enrollmentReady()` untouched |
| 6 | `--ink-faint` | exactly 4, unchanged |
| 7 | `.innerHTML =` in app.js | 0 |
| ES5 | arrow functions, `const`/`let` | 0 and 0 |
| extra | `renderAccess();` call sites | exactly 1, inside `applyLanguage()` |
| extra | `prefers-reduced-motion` blocks | still 2, this plan adds no animation |

### Behaviour proven beyond the source gates

The plan routes rendering to `human-check` because the project has no DOM harness and forbids a
build step. That constraint was respected: **no test infrastructure entered the repo.** `app.js`
was driven through a throwaway DOM stub in the scratchpad, loading the real `config.js`,
`copy.js` and `app.js` through `vm`, with working language buttons so a real switch could be
dispatched. Every claim below is a passing assertion, not an inspection.

**Written directions**

- Null renders one panel titled "Door instructions pending" carrying the `access.dir.pending.body`
  copy, with **zero `.sub-h` in the section**. The forbidden bare heading cannot occur.
- A string renders `h3.sub-h` then `p.dir-prose` then the interim panel: three children, in that
  order, with the sentence verbatim.
- An array of four renders `h3.sub-h` then `ol.steps` with four `li`, text preserved in order and
  byte for byte. An array of one renders a single row.
- Five degenerate shapes were fed in (empty string, empty array, array of blanks, a number, an
  object). All five fall to the pending panel with no heading. None renders `[object Object]`.
- A page with no `#access-body` at all does not throw.

**Practical notes**

- Shipped config, all seven null: no `.facts--notes`, no sub-heading, section is two children.
- Setting `floor` before `entrance` still renders entrance first. Order comes from `NOTE_KEYS`,
  not from assignment order.
- All seven set render as Entrance, Floor, Doorbell, Parking, Public transport, What to bring,
  When to arrive, in that order.
- Mixed junk (`''`, `null`, `0`, `{}`, `false`) alongside two real strings produces exactly two
  rows, no `n/a` filler and no empty `dd`.
- With directions null and one note set, the section is four children and the only sub-heading is
  "Practical notes".

**Position and language**

- With both blocks configured the section is exactly five children: directions heading, steps,
  notes heading, notes list, interim panel. **The interim panel is last on every path tested.**
- EN to DA to IT to EN translates both sub-headings, both pending titles and every note label,
  while note values stay verbatim in every language, which is the documented tradeoff working.
- After two switches there is still exactly one `ol.steps`, one `.facts--notes`, and the same
  child count. Nothing accumulates.

**Injection discipline (T-02-09)**

- `<img src=x onerror=...>` as a directions string, as a list entry, and `<script>` as a note
  value all render as literal text with zero element children on the node.

### Still owed to a real browser (D-23)

The 20px to 17px typographic step, the `.steps` numerals and hairlines matching the objectives
list higher up, the `.facts--notes` collapse and Danish label wrapping at 320px, and the absence
of horizontal scroll are rendering outcomes no stub can prove. These remain this plan's two
`human-check` blocks and are covered by the phase's D-23 pass.

## Deviations from Plan

No auto-fixes were needed and nothing was blocked. Three implementation decisions went past the
letter of the plan and are recorded rather than left to be discovered.

**1. `.facts--notes` restates the 640px single-column collapse**

The plan and UI-SPEC section 10 both say `.facts--notes` changes exactly one property and
inherits everything else, "the single-column collapse at 640px" named explicitly. Written
literally that is false in the cascade: the shared collapse is `.facts__row` inside a media
query, media queries carry no specificity of their own, and `.facts--notes .facts__row` therefore
beats it at every width. The notes list would have been the one table on the page that refuses to
collapse on a phone, which is the width it is most read at. One extra rule restores the inherited
behaviour the contract intended, and it is commented so nobody deletes it as duplication. This is
the same cascade trap 02-01 hit with the coarse-pointer touch minimums, in the opposite
direction.

**2. Every config value is type-checked, not just null-checked**

The plan says "a non-empty string" and "a non-empty array". Implemented literally as
`typeof value !== 'string' || !value`, so a number, an object or a boolean left in `config.js` by
a non-programmer degrades to the pending panel or to no row. An array whose entries are all blank
also falls through to pending, because a list that renders zero rows is an empty shell wearing a
heading, which is the exact state D-16 forbids.

**3. The pending case is detected by reading the returned node's class**

The plan requires `buildDirections()` to return the result of `pendingBlock(` on the null branch,
and separately requires the sub-heading to be created inside a branch that excludes that case.
The caller therefore reads `directions.classList.contains('pending')`. A boolean second return
value or a null return would have been cleaner, but both contradict the stated acceptance
criterion. Recorded because it is the one place in this plan where a class name carries meaning
in JS.

### Deliberate refusals carried out of the plan

- **No `venue.notes` key was added, renamed or reordered.** The seven are fixed and the order is
  the contract's.
- **No per-language notes structure.** Values are shown exactly as written in every language, and
  the config comment says so in plain words. A per-language config object is a structure a
  non-programmer gets wrong, and "3. sal" should not be translated anyway.
- **No icon, no new colour, no new font family, no new weight.** Every new declaration references
  an existing custom property or an existing size already on the page.
- **No animation of any kind on the notes list.** A stagger would animate the exact rows a guest
  is squinting at outdoors. The reduced-motion block count is unchanged at 2.
- **`access.video.heading` and `access.back` were not created.** They belong to plan 04, and the
  phase registry says do not create another plan's symbols early.

## Known Stubs

One, and it is deliberate, time-boxed and named in the plan's own success criteria.

| Stub | File | Line | Why it is intentional and who resolves it |
|---|---|---|---|
| Interim `pendingBlock('access.pending.title', 'access.pending.body')` standing in the video position | `app.js` | last statement of `renderAccess()` | It is not a placeholder for missing work, it is the panel that is live on the deployed site today, re-appended so this commit is deployable on its own. **Plan 04 task 1 deletes this line as it adds the real `.video-slot`.** The two must never both render. |

Nothing else is stubbed. Every other element in the section is wired to real config or is absent
from the DOM by construction, and both pending panels are live states with real copy in three
languages, not placeholders.

## Threat Flags

None. The plan's `<threat_model>` anticipated every trust boundary this plan touches.

| Threat ID | Disposition | Status |
|---|---|---|
| T-02-09 tampering via config strings written into the DOM | mitigate | Every node is `document.createElement` filled with `textContent`, including every `li` and every `dd`. Gate: zero `.innerHTML =` in app.js. Proven with markup payloads in all three positions. |
| T-02-10 disclosure of the entrance, staircase, floor and doorbell of a private residence | accept | All seven values ship null, so nothing is disclosed until the owner fills a row, and the config comment tells them plainly that these appear on a public page in every language. Same accepted decision as the address. |
| T-02-SC dependency supply chain | accept | Nothing installed. This plan adds no third-party runtime asset. |

## Notes for Plan 04

- **Delete the interim append.** It is the last statement of `renderAccess()` and carries a
  comment saying so. Put `subHeading('access.video.heading')` and the real `.video-slot` in its
  place, then the back link after it.
- The module-scope re-append rule is stated in the `THE ACCESS SECTION` banner comment in
  `app.js`. The `<video>` element is the first node that actually needs it: `renderAccess()`
  clears `#access-body` on every language switch, so a recreated player would stop dead in the
  hand of a guest watching it. Hold it at module scope and re-append, the way `#loc-map` is held.
- copy.js stands at **111 keys per table**. Plan 04 adds two (`access.video.heading`,
  `access.back`) for 113, matching the phase registry.
- `.sub-h` already carries `margin-top: var(--s-7)`, so the video heading needs no spacing of its
  own.
- `--ink-faint` is still at exactly 4 occurrences and the gate counts comment text, so do not name
  the token in a comment. Say "the faint ink token" instead.
- The reduced-motion query count is still 2. Plan 04 adds no animation, so it should stay at 2.
- The `.facts--notes` cascade note above is worth reading before adding `.inline-link--back` as a
  modifier on `.inline-link`: the coarse-pointer minimum will need the same source-order care that
  bit 02-01.

## Self-Check: PASSED

| Item | Result |
|---|---|
| config.js, copy.js, app.js, styles.css | all present, all modified |
| `99a6660` task 1 | found in git log |
| `dafaf00` task 2 | found in git log |
| `.planning/phases/02-practical-information/02-03-SUMMARY.md` | present |
| commits contain zero file deletions | verified on both |
| working tree | clean apart from the pre-existing `.planning/config.json` change and untracked `.gsd/`, neither of which belongs to this plan |
