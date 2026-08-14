---
phase: 03-enrollment-identity-and-the-group
status: pending
decision: D-33
requirements: [NDG-01, NDG-02, NDG-07, WA-02, WA-03, ENR-09, ENR-10, DEL-02, DEL-03]
performed:
---

# Phase 3 Device Pass Record (D-33)

**This sheet closes nothing.** It is an empty record, not evidence. Creating it verifies no
behaviour, satisfies no requirement and changes no status. It exists so the D-33 pass on real
iOS Safari and real Android Chrome has exactly one place to be written down, and so the
requirements above can later be checked against something written rather than against somebody's
recollection of an evening. Until every row below carries a result, phase 03 is `human_needed`
and not `passed`. Phase 02 set this precedent with `02-DEVICE-PASS.md` and it caught real
problems.

**It exists from the first wave, deliberately.** The single highest-risk item in this phase
becomes observable the moment plan 03-01 renders `#enrol-form`, because the nudge bar has never
rendered on any device in the life of this site. Anyone who checks a row early should write the
result here rather than in a summary.

## Preconditions

1. Serve the working tree from the repository root with `node tools/preview.js`, or with
   `Preview locally.cmd`. It listens on 127.0.0.1:4173.
2. Reach that address from a phone on the same LAN, using the machine's own address on the
   network rather than 127.0.0.1. **This is the one step only a human can establish**, and it is
   why this pass cannot be automated: the project ships no build step and no device harness, and
   that is a locked constraint rather than an omission.
3. Have both platforms in hand. A pass recorded on one phone is half a pass.
4. Rows marked **(link)** cannot be run until the owner supplies `whatsapp.inviteUrl`. Until
   then, run them against a temporary local value and mark the row `local only`. The linkless
   success panel (D-37) is the shipping state and has its own row, which **must** be checked
   before the link is ever set.

Record the browser and OS version in the Note cell of the first row of each table, so a later
reader knows what was actually tested.

---

## Table A. The nudge bar reserve (NDG-02, D-29). Highest risk in the phase.

The shipped reserve is a flat `76px`. The bar's real height is
`12 + max(44, text) + 12 + 1px border + env(safe-area-inset-bottom)`, which is about 69px on a
flat-bottomed phone and up to 103px on a notched iPhone in portrait. The measured `--nudge-h`
from plan 03-02 is what is being checked here, not the guess it replaces.

| Check | iOS result | Android result | Note |
|---|---|---|---|
| With the bar shown, the countdown clock can be scrolled to a position where no part of it sits behind the bar | | | |
| Same for `.addr__value`, the address line | | | |
| Same for `.video-slot`, the door video slot | | | |
| The footer's last line is fully visible at maximum scroll | | | |
| At 320x568 | | | |
| At 375x667 | | | |
| At 390x844 | | | |
| At 430x932 | | | |
| iOS Safari only: scrolling collapses the browser toolbar and the reserve stays correct through the change | | n/a | |
| Rotating to landscape and back re-measures, with no gap and no overlap left behind | | | |
| Switching to Danish, whose nudge copy may wrap to two lines, re-measures the bar height | | | |
| Tapping dismiss does not make the page jump up under the thumb (R3) | | | |
| A toast fired after dismissing does not land underneath the bar | | | |

## Table B. Enrollment on a real phone (ENR-09, ENR-10, DEL-02, DEL-03)

| Check | iOS result | Android result | Note |
|---|---|---|---|
| Enrolling end to end takes under 10 seconds on mobile data, not on wifi | | | |
| Focusing the name field does **not** zoom the viewport (every control is 16px) | n/a for Android | | |
| `autocomplete="name"` offers the guest's own name in one tap | | | |
| The soft keyboard does not fight the nudge bar: the bar hides on focus inside the form and comes back after | | | |
| The guest-count segments are one tap each and none is below 44px | | | |
| Blurring an untouched empty name field says nothing | | | |
| Typing a name, clearing it and blurring shows the error below the field, and the submit button does not move | | | |
| The error clears the moment the field is fixed, not mid-word | | | |
| Submitting with airplane mode on lands in the failure state with every typed value still present | | | |
| The submitting state shows the sweep bar and always terminates | | | |
| The success panel appears and the receipt reads back name, guests and note exactly as typed | | | |
| Reloading the page shows the returning-guest view, not an empty form | | | |

