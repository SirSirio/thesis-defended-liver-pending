# Phase 4: Photos - Pattern Map

**Mapped:** 2026-08-15
**Files analyzed:** 6 files, 11 logical units (this is a no-build static site; the useful unit is the function/block, not the file)
**Analogs found:** 10 / 11

This project has five source files at the repo root and no modules. Every unit below lands inside an
existing file, so "closest analog" here means *the existing function or CSS block whose shape the new
code must copy*, and the excerpts are the shape to copy, not decoration.

---

## File Classification

| New/Modified unit | File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|---|
| `photosOpen()` | `app.js` | utility (gate) | transform | `phase(now)` + `startMs`/`endMs`, `app.js:164-185` | exact |
| closed-panel time text | `app.js` | utility (format) | transform | `formatSchedule()`, `app.js:263-277` | exact |
| photo count get/set on `identity` | `app.js` | store | CRUD (local) | `identity` object, `app.js:1189-1229` | exact |
| `validateFile()` | `app.js` | utility (validation) | transform | `validateName()` / `validateNote()`, `app.js:1516-1537` | role-match |
| `downscaleToJpeg()` | `app.js` | service | file-I/O | *none* | **no analog** |
| `storagePath()` | `app.js` | utility | transform | `newGuestId()`, `app.js:1156-1178` | role-match |
| `uploadObject()` (the one XHR) | `app.js` | service | streaming / request-response | `sbRequest()`, `app.js:1287-1330` | role-match (contract, not transport) |
| `insertPhotoRow()` | `app.js` | service | CRUD | `submitEnrollment()`, `app.js:1344-1377` | exact |
| `renderPhotos()` | `app.js` | component (section render) | event-driven | `renderEnrollment()`, `app.js:2349-2412` | exact |
| `renderAlbum()` + `albumTile()` | `app.js` | component (read view) | request-response | `renderSocialProof()`, `app.js:2448-2530` | exact |
| uploader state machine (`setUploaderState`) | `app.js` | component (state) | event-driven | `setFormState()`, `app.js:1873-1892` | exact |
| `.uploader` / `.album` / progress CSS | `styles.css` | style | n/a | `.map-slot` `:641-650`, `.form-alert` `:1449-1466`, `.sweep` `:1475-1500`, reduced-motion `:1824-1858` | exact |
| new copy keys x3 languages | `copy.js` | config | n/a | `photos.*` block, `copy.js:191-194 / 374-377 / 561-564` | exact |
| `photos.opensAt` / `maxEdgePx` / `jpegQuality` | `config.js` | config | n/a | `photos` block, `config.js:210-217` | exact |
| §6 bucket record | `supabase/schema.sql` | migration | n/a | phase 3's `on conflict do update` for `withdrawn` (§7) | role-match |
| `04-DEVICE-PASS.md` | `.planning/phases/04-photos/` | doc | n/a | `02-` / `03-DEVICE-PASS.md` | exact |
| `index.html` `#photos-body` | `index.html` | markup | n/a | `#enrol-body` / `#access-body` | exact — **no change needed**, it already holds the static `.pending` block |

---

## Pattern Assignments

### `photosOpen()` — the `opensAt` gate (`app.js`, utility, transform)

**Analog:** `app.js:164-165` and `app.js:180-185`

Module-scope parse, once, of a string that carries its own offset:

```js
var startMs = Date.parse(CFG.startsAt);
var endMs   = Date.parse(CFG.endsAt);
```

```js
  function phase(now) {
    if (isNaN(startMs)) return 'before';
    if (now < startMs) return 'before';
    if (!isNaN(endMs) && now >= endMs) return 'over';
    return 'live';
  }
```

