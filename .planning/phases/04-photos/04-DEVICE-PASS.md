---
phase: 04-photos
status: pending
decision: D-30
requirements: [PH-01, PH-02, PH-03, PH-05, PH-06, PH-07, DEL-02, DEL-03, DSG-05, DSG-08]
performed:
---

# Phase 4 Device Pass Record (D-30)

**This sheet closes nothing.** It is an empty record, not evidence. Creating it verifies no
behaviour, satisfies no requirement and changes no status. It exists so the D-30 pass on real iOS
Safari and real Android Chrome has exactly one place to be written down, and so the requirements
above can later be checked against something written rather than against somebody's recollection of
an evening. Phases 02 and 03 set this precedent and both sheets caught real problems.

**What `Pending` means in every table below.** Every row was authored on 2026-08-17 by an executor
with no phone, no camera roll and no rendering engine of any kind. A row reading `Pending` is a row
nobody has looked at yet. It is not a soft pass and it must never be promoted to one by reading the
source: the whole point of this phase's central row is that the source cannot answer it. Each row
carries its **expected** result so the person holding the phone knows what they are looking at, and
an expectation is a prediction, not an observation. Overwrite `Pending` with `Pass`, `Fail` or
`Not tested` plus a reason. A row that could not be run is recorded as `Not tested` with the reason,
never as a pass.

**The one row that matters most is Table A row 1.** Whether a portrait iPhone photograph lands the
right way up in the album is the single most visible way this phase can fail, it is the one claim in
the whole design contract that no probe and no emulator could settle, and research
`## THE ORIENTATION REFINEMENT` deliberately left it to this sheet. If it fails, stop and record it
here as the phase's blocking finding. The remedy is named in that same section and is confined to
one function.

---

## Preconditions

1. Serve the working tree from the repository root with `node tools/preview.js`, or with
   `Preview locally.cmd`. It listens on 127.0.0.1:4173. Alternatively, walk the pass against the
   live GitHub Pages URL, but only once this phase's commits are pushed, otherwise the phone is
   testing the previous phase.
2. Reach that address from a phone on the same LAN, using the machine's own address on the network
   rather than 127.0.0.1. **This is the one step only a human can establish**, and it is why this
   pass cannot be automated: the project ships no build step and no device harness, and that is a
   locked constraint rather than an omission.
3. Have both platforms in hand. A pass recorded on one phone is half a pass.
4. Have a real camera roll with at least: one portrait photograph taken by the phone itself, one
   landscape photograph, and on iOS at least one HEIC image. A screenshot is not a substitute for
   either: a screenshot carries no meaningful EXIF orientation and is not HEIC.
5. The five photograph allowance is per identity and is counted in `localStorage`. Clearing site
   data resets the local count but not the database, which is the drift case Table E row 9 exists
   for. Plan for it: the database refuses the sixth for a given `guest_id` permanently.
6. The bucket now carries a three mebibyte ceiling and a single accepted declared type, applied to
   project `aplaxdplwnnlezffatal` on 2026-08-17 and verified on the wire. A photograph the site has
   shrunk lands at roughly a tenth of that, so no row below should ever meet the ceiling. If one
   does, that is a finding worth writing down.
7. **Anything uploaded during this pass is permanent and public.** There is no delete rule for
   anyone, on the table or on the bucket, so nothing written from a phone can be removed from a
   phone. Only the owner at the dashboard can clear it. Use photographs you are content to leave in
   the album, or plan a cleanup visit afterwards and record it at the bottom of this sheet.

Record the browser and OS version in the Outcome table at the foot, so a later reader knows what was
actually tested.

---

## Table A. Orientation and the camera roll (D-17 as refined, PH-01). Highest risk in the phase.

The pipeline never asks for an orientation. It decodes through an `<img>` element, whose
`image-orientation` initial value is `from-image` on both engines, so `naturalWidth` and
`naturalHeight` report oriented dimensions and `drawImage` writes oriented pixels. That is the whole
mechanism, and it is the reason this table exists: the correct behaviour here is the absence of
code, which is exactly the kind of thing that is right in a document and wrong on a phone.