## Table C. The group handoff (WA-02, WA-03)

| Check | iOS result | Android result | Note |
|---|---|---|---|
| **Linkless success panel (D-37, the shipping state):** the panel reads as complete and deliberate with no WhatsApp button, no dead control and no empty gap | | | |
| **(link)** The success panel CTA opens the WhatsApp app, not a browser page, on a phone with WhatsApp installed | | | |
| **(link)** The `#wa` section CTA does the same | | | |
| **(link)** Both CTAs are at least 56px tall on a coarse pointer and full width below 480px | | | |
| **(link)** After tapping either CTA, the nudge bar never asks about the group again | | | |

## Table D. Touch target geometry (UI-SPEC Touch Target Geometry)

Measure, do not eyeball. Every row is a floor, not a target.

| Element | Required | iOS measured | Android measured |
|---|---|---|---|
| Submit button | 56px coarse | | |
| WhatsApp CTA, success panel | 56px coarse | | |
| WhatsApp CTA, `#wa` section | 52px coarse | | |
| Name input | 52px coarse | | |
| Textarea | 96px min-height | | |
| Guest-count segment | 52px coarse | | |
| Change your registration | 52px coarse | | |
| Confirm withdrawal | 52px coarse | | |
| `.subtle-action` rows (withdraw, forget my details) | 44px box each, 16px apart | | |
| Nudge CTA and close | 44px | | |

## Table E. Danish at 320px (LNG-05, LNG-06, UI-SPEC long-text rows)

| Check | Result | Note |
|---|---|---|
| Every field label and hint renders without wrapping a control off the grid | | |
| Every `enrol.err.*` string fits on one line inside the reserved 24px error box | | |
| The submit and submitting labels do not wrap the button onto a second line, and both produce the same button height | | |
| The returning-guest lede renders correctly with a 60 character name | | |
| A 60 character unbroken name in the receipt does not push the page sideways | | |
| A 500 character note with line breaks reads back exactly as typed | | |
| The attendee list of many names wraps as a comma run without breaking the section | | |
| `wa.cta` and `wa.body` render without breaking the `#wa` section | | |
| The withdraw confirmation question renders on at most two lines without pushing the confirm control below the fold | | |
| The `.pending` unconfigured panel renders without overflow | | |

## Table F. Reduced motion and assistive technology (DSG-05, ENR-09, ENR-10)

| Check | Result | Note |
|---|---|---|
| Reduce Motion on: the sweep bar is static at full width and 0.35 opacity, not stranded part way across | | |
| Reduce Motion on: the form to success panel swap is instant | | |
| Reduce Motion on: `:active` scale is instant | | |
| Reduce Motion on: the nudge bar slide is instant | | |
| VoiceOver: a field error is **described** when the control takes focus, not announced over the guest | | |
| VoiceOver: a submit failure is **announced** immediately | | |
| VoiceOver: the success panel heading is read when focus lands on it, once, not twice | | |
| TalkBack: the same three | | |
| Keyboard only: the guest-count segments show a visible focus ring on the segment, not a clipped rectangle | | |
| Keyboard only: Escape reverts the withdraw confirmation | | |

## Table G. The four nudge branches (NDG-07)

The `days > 1` branch is reachable for a six day window in the whole life of the site, so it is
tested by moving `enrollment.deadline` locally rather than by waiting. All five outcomes.

| `daysUntil(deadline)` | Expected | Result |
|---|---|---|
| greater than 7 | `nudge.enrol.text` | |
| greater than 1 | `nudge.enrol.soon` with the day count substituted | |
| exactly 1 | `nudge.enrol.last` | |
| exactly 0 | `nudge.enrol.today` | |
| negative | the bar is hidden entirely | |
| any of the above, with `enrolled === '1'` | the bar shows the group state, or hides once `wa_joined` is set | |
| any of the above, after tapping dismiss | the bar stays down for the session and survives a language switch and an enrollment | |

---

## Outcome

Fill this in when both platforms are done. Anything unchecked stays unchecked in
`REQUIREMENTS.md`: a requirement that cannot be verified without a device is not satisfied by
reading the source, and phase 02 recorded that rule in `STATE.md` rather than quietly rounding up.

| Field | Value |
|---|---|
| Performed on | |
| iOS device and version | |
| Android device and version | |
| Network used | |
| Rows failed | |
| Follow up needed | |