**Copy:** the `Date.parse` + epoch-compare shape verbatim. `Date.parse` of a string carrying `+02:00`
yields the same instant in every timezone, which is the whole of D-04.
**Invert one thing:** `isNaN` falls back to `'before'` here (safe for a countdown). For `opensAt` it
must fall back to **open**, because `photos.opensAt: null` is the owner's emergency lever (D-05).
Write it as *open unless there is a valid future timestamp*.
**Forbidden:** `new Date(y, m, d)`, `toLocaleString` for comparison, reading the browser offset.

### Closed-panel time text (`app.js`, utility, transform)

**Analog:** `formatSchedule()`, `app.js:263-277`

```js
  function formatSchedule() {
    if (isNaN(startMs)) return t('facts.location.tbd');

    var locale = lang === 'it' ? 'it-IT' : (lang === 'da' ? 'da-DK' : 'en-GB');
    var opts = {
      day: 'numeric', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      timeZone: 'Europe/Copenhagen'
    };
    try {
      return new Intl.DateTimeFormat(locale, opts).format(new Date(startMs));
    } catch (e) {
      return new Date(startMs).toLocaleString();
    }
  }
```

**Copy:** the locale ternary, the `timeZone: 'Europe/Copenhagen'` pin, and the `try`/`catch` fallback
to `toLocaleString()`. Do not write a second locale map.

### Photo count in `identity` (`app.js`, store, local CRUD)

**Analog:** `identity`, `app.js:1189-1229`, with its layout comment at `:1180-1188`

```js
  var identity = {
    get: function () {
      var n = parseInt(store.get('extra_guests'), 10);
      return {
        guest_id: store.get('guest_id'),
        name: store.get('name'),
        extra_guests: isNaN(n) ? 0 : n,
        note: store.get('note'),
        enrolled: store.get('enrolled') === '1'
      };
    },
```

**Copy:** integers stored as decimal strings and read back with `parseInt(x, 10)` plus an `isNaN`
default — exactly the `extra_guests` treatment. The new key joins the documented layout comment at
`app.js:1180-1188` ("The storage layout under the `c03102.` prefix, exactly: ...") rather than being
written from somewhere else. `store` (`app.js:21-72`) already applies the `c03102.` prefix, so callers
pass bare keys.
**Also copy:** `clear:` at `:1222-1228` removes keys rather than blanking them. The photo count must
be considered there (forgetting the device should not leave a submission tally behind).

### `validateFile()` (`app.js`, utility, transform)

**Analog:** `validateName()` / `validateNote()`, `app.js:1516-1537` — validators return a **copy key
string or null**, never a message and never a boolean.

RESEARCH.md §Pattern 2 already writes it in that shape:

```js
function validateFile(file, maxBytes) {
  if (!file || !file.size)                       return 'photos.err.empty';
  if (file.type.indexOf('image/') !== 0)         return 'photos.err.type';
  if (file.size > maxBytes)                      return 'photos.err.size';
  return null;
}
```

The error key is then stored on the element as `data-errkey` so a language switch can re-render it
without re-running validation — see `syncFormLanguage()` below.

### `downscaleToJpeg()` (`app.js`, service, file-I/O) — **NO ANALOG**

Nothing in this codebase decodes or encodes an image. Use `04-RESEARCH.md` §Code Examples E1 verbatim,
including its comment block. Two house rules still apply and are not in E1's DNA by accident:
- the `settled` flag / `finish()` idiom mirrors `sbRequest`'s "cannot leave the caller locked"
  invariant (`app.js:1270-1286`);
- errors surface as **copy keys** (`'photos.err.decode'`, `'photos.err.encode'`), matching the
  validator convention above.

### `storagePath()` (`app.js`, utility, transform)

**Analog:** `newGuestId()`, `app.js:1156-1174`

```js
  function newGuestId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Safari before 15.4, and any non secure context that still has the object.
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      ...
    }
    return null;
  }
```

**Reuse, do not re-implement.** The `null` return is a real branch, and its handling precedent is at
`app.js:1178` (`var IDENTITY_OK = newGuestId() !== null;`) and `app.js:2612-2617`:

```js
    if (!ident.guest_id) {
      var fresh = newGuestId();
      if (!fresh) { setFormState(form, 'failure'); showAlert(form); return; }
```

Same shape here: no crypto means the file cannot be given a safe name, so it lands in the pending /
failure branch rather than getting a `Math.random()` path.

### `uploadObject()` — the one XHR (`app.js`, service, streaming)

**Analog for the transport:** none. **Analog for the contract:** `sbRequest()`, `app.js:1287-1330`.

The four properties to copy, all of which `sbRequest`'s comment at `app.js:1253-1286` earned the hard
way:

```js
    var timeout = new Promise(function (resolve) {
      timer = setTimeout(function () {
        if (ctl) ctl.abort();
        // The same shape the catch returns. To a guest a request that failed
        // and one that never answered are the same event.
        resolve({ ok: false, status: 0, code: 'NETWORK', body: null });
      }, timeoutMs || 12000);
    });

    var headers = { 'apikey': sbKey() };
```

1. **Key in `apikey` and nowhere else** (`app.js:1300`). Probe-verified correct for Storage too.
2. **Resolves, never rejects**, with `{ ok, status, code }` — so no call site needs a catch.
3. **Cannot leave the caller locked.** XHR's equivalent of the timeout race is wiring all four of
   `onload`, `onerror`, `onabort`, `ontimeout`. Three of four is a control that spins forever.
4. **A synthesised `code: 'NETWORK'`** for every non-answer, so the caller's branches match the
   PostgREST path's vocabulary.

Take the body from `04-RESEARCH.md` §E3. **Do not share the error classifier with `sbRequest`**:
Storage returns outer HTTP `400` for everything with the real status in `body.statusCode` (RESEARCH
§S4), and the storage success is `200` while the row insert's is `201`.

### `insertPhotoRow()` (`app.js`, service, CRUD)

**Analog:** `submitEnrollment()`, `app.js:1344-1377`, and its comment at `:1332-1343`

```js
  function submitEnrollment(fields, ident) {
    var row = {
      guest_id: ident.guest_id,
      name: fields.name,
      extra_guests: fields.extra_guests,
      note: fields.note,          // already null, never the empty string
      lang: lang                  // the resolved module variable, never a raw locale
    };

    return sbRequest('POST', '/rest/v1/enrollments', row, 'return=minimal')
```

**Copy exactly:**
- **Three named outcomes**, not thirteen. Enrollment returns `ok` / `pending` / `failed`; photos
  returns `ok` / `limit` / `failed` (RESEARCH §E4).
- **Classified on `res.code`, never on the message string** — "English, unstable, and embeds
  constraint names" (`app.js:1337-1339`). The limit branch is `res.code === 'P0001'`.
- **`Prefer: return=minimal` is not relaxed.** `return=representation` answers `401` / `42501` *and
  the row is not written*, on both tables. The comment at `app.js:1340-1343` says this for
  `enrollments`; the same sentence is true for `photos`.
- **Never test a literal status.** `app.js:1355-1360` explains why: "Gating on the one exact status
  this endpoint happens to answer today reports a written row as a lost one."

### `renderPhotos()` (`app.js`, component, event-driven)

**Analog:** `renderEnrollment()`, `app.js:2349-2412`, plus its header comment at `:2342-2348`

```js
  function renderEnrollment() {
    var host = $('#enrol-body');
    if (!host) return;

    var ident = identity.get();
    var body;

    if (!sbConfigured() || !IDENTITY_OK) body = 'pending';
    else if (editing) body = 'form';
    else if (withdrawnShown) body = 'withdrawn';
    else if (successShown) body = 'success';
    else if (ident.enrolled && ident.name) body = 'return';
    else body = 'form';
```

