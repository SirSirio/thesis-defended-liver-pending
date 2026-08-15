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

**Desk note, 03-06.** Nothing in this table was answered at the desk and nothing in it can be.
Every row depends on `env(safe-area-inset-bottom)`, which is 0 in a desktop browser, or on iOS
Safari's collapsing toolbar, which does not exist there, and this executor had no browser of any
kind. The structural half is gated and green: `--nudge-h` is written from `offsetHeight`, a
hidden bar writes 0, the reserve and the toast offset and `scroll-padding-bottom` are all
composed from that one property, and the reserve is released inside the hide timeout rather than
at the tap. None of that is evidence about a notched iPhone. This stays the highest risk item in
the phase.

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

**Desk note, 03-06.** Not answered here. Two rows have a desk-side half worth writing down so
the phone is not asked to establish it twice. The guest-count control is one tap per option on
both branches: at the committed maximum of 2 the field builds a three segment radiogroup, and
at a maximum above four it builds a native select over the whole range, both confirmed by
running the shipped `buildForm()` against a moved config. And the request really does send zero
extra guests when the maximum is zero, because `readGuests()` returns 0 before it looks at the
DOM at all. The heights those segments render at, the 10 second target, the keyboard behaviour
and the zoom-on-focus check are all phone rows and none of them is answered.

## Table C. The group handoff (WA-02, WA-03)

| Check | iOS result | Android result | Note |
|---|---|---|---|
| **Linkless success panel (D-37, the shipping state):** the panel reads as complete and deliberate with no WhatsApp button, no dead control and no empty gap | | | |
| **(link)** The success panel CTA opens the WhatsApp app, not a browser page, on a phone with WhatsApp installed | | | |
| **(link)** The `#wa` section CTA does the same | | | |
| **(link)** Both CTAs are at least 56px tall on a coarse pointer and full width below 480px | | | |
| **(link)** After tapping either CTA, the nudge bar never asks about the group again | | | |

**Desk note, 03-06.** Not answered here, and the last row has a desk-side half: with a
temporary local link in `config.js` the bar's group state was driven directly and it stops
asking the moment `wa_joined` is `'1'`, which is the branch condition rather than the tap.
Whether a real tap on a real phone opens the WhatsApp app rather than a browser page is
untouched by that, and so is whether the linkless panel reads as deliberate.

## Table D. Touch target geometry (UI-SPEC Touch Target Geometry)

Measure, do not eyeball. Every row is a floor, not a target.

The Declared column was added by 03-06 and is a source reading, not a measurement: it is what
`styles.css` asks the browser for at a coarse pointer. A measurement can still come in under a
declaration, so it does not answer any row. It does show three rows that cannot pass even in
principle, marked below.

| Element | Required | Declared in styles.css (desk) | iOS measured | Android measured |
|---|---|---|---|---|
| Submit button | 56px coarse | 52px base, **56px coarse** ✓ | | |
| WhatsApp CTA, success panel | 56px coarse | 52px base, **56px coarse** ✓ (`.panel__wa`) | | |
| WhatsApp CTA, `#wa` section | 52px coarse | **52px coarse** ✓ (`.wa__cta`) | | |
| Name input | 52px coarse | **48px, no coarse override** ✗ short by 4px | | |
| Textarea | 96px min-height | **96px** ✓ | | |
| Guest-count segment | 52px coarse | **48px, no coarse override** ✗ short by 4px (`.seg > span`) | | |
| Select (overflow branch) | 52px coarse | **48px, no coarse override** ✗ short by 4px (`.field__select`) | | |
| Change your registration | 52px coarse | **52px coarse** ✓ (`.panel__edit`) | | |
| Confirm withdrawal | 52px coarse | **52px coarse** ✓ (`.panel__confirm`) | | |
| `.subtle-action` rows (withdraw, forget my details) | 44px box each, 16px apart | **44px coarse inline-flex box** ✓ | | |
| Nudge CTA and close | 44px | **44px** ✓ (`.nudge__cta`) | | |

**Desk note, 03-06: three rows are short in the source, and it is not a regression.** The name
input, the guest-count segment and the select branch are all declared at 48px with no coarse
pointer block raising them, while `03-UI-SPEC.md` §Touch Target Geometry asks for 52px at a
coarse pointer for all three, with the stated reason "matches the input it sits between, so the
three field rows are one rhythm". 48px clears the 44px legal floor, so this is a shortfall
against the phase's own stricter target rather than an accessibility failure, and it has been
there since plan 03-01 rather than being introduced by a later plan. It is left unfixed
deliberately: changing touch geometry at phase close, with no device pass to check it against,
trades a known 4px for an unknown. Recorded in `deferred-items.md` and in `.planning/WINDOWS.md`.

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

**Desk note, 03-06, on the error string row only.** The source cap holds and is gated: every
`enrol.err.*` string is inside 36 characters in all three languages, and the longest Danish one
is `enrol.err.guestsRange`, "Vælg et tal fra listen.", at 23. The box that must hold it is
`.field__err`, reserved at `min-height: 24px` in every state at `font-size: 14.5px`. At 320px
the `.wrap` padding leaves 272px of content width and the `.field` grid has collapsed to one
column, so the error owns the full width. Even at a deliberately pessimistic 0.75em per
character, which is wider than any real sans, 23 characters is 250px and still inside 272px.
**That is a bound, not a render.** The one-line fit and the no-reflow guarantee it protects are
a rendered result at a specific width in a specific font, and this executor had no rendering
engine. The row stays unanswered.

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

