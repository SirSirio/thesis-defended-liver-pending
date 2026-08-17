---
phase: 03-enrollment-identity-and-the-group
status: complete
decision: D-33
requirements: [NDG-01, NDG-02, NDG-07, WA-02, WA-03, ENR-09, ENR-10, DEL-02, DEL-03]
performed: 2026-08-17, owner, real iOS Safari and real Android Chrome. Six rows walked, seven accepted without walking. See the acceptance note under Table A.
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
| With the bar shown, the countdown clock can be scrolled to a position where no part of it sits behind the bar | pass | pass | Owner, 2026-08-17. |
| Same for `.addr__value`, the address line | pass | pass | Owner, 2026-08-17. |
| Same for `.video-slot`, the door video slot | pass | pass | Owner, 2026-08-17. |
| The footer's last line is fully visible at maximum scroll | pass | pass | Owner, 2026-08-17. |
| At 320x568 | accepted | accepted | Not walked. Owner sign-off, see the acceptance note. |
| At 375x667 | accepted | accepted | Not walked. |
| At 390x844 | accepted | accepted | Not walked. Closest to the owner's own device, which was walked. |
| At 430x932 | accepted | accepted | Not walked. |
| iOS Safari only: scrolling collapses the browser toolbar and the reserve stays correct through the change | accepted | n/a | Not walked. |
| Rotating to landscape and back re-measures, with no gap and no overlap left behind | accepted | accepted | Not walked. |
| Switching to Danish, whose nudge copy may wrap to two lines, re-measures the bar height | pass | pass | Owner, 2026-08-17: "Wraps in 2 lines, but ok". The wrap is the condition this row exists to create, not a fault: two lines is what makes the bar taller than the flat reserve it replaced, and the row passes because the re-measure absorbed it with nothing left overlapping. |
| Tapping dismiss does not make the page jump up under the thumb (R3) | accepted | accepted | Not walked as a named check. The owner located the control (the `&times;` button) and reported no problem in use. |
| A toast fired after dismissing does not land underneath the bar | accepted | accepted | Not walked. |

**Desk note, 03-06.** Nothing in this table was answered at the desk and nothing in it can be.

**Attribution note, 2026-08-17.** The four filled rows above are the owner's own pass on real iOS
Safari and real Android Chrome, run against the live site and reported during UAT as
`03-UAT.md` test 1. They are recorded at the granularity that was actually observed and no
finer: the owner scrolled a real phone and confirmed that none of the three elements sits behind
the bar and that the footer's last line is reachable.

The remaining rows were held blank rather than inferred from that same "ok", because the four
viewport rows name specific sizes that were not individually walked, and rotation, the dismiss
jump and the post-dismiss toast each test a distinct behaviour that a scroll-and-look pass does
not exercise. Writing `pass` into a row the pass did not reach would defeat the one purpose this
sheet was created for, which its own opening paragraph states: a record checkable against
something written rather than against somebody's recollection.

Later the same day the Danish row was walked and passed, and the owner signed off on the rest.
Those rows now read `accepted` rather than `pass`, which is the distinction the paragraph above
was protecting. See the acceptance note below.

`03-02:T-03-09` and `03-06:T-03-38` are both high severity and both name this table as their
evidence. They are closed as accepted risks rather than as verified mitigations, and
`03-SECURITY.md` records them that way.

**Acceptance note, 2026-08-17, owner sign-off.** The rows reading `accepted` were not walked. They
are closed by the owner's explicit decision to ship, not by observation, and the distinction is
kept in the cells themselves so that no later reader mistakes one for the other. `pass` in this
table means somebody looked; `accepted` means somebody decided.

