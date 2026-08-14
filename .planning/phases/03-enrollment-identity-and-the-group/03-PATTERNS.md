# Phase 3: Enrollment, identity, and the group - Pattern Map

**Mapped:** 2026-08-14
**Units analyzed:** 24 (no new files; 24 new/changed units inside 6 existing files)
**Analogs found:** 22 / 24

> **How to read this file.** This is a static, no-build, no-framework site with five source
> files at the repo root plus `supabase/schema.sql`. Nothing is scaffolded from a template, so
> "new file X copies file Y" is meaningless here. The unit of analysis is the **function**
> (in `app.js`), the **component block** (in `styles.css`), the **key block** (in `copy.js`)
> and the **numbered section** (in `schema.sql`).
>
> Every new function this phase adds has a precedent already in `app.js`. Copy the precedent's
> *shape*, not just its intent.

---

## File Classification

### `app.js` (single 1250-line IIFE, `'use strict'`, ES5 syntax throughout)

| New unit | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `sbRequest()` | service | request-response | `mountMap()` timer discipline `app.js:649-667` + `copyAddress()` fallback ladder `app.js:693-710` | role-match |
| `sbConfigured()` | utility | config-read | `enrollmentReady()` `app.js:1165-1169` | exact |
| `store` extension (`mem`, `ok`, `remove`) | utility | storage | `store` `app.js:21-30` | exact (same object, extended) |
| `identity` module (`get`/`save`/`clear`) | store | storage | `store` `app.js:21-30` + `isEnrolled()` `app.js:1087` | role-match |
| `newGuestId()` | utility | transform | `isApplePlatform()` `app.js:290-320` (guarded capability ladder, try/catch per tier) | role-match |
| `renderEnrollment()` | component | event-driven render | `renderLocation()` `app.js:322-419` | exact |
| `buildForm()` | component | render | `buildDirections()` / `buildVideo()` (called from `renderAccess()` `app.js:1028-1045`) | exact |
| `buildField()` | component | render | `pendingBlock()` `app.js:250-265` | exact |
| `buildSuccessPanel()` | component | render | `renderLocation()`'s `.addr` block `app.js:350-388` | role-match |
| `buildReturnPanel()` | component | render | same as above | role-match |
| `buildWithdrawnPanel()` | component | render | `pendingBlock()` `app.js:250-265` | role-match |
| `validateField()` / `validateAll()` | utility | transform | *(none — see §No Analog Found)* | — |
| `setFormState()` | controller | state machine | `slot.setAttribute('data-state', ...)` in `mountMap()` `app.js:631/664` and `copyFeedback()` `app.js:677-688` | role-match |
| `submitEnrollment()` | controller | request-response | `copyAddress()` `app.js:693-710` (tiered, guaranteed non-silent outcome) | role-match |
| `amendEnrollment()` / `withdraw()` | controller | request-response | same | role-match |
| `renderSocialProof()` | component | request-response render | `mountMap()` `app.js:573-668` (async, failure is a message swap, never a throw) | role-match |
| `renderWhatsApp()` | component | render | `renderLocation()`'s Apple-button branch `app.js:409-418` (absent from DOM, never disabled) | exact |
| `wireEnrollment()` | controller | event-driven | `wireLocation()` `app.js:755-766` (delegated from the stable container, wired once from `init()`) | exact |
| `measureNudge()` | utility | event-driven | `observeMap()` `app.js:546-569` (guarded capability, degrades to eager) | exact |
| R3 fix to `hideNudge()` | utility | event-driven | `hideNudge()` `app.js:1177-1181` (edit in place) | exact |
| `applyLanguage()` chain additions | config | render | `applyLanguage()` `app.js:62-86` | exact |

### `styles.css`

| New unit | Role | Closest analog | Match |
|---|---|---|---|
| `.field`, `.field__label`, `.field__control` | component | `.facts__row` `styles.css:457-474` | exact (same grid, per UI-SPEC R1) |
| `.field__input` / `__textarea` / `__select` | component | *(none — first form controls on the site)*; nearest grammar `.btn` `styles.css:402-418` | partial |
| `.segset` / `.seg` | component | `.langswitch` + `.langswitch button[aria-pressed="true"]` `styles.css:200-224` | exact |
| `.sweep` | component | `.map-wait__bar` + `::after` + `@keyframes map-sweep` `styles.css:675-699` | exact (R2 renames the keyframe) |
| `.form-alert` | component | `.copybtn[data-state]` `styles.css:585-591` (text-safe red, no box, no icon) | role-match |
| `.panel` | component | `.section` body region; explicitly **not** `.pending` `styles.css:517-524` | partial |
| `.facts--record` / `.facts--proof` | component | `.facts--notes` `styles.css:872-888` | exact |
| `.subtle-action` | component | `.inline-link` / `.inline-link--back` `styles.css:981-1010` | exact |
| `[hidden] { display:none !important }` | config | Base block `styles.css:56-91` | n/a |

