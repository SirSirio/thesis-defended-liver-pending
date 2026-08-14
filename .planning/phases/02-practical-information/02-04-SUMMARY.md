---
phase: 02-practical-information
plan: 04
subsystem: access-video
tags: [access, video, ios-safari, empty-states, aspect-ratio, focus-management, phase-close]
status: complete
requires:
  - "plan 02-01: pendingBlock(), the renderer contract"
  - "plan 02-03: renderAccess(), subHeading(), the fixed block order, and the module scope re-append rule"
  - "phase 1 design system (tokens, .pending recipe, .inline-link, the global focus ring, smooth scrolling with its reduced-motion reset)"
  - "copy.js three language tables and the existing access.pending.* keys"
provides:
  - "app.js buildVideo(), returning a fixed ratio .video-slot holding either the player or the pending panel"
  - "app.js videoEl, videoMountedSrc and videoFailed, the module scope trio that survives a language switch"
  - "app.js the back to map inline link, appended last in renderAccess()"
  - "config.js door.aspect, default 16/9"
  - "copy.js access.video.heading and access.back, 113 keys per table"
  - ".video-slot, its portrait cap, the in-slot pending geometry, .video-slot video, .inline-link--back CSS"
  - "index.html focusable location and access sections"
affects:
  - "the deployed access section: plan 03's interim pending append is deleted and the real slot stands in its place"
  - "any later section that wants a jump target now has the focusable pattern to copy"
  - "phase 5 pre-flight inherits the D-23 device pass as the phase's outstanding backstop"
tech-stack:
  added: []
  patterns:
    - "a slot returned on every path, so the unconfigured state and the configured one are the same box and the same height"
    - "an attribute pair set as attributes AND as properties in one construction path, so neither can ship without the other"
    - "an optional attribute omitted entirely rather than written blank"
    - "a node held at module scope and re-appended, never rebuilt, so a language switch does not interrupt playback"
    - "a failure flag beside the held node, so a known broken source is never remounted"
    - "a modifier class written directly below the class it modifies, because equal specificity leaves only source order"
key-files:
  created: []
  modified:
    - config.js
    - copy.js
    - app.js
    - styles.css
    - index.html
decisions:
  - "The video slot renders at the configured ratio on every path, so the pending panel and the player are the same box and the day the file arrives nothing on the page moves"
  - "playsinline and muted are set as attributes and as properties in one construction path, because either alone fails inline playback on iOS Safari"
  - "Both failure paths, absent file and broken path, land on the same phase 1 panel with nothing written to the console"
  - "The in-slot pending panel uses min-height rather than the spec's height, because at 320px in Danish the copy is taller than a 16 by 9 box at that width and a fixed height would spill the sentence out of the panel"
  - "The slot carries no top margin of its own: .sub-h above it already brings 48px, and a second gap would leave the heading floating equidistant between its own box and the block above it"
metrics:
  duration: 16m
  completed: 2026-08-14
actuals:
  tokens: 3442
  tasks: 3
  commits: 3
---

# Phase 02 Plan 04: The Door Video Slot Summary

The section the site is named after now ships complete against a file that does not exist yet:
a fixed ratio slot that reads as documentation pending, a player that plays inline on iOS Safari
the moment one config line is set, and every failure path landing on the same deliberate panel.

## What Was Built

**The slot, and why it is the deliverable.** `buildVideo()` returns a `.video-slot` on every
path. With `door.videoSrc` null it holds one `.pending` panel and constructs no video element at
all. With a file configured it holds the player. Both are the same box at the same ratio, so the
day the owner drops a clip into `assets/` and sets one line, the player appears and nothing below
it moves by a pixel (D-11). The unconfigured state is not a stopgap standing in for the real
thing; it is what most guests will see for weeks, and it was built as the product.

**The ratio comes from config, not from the viewport.** `door.aspect` defaults to `'16/9'` and is
documented in the file's own voice for someone who filmed the door upright on their phone. JS
parses it, sets `--video-aspect` inline on the slot, and adds `data-orient="portrait"` when the
numerator is smaller than the denominator; CSS caps a portrait slot at 360px. Nine unparseable
values were fed in (`null`, `''`, `'wide'`, `'16'`, `'0/0'`, `'16/0'`, a number, an object, and
whitespace) and every one falls back to landscape rather than to a collapsed box, because a wrong
shape is a far smaller harm than no shape.

**The attribute pair that is the whole point of the phase.** `playsinline` and `muted` are set as
attributes AND as element properties in one construction path. Older WebKit honours the property
where an attribute set after creation is ignored, and either one alone fails inline playback on
iOS Safari, which is exactly the fullscreen takeover ACC-01 exists to prevent. They are written
as a pair and asserted as a pair. `controls` and `preload="metadata"` are set beside them.
Nothing self starts, `play` is never called from script, and `controlsList` is not set.