What the decision rests on. Six rows were genuinely walked on real iOS Safari and real Android
Chrome across the same day: the three occlusion checks, the footer at maximum scroll, and the
Danish two-line re-measure, which is the row most likely to break the reserve because it is the
one that makes the bar taller. The measurement is structural rather than per-device:
`app.js:3638` writes `--nudge-h` from `bar.offsetHeight`, and `app.js:3659-3661` and `:3667-3668`
re-run that write through a ResizeObserver and `visualViewport`. Rotation, a toolbar collapse and
a different viewport are all the same event to that code, and the Danish wrap already proved the
re-measure fires and lands. So the unwalked rows are the same mechanism under different triggers,
which is a real argument for accepting them and is not a proof.

What is genuinely uncovered. `320x568` is the smallest supported screen and the one where a
two-line bar eats the largest share of the viewport; nobody has seen the site on one. The
post-dismiss toast is the only row whose mechanism is not the reserve at all, so nothing above
speaks to it.

Reversible. Any of these rows can be walked later and rewritten from `accepted` to `pass` or to a
failure, and `03-SECURITY.md` carries the matching accepted risks with the same wording.
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

| Condition on the deadline | Expected | Result |
|---|---|---|
| greater than 7 | `nudge.enrol.text` | **Pass (desk).** Deadline +30d, `daysUntil` 30, bar shown, `data-state="enrol"`, key requested `nudge.enrol.text`, rendered "You have not registered yet." |
| greater than 1 | `nudge.enrol.soon` with the day count substituted | **Pass (desk).** Deadline +3.5d, `daysUntil` 4, bar shown, `data-state="enrol"`, key `nudge.enrol.soon`, rendered "Registration closes in 4 days." so `{n}` really substituted |
| exactly 1 | `nudge.enrol.last` | **Pass (desk).** Deadline +12h, `daysUntil` 1, bar shown, `data-state="enrol"`, key `nudge.enrol.last`, rendered "Registration closes tomorrow." |
| it falls on today's calendar date in Europe/Copenhagen, the clock some hours before it | `nudge.enrol.today`, and registration is still open | Deadline 23:59 local on the current date. Re-anchored by plan 03-09; see the note below. **Not yet re-run on a device.** |
| negative, meaning the deadline has already passed | the bar is hidden entirely and **no copy key is requested at all** | **Pass (desk).** Deadline -5d, `daysUntil` -5, `hideNudge` called, no `data-state` written, no copy key requested at all |
| any of the above, with `enrolled === '1'` | the bar shows the group state, or hides once `wa_joined` is set | **Pass (desk).** With `inviteUrl` null, the shipping state, the bar hides. With a temporary local link: not joined gives `data-state="group"`, keys `nudge.group.text` / `nudge.group.cta` and the href verbatim from config; with `wa_joined` at `'1'` the bar hides. The temporary link was removed again |
| any of the above, after tapping dismiss | the bar stays down for the session and survives a language switch and an enrollment | **Pass (desk) for the dismissal, structural for the survival.** With the session flag set the bar hid on every combination run: unenrolled, enrolled, and enrolled with a link. The flag is read on the first line of `renderNudge()`, before both the enrolled branch and the readiness gate; it is assigned in exactly one place and never reset; and the language chain and `refreshEnrollmentState()` both re-enter through `renderNudge()`, so neither can bypass it. Not observed in a browser |
| no path raises how often the bar appears | the escalation is in the copy only | **Pass (desk), structural.** `renderNudge()` has four call sites, all event driven: the language chain, `refreshEnrollmentState()`, the focusout restore, and `markGroupJoined()`. The file's one `setInterval` drives the countdown and never the bar, and the bar's one `setTimeout` is the 240ms hide teardown. There is no frequency variable to escalate |

**Why the zero row was re-anchored, 2026-08-15, plan 03-09. This is a broken gate, written down
rather than quietly corrected.**

As originally performed the row read `exactly 0` in the condition column and was exercised with
`enrollment.deadline` moved to **one hour in the past**. A deadline one hour in the past has
already closed. The row recorded **Pass** because the shipped ladder really did render
`nudge.enrol.today` there, and it did so for the worst possible reason: `daysUntil` was
`Math.ceil((deadline - now) / 86400000)`, `Math.ceil` of a small negative is negative zero,
negative zero compares equal to zero, and the `days === 0` branch fired for the whole
twenty-four hours after registration closed. The row's expectation was therefore **read off the
implementation rather than off intent**. What the row was supposed to test is the last day
*before* closing, which is the calendar claim `nudge.enrol.today` actually makes, and which no
positive offset could ever reach under that arithmetic.

