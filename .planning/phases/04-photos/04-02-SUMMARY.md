---
phase: 04-photos
plan: 02
subsystem: photos
status: complete
tags: [photos, upload, queue, progress, a11y, i18n, css]

requires:
  - plan 04-01's validateFile, downscaleToJpeg, storagePath, uploadObject, insertPhotoRow, renderAlbum
  - plan 04-01's 36 photos.* copy keys in three languages
provides:
  - photoBatch, the record array, and photoBatchPending, the skipped-render flag
  - setUploaderState (eight values), syncUploaderLanguage, refreshPhotosState
  - runBatch / runNextFile / settleBatch, the sequential driver
  - renderQueue / queueRow / setRowState / setRowProgress, the transcript
  - phrase(), photosMaxPerGuest(), photosRemaining(), maxFileMb()
  - .uploader__status, .uploader__alert, .uploader__label, .uploader__count
  - .queue, .queue__row, .queue__n, .queue__name, .queue__state, .queue__reason, .queue__bar, .queue__fill
affects:
  - plan 04-03 (closed body slots into the renderPhotos ladder)
  - plan 04-04 (the quota body is the eighth control state, full; the retry re-runs failed records)
  - plan 04-05 (device pass owns the task 3 human check)

tech-stack:
  added: []
  patterns:
    - "a model-first control: every visible thing is a projection of one array, nothing is read back out of the DOM"
    - "one closed list of state strings guarding the sole writer of the attribute CSS reads"
    - "failure reasons stored as copy keys plus substitution values, so a language switch re-renders without re-running validation"
    - "a determinate bar capped below completion until the server answers, with the dead wait named as a state word"

key-files:
  created: []
  modified:
    - app.js
    - styles.css

decisions:
  - "The status line is not given the hidden attribute. Two contract rules could not both hold: [hidden] is display:none !important, so a hidden line has no reserved box."
  - "On a partial batch the assertive line stays silent rather than repeating the polite line's counted sentence."
  - "The album refetches once per recorded file rather than once per batch, so the guest's own photograph lands below the control while the next file is still decoding."
  - "recordRow() is not reused for the remaining-count field, because it writes a translation attribute and this phase writes none."

metrics:
  duration: 22m
  tasks: 3
  commits: 3
  completed: 2026-08-16

actuals:
  tokens: 10304
  tasks: 3
  commits: 3
---

# Phase 04 Plan 02: The Transcript Summary

The tracer's single path becomes a submission transcript: five photographs picked at once become
five numbered rows before any work begins, one file moves at a time, each row's separating rule is
that file's progress bar, and the bar stops short of the end until the archive has actually
answered.

## What shipped

**Task 1 — the batch model, the driver and the eight control states** (`6da29fe`).

`photoBatch` is a module-scope array of records, declared in one statement alongside everything
that is a function of it. Every visible thing in the control is a projection of that array and
nothing is read back out of the DOM. `setUploaderState()` is modelled line for line on
`setFormState()` at `app.js:1893`: one attribute, no classes, no second flag, guarded by a closed
list of the eight legal values so a typo cannot invent a ninth and reach CSS that has no rule for
it. `runBatch()` builds one record per picked file, renders the transcript, then validates; the
sequential `runNextFile()` walk keeps at most one request in flight and at most one row moving;
`settleBatch()` computes the terminal state from the records rather than from a counter kept
alongside them, so the control cannot disagree with the transcript the guest is reading.

**Task 2 — the transcript and the progress honesty contract** (`8c070c5`).

`queueRow()` builds the index numeral, the file name, the state word, the reason node and the bar.
`setRowState()` is the sole writer of a row's state and stores the reason as a copy key plus its
substitution values. `setRowProgress()` writes exactly one transform on exactly one fill and owns
the 0.92 cap: below it the fill tracks the reported fraction and the word is Sending; at or above
it with no response yet the fill holds and the word swaps to Recording; on a 2xx the fill reaches
the end and the word becomes On record. `uploadObject()` now reports the non-computable side of
`lengthComputable` rather than dropping it, so a browser that will not measure gets the held bar
and the recording word from the start instead of a bar sitting at zero while the photograph moves.

**Task 3 — the transcript in CSS** (`de9bfd6`).

`.queue__bar` is 2px in every state, pinned to the row's bottom edge, filled with the rule token.
`.queue__fill` moves only by `scaleX` from a left origin at 140ms linear. The reduced-motion rule
joins the existing block at `styles.css:1824` and removes the transition without parking or hiding
the bar, which is the deliberate opposite of the `.sweep` rule three lines above it.

## Verification

Every automated gate in the plan was run, plus a behavioural harness the plan did not ask for.