```js
    /* The form persists across a language switch and across nothing else ... */
    if (body === 'form' && host.getAttribute('data-body') === 'form') {
      var standing = $('#enrol-form', host);
      if (standing && (standing.getAttribute('data-mode') === 'edit') === editing) {
        syncFormLanguage(standing);
        return;
      }
    }

    host.textContent = '';          // discards the static pending markup
    host.setAttribute('data-body', body);

    if (body === 'pending') {
      host.appendChild(pendingBlock('enrol.pending.title', 'enrol.pending.body'));
      return;
    }
```

**This is the single most important pattern in the phase.** Copy all four moves:
1. Null-guard the host, then compute one `body` string through an ordered `if/else` ladder. The
   photos ladder is: unconfigured -> closed -> not-registered -> full -> upload (UI-SPEC §Layout,
   five bodies).
2. **The persistent-sibling early exit.** `#enrol-body` is only rebuilt when the body *kind* changes,
   which is what keeps a language switch from destroying a typed value. The uploader needs the same
   guard, extended by Pitfall 7: **also skip the rebuild while the state is `preparing`, `uploading`
   or `partial`**, or a language tap rebuilds the control underneath in-flight XHRs.
3. `host.textContent = ''` then `host.setAttribute('data-body', ...)` — the static `.pending` markup
   in `index.html:299-302` is discarded on first render, which is why every later pending state has
   to be rebuilt in JS.
4. `pendingBlock()` for both placeholder panels.

**Registration in the chain:** `applyLanguage()`, `app.js:104-149`. The existing calls are
`renderSchedule` / `renderCountdown` / `renderDeadline` / `renderEnrollment` / `renderWhatsApp` /
`renderNudge` / `renderLocation` / `renderAccess` / `renderSocialProof` / `measureNudge`, and every
ordering there carries a written reason (`app.js:125-129`, `:139-148`). `renderPhotos()` is
non-blocking and slots beside `renderSocialProof()`; whichever position is chosen gets a comment
saying why, because that is the local convention.

**Language re-sync:** `syncFormLanguage()`, `app.js:2331-2340`

```js
  function syncFormLanguage(form) {
    if (!form) return;
    setFormState(form, form.getAttribute('data-state') || 'idle');
    $$('[data-errkey]', form).forEach(function (el) {
      var node = document.getElementById(el.id + '-err');
      if (node) node.textContent = t(el.getAttribute('data-errkey'));
    });
  }
```

The uploader owes the identical function: re-seat the state-dependent button label, and re-render any
visible refusal from the stored `data-errkey` rather than by re-running validation.

**Mount animation:** `mountPanel()`, `app.js:2319-2324` — append, then `requestAnimationFrame` to set
`data-show="1"` so the fade runs from the hidden state.

**Mutation fan-out:** `refreshEnrollmentState()`, `app.js:2419-2426` — one function calls every
renderer a mutation invalidates, rather than three calls from four places. A successful upload owes
the same single function (count field, uploader state, album refetch, D-12).

### `renderAlbum()` + `albumTile()` (`app.js`, component, request-response)

**Analog:** `renderSocialProof()`, `app.js:2448-2530`, and its section header at `:2428-2440`

```js
  var proofSeq = 0;

  function renderSocialProof() {
    var host = $('#enrol-proof');
    if (!host || !sbConfigured()) return;

    var seq = ++proofSeq;

    sbRequest('GET', '/rest/v1/attendees?select=first_name,extra_guests', null, null, 8000)
      .then(function (res) {
        if (seq !== proofSeq) return;

        // Cleared on every outcome, so a switch to a language whose fetch fails
        // does not leave the previous language's block standing.
        host.textContent = '';

        if (!res.ok || !Array.isArray(res.body)) return;
```

**Copy, one for one:**
- **The module-scope sequence token**, claimed *before* the request goes out and checked *above* the
  clear. The comment at `app.js:2452-2463` explains why the placement is the fix rather than a detail:
  clearing on a superseded response destroys a fresher answer. The album has exactly the same
  two-caller race (language chain + post-upload refetch, D-12).