**The poster attribute is omitted, never blanked.** It is written only inside a truthiness branch
on `door.posterSrc`. An empty `poster=""` makes Safari request the page itself as an image, so a
null poster produces no attribute at all. Verified against `null`, `''` and a number.

**Every failure is one event with one message.** The source is set on the video element itself
rather than in a child `<source>`, so a missing file fires its error on the node the handler is
attached to. The handler clears the slot and appends
`pendingBlock('access.pending.title', 'access.pending.body')`, the same panel a null source
produces, and sets a module scope flag so a later re-render does not put the broken player back
just to watch it break again. Nothing is written to the console anywhere in `app.js`. To a guest
standing outside, a missing file and an unmade file are the same event; the owner catches the
difference in `config.js`, which is the file they were going to open anyway.

**The player survives a language switch.** `renderAccess()` clears `#access-body` on every
switch, so the element and the source it was built from are held at module scope and re-appended,
the way `#loc-map` next door is kept. Proven: the identical element object comes back after three
language switches, only one video exists in the section, the error listener is attached exactly
once, and the heading above it translates. A changed `videoSrc` discards the held element and
builds fresh.

**Plan 03's interim placeholder is gone.** It was the last statement of `renderAccess()`, and it
was deleted in the same commit that added the real slot. There is now exactly one call to
`pendingBlock('access.pending.title', ...)` in the null branch of `buildVideo()` plus one in the
error handler, and the two can never both render because the second only fires on an element that
only exists when the first did not run. Asserted: exactly one Access-documentation panel in the
section on every configuration tested.

**The jump path is closed.** `#location` and `#access` carry a minus one tab index, so a jump from
the hero "Which door" button, the top bar entry or the new back link moves focus onto the landed
section rather than only the viewport, and the next Tab continues inside it. No JS scroll handler
was added: the smooth scrolling in `styles.css` already becomes an instant jump inside the
reduced-motion query, and a scripted scroll would drive straight past a preference the guest set
deliberately. The focus ring is suppressed for `:focus:not(:focus-visible)` only, so a tap does
not paint a ring around a whole section while a keyboard jump still shows where it landed.

**The back affordance is a link, not a third button.** Within-page jump, not an action; the fact
table already uses `.inline-link` for exactly this; and a third large button under a video would
compete with the two directions buttons that are the real actions on the page. It gets a 44px
inline-flex box on coarse pointers.

| Task | Name | Commit | Key files |
|---|---|---|---|
| 1 | The video slot and the unconfigured state that ships first | `7dd0a40` | config.js, copy.js, app.js, styles.css |
| 2 | The player, its attribute pair, and every failure landing on the same panel | `c07b811` | app.js, styles.css |
| 3 | Back to the map, focusable jump targets, and the closing verification sweep | `e10f94d` | copy.js, app.js, styles.css, index.html |

## Verification Results

All three task gates pass: `SLOT_GATE_PASS`, `PLAYER_GATE_PASS`, `PHASE_SWEEP_PASS`.

### Phase closing sweep (D-23 source half), run from the repository root

| # | Check | Result |
|---|---|---|
| 1 | `node --check app.js` | exit 0 |
| 2 | copy.js parity | 113 keys, three identical key sets |
| 3 | `grep -c '<iframe' index.html` | 0, and no `frame`, `embed` or `object` either |
| 4 | `grep -c 'enrol-form' app.js` | exactly 2, and `enrollmentReady()` is byte-identical to its phase 1 body (diffed against the pre-phase blob) |
| 5 | `grep -c -- '--ink-faint' styles.css` | exactly 4, unchanged. No new element sits on the 3.88:1 pairing |
| 6 | `grep -cE '\.innerHTML[[:space:]]*=' app.js` | 0 |
| 7 | U+2014 and U+2013 codepoint scan across all five source files | 0 |
| 8 | `grep -c 'scrollIntoView' app.js` | 0 |
| extra | address string in `index.html` | 0. The only `trong` hits are the word "strongly" in two meta descriptions |
| extra | `grep -c 'autoplay' app.js` | 0, including comments |
| extra | `console.log` / `console.error` in app.js | 0 and 0 |
| extra | `renderAccess();` call sites | exactly 1, inside `applyLanguage()` |
| extra | `prefers-reduced-motion` blocks in styles.css | still 2. This plan adds no animation |
| ES5 | arrow functions, `const`/`let` | 0 and 0 |

### Behaviour proven beyond the source gates