| Gate | Result |
|---|---|
| `node --check app.js` | pass |
| Six task-1 functions present | 6 / 6 |
| Four task-2 functions present | 4 / 4 |
| `grep -c 'var photoBatch'` | 1 |
| All eight control state strings in the file | 8 / 8 |
| All ten queue and status copy keys referenced | 10 / 10 |
| `uploader.*setAttribute('data-state'` in the photos region | 1, inside `setUploaderState` |
| `row.*setAttribute('data-state'` in the photos region | 1, inside `setRowState` |
| `aria-busy` inside `setUploaderState` | present |
| `querySelectorAll` / `$$(` inside `renderQueue` | 0 |
| `0.92` inside `setRowProgress` | present |
| `lengthComputable` inside `uploadObject` | 1, false side handled |
| Layout properties written by `setRowProgress` | 0 |
| A service `message` string reaching a text node | 0 |
| Translation attributes added to `app.js` | 0 |
| `innerHTML=` / `insertAdjacentHTML` added | 0 / 0 |
| New custom properties in the `styles.css` diff | 0 |
| `transition` naming `width` in any `.queue__fill` rule | 0 |
| `transform-origin` in the fill rules | 1, left origin |
| `2px` in `.queue__bar` | present, unchanged by any state |
| Banned constructs in the diff | 0 |
| New font sizes outside the permitted steps | 0 |
| New colours that are not token references | 0 |
| New hover rules | 0 |
| `.queue__fill` rule inside the reduced-motion block | present |
| `git diff --stat` against the plan base | exactly `app.js` and `styles.css` |

### The behavioural proof

The plan's automated gates are all greps, and a grep cannot tell a wired control from a plausible
one. So the whole page was run under a throwaway DOM stub in `node` (scratchpad only, nothing
added to the repo) and a mixed batch was driven end to end. **This is what caught the one real
defect in this plan.**

Seven files picked at once: one valid JPEG, a PDF, a PNG with an empty name, a 99 MB JPEG, and
three more valid JPEGs.

| Claim | Observed |
|---|---|
| Seven rows exist before any work begins | seven rows, numbered 1 to 7 |
| The PDF is refused by name | `refused` / "Not accepted" / "Not an image file" |
| The oversize file names the configured ceiling | "Larger than 12 MB", substituted from `photos.maxFileSizeMb` |
| An empty file name falls back | renders "Untitled image" |
| The valid files still upload | 5 storage writes, 5 rows indexed |
| One request in flight at a time | the driver never held two |
| Below the cap the bar tracks and says Sending | `uploading` / "Sending" / `scaleX(0.4)` |
| At the cap with no response the bar holds and the word swaps | `recording` / "Recording" / `scaleX(0.92)` |
| No bar reaches its end before the archive answers | no `scaleX(1)` observed mid flight |
| A recorded row reaches the end | `done` / "On record" / `scaleX(1)` |
| A refused row draws no line | `scaleX(0)` |
| The remaining figure ticks live | 5 to 0 across the batch |
| The mixed batch settles partial | `data-state="partial"`, status "5 recorded, 2 not." |
| Every path matches the D-20 allowlist | 5 / 5 |
| A second pick at the limit refuses by name and number | two `refused` rows, control `refused`, alert carries the count |
| Nothing is uploaded past the limit | 0 further writes |

With `lengthComputable` forced false the bar holds at `scaleX(0.92)` with the recording word from
the first event, which is the E3 empty row proved rather than asserted.

## Deviations from Plan

### 1. [Rule 1 - Bug] The status line is not given the hidden attribute

**Found during:** Task 3
**Issue:** Two of the plan's own truths cannot both hold literally. One requires the status node to
be "hidden" at idle; another requires it to hold "a reserved box in every state, so the submit
button and the album below it never move when a batch starts or ends". `[hidden]` is
`display: none !important` in the Base block, so a hidden status line has no box at all and the
album below it steps 24px each time a batch starts and ends.
**Fix:** The node exists from first render, empty, and is never hidden. `min-height: var(--s-5)`
reserves its 24px in every state. The alert line keeps `hidden`, because the contract only reserves
the status line and a permanently reserved red line would be dead space. This also serves the
reason the contract wanted the node early in the first place: a live region that was
`display: none` at the instant its content arrived is the case screen readers handle worst, and an
empty node that is in the layout announces more reliably than one that is not.
**Files modified:** app.js, styles.css
**Commits:** `6da29fe`, `de9bfd6`

### 2. [Rule 1 - Bug] The assertive line no longer repeats the polite one

**Found during:** Task 2, by the behavioural harness
**Issue:** On a partial batch whose failures have different reasons, the settle logic put
`photos.status.partial` into both live regions. A guest using a screen reader was told
"5 recorded, 2 not." twice, once politely and once assertively. That is the "same sentence twice"
defect the UI-SPEC warns about for the button label, reappearing in the one place where both
regions can honestly claim the sentence.
**Fix:** One reason shared by every unlanded row is still named assertively. Several reasons no
longer stack, because each row already carries its own reason in writing. On `partial` the
assertive line stays silent, because the polite line already carries the count. Where nothing
landed the polite line is empty, so the assertive line carries the count as before.
**Files modified:** app.js
**Commit:** `8c070c5`

### 3. [Rule 3 - Blocking] One acceptance grep is unsatisfiable as written

