---
status: complete
phase: 03-enrollment-identity-and-the-group
source: [03-VERIFICATION.md]
started: 2026-08-15T12:30:00Z
updated: 2026-08-17T18:45:00Z
---

## Current Test

[testing complete]

<!-- Tests 4 and 6 were resolved at the desk on 2026-08-17. Tests 1, 2, 3 and 5
     were run together on real devices the same day, once the GitHub Pages
     deploy was repaired — the live site had been serving the 13 August build
     across roughly 160 pushes, so no earlier device attempt would have been
     testing this phase's code at all. -->

## Automated verification pass

Run 2026-08-17 against the local preview at `http://127.0.0.1:4173/` with
Playwright, Chromium, viewport 390x844, `emulateMedia({ reducedMotion: 'reduce' })`.

UI checkpoints: 2 auto-verified (tests 4, 6), 4 queued for manual review (tests 1, 2, 3, 5).

What the desk can and cannot settle: `prefers-reduced-motion` is a plain media
query, so emulating it exercises the same CSS the OS setting would, and test 4
is fully answered. Touch-target height is a computed value with no
`@media (pointer: coarse)` rule attached to the three controls in question, so
the measured height *is* the coarse-pointer height, and test 6 is fully
answered. Nothing here reproduces iOS Safari's collapsing toolbar,
`env(safe-area-inset-bottom)`, a real dropped packet, screen-reader
announcement, or mobile-data timing, which is what leaves the other four
outstanding.

## Tests

### 1. Tables A to F of `03-DEVICE-PASS.md`, on real iOS Safari and real Android Chrome
expected: Every row carries a result. In particular Table A: with the bar shown at 320x568, 375x667, 390x844 and 430x932, each of the countdown clock, the address value and the door video slot can be scrolled clear of the bar, and the footer's last line is fully visible at maximum scroll.
why_human: NDG-02 is the highest risk item in the phase. The nudge bar has never rendered on any device, and the reserve it replaced was short by up to 27px on a notched iPhone. Every row depends on `env(safe-area-inset-bottom)` or on iOS Safari's collapsing toolbar, neither of which exists at a desk.
result: pass
reported: "ok"
tested_on: 2026-08-17, real devices, against the live site after the Pages deploy was repaired

### 2. NDG-01: load the site on both phones and look at the bar
expected: The bar is pinned to the bottom of the viewport in both `data-state` values, `enrol` and `group`.
why_human: Both states are driven and confirmed in code; nothing has been seen pinned to a real screen.
result: pass
reported: "Bar after registration disappears (not sure what is planned, but not bad)"
tested_on: 2026-08-17, real devices
note: |
  The observed behaviour is correct, and the test's `expected` line was written
  against a configuration this site does not currently have.

  `data-state="enrol"` was seen pinned on a real screen, which is the half NDG-01
  had never had evidence for. `data-state="group"` did not appear, and cannot:
  the group branch at app.js:3540 is guarded by `if (wa && store.get('wa_joined')
  !== '1')`, and `wa` is `CFG.whatsapp.inviteUrl`, which is `null` at
  config.js:164. With no group to point at, control falls to the `hideNudge(bar)`
  at the end of the function. The comment above the branch states the intent
  directly: "Enrolled. Offer the group once, then never bother them again." A bar
  that stayed up saying nothing would be the defect; the bar standing down is the
  design.

  So this is recorded as a pass on behaviour, with one half of the rendering
  still unwitnessed. The `group` state becomes reachable the moment an invite URL
  is set, and should be looked at once on a device at that point. Logged under
  Deferred Follow-Ups rather than left as a gap, because nothing is broken and no
  code change is implied — only a configuration value the host has not chosen yet.

### 3. ENR-06 on a device: withdraw a registration on a phone, then repeat with airplane mode turned on mid-request
expected: The confirmation shows the submitting state, focus lands where the panel says it does, and the airplane-mode attempt leaves the confirmation standing with the retry label rather than removing the control.
why_human: The state machine is now driven branch by branch at the desk against the shipped source, and every branch terminates correctly. What that cannot show is focus behaviour, screen-reader announcement, and a real dropped packet. Table F is unrun.
result: pass
reported: "ok"
tested_on: 2026-08-17, real devices, including the airplane-mode branch

