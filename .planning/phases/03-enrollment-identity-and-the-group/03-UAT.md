---
status: testing
phase: 03-enrollment-identity-and-the-group
source: [03-VERIFICATION.md]
started: 2026-08-15T12:30:00Z
updated: 2026-08-15T12:30:00Z
---

## Current Test

number: 1
name: Tables A to F of 03-DEVICE-PASS.md, on real iOS Safari and real Android Chrome
expected: |
  Every row carries a result. In particular Table A: with the bar shown at 320x568, 375x667,
  390x844 and 430x932, each of the countdown clock, the address value and the door video slot
  can be scrolled clear of the bar, and the footer's last line is fully visible at maximum
  scroll.
awaiting: user response

## Tests

### 1. Tables A to F of `03-DEVICE-PASS.md`, on real iOS Safari and real Android Chrome
expected: Every row carries a result. In particular Table A: with the bar shown at 320x568, 375x667, 390x844 and 430x932, each of the countdown clock, the address value and the door video slot can be scrolled clear of the bar, and the footer's last line is fully visible at maximum scroll.
why_human: NDG-02 is the highest risk item in the phase. The nudge bar has never rendered on any device, and the reserve it replaced was short by up to 27px on a notched iPhone. Every row depends on `env(safe-area-inset-bottom)` or on iOS Safari's collapsing toolbar, neither of which exists at a desk.
result: [pending]

### 2. NDG-01: load the site on both phones and look at the bar
expected: The bar is pinned to the bottom of the viewport in both `data-state` values, `enrol` and `group`.
why_human: Both states are driven and confirmed in code; nothing has been seen pinned to a real screen.
result: [pending]

### 3. ENR-06 on a device: withdraw a registration on a phone, then repeat with airplane mode turned on mid-request
expected: The confirmation shows the submitting state, focus lands where the panel says it does, and the airplane-mode attempt leaves the confirmation standing with the retry label rather than removing the control.
why_human: The state machine is now driven branch by branch at the desk against the shipped source, and every branch terminates correctly. What that cannot show is focus behaviour, screen-reader announcement, and a real dropped packet. Table F is unrun.
result: [pending]

### 4. DSG-05 observed half: turn Reduce Motion on at the OS level and drive the form
expected: The sweep bar is static at full width and 0.35 opacity rather than stranded part way across; the form to success panel swap is instant; the `:active` scale is instant; the bar's slide is instant.
why_human: The two reduced-motion blocks are declared correctly and gated in source, but the observed half needs the OS setting on and a screen.
result: [pending]

### 5. DEL-02, DEL-03: enrol end to end on a mid-range phone on mobile data, not wifi
expected: Under ten seconds, on iOS Safari and Android Chrome, and no viewport zoom when the name field takes focus.
why_human: The roadmap's Done-when sentence opens with this clause and it is unmeasured. Carried over from phase 2, where WINDOWS entry 1 records the same debt.
result: [pending]

### 6. Table D of `03-DEVICE-PASS.md`: measure the three declared-short touch targets on a coarse pointer
expected: The name input, the guest-count segment and the select overflow branch measure at least 52px per `03-UI-SPEC.md` Touch Target Geometry.
why_human: `styles.css` still declares 48px with no coarse override at lines 421, 1274 and 1369. 48px clears the 44px floor, so this is a shortfall against the phase's own stricter contract rather than an accessibility failure. Deliberately deferred to the same moment Table D is answered (WINDOWS entry 10, `deferred-items.md`).
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

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