| # | Check | Expected | iOS verdict | Android verdict | Note |
|---|---|---|---|---|---|
| A1 | **A portrait photograph taken by the phone lands the right way up in the album** | Upright, not rotated a quarter turn, not mirrored | Pending | Pending | |
| A2 | A landscape photograph lands the right way up | Upright | Pending | Pending | |
| A3 | A portrait photograph rotated in the phone's own Photos app afterwards still lands upright | Upright, honouring the rotation the guest can see in their roll | Pending | Pending | |
| A4 | The uploaded photograph is not squashed or stretched: a face is the shape of a face | Aspect preserved, longest edge at most 2048px | Pending | Pending | |
| A5 | **An HEIC pick from the iOS camera roll arrives as a JPEG and uploads** | Accepted and rendered. iOS converts at the OS layer before the browser sees a byte | Pending | n/a | |
| A6 | A PNG screenshot picked from the roll uploads and renders | Accepted, re-encoded to JPEG | Pending | Pending | |

## Table B. The picker and the control (PH-01, carried from plan 04-01)

Plan 04-01's `<human-check>` was deferred here in full. Its four observations are rows B1, B2, B3
and B4. The tracer's automated and live wire halves all passed, so the layers underneath are proven;
what is unproven is the picker itself on real hardware.

| # | Check | Expected | iOS verdict | Android verdict | Note |
|---|---|---|---|---|---|
| B1 | The picker opens from the `hidden` input when the visible button is tapped | The camera roll opens. The button label is in the site's language, not the browser's | Pending | Pending | |
| B2 | The section does not throw | No blank section, nothing missing below the heading | Pending | Pending | |
| B3 | The photograph appears as a square tile captioned with the guest's first name after the refetch | Tile present, caption correct, not broken | Pending | Pending | |
| B4 | Tapping the tile opens the full photograph in a new tab | Opens the public storage URL | Pending | Pending | |
| B5 | **Multi-select works:** picking three photographs at once hands all three to the site | Three rows appear, not one | Pending | Pending | |
| B6 | Taking a photograph with the camera from the picker, rather than choosing an existing one, also uploads | Accepted like any other pick | Pending | Pending | |

Row B3 carries the phase's one untested timing claim, flagged in plan 04-01's summary: the refetch
after a successful upload is not delayed, so whether a just-written object is readable at that
instant is unknown. If the guest's own tile is briefly broken, the `img.onerror` path already hides
it and the remedy is a short delay in one function. Record it here rather than treating it as a
transient.

## Table C. The queue transcript at 320px in Danish (PH-05, carried from plan 04-02)

Plan 04-02's seven deferred observations, verbatim in substance. Observations 1, 2, 3 and 6 were
proved logically by a harness that drove the shipped source, so they are marked below as
**structurally proved**. That is a statement about the model, not about a screen, and each still
needs a phone. What only a device settles is the typography at 320px and the operating system
reduced motion path.

Set the browser to Danish, or switch the site to Danish, and use a 320px wide viewport.

| # | Check | Expected | iOS verdict | Android verdict | Note |
|---|---|---|---|---|---|
| C1 | Three numbered rows appear immediately on picking three photographs | All three present before any work begins. Structurally proved | Pending | Pending | |
| C2 | Exactly one bar moves at a time | Sequential, never two at once. Structurally proved | Pending | Pending | |
| C3 | The bar stops short of the end and the state word changes before the row completes | The bar never sits at full width waiting for a response | Pending | Pending | |
| C4 | Every state word holds one line at 320px in Danish | No wrap. Every `photos.queue.*` word is 16 characters or fewer in all three languages | Pending | Pending | |
| C5 | A long file name wraps rather than being cut | Wraps, no horizontal scroll, no ellipsis eating the extension | Pending | Pending | |
| C6 | No row shifts vertically at any point during the batch | The bar is 2px in every state and the row padding is fixed. Structurally proved | Pending | Pending | |
| C7 | With **reduced motion** on at the operating system level, the bar still advances in steps and is neither hidden nor parked at full width | It advances. This is the deliberate opposite of the atmosphere bars, which park | Pending | Pending | |