### `copy.js`, `config.js`, `index.html`, `supabase/schema.sql`

| New unit | Role | Closest analog | Match |
|---|---|---|---|
| ~42 keys x 3 languages | config | `copy.js:80-95` / `216-231` / `354-369` (the `enrol.*` / `nudge.*` / `wa.*` blocks) | exact |
| `config.js` comment corrections | config | `config.js:123-135` (the `ENROLLMENT` block) | exact |
| `#wa` section markup | component | `#enrol` section `index.html:215-226` | exact |
| `schema.sql` §7 + §8 + closing query | migration | `schema.sql:155-169` (§5) and the `DONE` block `:190-199` | exact |

---

## Pattern Assignments

### 1. Section render function — `renderEnrollment()`, `renderWhatsApp()`

**Analog:** `renderLocation()` `app.js:322-419`, with the shape confirmed by `renderAccess()`
`app.js:1017-1061`.

The house shape, verbatim (`app.js:322-348`):

```js
  function renderLocation() {
    var host = $('#location-body');
    if (!host) return;

    var venue = CFG.venue || {};

    /* #location-body owns two separate children. #loc-data is cleared and
       rebuilt on every language switch. The map slot that arrives later is a
       sibling, created once, because rebuilding it would tear down a mounted
       iframe and make the guest pay Google a second time on mobile data. */
    var data = $('#loc-data', host);
    if (!data) {
      host.textContent = '';          // discards the static pending markup
      data = document.createElement('div');
      data.id = 'loc-data';
      host.appendChild(data);
    } else {
      data.textContent = '';
    }

    /* Branch rather than early return, because the map slot below has to be
       reconciled in both directions. */
    var address = typeof venue.address === 'string' ? venue.address : '';
    if (!address) {
      data.appendChild(pendingBlock('loc.pending.title', 'loc.pending.body'));
    } else {
      ...
```

**Five things `renderEnrollment()` must copy exactly:**

1. `var host = $('#enrol-body'); if (!host) return;` — the null guard first, always.
2. `host.textContent = ''` on first render is what **discards the static pending markup** from
   `index.html:219-222`. Note the comment at `:334` says exactly this. Same trick for `#wa-body`.
3. **The persistent-child pattern at `:332-340` is the direct precedent for the UI-SPEC's
   "the form is built once and persists" rule.** `renderLocation()` keeps the map slot as a
   *sibling* that survives re-render because tearing it down would cost the guest real money.
   `renderEnrollment()` keeps `#enrol-form` for the same class of reason (typed values, focus).
   Copy the `if (!node) { create } else { clear }` reconciliation literally.
4. **Branch, do not early-return** (`:342-348`), because state must be reconciled in both
   directions. The five bodies A–E in the UI-SPEC layout contract are one branch chain, and a
   guest who withdraws must take the success panel with them.
5. The unconfigured branch calls `pendingBlock('enrol.pending.title', 'enrol.pending.body')`.
   No second placeholder language (D-12, UI-SPEC "Components inherited").

`renderAccess()` `app.js:1017-1032` adds the conditional-heading idiom, which is what
`renderWhatsApp()` needs inverted:

```js
    var directions = buildDirections();
    if (!directions.classList.contains('pending')) {
      host.appendChild(subHeading('access.dir.heading'));
    }
    host.appendChild(directions);
```

---

### 2. Node builder — `buildField()`, `buildSuccessPanel()`, `buildReturnPanel()`

**Analog:** `pendingBlock()` `app.js:250-265`, quoted with its comment because the comment is
the house rule this phase must not break:

```js
  /* Rebuilds the .pending block that index.html ships as static markup. The
     first render replaces the container's contents, so the static one is gone
     and every later pending state has to be built here instead.

     createElement plus textContent, never a markup string: config values flow
     through these nodes and that discipline is what keeps config.js from
     becoming an injection vector. */
  function pendingBlock(titleKey, bodyKey) {
    var box = document.createElement('div');
    box.className = 'pending';

    var head = document.createElement('p');
    head.className = 'pending__t';
    head.textContent = t(titleKey);

    var body = document.createElement('p');
    body.className = 'pending__b';
    body.textContent = t(bodyKey);

    box.appendChild(head);
    box.appendChild(body);
    return box;
  }
```

