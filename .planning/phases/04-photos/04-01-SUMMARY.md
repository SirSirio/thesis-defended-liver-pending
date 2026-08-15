---
phase: 04-photos
plan: 01
subsystem: photos
status: complete
tags: [photos, upload, storage, album, supabase, i18n, css]

requires:
  - phase 3's sbRequest(), identity, store, pendingBlock(), newGuestId()
  - public.album view and public.photos table, live and applied
provides:
  - validateFile, downscaleToJpeg, storagePath, STORAGE_PATH_RE
  - uploadObject (the one XHR), insertPhotoRow, photoPublicUrl
  - renderPhotos (pending, gate, upload bodies), renderAlbum, albumTile, albumHead
  - identity.photoCount() / identity.setPhotoCount()
  - photos.opensAt, photos.maxEdgePx, photos.jpegQuality
  - 36 photos.* copy keys per language
affects:
  - plan 04-02 (queue transcript, eight uploader states, refreshPhotosState)
  - plan 04-03 (closed body, photosOpen gate)
  - plan 04-04 (quota body, classifiers, retry)
  - plan 04-05 (bucket record, device pass, cleanup inventory)

tech-stack:
  added: []
  patterns:
    - "canvas decode/draw/encode with hand-released bitmap, object URL and backing store"
    - "XMLHttpRequest with all four terminal handlers and a single settle guard"
    - "render-time anchored allowlist regex coupled to its path builder"
    - "module-scope sequence token claimed before the request, checked above the clear"

key-files:
  created: []
  modified:
    - config.js
    - copy.js
    - app.js
    - styles.css

decisions:
  - "Object key layout locked to {yyyy-mm-dd}/{fresh-uuid}.jpg (D-20, option-a). One-way door, auto-selected under auto_advance."
  - "The allowlist regex and storagePath() are one contract and ship in one commit."
  - "Storage first, then the row. The orphan a failed row insert leaves is accepted, not repaired."
  - "Album head count is computed from rows that survive the allowlist, so the register cannot disagree with the grid."

metrics:
  duration: 11m
  tasks: 3
  commits: 2
  completed: 2026-08-16

actuals:
  tokens: 11159
  tasks: 3
  commits: 2
---

# Phase 04 Plan 01: The Photo Upload Tracer Summary

The whole spine of the photos phase proven on one path against the live project: three config
keys, the 36 key copy contract in three languages, the validator, the downscaler, the path
builder, the codebase's only XMLHttpRequest, the row insert, and the album read that proves the
write by reading it back rather than by trusting a status code.

## What shipped

**Task 1 — the object key layout (checkpoint:decision).** Auto-selected `option-a` under
`workflow.auto_advance`, which is D-20 as written: `{yyyy-mm-dd}/{fresh-uuid}.jpg`, with the uuid
minted per upload by `newGuestId()` and unrelated to `guest_id`. The checkpoint carried
`gate="blocking"` rather than `gate="blocking-human"`, so auto-selection applied. Recorded here
because it is a one-way door: nothing in the browser can rename or delete a stored object, and the
album's allowlist regex is the same contract read backwards.

**Task 2 — the data contract** (`2b68edc`). `config.js` gained `opensAt`, `maxEdgePx` and
`jpegQuality` inside the existing `photos` block, each commented for a non-programmer, plus the
sentence D-21 requires on `maxFileSizeMb` naming it and the bucket's 3 MB ceiling as two different
numbers doing two different jobs. `copy.js` went from 156 to 192 keys in each of `en`, `it` and
`da`, at identical key sets, using the UI-SPEC strings verbatim.

**Task 3 — the tracer** (`36b3817`). One new region in `app.js` after the enrollment cluster, plus
the album grid and uploader host in `styles.css`.

## Verification

Every automated gate in the plan was run.