**Found during:** Task 2
**Issue:** The criterion `awk '/function downscaleToJpeg\(/,/^  }/' app.js | grep -cE 'runNextFile\(|runBatch\(|downscaleToJpeg\('` must return 0, but the awk range begins at the
function's own declaration line, which contains `downscaleToJpeg(`. No implementation can satisfy
it. Same class as plan 04-01's deviation 1.
**Fix:** Ran the gate against the function body, excluding its own declaration line
(`| tail -n +2 |`). It returns **0**, so the intent holds: the decode path cannot re-enter itself
or the driver for the same record, and a decode or encode failure is terminal for that file.
**Files modified:** none
**Commit:** n/a

### 4. [Rule 2 - Missing critical functionality] `maxFileMb()` extracted

**Found during:** Task 1
**Issue:** `photos.err.size` carries `{mb}` and must name the same number the check enforced, but
`maxFileBytes()` parsed the config value privately, so the refusal copy would have needed a second
parse of the same field. Two parses of one value are two numbers that drift apart on a typo.
**Fix:** One reader, `maxFileMb()`; `maxFileBytes()` calls it. Proved by the harness, which
rendered "Larger than 12 MB" for a 99 MB file against a configured ceiling of 12.
**Files modified:** app.js
**Commit:** `6da29fe`

### 5. [Rule 2 - Missing critical functionality] The model is cleared with the control

**Found during:** Task 1
**Issue:** `renderPhotos()` discards the uploader when the body kind changes, but the module held
references to the discarded nodes and a batch model the control could no longer act on. A guest who
withdrew mid session would come back to a transcript of an evening no control could touch.
**Fix:** The references are nulled and, when the new body is not the upload body, the batch, the
totals, the pending flag, both live-region models and the control state are all reset.
**Files modified:** app.js
**Commit:** `6da29fe`

## Known Stubs

One scope handoff the plan states in its own text, recorded so the verifier sees it.

| Stub | File | Why |
|---|---|---|
| The `full` control state is declared in `UPLOADER_STATES` and is never written. A guest who reaches five sees the control settle to `success` or `partial` with the remaining figure at 0, and a further pick is refused by name with `photos.refuse.extra` rather than with the joke. | `app.js` (photos region) | The phase artifact registry assigns the quota body to plan 04-04, which adds the `full` branch to the `renderPhotos()` ladder. The value is named here because the closed list is the guard, and a list that grows by one on a later plan is a list two plans disagree about. The interim behaviour is honest and never silent: every refused file is named and numbered. |

The retry control (`photos.retry.failed`, the `partial` and `failed` states' second button) is also
plan 04-04's, per the phase registry. The records survive with their `File` objects intact until
the guest picks again, which is what makes that retry possible without re-picking.

## Outstanding verification

**The task 3 `<human-check>` was not performed and its seven observations are NOT recorded.** It
requires `node tools/preview.js`, a browser at a 320px viewport, real photographs from a camera
roll, and an operating-system reduced-motion toggle. `human_verify_mode` is `end-of-phase` in
`.planning/config.json` and plan 04-05 is the device pass that owns it. Carry:

1. Three numbered rows appear immediately on picking three photographs.
2. Exactly one bar moves at a time.
3. The bar stops short of the end and the state word changes before the row completes.
4. Every state word holds one line at 320px in Danish.
5. A long file name wraps rather than being cut.
6. No row shifts vertically at any point during the batch.
7. With reduced motion on, the bar still advances in steps and is neither hidden nor parked at
   full width.

Observations 1, 2, 3 and 6 are proved logically by the harness above (rows exist before work
begins, the driver is strictly sequential, the cap holds with the word swapped, and the bar's
height is 2px in every state with the row's padding fixed). What only a device can settle is the
typography at 320px and the operating-system reduced-motion path.

Requirements were deliberately **not** marked complete in `REQUIREMENTS.md`. PH-01, PH-05, PH-06
and PH-07 are phase-level and three plans of this phase are still outstanding; PH-01 in particular
is only settled by the device pass. This follows plan 04-01's precedent.

## Threat Flags

None. No security-relevant surface was introduced beyond the `<threat_model>` register, and four of
its rows are discharged by this plan:

- **T-04-10** (an operating-system supplied file name rendered into the queue): the name cell is
  `createElement` plus `textContent`. Zero `innerHTML` assignments and zero adjacent-markup
  insertions were added.
- **T-04-12** (a control left spinning): every branch of `runNextFile()` terminates in a row state
  and re-enters the driver, and the walk terminates in `settleBatch()`, which terminates in a
  control state. Proved by the harness, which reached a settled control on a batch containing a
  validation refusal, an oversize refusal and five successes.
- **T-04-13** (simultaneous decodes exhausting a phone): the driver is strictly sequential and
  `downscaleToJpeg()` releases the object URL, the image source and the canvas backing store before
  the callback runs.
- **T-04-14** (a bar claiming completion before the archive answered): the cap, the state-word
  swap and the non-computable branch were all observed rather than asserted.

## Self-Check: PASSED

- `app.js` and `styles.css` both present and modified
- commit `6da29fe` found in `git log`
- commit `8c070c5` found in `git log`
- commit `de9bfd6` found in `git log`
- `git diff --stat` against the plan base `3f0c523` shows exactly the two planned files, no others