Also `subHeading()` `app.js:785-790`, the smallest builder in the file:

```js
  function subHeading(key) {
    var head = document.createElement('h3');
    head.className = 'sub-h';
    head.textContent = t(key);
    return head;
  }
```

**Copy:** takes copy **keys**, not strings. Returns a detached node, never mounts. Class name
set via `.className`. Text via `.textContent`. **Never `innerHTML`, never a template string.**
`app.js:246-249` states this as the house rule and this phase is the first where breaking it
is exploitable, because a stored guest `name` renders into other guests' browsers via the
attendee list.

**Attribute-setting idiom** — from `renderLocation()` `app.js:401-407`, which is also the
verbatim shape of both WhatsApp CTAs:

```js
      var google = document.createElement('a');
      google.className = 'btn btn--primary';
      google.textContent = t('loc.google');
      google.setAttribute('href', urls.google);
      google.setAttribute('target', '_blank');
      google.setAttribute('rel', 'noopener');
      dirs.appendChild(google);
```

---

### 3. Absent, never disabled — `renderWhatsApp()`, the social proof threshold

**Analog:** `renderLocation()` `app.js:409-418`:

```js
      // Apple only where it can act, and absent from the DOM rather than hidden.
      if (isApplePlatform()) {
        var apple = document.createElement('a');
        apple.className = 'btn btn--ghost';
        ...
      }
```

plus its framing comment at `:390-392`:

```js
      /* Actions sit in their own row below the address. This block is only ever
         reached with an address in hand, so there is no disabled button and no
         dead affordance anywhere in the section. Absent beats greyed out. */
```

**Apply to:** WA-06 (`whatsapp.inviteUrl` null → `#wa` keeps its `hidden` attribute, nothing is
built), D-20 (below `showCountFrom` → the block is not created at all, not a zero), D-22
(fetch failure → nothing appears).

---

### 4. Guarded capability, degrades to eager — nudge-bar measurement (`ResizeObserver` / `visualViewport`)

**Analog:** `observeMap()` `app.js:546-569`. The UI-SPEC asks the `--nudge-h` measurement to
mirror this exactly:

```js
  function observeMap(slot) {
    if (!('IntersectionObserver' in window)) {
      // A missing capability degrades to eager, never to absent. An old browser
      // pays for the map at first paint, which is worse than lazy and far
      // better than a permanently empty frame.
      mountMap(slot);
      return;
    }

    // Only reachable with a stale observer if the address was blanked and then
    // restored, which already disconnects. Cheap to be certain.
    if (mapObserver) { mapObserver.disconnect(); mapObserver = null; }

    mapObserver = new IntersectionObserver(function (entries) { ... }, { rootMargin: '400px 0px' });

    mapObserver.observe(slot);
  }
```

**Copy:** `if (!('ResizeObserver' in window)) { <apply the 76px fallback>; return; }`. Observer
held at module scope, disconnected before it is re-created. Never feature-detect by trying and
catching. Note `isApplePlatform()` `app.js:290-320` for the other flavour: three independent
`try`/`catch` probes, each treating an unreadable signal as *absent* rather than as negative,
with the closing comment `return !seen;` — inconclusive shows the safer thing.

---

### 5. Multi-tier fallback with a guaranteed non-silent outcome — the submit path

**Analog:** `copyAddress()` `app.js:693-710` → `copyByHand()` `app.js:717-750`. This is the
established shape for "a network/platform thing might refuse, and the guest must never be left
with nothing":

```js
  function copyAddress(btn) {
    ...
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(address).then(function () {
          copyFeedback(btn, 'copied', 'loc.copied', 'loc.copied.toast', 2000);
        }, function () {
          copyByHand(btn, address);
        });
        return;
      }
    } catch (e) { /* no async clipboard here, fall through to tier two */ }

    copyByHand(btn, address);
  }
```

and its terminal line, `app.js:749` — **every path ends in a visible outcome**:

```js
    copyFeedback(btn, 'failed', 'loc.copy.failed', 'loc.copy.failed.toast', 4000);
```

with the governing comment at `:712-716`: *"Never a silent failure, and never a console message
as the guest facing outcome."*

**Apply to:** `submitEnrollment()`. Every branch of the response classifier (`201`, `409/23505`
→ switch to amend, `404/PGRST202` → pending state, `NETWORK` → failure banner) must terminate in
a `setFormState(...)` call. There is no path that returns without writing `data-state`.

**Timer discipline**, from `mountMap()` `app.js:649-651` and `copyFeedback()` `app.js:682-687` —
one timer, held at module scope, **cleared before it is set**:

```js
    if (mapTimer) clearTimeout(mapTimer);
    mapTimer = setTimeout(function () {
      mapTimer = null;
      ...
    }, 8000);
```

```js
    // One timer, cleared first, so repeated taps do not stack reverts.
    if (copyRevert) clearTimeout(copyRevert);
```

The abort timer in `sbRequest()` uses the same rule. `mountMap()`'s 8000ms timeout, and its
comment at `:641-648` about why a timeout *swaps a message rather than destroying a working
element*, is the reasoning to reuse for the 12s abort.

---

### 6. `data-state` as the single state machine hook

**Analog:** `mountMap()` `app.js:630-632` and `:663-666`:

```js
    frame.addEventListener('load', function () {
      slot.setAttribute('data-state', 'ready');
    });
```
```js
      if (slot.getAttribute('data-state') === 'ready') return;
      slot.setAttribute('data-state', 'blocked');
      var waiting = $('.map-wait__line', slot);
      if (waiting) waiting.textContent = t('loc.map.blocked');
```

CSS side, `styles.css:585-591` and `:700+`:

```css
.copybtn[data-state="copied"],
.copybtn[data-state="failed"] {
  border-color: var(--accent-lit);
  color: var(--accent-lit);
}
```
```css
.map-slot[data-state="blocked"] .map-wait__bar::after { animation: none; ... }
```

**Copy:** `setFormState(next)` writes exactly one attribute, `#enrol-form[data-state]`. CSS
reads it. No class juggling, no second flag. The nudge bar already uses the sibling idiom
`data-show` for visibility (`app.js:1174`, `styles.css:1031`), which is the show/hide grammar,
not the state grammar. Keep the two separate exactly as the existing code does.

---

### 7. Show/hide with `requestAnimationFrame`, teardown on a timer

**Analog:** `toast()` `app.js:1212-1224`, and `showNudge()`/`hideNudge()` `app.js:1171-1181`.
Three sites in the file already use this idiom and `mountMap():635-637` names it as such
(*"Same idiom as showNudge() and toast(), for the same reason"*).

```js
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    // Next frame, so the transition actually runs from the hidden state.
    requestAnimationFrame(function () { toastEl.setAttribute('data-show', '1'); });

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.removeAttribute('data-show');
      setTimeout(function () { toastEl.hidden = true; }, 260);
    }, 2400);
  }
```

```js
  function showNudge(bar) {
    bar.hidden = false;
    document.body.setAttribute('data-nudge', '1');
    requestAnimationFrame(function () { bar.setAttribute('data-show', '1'); });
  }

  function hideNudge(bar) {
    bar.removeAttribute('data-show');
    document.body.removeAttribute('data-nudge');
    setTimeout(function () { bar.hidden = true; }, 240);
  }
```

**Copy:** `hidden = false` first, then `requestAnimationFrame` to set `data-show`, so the
transition runs from the hidden state. On teardown, remove `data-show` first, then `hidden`
after the transition duration.

**Refactor R3 lands here:** move `document.body.removeAttribute('data-nudge')` from
`hideNudge()`'s line 1179 **into** the existing `setTimeout` at `:1180`. That is a two-line
move, not a rewrite.

`toast()` is the channel for D-11's *incidental* confirmations only ("registration updated",
"identity cleared"). Never the success moment.

---

### 8. Wire once from `init()`, delegate from the stable container

**Analog:** `wireLocation()` `app.js:755-766`, with the comment that is the whole reason:

```js
  /* Delegated from the stable container and wired once from init(), because
     renderLocation() re-runs on every language switch and a listener attached
     in there would stack a duplicate handler per switch. */
  function wireLocation() {
    var host = $('#location-body');
    if (!host) return;

    host.addEventListener('click', function (ev) {
      var node = ev.target;
      var btn = (node && node.closest) ? node.closest('.copybtn') : null;
      if (!btn && node && node.classList && node.classList.contains('copybtn')) btn = node;
      if (!btn) return;
      copyAddress(btn);
    });
  }
```

Note the **`closest` guard**: `node.closest` is feature-checked and there is a manual
`classList.contains` fallback. Copy that literally for `.subtle-action`, `.inline-link` and
the WhatsApp CTAs.

`wireNudge()` `app.js:1185-1203` is the other precedent, and its CTA handler is the exact
thing D-26 says the two new CTAs must replicate:

```js
    // Tapping through to WhatsApp counts as done.
    if (cta) cta.addEventListener('click', function () {
      if (bar.getAttribute('data-state') === 'group') {
        store.set('wa_joined', '1');
        hideNudge(bar);
      }
    });
```