**Desk note, 03-06, on the four reduced-motion rows.** What the source declares, which is not
what the rows ask. `.sweep::after` carries an explicit `animation: none; width: 100%;
opacity: 0.35; transform: none` inside the second reduced-motion block, so the sweep is written
to park at full width rather than be stranded by the universal 0.01ms clamp above it, and
`.panel { opacity: 1; transition: none }` makes the form to panel swap instant for the same
reason. The `:active` scale and the bar's slide have no rule of their own and rely on that
clamp, which is weaker but correct. All four rows still need the OS setting turned on and a
screen to watch, and none of them is answered. Nothing at all is established for the six
VoiceOver, TalkBack and keyboard rows.

## Table G. The four nudge branches (NDG-07)

The `days > 1` branch is reachable for a six day window in the whole life of the site, so it is
tested by moving `enrollment.deadline` locally rather than by waiting. All five outcomes.

**How these were performed, 2026-08-15, plan 03-06, at the desk and not on a phone.**
`enrollment.deadline` in `config.js` was really moved on disk once per row, and the shipped
`renderNudge()` and `daysUntil()` were sliced out of `app.js` by brace matching and run against
the moved file in a fresh process, with stubs standing in only for the browser objects the bar
closes over (`$`, `showNudge`, `hideNudge`, `store`). No branch condition was re-typed, so a
change to the ladder in `app.js` changes these results. The committed deadline was written back
afterwards and the restoration is asserted by the phase gate. What this does **not** establish
is anything about how the bar looks or behaves on a screen; that is Table A's job and Table A is
still empty.

| `daysUntil(deadline)` | Expected | Result |
|---|---|---|
| greater than 7 | `nudge.enrol.text` | **Pass (desk).** Deadline +30d, `daysUntil` 30, bar shown, `data-state="enrol"`, key requested `nudge.enrol.text`, rendered "You have not registered yet." |
| greater than 1 | `nudge.enrol.soon` with the day count substituted | **Pass (desk).** Deadline +3.5d, `daysUntil` 4, bar shown, `data-state="enrol"`, key `nudge.enrol.soon`, rendered "Registration closes in 4 days." so `{n}` really substituted |
| exactly 1 | `nudge.enrol.last` | **Pass (desk).** Deadline +12h, `daysUntil` 1, bar shown, `data-state="enrol"`, key `nudge.enrol.last`, rendered "Registration closes tomorrow." |
| exactly 0 | `nudge.enrol.today` | **Pass (desk).** Deadline -1h, `daysUntil` 0, bar shown, `data-state="enrol"`, key `nudge.enrol.today`, rendered "Registration closes today." |
| negative | the bar is hidden entirely | **Pass (desk).** Deadline -5d, `daysUntil` -5, `hideNudge` called, no `data-state` written, no copy key requested at all |
| any of the above, with `enrolled === '1'` | the bar shows the group state, or hides once `wa_joined` is set | **Pass (desk).** With `inviteUrl` null, the shipping state, the bar hides. With a temporary local link: not joined gives `data-state="group"`, keys `nudge.group.text` / `nudge.group.cta` and the href verbatim from config; with `wa_joined` at `'1'` the bar hides. The temporary link was removed again |
| any of the above, after tapping dismiss | the bar stays down for the session and survives a language switch and an enrollment | **Pass (desk) for the dismissal, structural for the survival.** With the session flag set the bar hid on every combination run: unenrolled, enrolled, and enrolled with a link. The flag is read on the first line of `renderNudge()`, before both the enrolled branch and the readiness gate; it is assigned in exactly one place and never reset; and the language chain and `refreshEnrollmentState()` both re-enter through `renderNudge()`, so neither can bypass it. Not observed in a browser |
| no path raises how often the bar appears | the escalation is in the copy only | **Pass (desk), structural.** `renderNudge()` has four call sites, all event driven: the language chain, `refreshEnrollmentState()`, the focusout restore, and `markGroupJoined()`. The file's one `setInterval` drives the countdown and never the bar, and the bar's one `setTimeout` is the 240ms hide teardown. There is no frequency variable to escalate |

---

## Desk half (03-06, 2026-08-15)

Kept separate from the Outcome table below on purpose. The Outcome table is the device pass's
own record and stays empty until a phone has answered Tables A to F; putting a desk date in it
would make the sheet read as finished when the part that matters has not started.

| Field | Value |
|---|---|
| Performed on | 2026-08-15, plan 03-06, at the desk |
| Method | Node only. No browser of any kind was available to this executor, so every row that needs a rendered pixel is unanswered rather than estimated |
| Tables completed | G only, in full, including the two rows beyond the five ladder branches |
| Tables not started | A, B, C, D, E, F. Each carries a desk note saying what the desk could and could not establish |
| Config moved and restored | `enrollment.deadline` five times, `enrollment.maxGuestsPerPerson` three times, `whatsapp.inviteUrl` once. All written back; restoration asserted by the phase gate and by a clean `git status` on `config.js` |
| Findings raised at the desk | Three Table D rows are declared 4px short of the UI spec's coarse-pointer target. See the note under Table D |
| Still owed | The whole of D-33: real iOS Safari and real Android Chrome, both platforms, per the preconditions at the top of this sheet |

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