## Table D. The gate ladder and the upload control (PH-02, PH-08, carried from plan 04-03)

Eleven deferred observations from plan 04-03, five from its task 1 and six from its task 2. The
first five need `photos.opensAt` moved in `config.js` once per row and written back afterwards.

| # | Check | Expected | iOS verdict | Android verdict | Note |
|---|---|---|---|---|---|
| D1 | `photos.opensAt` in the future renders the closed panel with the moment in the current language, and no album | Closed body, stated time, no grid. Structurally proved | Pending | Pending | |
| D2 | A past timestamp renders the upload body with the album | Upload body. Structurally proved | Pending | Pending | |
| D3 | `null` renders the upload body | Upload body. Structurally proved | Pending | Pending | |
| D4 | `'not a date'` renders the upload body, never the closed one | Upload body. An invalid or absent value opens. Structurally proved | Pending | Pending | |
| D5 | With a timestamp roughly thirty seconds ahead and the page left open, the section switches itself to the upload body within a second or two of that moment, once, without flicker | One flip, no repeat, and the 220ms opacity swap reads as a swap rather than a flash | Pending | Pending | |
| D6 | At 320px in Danish, the remaining count reads five, above the permanence line, above the button | That order, single column below 640px | Pending | Pending | |
| D7 | The button is at least 56px on a touch pointer and spans the full width | See Table H for the measurement | Pending | Pending | |
| D8 | The Danish `photos.cta` label holds one line | No wrap at 320px | Pending | Pending | |
| D9 | The Danish `photos.permanent` line takes at most three lines and the button stays visible | Button not pushed below the fold | Pending | Pending | |
| D10 | Uploading one photograph makes the figure read four, unanimated, and without destroying the queue | Count updates, transcript survives | Pending | Pending | |
| D11 | Clearing the stored name and reloading renders the registration gate with the existing register label, the album still below it, and no name field | Gate body, one anchor to `#enrol`, zero inputs, album present. Structurally proved, and this is the row that would have failed before plan 04-03's deviation 2, so confirm it is visibly there rather than merely in the DOM | Pending | Pending | |

## Table E. Failure, retry and the quota (PH-05, PH-06, carried from plan 04-04)

Nine deferred observations from plan 04-04. Rows E1 to E6 need the connection throttled to offline
partway through a batch, which is done from the phone's own airplane mode or from remote devtools.
Rows E3 to E6 and E9 were proved logically by a harness that drove the shipped source and counted
storage writes on both sides of a retry, so what a device settles is the typography and the layout.

| # | Check | Expected | iOS verdict | Android verdict | Note |
|---|---|---|---|---|---|
| E1 | Exactly one retry control is visible after a partial batch | One, not one per failed row | Pending | Pending | |
| E2 | The Danish `photos.retry.failed` label holds one line at 320px | The button carries `white-space: nowrap` and goes full width at 480px and below, so what a device settles is whether the label overflows the box rather than wrapping | Pending | Pending | |
| E3 | Tapping it re-runs only the two failed rows | Two storage writes, not five. Structurally proved | Pending | Pending | |
| E4 | The recorded row does not move or re-send | Untouched. Structurally proved | Pending | Pending | |
| E5 | The remaining count ends at two rather than one | Counted once per photograph, not once per attempt. Structurally proved | Pending | Pending | |
| E6 | The submit button was usable throughout | Never stuck disabled. Structurally proved | Pending | Pending | |
| E7 | With the stored count at four and three photographs picked: the first is accepted, the last two render as **refused** rows naming them, the alert names how many were declined, and the control is replaced by the quota panel with the album still below it | Partial acceptance, named refusals, quota panel, album intact | Pending | Pending | |
| E8 | The quota panel read aloud in all three languages reads as neither an error, an apology nor a wall | A person settles the register. No occurrence of error, failed, fail or sorry, or their Italian and Danish equivalents, in `photos.full.*` or `photos.refuse.*` | Pending | Pending | |
| E9 | With five real rows in the database under one identity and the local count reset: the server refusal shows the declined wording, does not claim the upload failed, sets the count to five, and flips to the quota panel without a second attempt | The `P0001` code is treated as being at the limit unconditionally and never retried. Structurally proved | Pending | Pending | |
| E10 | The Danish `photos.full.body` fits four lines at 320px without the panel overflowing | No overflow | Pending | Pending | |
| E11 | The 220ms opacity swap actually runs as the control is replaced by the quota panel | A swap, not an instant cut, and not a flicker | Pending | Pending | |