Registration in `init()` `app.js:1230-1242` — wire before `applyLanguage()`:

```js
  function init() {
    lang = resolveInitialLang();
    wireNudge();
    wireLocation();
    applyLanguage();
    startClock();
    ...
```

`wireEnrollment()` goes on the line after `wireLocation()`. **Submission binds to the form's
`submit` event, not to a click on the button** (UI-SPEC), which is the one place the delegation
pattern differs.

---

### 9. Storage — `store` extension and the identity module

**Analog:** `store` `app.js:21-30`, quoted verbatim because the phase edits this exact object:

```js
  /* ======================================================================
     STORAGE
     Private browsing and locked down browsers throw on localStorage access,
     so every call goes through here and the site keeps working regardless.
     ====================================================================== */

  var store = {
    get: function (k) {
      try { return window.localStorage.getItem('c03102.' + k); }
      catch (e) { return null; }
    },
    set: function (k, v) {
      try { window.localStorage.setItem('c03102.' + k, v); return true; }
      catch (e) { return false; }
    }
  };
```

**Two invariants to preserve** (RESEARCH §Pattern 2): the `'c03102.'` prefix is applied *inside*
the wrapper and callers pass bare keys; `set` returns a boolean. `lang`, `enrolled` and
`wa_joined` already flow through this and phase 4 will too.

Consumers that constrain the written values:

```js
  function isEnrolled() { return store.get('enrolled') === '1'; }
```
> [`app.js:1087`] — so `enrolled` is written as the **string** `'1'` and cleared to `'0'`.
> Writing `true`, `1`, or removing the key are three subtly different wrong answers.

```js
    if (wa && store.get('wa_joined') !== '1') {
```
> [`app.js:1144`] — same string comparison.

---

### 10. The re-render chain

**Analog:** `applyLanguage()` `app.js:62-86`:

```js
  function applyLanguage() {
    document.documentElement.setAttribute('lang', lang);
    document.documentElement.setAttribute('data-lang', lang);

    $$('[data-i18n]').forEach(function (el) {
      var key = el.getAttribute('data-i18n');
      var val = t(key);
      if (!val) return;

      var attr = el.getAttribute('data-i18n-attr');
      if (attr) el.setAttribute(attr, val);
      else el.textContent = val;
    });

    $$('[data-set-lang]').forEach(function (btn) {
      btn.setAttribute('aria-pressed', btn.getAttribute('data-set-lang') === lang ? 'true' : 'false');
    });

    renderSchedule();
    renderCountdown();
    renderDeadline();
    renderNudge();
    renderLocation();
    renderAccess();
  }
```

**Copy:** append `renderEnrollment();` and `renderWhatsApp();` to the chain. Three notes:

- The `[data-i18n]` sweep runs over **the whole document including JS-injected nodes**, which is
  why the UI-SPEC requires every static form string to carry `data-i18n` and forbids it on any
  string containing a placeholder token.
- The precedent for a substituted string is `renderDeadline()` `app.js:1102`, which runs *after*
  the sweep: `el.textContent = t('hero.deadline').replace('{date}', formatDate(deadlineMs));`
  `enrol.return.lede`'s `{name}` follows this exactly.
- The `data-i18n-attr` branch at `:71-73` is what R4 needs for the nudge close button's
  `aria-label`.

**D-28 (the reverse direction):** enrolling, editing and withdrawing must call `renderNudge()`
and `renderDeadline()` too. The gate is not to be touched (D-13):

```js
  function enrollmentReady() {
    var p = CFG.photos || {};
    var configured = Boolean(p.supabaseUrl && (p.supabaseKey || p.supabaseAnonKey));
    return configured && Boolean($('#enrol-form'));
  }
```
> [`app.js:1165-1169`, verbatim] — note it accepts **either** `supabaseKey` or
> `supabaseAnonKey`. `sbConfigured()` must use the identical expression or the two will disagree.

---

### 11. CSS — the form is the fact table

**Analog:** `.facts__row` `styles.css:455-474`, which R1 turns into the shared grid token:

```css
.facts { margin: 0; border-top: 1px solid var(--rule); }

.facts__row {
  display: grid;
  grid-template-columns: minmax(180px, 260px) 1fr;
  gap: var(--s-5);
  padding: var(--s-4) 0;
  border-bottom: 1px solid var(--rule);
}

.facts__row dt {
  color: var(--ink-dim);
  font-size: 14.5px;
}

.facts__row dd {
  margin: 0;
  color: var(--ink);
  font-size: 15.5px;
}
```