No test infrastructure entered the repo. As in plan 03, `app.js` was driven through a throwaway
DOM stub in the scratchpad, loading the real `config.js`, `copy.js` and `app.js` through `vm`
with working language buttons so a real switch could be dispatched. **71 assertions, 0 failures.**
Every claim below is a passing assertion, not an inspection.

**The unconfigured state**

- Shipped config renders four blocks in the fixed order: directions pending panel, video
  sub-heading, slot, back link. The slot holds exactly one child and it is the pending panel.
- Zero video elements anywhere in the section on the null branch.
- Exactly one Access-documentation panel. The second `.pending` in the section is the directions
  one carrying its own copy, which is the correct two-panel state when both config values are
  null. **Plan 03's interim append is confirmed gone.**
- The panel title is the phase 1 string verbatim, in all three languages.

**Ratio**

- `16/9` sets the custom property and no orientation attribute; `9/16` sets both.
- Nine degenerate aspect values all fall back to `16/9` with no portrait attribute.

**The player**

- Every locked attribute present: `playsinline` and `muted` as attributes and as properties,
  `controls`, `preload="metadata"`, `src` on the element itself, no child `<source>`.
- No self-starting attribute and no `controlsList` on the constructed element.
- Poster set when configured, absent entirely for `null`, `''` and a non-string.
- Seven degenerate `videoSrc` values (`null`, `''`, `0`, `12`, `{}`, `false`, `[]`) all fall to
  the pending panel with no video element built.

**Failure and language**

- Firing `error` removes the video and leaves one pending panel with the same title the null
  branch shows. Neither the word "error" nor the configured path appears anywhere in the
  section's text.
- After a language switch the errored source is not remounted, and the panel is now in Danish.
- With a working file, three language switches return the identical element object, one video,
  four blocks, one error listener, and a translated heading and back link.
- With directions and one note also configured the section is seven blocks with the slot sixth
  and the back link last.
- A page with no `#access-body` does not throw.

**The back link**

- Last child of the section, carries both `inline-link` and `inline-link--back`, `href="#location"`,
  text "Back to the map and address", and **no click listener**: the href does the whole job.

### Still owed to real hardware (D-23, backstop)

Both of this plan's `human-check` blocks and the phase's two backstop truths remain outstanding
and **abstain to human review rather than passing silently.** They cannot be proven from source
and the project has no device or DOM harness, which is a locked constraint, not an omission:

1. **Real iOS Safari and real Android Chrome.** Inline playback with no fullscreen takeover (the
   single behaviour this phase most needs), clipboard copy of the address including the a-ring
   and the o-slash, Google Maps opening a route on both platforms, Apple Maps opening on iOS and
   its button being absent on Android, both jumps landing with the heading below the sticky bar,
   the back link measuring at least 44px, and the jump being instant with Reduce Motion on.
2. **320px in Danish with all seven notes filled.** No horizontal scroll, no truncated label.
3. **The in-slot panel geometry.** That the panel fills the slot rather than floating centred in
   it, that there is one border and no nested box, and that a 9 by 16 slot is capped at 360px.

`tools/preview.js` is present and serves the working tree at 127.0.0.1:4173 for that pass. Making
it reachable from a phone on the same LAN is the one part of this plan's precondition that only a
human can establish.

## Deviations from Plan

No auto-fixes were needed and nothing was blocked. Three implementation decisions went past the
letter of the plan and are recorded rather than left to be discovered.

**1. The in-slot pending panel uses `min-height: 100%`, not the spec's `height: 100%`**

At 320px a 16 by 9 slot is about 153px tall. The Danish `access.pending.body` string at that
width is roughly 200px of text before padding. Written literally, the panel would have a fixed
height and the sentence would spill out of the bottom of its own border, on the narrowest phone,
in the section the core value depends on. `min-height` satisfies the contract's actual intent,
that the panel fills the slot rather than floating centred inside it, and lets the box grow to
hold its own words in the one case where it must. Everywhere else it is exactly the slot.

**2. The slot carries no top margin**

The plan asks for `var(--s-7)` above `.video-slot` "to match the spacing between the section's
sub-blocks". That spacing already exists: `.sub-h` carries `margin-top: var(--s-7)` and
`margin-bottom: var(--s-4)`, so the sub-block gap is served by the heading. Adding 48px below the
heading as well (adjacent vertical margins collapse to the larger, so 48 and not 64) would leave
the "Door video" heading equidistant between the block above it and the box below it, which is
the ambiguity a heading exists to resolve. The pairing the rest of the section uses, heading then
16px then content, is preserved instead.

**3. `.inline-link--back` is written directly below `.inline-link`, not in the access block**