## Table F. A throttled connection (PH-05)

Throttle to a slow connection rather than to offline, so the upload succeeds slowly. Party wifi is
the real target and this is the state PH-05 was written against.

| # | Check | Expected | iOS verdict | Android verdict | Note |
|---|---|---|---|---|---|
| F1 | Progress stays visible and honest for the whole of a slow upload | The bar moves in proportion to bytes leaving the phone | Pending | Pending | |
| F2 | **The bar never sits at full width waiting for a response** | It stops short, and the state word changes to mark the wait | Pending | Pending | |
| F3 | Backgrounding the tab mid upload on iOS does not leave the control stranded in the uploading state | Either it completes, or the 60 second timeout or an error handler terminates it and the row lands failed with a retry offered | Pending | n/a | |
| F4 | A locked screen partway through behaves the same | Same as F3 | Pending | Pending | |
| F5 | Nothing is silently dropped: every picked file ends in a visible row with a settled state | Row count in equals row count out | Pending | Pending | |

## Table G. The sixth photograph, on a real phone (PH-06)

| # | Check | Expected | iOS verdict | Android verdict | Note |
|---|---|---|---|---|---|
| G1 | **The sixth photograph is refused with the joke** | The refusal copy, in the current language | Pending | Pending | |
| G2 | The copy nowhere reads as a fault | Not an error, not an apology, not a wall. The guest should not feel told off | Pending | Pending | |
| G3 | The refusal happens before any bytes leave the phone when the local count already says five | No upload, no wait | Pending | Pending | |
| G4 | The same refusal in Danish and in Italian reads as the same joke, not as a translation of one | A person settles this | Pending | Pending | |

## Table H. Touch target geometry (UI-SPEC Touch Target Geometry)

Measure, do not eyeball, and **write the measured number down rather than a tick**. Every row is a
floor, not a target. The Declared column is a source reading taken at the desk on 2026-08-17, not a
measurement: it is what `styles.css` asks the browser for. A measurement can still come in under a
declaration, so the Declared column answers no row.

| Element | Required (coarse) | Declared in styles.css (desk) | iOS measured | Android measured |
|---|---|---|---|---|
| Submit photographs button | 56px | 52px base, **56px coarse** (`.uploader__acts .btn`) | Pending | Pending |
| Register for the course, gate body | 56px | 52px base, **56px coarse** (`#photos-body[data-body="gate"] .btn`) | Pending | Pending |
| Send the failed ones again | 52px | 48px base, **52px coarse** (`.uploader__acts .uploader__retry`) | Pending | Pending |
| Album tile | roughly 132px at 320px | `aspect-ratio: 1 / 1`, two columns below 560px, so the tile is about half the content width | Pending | Pending |
| Queue row | not interactive | no rule, deliberately | n/a | n/a |

If any measured number comes in under the Required column, record it as a finding at the foot of this
sheet rather than fixing it during the pass.

## Table I. Reduced motion and assistive technology (DSG-05, DSG-08, D-29)

Turn **reduced motion** on at the operating system level, not in a devtools emulation. Then run
VoiceOver on iOS and TalkBack on Android.