Modifier precedent for `.facts--record` / `.facts--proof` is `.facts--notes`
`styles.css:872-888`, which already carries `overflow-wrap: break-word` on its `dd`.

**Segmented control** — `.langswitch` `styles.css:200-224` is the selected-segment grammar to
copy exactly (D-21 / UI-SPEC):

```css
.langswitch button {
  appearance: none; border: 0; cursor: pointer;
  background: transparent;
  color: var(--ink-dim);
  font-family: var(--font-mono);
  font-size: 12px; font-weight: 500;
  padding: 6px 9px;
  min-height: 32px;
  border-radius: var(--r-sm);
  transition: background var(--t-fast) var(--ease-out),
              color var(--t-fast) var(--ease-out);
}
.langswitch button[aria-pressed="true"] {
  background: var(--accent);
  color: #fff;
}
@media (hover: hover) and (pointer: fine) {
  .langswitch button:not([aria-pressed="true"]):hover { color: var(--ink); background: var(--surface-2); }
}
```

**Button base** — `.btn` `styles.css:402-425`. Note the transition list and `:active` scale that
`.seg > span` must match:

```css
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  min-height: 48px;                 /* touch target */
  padding: 0 var(--s-5);
  font-family: var(--font-body);
  font-size: 15px; font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  border: 1px solid transparent;
  border-radius: var(--r-sm);
  cursor: pointer;
  transition: transform var(--t-fast) var(--ease-out),
              background var(--t-fast) var(--ease-out),
              border-color var(--t-fast) var(--ease-out),
              color var(--t-fast) var(--ease-out);
}
.btn:active { transform: scale(0.97); }
.btn--primary { background: var(--accent); color: #fff; }
@media (hover: hover) and (pointer: fine) {
  .btn--primary:hover { background: #B00000; }
}
.btn--ghost { border-color: var(--rule-lit); color: var(--ink); }
```

**Sweep bar (R2)** — `styles.css:675-699`, copy verbatim and rename the keyframe to `sweep-x`:

```css
.map-wait__bar {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 2px;
  overflow: hidden;
}

.map-wait__bar::after {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 25%;
  height: 100%;
  background: var(--accent-lit);
  /* linear is the one sanctioned exception to the token easing curves. */
  animation: map-sweep 1100ms linear infinite;
}

@keyframes map-sweep {
  from { transform: translateX(-100%); }
  to   { transform: translateX(400%); }
}
```

**Underplayed text control** — `.inline-link` / `.inline-link--back` `styles.css:981-1010` is the
analog for `.subtle-action`, including its coarse-pointer 44px block. **Read the comment at
`:988-999` before touching this region**: it records three separate source-order traps in this
file (the `.dirs` touch minimums, the `.facts--notes` collapse, and this one) where a rule
written in its "correct" subject block lost silently to an equal-specificity earlier selector.
New form rules that override `.btn` or `.facts__row` must sit **after** them in the file.

Same trap, stated again at `styles.css:596-600` for coarse-pointer minimums — which is directly
relevant, since the submit button and both WhatsApp CTAs need 56px/52px overrides of `.btn`'s 48px.

Also `.sr-only` `styles.css:98-102` (the radio inputs) and the global ring `styles.css:104-108`
(2px `--accent-lit`, offset 3px, radius `--r-sm`) which `.seg input:focus-visible + span` must
restate explicitly.

---

### 12. `copy.js` — 42 keys x 3 languages

**Structure:** one `window.PARTY_COPY` object, three sibling tables `en` / `it` / `da`
(`copy.js:11`, `:16`, and the two banner comments), flat dotted string keys, single quotes,
trailing comma, blank line between key groups. House rule at `copy.js:7-8`:

> `House rule: no em dashes anywhere in this file. Commas, colons, periods and parentheses only.`

**Representative block** — the existing `enrol.*` / `nudge.*` / `wa.*` group, at
`copy.js:80-95` (en), `:216-231` (it), `:354-369` (da). All three are at **identical key sets and
identical line ordering**, which is how LNG-06 parity is maintained by eye:

```js
    'enrol.heading': 'Course registration',
    'enrol.lede': 'Registration is required. Not for bureaucratic reasons, but because the host needs to know how much food to buy.',
    'enrol.pending.title': 'Registration opens shortly',
    'enrol.pending.body': 'The registration system is being set up. Come back in a few days, or tell the host directly in the meantime.',

    'nudge.enrol.text': 'You have not registered yet.',
    'nudge.enrol.cta': 'Register',
    'nudge.enrol.soon': 'Registration closes in {n} days.',
    ...
    'wa.heading': 'Course announcements',
    'wa.body': 'Practical updates go out in the group chat. Address changes, delays, and the occasional photograph.',
    'wa.cta': 'Join the WhatsApp group',
```

