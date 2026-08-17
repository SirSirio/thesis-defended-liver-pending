---
phase: 04-photos
reviewed: 2026-08-17T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app.js
  - config.js
  - copy.js
  - styles.css
  - supabase/schema.sql
findings:
  critical: 3
  warning: 9
  info: 0
  total: 12
status: issues_found
---

# Phase 4: Code Review Report

**Reviewed:** 2026-08-17
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the phase 04 surface: file validation, canvas downscale, the XHR object write, the
`public.photos` insert, the `public.album` read, the eight-state batch queue, the opening-time
gate, both error classifiers, the retry and the five-per-guest quota.

The parts the phase context asked me to check hardest are, on the whole, correct. Every
guest-supplied and database-supplied string reaches the DOM through `textContent` or a property —
I found no interpolation of a name, a file name or a storage path into markup, so there is no XSS
in the album or the queue. `guest_id` is never rendered, never put in a URL and never in an object
key: `storagePath()` mints a fresh uuid and `STORAGE_PATH_RE` refuses anything that is not that
exact shape before a path is concatenated into `href`/`src`, which also closes the traversal
vector. The publishable key in `config.js` is correctly a `sb_publishable_` key and is not
reported as a leak.

What is wrong is state coordination at the seams, and three of those are shipping defects:

1. The photos section is never re-rendered when the identity it depends on changes. After
   "forget this device" the upload control keeps standing, and the next pick uploads bytes to the
   public bucket and then writes a row with `guest_id: null`, which the database refuses — one
   guaranteed orphan object per picked file, reported to the guest as "The archive refused it".
2. The batch's terminal summary — the counted sentence, the assertive alert naming the files that
   did not land, and the whole transcript — is computed and then destroyed in the same task
   whenever the batch takes the guest to the quota. No frame ever paints it. That is PH-05's
   requirement failing at the one moment the guest most needs the answer.
3. The row insert has no idempotency and no network classification, so `sbRequest`'s 12 second
   timeout on a successful write leaves a `failed` row with a retry button under it; one tap
   uploads a second object, writes a second row, and burns a second slot of an allowance the copy
   says cannot be taken back.

## Structural Findings (fallow)

No `<structural_findings>` block was supplied with this review. All findings below are narrative.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: The photos section is never re-rendered after an identity change, and "forget this device" then uploads orphans

**Severity:** BLOCKER
**File:** `app.js:2499-2506` (`refreshEnrollmentState`), `app.js:2903-2925` (`forgetIdentity`), `app.js:5067` (`renderPhotos`)

**Issue:** `renderPhotos()` has exactly two call sites — `applyLanguage()` (`app.js:149`) and
`syncPhotosGate()` (`app.js:237`, which fires only when the open/closed boolean flips). It is
absent from `refreshEnrollmentState()`, which is the single fan-out every enrollment mutation
runs through. The photos ladder at `app.js:5092-5110` is a pure function of `ident.name`,
`ident.guest_id` and `identity.photoCount()`, and every one of those is written by the enrollment
controls. Three reachable consequences:

- **Orphan uploads (the serious one).** `forgetIdentity()` calls `identity.clear()`, removing
  `guest_id`, `name` and `photo_count`, then `refreshEnrollmentState()`. The photos section is
  untouched, so the standing `.uploader` remains on the page with `photosRemaining()` still
  reading its stale figure. A pick now runs `runBatch()`, which does `photoIdent = identity.get()`
  → `{ guest_id: null, name: null }`. Validation passes, the downscale succeeds, `uploadObject()`
  writes the object to the public bucket, and only then does `insertPhotoRow()` POST
  `{"guest_id":null,"name":null,...}` into a table whose `guest_id uuid not null`
  (`supabase/schema.sql:149-150`) refuses it with 23502. `classifyPhotoInsert()` maps that to
  `photos.err.server`, so the guest is told "The archive refused it" for every file, and every
  file leaves an unreferenced object in the bucket. The retry button is offered on those `failed`
  rows, so one tap produces a second set of orphans.
- **Stale gate.** A guest who reads the photos section first sees the `gate` panel, taps its
  "Register for the course" CTA, registers, scrolls back — and the gate is still there telling
  them to register. It only clears on a language tap or a reload.
- **Stale remaining count.** Clearing the identity resets `photo_count` to 0, but the
  `.uploader__count` figure keeps whatever it last painted.

**Fix:** add the renderer to the fan-out, the same way the bar and the head count were added:

```js
function refreshEnrollmentState() {
  renderEnrollment();
  renderDeadline();
  renderNudge();
  renderSocialProof();
  // The photos ladder reads ident.name, ident.guest_id and the stored photo
  // count, and every enrollment control writes at least one of them.
  renderPhotos();
}
```