| Gate | Result |
|---|---|
| `node --check` on config.js, copy.js, app.js | pass |
| Copy parity | `parity ok 192`, three tables at identical key sets |
| Codepoint scan for U+2013 / U+2014 | clean |
| `opensAt` strictly earlier than `startsAt` | pass |
| All 36 new keys in all three tables | pass |
| Refusal copy carries no fault language | `register ok` |
| Nine named functions present | pass |
| `innerHTML=`, `insertAdjacentHTML`, `Math.random` in code | 0 / 0 / 0 |
| `x-upsert`, `return=representation`, `Bearer` in code | 0 / 0 / 0 |
| `createImageBitmap`, `imageOrientation`, `rotate` in code | 0 / 0 / 0 |
| `guest_id` inside `storagePath` / `albumTile` | 0 / 0 |
| `toast(` inside the photos region | 0 |
| `rest/v1/photos?select` | 0, the album reads the view only |
| `xhr.on*` handlers in `uploadObject` | 4 |
| `status === 200` literal in `uploadObject` | 0, the test is a range |
| `renderPhotos()` before `measureNudge()` in the chain | pass |
| New custom properties in the styles.css diff | 0 |
| Album grid at 2 / 3 / 4 columns | pass |
| `aspect-ratio: 1 / 1` and `object-fit: cover` | pass |
| New hover rules inside `@media (hover: hover) and (pointer: fine)` | both |
| Live probe | `album 200`, `raw-table 401` |

### The live wire proof

A real 160 byte JPEG was pushed through the exact verbs and headers the new code sends.

| Step | Result |
|---|---|
| Storage write, `apikey` only, `image/jpeg`, `cache-control` | **HTTP 200** |
| Row insert, `Prefer: return=minimal` | **HTTP 201**, empty body |
| Album read through `public.album` | **HTTP 200**, the row present |
| `first_name` returned | `"ZZTEST"`, server-side `split_part` applied to `ZZTEST DeleteMe` |
| `guest_id` column on the view | absent |
| Public object read with no key | 200, `image/jpeg`, `cache-control: public, max-age=31536000` |

Two different success codes in the same upload of the same photograph, 200 from Storage and 201
from PostgREST, which is exactly why neither is tested against a literal. The `cache-control`
header we set is honoured on the way back out, so album images are not refetched on every view.

The allowlist was exercised against the live view and against traversal, query and fragment
attempts: all 7 rows currently in `public.album`, the probe row included, are skipped, so the album
renders clean on day one **before** the owner's cleanup rather than after it. `storagePath()` output
was checked against `STORAGE_PATH_RE` over 2000 samples with no mismatch, so the two halves of the
one-way contract agree.

### Probe artifact for the plan 04-05 cleanup inventory

Per the plan's acceptance criteria, the terminal probe wrote `ZZTEST DeleteMe`:

- `storage_path`: `zz-research/tracer-0401.jpg`
- `guest_id`: `ec7223c6-bb33-4b51-9536-9227d7aaf1bf`
- object id: `e4fe9d3f-0e57-46ba-8a8f-f67909a8ce69`

It does not match `STORAGE_PATH_RE` and therefore never renders. **Hand this to the owner with the
five pre-existing `zz-research/limit-N.jpg` rows.**

## Deviations from Plan

### 1. [Rule 3 - Blocking] Three forbidden-token greps re-scoped to executable code

**Found during:** Task 3
**Issue:** The plan requires `downscaleToJpeg()` and `insertPhotoRow()` to be copied from research
E1 and E4 "verbatim including its comment block", and those comment blocks contain the words
`createImageBitmap`, `imageOrientation` and `return=representation` in the course of explaining why
each was rejected. The plan separately requires `grep -c` of those same tokens to return 0. The two
instructions cannot both be satisfied literally.
**Fix:** Kept the comments verbatim, as the research and the plan both demand, and ran the three
gates against comment-stripped source instead. All three return 0 in executable code. The gates'
intent is "no second decode path, no read-back preference", and that intent is met and proven.
**Files modified:** app.js
**Commit:** `36b3817`

### 2. [Rule 3 - Blocking] Queue-copy length gate applied as the UI-SPEC scopes it