This is the **seventh instance** of the pattern `.planning/WINDOWS.md` entries 6, 7 and 9 record.
It is also the one instance the phase's 43-case mutation sweep could not have caught: mutation
testing proves a gate *can* fail, not that it is asserting the right thing. Break the ladder and
this row goes red exactly as designed, because it was anchored to the ladder.

The row is now stated as a calendar condition and anchored to a **positive** offset, a deadline
at 23:59 local on the current date with the clock some hours before it, and its Result cell is
cleared so it is re-run rather than inherited. The `negative` row's expectation gained the words
"no copy key is requested at all", which is the statement the requirement makes and which cannot
be satisfied by swapping one wrong string for another.

**One further caution about the three rows left standing.** Their Result cells record what plan
03-06 observed on 2026-08-15 against the millisecond `daysUntil`, which plan 03-09 has deleted in
favour of a calendar-day difference in `Europe/Copenhagen`. The *expectations* are unchanged and
still correct; the recorded *offsets* (+12h in particular) are no longer guaranteed to land in
the bucket they landed in then. They are kept as the historical record of what was performed, not
promoted as claims about the current code. Plan 03-09's gates D3 and its calendar-anchored
supplement re-prove all four ladder branches plus the closed case against the current file.

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

## Cleanup and the head count (03-06 task 2, 2026-08-15)

The owner ran the delete against project `aplaxdplwnnlezffatal`, and the result was then read back
from the wire by this executor rather than accepted as a report. Recorded here because the head
count arithmetic these rows were the fixture for is now running against real data for the first
time, and a later reader needs to know when the fixture went away.

**The acceptance probe, run first-hand, verbatim.**

```
GET /rest/v1/attendees?select=first_name,extra_guests
[{"first_name":"Sirio","extra_guests":0}]
HTTP 200
```

No entry whose first name is `ZZTEST`. The three test rows are gone and the owner's own
registration survived, which is the outcome the exact-equality predicate guaranteed.

**The control probe, which is the half that makes the acceptance probe mean anything.**

```
GET /rest/v1/enrollments?select=*
[]
HTTP 200
```

The raw table still answers `[]` to the publishable key while the view demonstrably returns a
row, so the delete did not open a read path. This pairing is the whole reason the probe reads the
view: an empty array from the table is what a blocked read and a clean table both look like.

| Reading | Before the delete | After the delete |
|---|---|---|
| Rows in `public.attendees` | 4 | **1** |
| Head count the page would compute | 4 | **1** |
| Configured threshold `showCountFrom` | 8 | 8 |
| Social proof block | absent, 4 < 8 | **absent, 1 < 8** |
| Names the list row would render | `Sirio, ZZTEST, ZZTEST, ZZTEST` | **`Sirio`** |

The arithmetic was re-established by running the shipped `renderSocialProof()` and `recordRow()`,
sliced out of `app.js` by brace matching, against the real wire body above. It was not re-typed,
so a change to the count in `app.js` changes these numbers. At the committed threshold of 8 the
block does not render; with the threshold lowered to 1 purely to read the value out, it renders
`1` and the single name `Sirio`. The same harness against the pre-delete four-row body renders
`4` and `Sirio, ZZTEST, ZZTEST, ZZTEST`, which is what the cleanup actually removed: not only an
inflated number but three test strings that would have been shown to every guest had the count
ever reached the threshold.

**Not established here.** Nothing on this page has been seen rendered. The social proof block's
correct state today is *absent*, so even a browser would have shown nothing, and the row on
Table C covering the block at the threshold boundary stays unanswered along with the rest of the
device pass.

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