- **8000ms timeout**, not the write path's 12000. Non-blocking decoration; a guest never waits on it.
- **Silent failure** — `if (!res.ok || !Array.isArray(res.body)) return;` and no skeleton. That is
  D-14, and `app.js:2482-2485` is the precedent written out.
- **`createElement` + `textContent`, never `innerHTML`.** The header at `app.js:2431-2435` says this
  is load-bearing rather than tidy for exactly this data: a string one guest typed rendered into
  every other guest's browser. `first_name` in the album is the same string.
- **No client-side name split.** `app.js:2437-2439`: "Nothing splits a name in this file either. The
  truncation lives in the view." `public.album` applies `split_part` server side.

Tile construction: `04-RESEARCH.md` §E5, which already follows the above. Note it reads `first_name`
from the view and never asks for `guest_id` (probed: `42703`).

### Uploader state machine (`app.js`, component, event-driven)

**Analog:** `setFormState()`, `app.js:1873-1892`

```js
  /* One attribute drives everything. CSS reads it, JS sets it, and there is no
     class juggling and no second flag. Every branch of the submit path ends in
     a call to this, so no code path can leave the button locked. */
  function setFormState(form, state) {
    form.setAttribute('data-state', state);

    var busy = (state === 'submitting');
    $$('input, select, textarea, button', form).forEach(function (el) { el.disabled = busy; });

    var btn = $('#enrol-submit', form);
    if (!btn) return;

    btn.textContent = busy ? t('enrol.submitting')
                   : (state === 'failure' ? t('enrol.retry')
                   : (form.getAttribute('data-mode') === 'edit' ? t('enrol.update')
                                                                : t('enrol.submit')));
    // A disabled button on its own tells a screen reader nothing about why.
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }
```

**Copy:** one `data-state` attribute, no classes, no second flag; bulk-disable during the busy state;
label read off the element's own attributes rather than a module flag; `aria-busy` alongside
`disabled`. The uploader's states are UI-SPEC's eight (`idle`, `full`, `validating`, `refused-file`,
`preparing`, `uploading`, `partial`, `success`, `failed`) instead of the form's four, and **every
branch of the upload path must terminate in a call to it**.

**Alert panel:** `showAlert()` / `hideAlert()`, `app.js:1894-1924`

```js
    /* A PostgREST message string is never rendered here. Those are English,
       unstable, and leak table and constraint names. Every failure maps to the
       same pair of copy keys ... */
    var title = document.createElement('p');
    title.className = 'form-alert__t';
    title.setAttribute('data-i18n', 'enrol.fail.title');
    title.textContent = t('enrol.fail.title');
```

Note the `data-i18n` attribute set on a JS-built node so the `applyLanguage()` sweep
(`app.js:108-116`) picks it up for free on the next switch. `.uploader__alert` and
`.uploader__status` copy this, and per UI-SPEC they are **in the DOM from first render and `hidden` at
idle**, because many screen readers will not announce a live region that arrives with its content —
the reason is written at `styles.css:1446-1448`.

**Guard before mutating a node after an await:** `stillMounted(form)`, used at `app.js:2661` and
`:2669`. Any post-XHR write to the uploader owes the same check.

**Do not use `toast()`** (`app.js:3621`) for the success moment. `app.js:2683-2689` records the rule:
primary moments are state changes in the section body; the toast is for an incidental "yes, that
saved".

### `styles.css` — album grid, uploader, progress bar

**Analog A — the no-reflow box:** `.map-slot`, `styles.css:641-650`

```css
.map-slot {
  position: relative;
  overflow: hidden;
  width: 100%;
  margin-top: var(--s-6);
  background: var(--surface);
  border: 1px solid var(--rule);
  border-radius: var(--r-sm);
  aspect-ratio: 4 / 3;
}
```

`.album__frame` copies this with `aspect-ratio: 1 / 1` and the `<img>` at
`width:100%; height:100%; object-fit:cover`. The box exists before the image arrives, so a slow tile
is a `--surface` rectangle rather than a collapse. Same guarantee as phase 2's D-09.