**Found during:** Task 2
**Issue:** The plan asserts every `photos.queue.*` value is 16 characters or fewer. Two verbatim
UI-SPEC strings exceed it: `photos.queue.unnamed` is `Immagine senza nome` (19) in Italian and
`Billede uden navn` (17) in Danish.
**Fix:** Kept the strings verbatim, because the plan forbids re-translating the UI-SPEC table. The
UI-SPEC's own self-audit scopes the 16 character budget to the seven **state words**, and
`photos.queue.unnamed` is not one: it renders in `.queue__name`, the cell the spec explicitly gives
`overflow-wrap: anywhere` so it may wrap. The seven state words were checked and the longest is 15
(`In preparazione`), which is what the spec claims.
**Files modified:** copy.js
**Commit:** `2b68edc`

### 3. [Rule 2 - Missing critical functionality] A minimal `setUploaderState()` landed in this plan

**Found during:** Task 3
**Issue:** The phase's artifact registry assigns `setUploaderState()` to plan 04-02, but this
plan's own action text requires that "every branch of the path terminates by writing a state onto
the uploader host, so no path can leave the control locked". Without the function the control can
be left disabled forever.
**Fix:** Shipped a three-value version (`idle`, `preparing`, `uploading`) that sets `data-state`,
toggles `disabled` and `aria-busy`, and reseats the label. Plan 04-02 extends it to the eight
values in the UI-SPEC rather than writing it from scratch.
**Files modified:** app.js
**Commit:** `36b3817`

### 4. [Rule 2 - Missing critical functionality] `stillMounted()` guard on the album continuation

**Found during:** Task 3
**Issue:** `renderAlbum()` writes to its host after an await, and `renderPhotos()` can replace the
host between the request going out and the response landing.
**Fix:** Added the `stillMounted(host)` check the codebase already requires of every post-await
write, beside the sequence-token check.
**Files modified:** app.js
**Commit:** `36b3817`

## Known Stubs

Both are scope handoffs the plan states in its own text, not oversights. Recorded so the verifier
sees them.

| Stub | File | Why |
|---|---|---|
| `runBatch()`'s progress callback is an empty function, and a file refused by validation, decode, upload or insert is currently dropped without a visible row | `app.js` (photos region) | The plan says "the progress callback is wired but has no bar to drive yet; plan 04-02 renders the transcript it feeds". **PH-05's no-silent-drop requirement is not satisfied until plan 04-02 lands `renderQueue()`/`queueRow()`.** |
| The uploader host renders the permanence line, the button and the input only. No remaining-count field, status line, alert line or queue | `app.js`, `styles.css` | The phase artifact registry assigns `.uploader__status` and `.uploader__alert` to plan 04-02 and the remaining-count fan-out to `refreshPhotosState()`, also 04-02. |

## Outstanding verification

**The task 3 `<human-check>` was not performed and its four observations are NOT recorded**, because
it requires picking a photograph from a real camera roll on a physical phone. `human_verify_mode` is
`end-of-phase` in `.planning/config.json`, and plan 04-05 is the device pass that owns it. The
automated and live-wire halves of the tracer's `<verify>` all passed, so the layers are proven; what
is unproven is the picker opening from a `hidden` input on real iOS Safari and real Android Chrome,
which the UI-SPEC already flags as a device pass item.

Carry to the device pass:

1. The picker opens from the `hidden` input.
2. The section does not throw.
3. The photograph appears as a square tile captioned with the guest's first name after the refetch.
4. Tapping the tile opens the full photograph in a new tab.

## Flagged planner assumptions, still assumptions

The plan's two unresolved UI E9 rows are unchanged by this work. The album head count is taken from
the fetched row count and is not recomputed after `img.onerror` hides a tile, and the refetch after
a successful upload is not delayed, so whether a just-written object is readable at that instant
remains the phase's one untested timing claim. If the device pass sees a broken own tile, the
`img.onerror` path already hides it and the fix is a short delay in one function.

## Threat Flags

None. No security-relevant surface was introduced beyond the `<threat_model>` register. T-04-01
(guest_id in a public key or the DOM) and T-04-03 (a database string steering a URL) were both
proved closed on the live wire: the view does not carry `guest_id`, and the anchored allowlist
rejects traversal, query and fragment payloads.

## Self-Check: PASSED

- `config.js`, `copy.js`, `app.js`, `styles.css` all present and modified
- commit `2b68edc` found in `git log`
- commit `36b3817` found in `git log`
- `git diff --stat` against the plan base shows exactly the four planned files, no others