`renderPhotos()`'s existing mid-batch skip guard (`app.js:5081-5085`) already makes this safe to
call at any time. Additionally, harden the entry point so a drifted identity cannot spend bytes:
in `runBatch()`, after `photoIdent = identity.get()`, bail to the gate rather than uploading —

```js
photoIdent = identity.get();
if (!photoIdent.guest_id || !photoIdent.name) { renderPhotos(); return; }
```

### CR-02: The batch's settle-time summary is destroyed in the same task it is written, so unlanded files are never reported (PH-05)

**Severity:** BLOCKER
**File:** `app.js:4942-5007` (`settleBatch`), `app.js:5132-5142` (`renderPhotos`)

**Issue:** `settleBatch()` computes the terminal control state, writes the polite counted
sentence (`app.js:4967-4969`) and the assertive line naming what did not land
(`app.js:4981-4984`), and then, still synchronously in the same task, runs:

```js
if (identity.photoCount() >= photosMaxPerGuest()) {
  photoBatchPending = false;
  return renderPhotos();
}
```

`renderPhotos()` selects the `full` body, clears `#photos-body`, and resets `photoBatch`,
`photoStatus` and `photoAlert` to empty (`app.js:5136-5141`). No frame is painted between the
write and the wipe, so the summary the guest is owed is never visible. The clearest failure:

> The guest is at 3 of 5. They pick 5 photographs. `room` is 2, so files 3, 4 and 5 are refused
> as overflow. Files 1 and 2 record, the count hits 5, `settleBatch` sets
> `photos.status.partial` ("2 recorded, 3 not.") and the alert
> `photos.refuse.extra` — and both are destroyed on the next statement. The guest is left looking
> at "Documentation complete. Five photographs are on record in your name." with no indication
> anywhere that three of the five files they picked were never sent.

The same wipe takes any `failed` row and its retry button with it. The `full` body's comment
claims "the guest sees the transcript of the batch they just submitted finish before the file
closes over it" — that is not what the code does.

**Fix:** carry the batch's outcome into the quota body instead of dropping it. Minimal version —
keep the transcript and the alert alive across the swap by rendering them under the quota panel:

```js
// in settleBatch, replace the immediate flip
if (identity.photoCount() >= photosMaxPerGuest()) {
  photoBatchPending = false;
  photoQuotaSummary = { status: photoStatus, alert: photoAlert, batch: photoBatch };
  return renderPhotos();
}
```

and in `renderPhotos()`'s `full` branch, append the retained alert line and queue below
`quotaPanel()` before clearing the model. If the design refuses to put a transcript under the
punchline, the alternative is to defer the flip: leave the `partial`/`refused` body standing and
only fall to `full` on the next `renderPhotos()` (page load, language tap, or the next pick),
which the ladder already handles.

### CR-03: A timed-out row insert is retryable, so one tap can write a duplicate photo row and burn a second quota slot

**Severity:** BLOCKER
**File:** `app.js:4007-4012` (`insertPhotoRow`), `app.js:3990-4005` (`classifyPhotoInsert`), `app.js:5032-5059` (`retryFailedFiles`)

**Issue:** `sbRequest` resolves `{ ok:false, code:'NETWORK' }` after 12 seconds
(`app.js:1371-1378`) whether or not the request reached PostgREST. The insert carries no
idempotency key of any kind — `storage_path` is minted fresh per attempt at `app.js:4837` — so a
row that PostgREST wrote at second 13 is indistinguishable, to this client, from one it never
received. `classifyPhotoInsert()` returns `photos.err.server` for that outcome, the row is set to
`failed`, and `failed` is precisely the state `retryFailedFiles()` re-drives: `rec.path = null`,
state back to `waiting`, `runNextFile()`. The retry uploads a **second** object under a **new**
uuid and inserts a **second** row. Result: two tiles of the same photograph in everyone's album,
two of the guest's five slots consumed, and one extra orphan — for content the site's own copy
says "cannot be taken back from here" (`photos.permanent`).

This is the same class of defect the enrollment path took seriously and solved: `submitEnrollment`
handles the "lost response on a bad connection" case explicitly through the unique constraint on
`guest_id` (`app.js:1444-1448`). The photos path has no equivalent, and 12 seconds for a JSON POST
on party wifi is not a contrivance — it is the network this phase was written for.

**Fix:** make the insert idempotent by deriving the object key once per record and reusing it
across attempts, so a repeated insert collides on `storage_path unique`
(`supabase/schema.sql:151`) instead of duplicating. `rec.path` is already on the record; stop
clearing it on retry and stop minting a new one when it is set:

```js
// runNextFile
var path = rec.path || storagePath();
if (!path) { setRowState(rec, 'failed', 'photos.err.server', null); return runNextFile(); }
rec.path = path;

// retryFailedFiles: do NOT null rec.path
rec.slot = ++again;
setRowState(rec, 'waiting', null, null);
setRowProgress(rec, 0);
```

Then teach `classifyPhotoInsert()` that a 409/23505 on `storage_path` means *this row is already
recorded* and return `'ok'`, and have `uploadObject` tolerate the object already existing
(Storage answers `KeyAlreadyExists`, which `storageBodyStatus()` already surfaces). Note that the
`BEFORE INSERT` trigger fires ahead of the unique constraint for a guest at the maximum
(`supabase/schema.sql:65-70`), so the 23505 branch must sit alongside, not inside, the `P0001`
branch.

## Warnings

### WR-01: The row-insert classifier never reports a network failure, so a dropped connection is blamed on the archive

**Severity:** WARNING
**File:** `app.js:3990-4005`

**Issue:** `classifyStorage()` deliberately distinguishes the synthesised `NETWORK` code
(`app.js:3968`) because "it is the one outcome that means the bytes never arrived, which is a
sentence a guest can act on". `classifyPhotoInsert()` — sitting fifteen lines below it and
reading the same `code` field from the same `sbRequest` shape — checks only `P0001` and falls
through to `photos.err.server`. So a guest whose connection drops during the row insert reads
"The archive refused it", which is false on both halves: nothing arrived at the archive, and
nothing refused anything. It also removes the only cue that pressing retry is the right move.

**Fix:**

```js
function classifyPhotoInsert(res) {
  if (!res) return 'photos.err.server';
  if (res.ok) return 'ok';
  if (res.code === 'P0001') return 'limit';
  if (res.code === 'NETWORK') return 'photos.err.network';
  return 'photos.err.server';
}
```

### WR-02: `retryFailedFiles()` has no busy guard — only a CSS `display:none` prevents a second concurrent upload driver

**Severity:** WARNING
**File:** `app.js:5032-5059`, `styles.css` (`.uploader__retry { display: none; }` / `[data-state="partial"|"failed"]`)

**Issue:** The sequential driver's whole contract is "at any instant at most one request is in
flight and at most one row is in a moving state" (`app.js:4792-4796`). `runBatch`'s entry point is
protected by a real DOM property (`btn.disabled = busy`, `app.js:4235`). The retry's is not: the
button is never disabled, and the only thing keeping it off the screen during a batch is a
stylesheet rule. If the stylesheet is not applied — a failed CSS request on the same bad network
this phase is built for, a reader mode, a user stylesheet — a tap during an upload resets the
already-`failed` rows to `waiting`, overwrites `photoBatchTotal` (`app.js:5054`) so the running
driver's "Sending {i} of {n}" starts lying, and calls `runNextFile()`, which starts a **second**
concurrent driver. Both drivers then walk the same array and both eventually call
`settleBatch()`. The function's own comment acknowledges "a control that can be called from
anywhere owes a terminal answer for every input" but only guards the `!again` case.

**Fix:** guard on the model, which is the only thing that knows:

```js
function retryFailedFiles() {
  // The driver is sequential by contract. CSS hides this control while a batch
  // runs; the model is what enforces it.
  if (photoState === 'preparing' || photoState === 'uploading') return;
  ...
}
```

### WR-03: `downscaleToJpeg()` has no timeout, so its stated "the caller cannot be left waiting" invariant does not hold

**Severity:** WARNING
**File:** `app.js:3774-3831`

**Issue:** The header comment says "The settled flag mirrors sbRequest's invariant: the caller
cannot be left waiting." It does not. `sbRequest` earns that invariant by racing the wire against
a timer that *resolves* (`app.js:1371-1378`, and the long comment there explains exactly why a
flag alone is not enough). `settled` here only prevents a double-settle; nothing guarantees a
settle at all. If neither `img.onload` nor `img.onerror` fires — decode abandoned under memory
pressure, a `File` handle invalidated by the OS between pick and read, a blob URL the browser
declines to resolve — `done()` is never called, `runNextFile()` never re-enters, the object URL is
never revoked, and `photoState` stays `preparing` with `#photos-pick` disabled for the rest of the
page's life. There is no recovery short of a reload, and `renderPhotos()` will refuse to rebuild
the control because its skip guard reads that same stuck state (`app.js:5081-5085`).

**Fix:** give it the same shape `sbRequest` and `uploadObject` (`xhr.timeout = 60000`) already
have:

```js
var timer = setTimeout(function () { finish(null, 'photos.err.decode'); }, 20000);
function finish(blob, errKey) {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  URL.revokeObjectURL(url);
  img.src = '';
  done(blob, errKey);
}
```

### WR-04: The canvas backing store is not released on two of the four failure paths

**Severity:** WARNING
**File:** `app.js:3801-3826`

**Issue:** The file states the rule itself — "canvas.width = 0 is the one people leave out and it
is the one that actually frees the backing store on WebKit" — and then applies it only inside the
`toBlob` callback (`app.js:3821`, `app.js:3824`). The two early returns after the canvas is sized,
`if (!ctx) return finish(...)` (`app.js:3806`) and the `drawImage` catch
(`app.js:3810-3814`), leave a full `cw × ch` backing store attached to a canvas that is then only
reachable through the closure. On the phone this matters on, that is up to 1600×1600×4 bytes held
past the point the next file starts decoding — and `drawImage` throwing is itself a
memory-pressure signal, so this leaks precisely when the heap is already tight.

**Fix:** release before every return past the allocation:

```js
function release() { canvas.width = canvas.height = 0; }
var ctx = canvas.getContext('2d');
if (!ctx) { release(); return finish(null, 'photos.err.decode'); }
try { ctx.drawImage(img, 0, 0, cw, ch); }
catch (e) { release(); return finish(null, 'photos.err.decode'); }
```

### WR-05: Hiding broken tiles in CSS breaks the head-count invariant the album read claims to guarantee

**Severity:** WARNING
**File:** `styles.css` (`.album__tile[data-broken] { display: none; }`), `app.js:4112-4131`, `app.js:4069`

**Issue:** `renderAlbum()` filters rows through `STORAGE_PATH_RE` *before* counting, with the
stated reason: "Filtered before anything is counted or concatenated ... The two have to agree or
the register lies." That invariant is then broken one function away. `albumTile()` sets
`data-broken` on an image `error`, and the stylesheet removes the tile from the layout — but
`albumHead('count', rows.length)` has already been painted from the unfiltered-by-load count. A
404ing object (every orphan CR-01 and CR-03 create is a *row-less* object, but the reverse — a row
whose object was cleaned out of the bucket by the owner from the dashboard — is exactly the
documented cleanup path) leaves the register reading "12 submissions on record" above eleven
tiles. The register lies in the precise way the filter was written to prevent.

**Fix:** either count what is actually on screen, by decrementing the head on `error`:

```js
img.onerror = function () {
  a.setAttribute('data-broken', '1');
  albumCountDown(host);   // re-render the head from the live tile count
};
```

or accept the drift and delete the "the two have to agree" comment so the next reader is not
misled about a guarantee that does not exist.

### WR-06: The five-photograph limit is hardcoded into nine copy strings while `photos.maxPerGuest` is configurable

**Severity:** WARNING
**File:** `copy.js` (`photos.refuse.extra`, `photos.full.body`, `photos.lede` × 3 languages), `config.js:216`

**Issue:** `app.js` is scrupulous about this — `photosMaxPerGuest()` exists specifically so the
number is read "never a literal, because two parses of one value drift apart on a typo"
(`app.js:4906-4907`) — and then the number is written as a word into the copy the guest actually
reads: "Five per person is the limit. {n} of these were not accepted.", "Five photographs are on
record in your name.", "Maximum five per person", and their Italian and Danish equivalents. An
owner who edits `photos.maxPerGuest` to 3 gets a site that refuses the fourth photograph while
telling the guest, in three languages, that the limit is five. `config.js:216`'s own comment
points only at `schema.sql`, so nothing warns them about the copy.

**Fix:** the substitution machinery already exists — `phrase()` fills `{n}`-style tokens, and
`hitQuota`/`runBatch` already pass vals objects. Parameterise the limit:

```js
'photos.refuse.extra': '{max} per person is the limit. {n} of these were not accepted.',
'photos.full.body': '{max} photographs are on record in your name. ...',
```

and pass `{ n: extra.length, max: photosMaxPerGuest() }` at both call sites
(`app.js:4783`, `app.js:4922`) and in `quotaPanel()`. If parameterising the joke is judged to cost
more than it buys, add the constraint to `config.js` beside `maxPerGuest` in as many words:
"changing this number makes copy.js wrong in three languages."

### WR-07: `public.photos` accepts an unbounded, unshaped `name` and `storage_path` from any holder of the publishable key

**Severity:** WARNING
**File:** `supabase/schema.sql:147-153`, `supabase/schema.sql:214-218`