**Analog B — the message that draws no box:** `.form-alert`, `styles.css:1449-1466`, with the
rationale at `:1436-1448` ("a bordered red box here would be the only card on the page and would read
as a browser error rather than as this site"). `.uploader__alert` follows it: `--accent-lit` text, no
border, no fill.

**Analog C — indeterminate motion:** `.sweep`, `styles.css:1475-1500`

```css
.sweep::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 25%;
  height: 100%;
  background: var(--accent-lit);
  animation: sweep-x 1100ms linear infinite;
}

.enrol-form[data-state="submitting"] .sweep { display: block; }
```

The upload bar is **determinate**, so it is not `.sweep` — but copy three things: the
`[data-state="..."] .child { display: block }` gating idiom, `--accent-lit` rather than `--accent`
(the fill red is 2.06:1 against the page and was invisible when the map bar used it,
`styles.css:1473-1474`), and `transform`-only motion that never touches layout. RESEARCH Pitfall 5:
cap the visible bar below 100% until `onload`, or swap the label at 100%.

**Analog D — reduced motion (D-29):** `styles.css:1824-1858`

```css
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  ...
  .sweep::after { animation: none; width: 100%; opacity: 0.35; transform: none; }
  .panel { opacity: 1; transition: none; }
}
```

The global clamp is **not sufficient on its own** and the comment at `:1833-1845` explains why: it
collapses an animation to one 0.01ms pass and strands anything mid-travel. Every new animation in this
phase needs its own explicit rule inside this block, in this file, in this phase (D-29). The
`.panel { opacity: 1; transition: none; }` line is the precedent for anything that mounts at zero
opacity and waits a frame for its attribute (`mountPanel`).

**Tokens:** `--r-sm: 2px`, `--r-md: 8px`, spacing `--s-1` .. `--s-10` on a 4px base
(`styles.css:22-48`). Buttons: `.btn` `:419-443`, `.btn:active { transform: scale(0.97); }` `:435`.

### `copy.js` — new keys

**Analog:** the existing photos block, `copy.js:191-194`, `374-377`, `561-564`

```js
    'photos.heading': 'Documentation',
    'photos.lede': 'Students are asked to submit photographic evidence of the evening. Maximum five per person, which is a limit chosen to protect everyone.',
    'photos.pending.title': 'Submission portal opens later',
    'photos.pending.body': 'Uploads open closer to the date. Nothing is required from you now.',
```

Flat dotted keys, one flat object per language, **identical key sets across `en` / `it` / `da`**
(LNG-06; currently 156 keys each). Italian and Danish are written natively, not translated — compare
the three lede strings above. English is the fallback via `t()` (`app.js:97-102`). Zero em dashes
(DSG-06). Error keys follow the `photos.err.*` shape the validators return.

### `config.js` — three new keys

**Analog:** `config.js:210-217`

```js
  photos: {
    supabaseUrl: 'https://aplaxdplwnnlezffatal.supabase.co',
    supabaseKey: 'sb_publishable_Z6Cq5vFRqyUhXueQGevrYQ__j0pNRrc',
    bucket: 'party-photos',
    table: 'photos',
    maxPerGuest: 5,      // also enforced in the database, see supabase/schema.sql
    maxFileSizeMb: 12,
  },
```

Copy the trailing-comment style (short, aimed at a non-programmer, pointing at where the other half of
the rule lives) and the block-comment header style above it. Three additions: `opensAt`, `maxEdgePx`,
`jpegQuality`. Comments that must exist per the decisions: `opensAt: null` opens immediately (D-05);
`opensAt < startsAt` so the countdown never invites guests to a closed portal (Pitfall 8);
`maxFileSizeMb` and the bucket's own limit are two different numbers doing two different jobs and must
not be "reconciled" (D-21). Clamp `jpegQuality` on read — out of range is silently ignored by the
encoder, so a typo produces bigger files and no error.

### `supabase/schema.sql` §6

**Analog:** phase 3's idempotent column add in §7, same `on conflict ... do update` shape.
Body is written out in `04-RESEARCH.md` §E6. Also update the header STATUS block: the `P0001` proof
the header calls outstanding (`schema.sql:54-58`) is now discharged.

---

## Shared Patterns

### Every DOM value goes in through `textContent` or a property

**Source:** `pendingBlock()`, `app.js:313-335`
**Apply to:** every node this phase builds

```js
  /* createElement plus textContent, never a markup string: config values flow
     through these nodes and that discipline is what keeps config.js from
     becoming an injection vector. */
  function pendingBlock(titleKey, bodyKey) {
    var box = document.createElement('div');
    box.className = 'pending';

    var head = document.createElement('p');
    head.className = 'pending__t';
    head.textContent = t(titleKey);
    ...
  }
```

`renderSocialProof`'s header (`app.js:2431-2435`) escalates this from house style to load-bearing for
guest-supplied strings. The album caption is the same class of string.

### Configured check

**Source:** `app.js:1238-1251`
**Apply to:** `renderPhotos()`, `renderAlbum()`, `uploadObject()`

```js
  function sbUrl() { return (CFG.photos || {}).supabaseUrl || ''; }

  function sbKey() {
    var p = CFG.photos || {};
    return p.supabaseKey || p.supabaseAnonKey || '';
  }

  function sbConfigured() {
    var p = CFG.photos || {};
    return Boolean(p.supabaseUrl && (p.supabaseKey || p.supabaseAnonKey));
  }
```

Note the comment at `:1245-1247`: the expression is duplicated deliberately so two gates cannot
disagree. Reuse these three, do not write a fourth reader of the same config.

### localStorage with an in-memory fallback

**Source:** `store`, `app.js:21-72`
**Apply to:** the photo count

The `ok` flag is probed by writing and removing a key, because Safari private mode exposes
`localStorage` and throws on `setItem` rather than on access (`app.js:34-36`). `mem` is written
unconditionally, on purpose (`app.js:22-31`). The `c03102.` prefix is applied inside the wrapper.

### Failures are copy keys, never wire strings

**Source:** `app.js:1337-1339` and `app.js:1900-1903`
**Apply to:** every error path in the phase

A PostgREST or Storage message string is never rendered. Every failure maps to copy keys that name the
problem, name the recovery, and say nothing the guest typed or selected was lost. D-15's refusal must
name the specific files it declined; PH-05 forbids a silent drop.

### Nothing terminates without a state

**Source:** `sbRequest`'s comment `app.js:1253-1286`, `setFormState`'s `app.js:1870-1872`
**Apply to:** `uploadObject()`, the per-file loop, `renderPhotos()`

"No call site needs a catch" and "no code path can leave the button locked" are asserted invariants
this file has already broken once and repaired. The XHR wrapper does **not** inherit them and owes all
four terminal handlers.

---

## No Analog Found

| Unit | Role | Data Flow | Reason |
|---|---|---|---|
| `downscaleToJpeg()` | service | file-I/O | No canvas, image decode, or `File`/`Blob` handling exists anywhere in this codebase. Use `04-RESEARCH.md` §E1 as the source, and wrap it in the house conventions above (copy-key errors, single-settle guard). |

Partial-analog note: `uploadObject()` has no transport analog (this is the only `XMLHttpRequest` in
the project) but a strong *contract* analog in `sbRequest`. Planner should treat the contract as
mandatory and the transport as new code.

---

## Metadata

**Analog search scope:** repo root (`app.js`, `styles.css`, `copy.js`, `config.js`, `index.html`),
`supabase/schema.sql`, `.planning/phases/0{2,3}-*`
**Files scanned:** 6 source files, 3 planning documents
**Pattern extraction date:** 2026-08-15