Third instance of the same cascade trap in this phase, after 02-01's touch minimums and 02-03's
notes collapse. `.inline-link` and `.inline-link--back` weigh exactly the same, the access CSS
block sits earlier in the file, and the cleared left margin would have lost silently on source
order alone. It is written below the class it modifies with a comment saying why, so nobody
tidies it upwards. `margin-top: var(--s-6)` was added for the same reason the plan did not
anticipate: the link would otherwise butt against the bottom edge of the video slot.

### One near miss worth recording

The first version of the `index.html` comment explaining the jump targets spelled the attribute
out literally, which pushed `grep -c 'tabindex="-1"' index.html` to 3 and failed the gate on a
comment. It is the same lesson 02-03 recorded for the faint ink token: **these gates count comment
text.** The comment now describes the attribute in words and says so explicitly.

### Deliberate refusals carried out of the plan

- **No JS scroll of any kind.** No `scrollIntoView`, no scroll handler, no scroll library. The
  href and the existing CSS do the whole job, and the reduced-motion reset already covers it.
- **No restyling of native video controls,** and no rule anywhere in `styles.css` targeting a
  control pseudo element. A hand rolled player is pure failure surface on iOS Safari.
- **No `controlsList`.** Chrome only, and preventing download serves nobody here.
- **No new pinned or fixed element.** The bottom bar is reserved for the enrollment nudge.
- **No animation.** The reduced-motion block count is unchanged at 2.
- **No new colour, icon, font family or weight.** Every new declaration references an existing
  token or a size already on the page.
- **No test infrastructure in the repo.** The stub that produced the 71 assertions lives in the
  scratchpad and is not committed.

## Known Stubs

**None.** Plan 03's single tracked stub, the interim `pendingBlock` append in the video position,
was deleted by task 1 of this plan and is verified absent. Every element in the access section is
now wired to real config or is absent from the DOM by construction.

The two `null` values still in `config.js`, `door.videoSrc` and `door.posterSrc`, are not stubs.
They are the shipped configuration, they render a designed state with real copy in three
languages, and the code path that consumes them is complete and tested. Filling them is an owner
input, tracked in STATE.md as such.

## Threat Flags

None. The plan's `<threat_model>` anticipated every trust boundary this plan touches, and no new
network endpoint, auth path, file access pattern or schema change was introduced.

| Threat ID | Disposition | Status |
|---|---|---|
| T-02-11 tampering via `videoSrc` and `posterSrc` applied as attributes | mitigate | Every attribute is set with `setAttribute` on an element built by `createElement`. Both values are same-origin relative paths. The poster attribute is omitted entirely when null, which also closes the case where Safari requests the page itself as an image. |
| T-02-12 spoofing via browser or developer text reaching a guest | mitigate | The error handler swaps in the same pending panel the null branch produces. Gate: zero `console.log` and zero `console.error` in app.js, so no developer-facing string exists to leak. Asserted: neither the word "error" nor the configured path appears in the section's text after a failure. |
| T-02-13 disclosure of a private residence in a public repository | accept | Unchanged owner decision. Both values ship null, so nothing is exposed until a clip is committed. |
| T-02-SC dependency supply chain | accept | Nothing installed. No package manager, no lockfile, no build step, no third-party runtime asset added by this plan. |

## Notes for the Phase Verifier

- The phase is code complete. The one outstanding item is the **D-23 real device pass**, which
  the plan itself classifies as a backstop that abstains to human review. It is not a gap in the
  implementation; it is a class of proof this project deliberately has no harness for.
- `copy.js` stands at **113 keys per table**, matching the phase registry exactly. Twenty new
  keys across the phase, three identical key sets.
- The `grep -cF "pendingBlock('access.pending.title'" app.js` count is now **2** by design: the
  null branch and the error handler. Plan 04 task 1's `-eq 1` assertion was correct only at that
  moment and the plan says so in writing. **Do not "fix" it back down to 1.**
- Three cascade traps have now been hit in this phase, all from equal-specificity rules losing on
  source order. Anyone adding CSS to the access or location sections should check where their
  selector sits relative to the one it means to override before trusting inheritance.

## Self-Check: PASSED

| Item | Result |
|---|---|
| config.js, copy.js, app.js, styles.css, index.html | all present, all modified |
| `7dd0a40` task 1 | found in git log |
| `c07b811` task 2 | found in git log |
| `e10f94d` task 3 | found in git log |
| commits contain zero file deletions | verified on all three |
| working tree | clean apart from the pre-existing `.planning/config.json` change and untracked `.gsd/`, neither of which belongs to this plan |
| orphan worktrees under `.claude/worktrees/` | untouched, unread, and no `git worktree` subcommand was run |