### 4. DSG-05 observed half: turn Reduce Motion on at the OS level and drive the form
expected: The sweep bar is static at full width and 0.35 opacity rather than stranded part way across; the form to success panel swap is instant; the `:active` scale is instant; the bar's slide is instant.
why_human: The two reduced-motion blocks are declared correctly and gated in source, but the observed half needs the OS setting on and a screen.
result: pass
source: automated
verified: 2026-08-17, Playwright + Chromium, emulateMedia reducedMotion=reduce, viewport 390x844
evidence: |
  `matchMedia('(prefers-reduced-motion: reduce)').matches` = true, so the blocks at
  styles.css:813 and styles.css:1824 were live for every reading below.

  - `.sweep::after` — animation-name `none`, width `100%`, opacity `0.35`,
    transform `none`. Parked at full width, not stranded part way across. This is
    the row the test names first and it matches exactly.
  - `.map-wait__bar::after` — animation-name `none`, opacity `0.35`, transform
    `none`, width `325px` (= 100% of its 325px container at this viewport).
  - `.panel` — transition-property `none`, opacity `1`. The form to success panel
    swap is instant. Read by injecting a `.panel` element, because the real one
    mounts only after a submit; the rule under test is a static CSS declaration,
    so the injected node resolves the identical cascade.
  - `.album__tile` — transition-duration clamped, transform `none`, so the
    `:active` scale is instant.
  - `.nudge` — transition-duration `1e-05s`, so the bar's slide is instant.
  - `html` — scroll-behavior `auto`.

  Why this closes the "observed half" rather than merely re-reading the source:
  the previous desk check confirmed the rules were *declared and gated*. This one
  confirms the browser *resolved* them — computed values after cascade, specificity
  and the `!important` clamp interacted. The OS toggle's only role is to flip the
  media query, which is flipped here.

### 5. DEL-02, DEL-03: enrol end to end on a mid-range phone on mobile data, not wifi
expected: Under ten seconds, on iOS Safari and Android Chrome, and no viewport zoom when the name field takes focus.
why_human: The roadmap's Done-when sentence opens with this clause and it is unmeasured. Carried over from phase 2, where WINDOWS entry 1 records the same debt.
result: pass
reported: "ok"
tested_on: 2026-08-17, real devices on mobile data
note: Clears the debt WINDOWS entry 1 carried over from phase 2. The roadmap's Done-when sentence opens with this clause and it is now answered rather than assumed.

### 6. Table D of `03-DEVICE-PASS.md`: measure the three declared-short touch targets on a coarse pointer
expected: The name input, the guest-count segment and the select overflow branch measure at least 52px per `03-UI-SPEC.md` Touch Target Geometry.
why_human: `styles.css` still declares 48px with no coarse override at lines 421, 1274 and 1369. 48px clears the 44px floor, so this is a shortfall against the phase's own stricter contract rather than an accessibility failure. Deliberately deferred to the same moment Table D is answered (WINDOWS entry 10, `deferred-items.md`).
result: skipped
source: automated
reason: "Deferred follow-up: measured, confirmed short, and already dispositioned. The three controls resolve to 48px against the 52px contract. This is the pre-existing deferral at WINDOWS entry 10 of `deferred-items.md`, not a new finding, so it is recorded here rather than opened as a phase-3 gap."
verified: 2026-08-17, Playwright + Chromium, viewport 390x844
evidence: |
  Measured computed `min-height` and rendered box height:

  | Control | Selector | min-height | rendered | contract |
  |---|---|---|---|---|
  | Name input | `.field__input` | 48px | 48.0px | 52px |
  | Guest-count segment | `.seg > span` | 48px | 48.0px | 52px |
  | Submit (control) | `#enrol-submit` | 52px | 52.0px | 52px |

  The select overflow branch (`.field__select`) does not render at this state, so
  it could not be measured directly. It shares the single rule at styles.css:1272-1275
  with `.field__input` — one selector list, one `min-height: 48px` — so it carries
  the same value by construction.

  Why a coarse pointer adds nothing here. A grep of `styles.css` finds
  `@media (pointer: coarse)` blocks at lines 257, 619, 1028, 1056, 1517, 1656,
  1751, 2017 and 2040, and none of them names `.field__input`, `.field__select`
  or `.seg`. With no coarse rule in the cascade for these three, the coarse-pointer
  computed height is by definition the height measured above. `#enrol-submit` is
  the control case: it *does* have a coarse rule (line 1517) and it does reach 52.

  So the phone would return 48px, which is what the stylesheet already says. The
  open question was never the measurement — it is whether to raise the three to 52
  or to amend the contract. That decision is still open and still deferred.