| # | Check | Expected | iOS verdict | Android verdict | Note |
|---|---|---|---|---|---|
| I1 | Reduced motion on: the progress bar still updates in steps | It advances. It is neither hidden nor parked at full width, unlike the atmosphere bars, and the distinction is deliberate: this bar reports real bytes leaving a phone | Pending | Pending | |
| I2 | Reduced motion on: the pressed feedback is instant | No easing on `:active` | Pending | Pending | |
| I3 | Reduced motion on: the body swap is instant | The 220ms opacity swap becomes a cut | Pending | Pending | |
| I4 | Reduced motion on: the album tile reveal is instant | No transition, no scale | Pending | Pending | |
| I5 | **VoiceOver**: progress is announced politely | The status line does not interrupt the guest mid sentence | Pending | n/a | |
| I6 | **VoiceOver**: a failure is announced assertively | The alert line interrupts, because a failure is worth interrupting for | Pending | n/a | |
| I7 | **VoiceOver**: an album tile announces whose photograph it opens | The first name is read, and the link reads as a link | Pending | n/a | |
| I8 | **TalkBack**: the same three | Same expectations as I5, I6 and I7 | n/a | Pending | |
| I9 | Keyboard only, with a hardware keyboard attached: the submit control and the retry control both take a visible focus ring | Ring visible, not clipped | Pending | Pending | |

## Table J. Image quality and memory (research assumptions A1 and A2)

Both of these are flagged assumptions in `04-RESEARCH.md ## Assumptions Log` and both were routed
here deliberately, because neither could be probed.

| # | Check | Expected | Verdict | Note |
|---|---|---|---|---|
| J1 | A 12 megapixel photograph does not look soft or aliased in the album **at four columns** (assumption A1) | Acceptable sharpness from a one step 2.5x reduction with `imageSmoothingQuality: 'high'`. Four columns needs a viewport of at least 900px, so this row is walked on a tablet in landscape or at a desk browser widened to 900px, not on a phone, where the album is two columns | Pending | |
| J2 | Five sequential 12 megapixel decodes do not reload the tab (assumption A2) | The batch completes. A tab reload mid upload on an older iPhone is the failure this row exists to catch | Pending | |
| J3 | The same five on the oldest iPhone available | As J2 | Pending | |

If J1 fails, record it and name **stepwise halving** as the remedy, roughly five lines in one
function, and do not build it speculatively. If J2 or J3 fails, the mitigation named in research is a
short delay between files or a lower size ceiling, and the same rule applies.

---

## Findings

Record anything found here, one entry per finding, with the row it came from. A finding is worth
more than a verdict: the verdict says a row failed, the finding says what a later reader needs to
know.

**Blocking findings.** A failure of row A1 is blocking for the phase and must be written here and
carried into `04-05-SUMMARY.md`, not left only in this sheet.

_No findings recorded yet, because the pass has not been walked._

## Cleanup owed after the pass

Every photograph uploaded during this pass is permanent and public and cannot be removed from a
phone. When the pass is done, the owner clears them from the Supabase dashboard for project
`aplaxdplwnnlezffatal`: delete the rows from `public.photos`, then delete the matching objects from
the `party-photos` bucket. Prove the result through `public.album` rather than through the photos
table, which is refused to the publishable key, exactly as the phase 3 cleanup and the 2026-08-17
cleanup were proved.

One surprise worth knowing before meeting it: with a declared type list set on the bucket, creating
a folder through the dashboard can be refused, because the empty placeholder file a new folder makes
is not a JPEG. Deleting is unaffected.

| Field | Value |
|---|---|
| Photographs uploaded during the pass | Pending |
| Cleared from the database on | Pending |
| Album read back empty on | Pending |

---

## Outcome

Fill this in when both platforms are done. Anything unchecked stays unchecked in `REQUIREMENTS.md`:
a requirement that cannot be verified without a device is not satisfied by reading the source, and
phase 02 recorded that rule in `STATE.md` rather than quietly rounding up.

| Field | Value |
|---|---|
| Performed on | Pending |
| iOS device and version | Pending |
| iOS browser and version | Pending |
| Android device and version | Pending |
| Android browser and version | Pending |
| Network used | Pending |
| Served from | Pending |
| Rows failed | Pending |
| Follow up needed | Pending |