**Copy:** insert new keys into the same group, at the same relative position, in all three
tables. `{n}` / `{date}` is the established placeholder token syntax; `{name}` follows it.
Italian and Danish are written natively (`copy.js:4-5`: *"a translated pun is a dead pun"*).

---

### 13. `config.js` — owner-facing comment style

**Analog:** the `ENROLLMENT` block `config.js:123-142`, verbatim:

```js
  /* ---------------------------------------------------------------------
     ENROLLMENT
     ---------------------------------------------------------------------
     So you know who is actually coming. Built in phase 3, on the same
     Supabase project as the photos, so it costs you no extra setup.

     `deadline` is what creates the gentle pressure to sign up. It is shown
     on the site and the nudge copy sharpens as it approaches. Set it a few
     days before the party so you can count heads and buy accordingly.

     `showCountFrom` hides the confirmed total until it reaches this number,
     because "2 people are coming" persuades nobody.
     --------------------------------------------------------------------- */

  enrollment: {
    deadline: '2026-09-26T23:59:00+02:00',
    maxGuestsPerPerson: 2,   // how many extra people one guest may bring
    showCountFrom: 8,        // hide the running total until it looks healthy
    showAttendeeList: true,  // hide first names only, never full names
  },
```

**The style, precisely:** an ALL-CAPS block banner in a `/* */` comment with 21-dash rules above
and below the title; second person, addressed to a non-programmer; each key explained by *what it
buys you*, not by its type; backtick-quoted key names in prose; short aligned `//` comments on
individual values. **Zero jargon.** `config.js:180-193` (the Supabase key explanation) is the
best example of the register to match when writing the corrected comments.

**The three factually-wrong comments RESEARCH §G4 flags** are all of the form "Built in phase N":
`config.js:126` says enrollment is "Built in phase 3" (correct), `:161` says the quiz is "Built in
phase 4" (roadmap says 5), `:177` says photos are "Built in phase 3" (roadmap says 4). Also
`:193` says "Until both are filled in, enrollment and photos show a waiting message" — they now
*are* filled in. Correct the facts, keep the voice.

---

### 14. `supabase/schema.sql` — sections 7 and 8

**Analog:** section 5, `schema.sql:155-169`:

```sql
-- ============================================================================
-- 5. PUBLIC VIEW: attendee first names and the headcount
-- ----------------------------------------------------------------------------
-- Exposes only what the site needs for social proof. Notes and full names
-- never leave the host's dashboard.
-- ============================================================================

create or replace view public.attendees as
  select
    split_part(trim(name), ' ', 1) as first_name,
    extra_guests,
    created_at
  from public.enrollments;

grant select on public.attendees to anon;
```

and the closing block `schema.sql:190-199`, which D-05 rewrites:

```sql
-- ============================================================================
-- DONE
-- ----------------------------------------------------------------------------
-- To read your guest list: Dashboard > Table Editor > enrollments.
-- Total head count including plus ones:
--
--   select count(*) + coalesce(sum(extra_guests), 0) as total
--     from public.enrollments;
-- ============================================================================
```

**Copy:** numbered `-- ====` banner, title line, `-- ----` divider, plain-English rationale
aimed at the owner, then the SQL. New sections append as 7 and 8; do not renumber. The
`grant select on public.attendees to anon;` line stays immediately after the view (RESEARCH
explains why: `create or replace` preserves it, `drop view` would not). Whole file must stay
idempotent — `schema.sql:7` promises *"It is safe to run more than once."*

---

### 15. `index.html` — the `#wa` section

**Analog:** the `#enrol` section, `index.html:215-226`:

```html
  <section class="section" id="enrol" data-zone="slipping">
    <div class="wrap">
      <h2 class="section__h" data-i18n="enrol.heading">Course registration</h2>
      <p class="section__lede" data-i18n="enrol.lede">Registration is required. ...</p>
      <div id="enrol-body">
        <div class="pending">
          <p class="pending__t" data-i18n="enrol.pending.title">Registration opens shortly</p>
          <p class="pending__b" data-i18n="enrol.pending.body">The registration system is being set up. ...</p>
        </div>
      </div>
    </div>
  </section>
```

**Copy:** `section.section` + `data-zone` + `.wrap` + `h2.section__h` + `p.section__lede` +
`div#…-body`. Every static string carries `data-i18n` **and** an English default as its text
content, so the page reads correctly before JS runs.