**Issue:** `public.enrollments` bounds its guest-supplied text —
`check (char_length(trim(name)) between 1 and 60)` and `char_length(note) <= 500`
(`schema.sql:112-117`). `public.photos`, whose `name` is the one column that is rendered into
*every other guest's* browser through `public.album`, declares only `name text not null` with no
bound at all, and `storage_path text not null unique` with no shape constraint, under a policy of
`with check (true)`. The client-side `STORAGE_PATH_RE` filter (`app.js:3873`) is the only thing
keeping a malformed path out of an `href`, and it lives in a file anyone can skip. `name` has no
filter anywhere: a single POST with the public key writes an arbitrarily long string that every
guest's album then renders (safely, via `textContent`, so this is not XSS — but it is unmoderated,
unbounded and, per the schema's own design, undeletable from the browser).

I accept the documented asymmetry — client checks protect a guest from their own mistake and are
not expected to hold against a crafted request. The point here is the opposite one: this is a
column where the *server-side* control the model relies on was simply not written, while its
sibling table has one.

**Fix:** mirror the enrollments bounds, in the same idempotent `alter` shape section 7 and
section 10 already use:

```sql
alter table public.photos
  drop constraint if exists photos_name_check,
  add constraint photos_name_check check (char_length(trim(name)) between 1 and 60);

alter table public.photos
  drop constraint if exists photos_storage_path_check,
  add constraint photos_storage_path_check
    check (storage_path ~ '^\d{4}-\d{2}-\d{2}/[0-9a-f-]{36}\.jpg$');
```

The second one moves `STORAGE_PATH_RE`'s contract to the side of the wire that can enforce it —
and the file already tells you both halves must change together, which is an argument for the
constraint living next to the regex's other half rather than only in JavaScript.

### WR-08: A browser that cannot measure upload progress is shown "Recording" for the entire send

**Severity:** WARNING
**File:** `app.js:3913-3920`, `app.js:4343-4357`

**Issue:** When `e.lengthComputable` is false, `uploadObject` reports `null`, `setRowProgress`
substitutes `0.92`, and the `f >= 0.92` branch immediately calls `setRowState(rec, 'recording')`.
The row therefore reads "Recording" / "Registrerer" from the first progress event until the
response lands — while the bytes are, in fact, still being sent. That is the same lie
`runNextFile` refuses forty lines earlier: "a control that says Sending while it is decoding is
lying about which step it is on". The state word is the row's only non-colour signal, and here it
names the wrong step for the whole of the longest step.

**Fix:** separate "hold the bar" from "advance the state word". The cap is honest without the
transition:

```js
function setRowProgress(rec, fraction) {
  if (!rec) return;
  var known = (typeof fraction === 'number' && isFinite(fraction));
  var f = known ? fraction : 0.92;
  if (f < 0) f = 0;
  if (f > 1) f = 1;
  // Only a measured completion advances the word. An unmeasurable upload holds
  // the bar at the cap and keeps saying Sending, which is what it is doing.
  if (f >= 0.92 && rec.state !== 'done') {
    f = 0.92;
    if (known && rec.state === 'uploading') setRowState(rec, 'recording');
  }
  ...
}
```

### WR-09: `'full'` is a declared uploader state that nothing can ever write

**Severity:** WARNING
**File:** `app.js:4171`, `app.js:5109`, `app.js:5158-5160`

**Issue:** `UPLOADER_STATES` lists eight values and describes itself as the guard that stops a
typo inventing a ninth. `setUploaderState` is called with `'preparing'`, `'uploading'`, a
re-seated `photoState`, or `settleBatch`'s computed state, which is one of
`idle | partial | success | failed | refused` (`app.js:4959-4963`). `'full'` is never among them:
the quota is handled one level up, by the ladder replacing the whole control with `quotaPanel()`,
so no `.uploader` element exists to carry `data-state="full"`. The list therefore documents a
state the control cannot enter, and the stylesheet has no rule for it — which is fine today and is
a trap for the next reader, who will reasonably assume `setUploaderState(uploader, 'full')` is a
supported call and find it silently coerced to `idle` by the `indexOf` guard if the element is
ever missing.

**Fix:** drop `'full'` from `UPLOADER_STATES` and state in the comment that the quota is a body of
the ladder rather than a state of the control:

```js
// Seven values, and the quota is deliberately not one of them: at the maximum
// renderPhotos() replaces the control entirely, so there is no .uploader to
// carry a full state. See the ladder at renderPhotos().
var UPLOADER_STATES = ['idle', 'preparing', 'uploading', 'success', 'partial', 'refused', 'failed'];
```

---

_Reviewed: 2026-08-17_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