## Summary

total: 6
passed: 5
issues: 0
pending: 0
skipped: 1
blocked: 0

## Deferred Follow-Ups

- test: 2
  idea: "Witness the nudge bar's `data-state=\"group\"` rendering on a device once `whatsapp.inviteUrl` is set in config.js (currently null at line 164). The branch is unreachable until then, so the state has correct-but-unobserved rendering. No code change implied — this waits on a configuration value the host has not chosen yet."
  deferred_at: 2026-08-17
  resolved_at: 2026-08-17
  resolution: |
    Closed the same day it was opened. The owner supplied the invite link, it was
    set at config.js:164, and all four guarded surfaces switched on together: the
    `#wa` section, the nudge bar's `group` state, and the success panel's button.
    Confirmed working on a device by the owner.

    The handoff was also rebuilt while the link was going in, because a plain
    text button in the site palette did not read as an invitation. It now carries
    the WhatsApp mark as inline SVG cloned from a `<template>`, inside a bordered
    card with a full-width green control. Two defects were caught during that
    work rather than after it: the label needed its own span, because
    `applyLanguage()` writes `[data-i18n]` elements with `el.textContent` and
    would have deleted the icon on the first language switch; and the card's mark
    carried two equal-weight classes, so the button-sized one won on source order
    and rendered it at 22px instead of 80. Both fixed and verified.

- test: 6
  idea: "Raise `.field__input`, `.field__select` and `.seg > span` to 52px under `@media (pointer: coarse)`, or amend `03-UI-SPEC.md` Touch Target Geometry to accept 48px for text-entry and segmented controls. Measured at 48px on 2026-08-17; clears the 44px accessibility floor, short of the phase's own 52px contract."
  deferred_at: 2026-08-17

## Gaps

None outstanding at the desk. All three verification gaps closed and were re-derived
first-hand rather than read from the summaries, and the five regressions the gap-closure
round introduced were found by code review and fixed.

### Already discharged, listed so it is not re-tested

`03-VERIFICATION.md` carries a seventh `human_verification` item, N-01: a decision about the
gap-closure code review having no artifact on disk. That is resolved and needs no user action.

The review had been written to disk, then overwritten during a worktree merge by the older
review's content, leaving both `03-REVIEW.md` and `03-REVIEW-pre-gap-closure.md` holding the
same bytes. The reviewer's original was recovered from a backup taken before the merge and
restored in commit `ed9a617`; `deferred-items.md` gained section 3 dispositioning all nine
gap-closure findings, and its stale pointer at the renamed file was corrected, in `3b5bed6`.
The two reviews now use separate ID sequences and the file says so, which is what the
verifier's N-01 was actually protecting against: a commit message reading `CR-01` resolving
against the wrong review.

### The one thing phase 4 inherits

The sixth-photo limit (`photo_limit_reached`) is unproven on the wire. Probe F proves the
trigger runs again after the CR-01 fix, but proving the limit still refuses a sixth row means
writing five real photo rows, and no delete rule exists for anyone in this schema. Phase 4
owns that proof and should carry it as an explicit task rather than assume it. Recorded in
`deferred-items.md` section 3b and in `supabase/schema.sql`'s STATUS header.