Two deviations `#wa` makes deliberately: it ships with the `hidden` attribute (WA-06), and its
body div is empty rather than holding a `.pending` block, because WA-06 says absent, not pending.

`tabindex="-1"` must **not** be added: `index.html:228-236` records that exactly two occurrences
of that attribute may exist in the file and the count is gated.

---

## Shared Patterns

### Null-guard first, every render function
**Source:** `app.js:323`, `:1018`, `:1090`, `:1111`, `:1213`
**Apply to:** every new render/build function.
```js
    var host = $('#location-body');
    if (!host) return;
```

### `t(key)` for every guest-facing string
**Source:** `app.js:55-60`
**Apply to:** all new render functions, all error messages, all button labels.
```js
  function t(key) {
    var table = COPY[lang] || {};
    if (table[key] != null) return table[key];
    if (COPY.en && COPY.en[key] != null) return COPY.en[key];
    return '';
  }
```
Note it returns `''`, never `undefined`, and `applyLanguage()`'s sweep skips falsy values
(`if (!val) return;` at `app.js:69`) — so a missing key leaves the HTML default in place.

### Defensive config read
**Source:** `app.js:326`, `:580-582`, `:1115`, `:1166`
**Apply to:** every read of `CFG.enrollment`, `CFG.whatsapp`, `CFG.photos`.
```js
    var venue = CFG.venue || {};
    var address = typeof venue.address === 'string' ? venue.address : '';
```
The `|| {}` then the `typeof` check. Two layers, because the owner edits `config.js` by hand.

### `createElement` + `textContent`, never `innerHTML`
**Source:** stated at `app.js:246-249`, reinforced at `:592-594`
**Apply to:** every node this phase builds. Load-bearing here for the first time: a guest's
stored `name` renders into other guests' browsers via the attendee list.

### Comment the *why*, especially the refusals
**Source:** the whole file, e.g. `app.js:604-614` (why the map iframe has no `sandbox` and no
`allow`), `styles.css:988-999` (why a rule is written out of its subject block).
**Apply to:** every new function. The house style records what was deliberately *not* done and
why, so a later reader does not "fix" it. This phase has many such refusals already documented
in CONTEXT.md and the UI-SPEC (no PATCH, no SELECT policy, no spinner glyph, no placeholder
attributes, no `:has()`, no fieldset, no withdraw control in the success panel) — each belongs
in a comment at its site, not only in the planning docs.

### `@media (hover: hover) and (pointer: fine)` on every hover
**Source:** `styles.css:224`, `:421-423`, `:426-428`, `:479-481`, `:1070-1072`
**Apply to:** every new hover state, so it never fires from a touch.

### Coarse-pointer minimums go *after* the base class
**Source:** `styles.css:596-600` and `:988-999`, both of which document the same trap being hit.
**Apply to:** the 52/56px overrides on the submit button, both WhatsApp CTAs, inputs and segments.

---

## No Analog Found

| Unit | Role | Data flow | Reason |
|---|---|---|---|
| `validateField()` / `validateAll()` / the `aria-describedby` + `aria-invalid` wiring | utility | transform | No validation exists anywhere in the codebase. No `aria-invalid`, no `role="alert"`, no error node of any kind. Use UI-SPEC §Validation timing and RESEARCH §Validation and Accessibility. |
| `.field__input` / `.field__textarea` / `.field__select` base styles | component | — | RESEARCH §G1 verified **zero** `input`, `label`, `textarea`, `select` or `fieldset` rules in `styles.css`. The nearest grammar is `.btn` (border, radius `--r-sm`, transition list, min-height) and `.langswitch` (surface fill, mono, selected state). Take the vocabulary from those; the geometry from `.facts__row`; the token values from UI-SPEC §Interaction States, which are already fixed and contrast-verified. |

Partial-analog note: `.panel` and `.form-alert` have no direct precedent either, but both are
defined by *refusal* rather than by invention — `.panel` is "a region, not a card" (so the analog
is the absence of `.pending`'s border), and `.form-alert` is "a paragraph in the destructive
colour" (so the analog is `.copybtn[data-state="failed"]`'s text-safe red with no box and no icon,
`styles.css:583-591`, whose comment already argues the exact case: *"No error icon and no red box:
that reads as form validation"*).

---

## Metadata

**Analog search scope:** repo root (`app.js`, `styles.css`, `copy.js`, `config.js`, `index.html`)
and `supabase/schema.sql`. Whole codebase; there is nothing else.
**Files scanned:** 6 (3,629 lines total)
**Pattern extraction date:** 2026-08-14
