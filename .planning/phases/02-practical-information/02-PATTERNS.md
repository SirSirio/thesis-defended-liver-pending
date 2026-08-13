# Phase 2: Practical information - Pattern Map

**Mapped:** 2026-08-13
**Files analyzed:** 5 (all modified, zero new files)
**Analogs found:** 5 / 5 (all in-file, since the codebase is 5 files with no modules)

> Whole-codebase note: there is no framework, no build step, no directories of
> peer files. Every analog is a sibling function or block **inside the same file
> being modified**. "Copy the pattern from" here means "match the shape of the
> function 200 lines above yours."

## File Classification

| Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `app.js` → `renderLocation()` | renderer (view function) | config-read → DOM write, re-run on language change | `renderNudge()` app.js:279-326 (state branching) + `renderSchedule()` app.js:207-231 (config read with fallback) | role-match, split across two |
| `app.js` → `renderAccess()` | renderer (view function) | config-read → DOM write, media mount | same pair as above | role-match |
| `app.js` → map mount (IntersectionObserver) | lazy loader | event-driven, one shot | `document.addEventListener('visibilitychange', …)` app.js:183-185 + `showNudge()` app.js:341-345 (rAF-then-attribute reveal) | partial |
| `app.js` → copy-to-clipboard | interaction handler | user event → async → toast | `wireNudge()` app.js:355-373 (listener wiring) + `toast()` app.js:382-394 (confirmation) | role-match |
| `config.js` → `venue.*`, `door.*` | config | static data | `door` block config.js:47-63 and `venue` block config.js:30-45 (already exist, extend in place) | exact |
| `copy.js` → new `loc.*` / `access.*` keys | i18n table | static data, three parallel tables | existing `loc.*` cluster copy.js:97-104 / 209-216 / 325-332 | exact |
| `styles.css` → map slot, video slot, notes list, actions | stylesheet component | n/a | `.pending` 505-523, `.facts` 443-472, `.btn` 390-416, `.toast` 647-663 | exact |
| `index.html` → section scaffolding | markup | n/a | `#location` 223-233 / `#access` 235-246 (already correct, likely untouched) | exact |

---

## Pattern Assignments

### Q1 — The exact shape of a `renderX()` function in `app.js`

There are four: `renderCountdown` (124), `renderSchedule` (207), `renderDeadline` (259),
`renderNudge` (279). Every one obeys the same five rules:

1. **Named `function renderX()`, zero arguments.** No parameters, ever. They read
   module-scope `CFG`, `lang`, `t()`, and the DOM. This is what lets `applyLanguage()`
   call them blind.
2. **First line is a guard on the container, and it returns silently.**
   ```javascript
   function renderNudge() {
     var bar = $('#nudge');
     if (!bar) return;
   ```
   ```javascript
   function renderCountdown() {
     if (!els.root) return;
   ```
   Never throws, never logs. A missing container is a non-event.
3. **Every DOM lookup is re-done inside the function via `$`**, not cached at module
   scope — except `renderCountdown`, which caches into the `els` object (app.js:102-111)
   because it runs once a second. `renderLocation`/`renderAccess` run only on language
   change, so they follow the `renderNudge` style: look up fresh each call.
4. **The null/placeholder branch is an early return that hides or falls back**, and the
   fallback text always comes from `t()`. The canonical config-null branch is
   `renderSchedule` (app.js:220-230):
   ```javascript
   var loc = $('#fact-location');
   if (loc) {
     var venue = CFG.venue || {};
     if (venue.name || venue.address) {
       loc.textContent = venue.name || venue.address;
       loc.removeAttribute('data-i18n');
     } else {
       loc.setAttribute('data-i18n', 'facts.location.tbd');
       loc.textContent = t('facts.location.tbd');
     }
   }
   ```
   Note the `data-i18n` bookkeeping: when JS takes over an element's text it **removes**
   `data-i18n` so `applyLanguage()`'s generic sweep stops overwriting it; when it hands
   control back it **restores** the attribute. Any element `renderLocation()` writes
   dynamic text into must do the same, or the sweep at app.js:66-74 will clobber it.
5. **Config is defensively defaulted at point of use**, never assumed:
   ```javascript
   var venue = CFG.venue || {};
   var wa   = (CFG.whatsapp || {}).inviteUrl;      // app.js:285
   var deadlineMs = Date.parse((CFG.enrollment || {}).deadline);  // app.js:242
   ```
   So: `var door = CFG.door || {};`

**Multi-state renderers set `data-state` on the container rather than toggling classes:**
```javascript
els.root.setAttribute('data-state', state);          // app.js:129
bar.setAttribute('data-state', 'enrol');             // app.js:304
```
and CSS keys off it (`styles.css:370-373`, `.nudge[data-show="1"]`). The map slot's
waiting/mounted/blocked states should be `data-state` attributes on the slot, styled in
`styles.css`, not class swaps in JS.

**Wiring into the re-render chain — app.js:80-83, inside `applyLanguage()`:**
```javascript
    renderSchedule();
    renderCountdown();
    renderDeadline();
    renderNudge();
```
Add `renderLocation();` and `renderAccess();` to this list. Nothing else is needed:
`init()` (app.js:400) calls `applyLanguage()` once, and `setLanguage()` (app.js:86) calls
it again on every switch. Do **not** add separate calls in `init()` — that would double
render on first paint.

**Event listeners are wired in a separate `wireX()` function, never inside `renderX()`.**
`wireNudge()` (app.js:355) is called once from `init()` at app.js:402, *before*
`applyLanguage()`. Because `renderLocation()` re-runs on every language switch, any
`addEventListener` placed inside it would stack duplicate handlers. Two valid shapes:
either a `wireLocation()` called once from `init()` that delegates from the stable
`#location-body` container, or re-create the listener along with the element it is
attached to (safe, since re-render replaces the node). Prefer the first for the
IntersectionObserver — that observer must be created **once**, disconnected on mount, and
must survive a re-render without being re-registered.

**Reveal-after-mount uses the rAF-then-attribute idiom** (`showNudge` app.js:341-345,
`toast` app.js:386-387):
```javascript
    bar.hidden = false;
    document.body.setAttribute('data-nudge', '1');
    requestAnimationFrame(function () { bar.setAttribute('data-show', '1'); });
```
with the comment already written at app.js:386: *"Next frame, so the transition actually
runs from the hidden state."* The map iframe fade-in (D-21) uses exactly this: append the
iframe, then `requestAnimationFrame` → `setAttribute('data-show','1')`, with the CSS
transition on opacity.

**Style conventions, non-negotiable and consistent across all 419 lines:**
- ES5 only. `var`, `function () {}`, no arrow functions, no `const`/`let`, no template
  literals, no `classList.toggle` chains. `Array.prototype.slice.call` at app.js:13 is
  the tell.
- String concatenation with `+` (app.js:152-154), and `.replace('{date}', …)` /
  `.replace('{n}', days)` for copy interpolation (app.js:272, 299).
- Every non-obvious decision carries a `/* */` or `//` comment explaining *why*, in the
  project's dry voice: *"Announce once a minute rather than once a second, so screen
  reader users are informed instead of assaulted."* (app.js:148-149). New code owes the
  same.
- Section banners between major blocks:
  ```javascript
  /* ======================================================================
     TOAST
     ====================================================================== */
  ```
  `renderLocation`/`renderAccess` get their own banner, e.g. `LOCATION AND ACCESS`,
  placed after `COURSE FACTS driven by config` (app.js:187) and before `ENROLLMENT
  DEADLINE and NUDGE` (app.js:233), matching the page's reading order.
- `try/catch` is used only where a browser API genuinely throws, and always degrades
  silently to a working fallback — see `store` (app.js:21-30) and `formatSchedule`
  (app.js:200-204). The clipboard path (D-10) follows this: try async clipboard, catch
  → `execCommand`, catch → select the text. Never a thrown error, never a console log as
  the user-facing outcome.

### Q2 — How `.pending` is produced

**Static markup in `index.html`, not built in JS.** Confirmed identical in all four body
containers. index.html:226-231:
```html
      <div id="location-body">
        <div class="pending">
          <p class="pending__t" data-i18n="loc.pending.title">Venue under confirmation</p>
          <p class="pending__b" data-i18n="loc.pending.body">The room booking is still being negotiated. The address appears here as soon as it is fixed, and this page updates itself.</p>
        </div>
      </div>
```
The English text is hard-coded in the markup as the no-JS baseline, and `data-i18n`
carries the key that `applyLanguage()`'s sweep (app.js:66-74) swaps at runtime.

**Consequence for this phase, and it is the single most important structural decision
here:** `renderLocation()` writes into `#location-body`, which means it *destroys* the
static `.pending` block on first render. Therefore **any `.pending` state the new
sections need must be re-created in JS**, since the original is gone the moment JS runs.
The correct shape:

```javascript
  // Builds the same .pending block index.html ships statically, because the
  // first render replaces the container's contents and the static one is lost.
  function pendingBlock(titleKey, bodyKey) {
    var box = document.createElement('div');
    box.className = 'pending';

    var t1 = document.createElement('p');
    t1.className = 'pending__t';
    t1.textContent = t(titleKey);

    var b1 = document.createElement('p');
    b1.className = 'pending__b';
    b1.textContent = t(bodyKey);

    box.appendChild(t1);
    box.appendChild(b1);
    return box;
  }
```
Note: build with `createElement` + `textContent`, **not** `innerHTML` with a string. The
existing code never once assigns `innerHTML`; every DOM write in app.js is `textContent`
or `setAttribute`. Config-supplied strings (address, directions, note values) are
untrusted-by-convention here and go in via `textContent`. The one unavoidable
`createElement('iframe')` gets its `src` built with `encodeURIComponent` (D-05, D-07).

Because JS re-creates the pending markup, the JS-built version does **not** need
`data-i18n` attributes — `renderX()` re-runs on language change and rebuilds it with the
right `t()` values. Adding `data-i18n` would be harmless but redundant; matching
`renderSchedule`'s explicit `t()` call is the closer analog.

Also: `#location` has **no** `.section__lede`, while `#access` has one at index.html:238
(`data-i18n="access.lede"`, static, outside `#access-body`, so it survives re-render). If
the location section wants a lede, it is added to `index.html` as static markup with
`data-i18n`, not rendered from JS. That is the established split: **static chrome with
`data-i18n`, dynamic body from JS.**

### Q3 — `copy.js` key naming and table structure

**Structure:** one object per language, `en` first (copy.js:16), then `it` (128), then
`da` (244), each opened by the banner comment
```javascript
  /* ======================================================================
     ENGLISH
     ====================================================================== */
```
Keys appear in the **same order in all three tables**, grouped by section with a blank
line between groups, mirroring the page's top-to-bottom order: meta, nav, hero, countdown,
facts, obj, enrol, nudge, wa, loc, access, photos, footer, lang. New `loc.*` keys go in
the `loc` group (copy.js:97-104 / 209-216 / 325-332); new `access.*` keys in the `access`
group (106-109 / 218-221 / 334-337). Insert at the same index in all three.

**Naming convention:** quoted single-quoted string keys, all lowercase, dot separated,
`section.thing` or `section.subgroup.variant`:
- flat leaf: `'loc.copy'`, `'loc.google'`, `'loc.maptitle'`
- state group: `'loc.pending.title'`, `'loc.pending.body'` — always `.title` / `.body`
- CTA: `'nudge.enrol.cta'`, `'facts.registration.link'` — action suffix
- fallback value paired with its label: `'facts.location'` (the label) and
  `'facts.location.tbd'` (the value shown when config is null). The `.tbd` suffix is the
  established name for a to-be-announced value. New notes labels should follow:
  `'loc.notes.entrance'`, `'loc.notes.floor'`, etc., with `'loc.notes.heading'` for the
  block title.
- interpolation placeholders are braced and named: `'{date}'` (copy.js:34), `'{n}'` (87).

Values are single-quoted, trailing comma on every entry including the last, two-space
indent inside the language object.

**Rules that bind (copy.js:1-9 header):** *"no em dashes anywhere in this file. Commas,
colons, periods and parentheses only."* And: jokes written natively per language, not
translated across. The Danish table carries a further note (copy.js:237-243) that the
CourseBase vocabulary (skemaplacering, læringsmål, kursusansvarlig) is the payload — the
access copy should reach for the equivalent institutional Danish (indgang, opgang, etage,
dørtelefon) rather than neutral phrasing. Inline `//` comments on individual keys are
used where a choice needs defending, e.g. copy.js:253:
```javascript
    'nav.access': 'Adgang',   // short on purpose: this is the one nav item kept on phones
```

### Q4 — `config.js` documentation voice and block format

Every group is preceded by this exact comment frame (config.js:30-39 is the `venue` one,
already written for this phase's data):
```javascript
  /* ---------------------------------------------------------------------
     WHERE
     ---------------------------------------------------------------------
     Set `address` to the full street address, exactly as you would type it
     into Google Maps. Everything else (the embedded map, the "open in
     Google Maps" link, the "open in Apple Maps" link) is generated from it.

     Leave it null and the location section says the venue is being
     confirmed, which is a normal thing for an invitation to say.
     --------------------------------------------------------------------- */

  venue: {
    name: null,        // e.g. 'Anker Engelunds Vej 1, Bygning 101'
    address: null,     // e.g. 'Anker Engelunds Vej 1, 2800 Kgs. Lyngby, Denmark'
    note: null,        // optional extra line, e.g. 'Second floor, follow the noise'
  },
```
Format rules, all consistent across the 175-line file:
- Two-space indent, `/* ---` rule line, ALL CAPS group heading (`WHEN`, `WHERE`, `THE
  DOOR`, `ENROLLMENT`, `THE JOKE`), second rule line, prose, closing rule line.
- Prose is second person addressed to the owner, plain English, no jargon, and states
  **what happens if you leave it null**. Every block does this: *"Leave it null and the
  whole thing stays hidden rather than broken."* (config.js:95). The `venue.notes`
  block (D-16/D-17) owes the same sentence.
- Each key gets an aligned trailing `// e.g. '...'` comment showing a realistic sample
  value, or a `//` explaining the unit (`// how many extra people one guest may bring`).
- Trailing commas everywhere, including the last key and the last group.
- Occasional imperative in caps for the one thing the owner will actually do:
  `TO CHANGE THE DATE: edit the line below. That is the whole job.` (config.js:21).
  The `door.videoSrc` block is the natural home for the equivalent here (D-11).
- The file header (config.js:1-9) already promises: *"Anything set to null shows a polite
  placeholder on the site instead of breaking."* Nothing added may violate that promise.
- The tone permits dryness — *"Rough guess is fine. Nobody is checking."* (config.js:27) —
  but never sarcasm at the owner's expense.

For `venue.notes` (D-16), the label/value shape must survive a non-programmer editing it.
An object of null-valued keys with `// e.g.` comments matches the file's existing idiom
better than an array of objects, which asks the owner to balance braces.

### Q5 — `styles.css` tokens and component conventions

**All tokens are declared in `:root`, styles.css:9-49.** Nothing new may hardcode a value
that already exists as a token.

| Need | Token | Never write |
|---|---|---|
| page bg | `var(--bg)` #0B0B0C | `#000` (comment at :12 forbids pure black) |
| panel bg | `var(--surface)` / `var(--surface-2)` | ad hoc greys |
| body text | `var(--ink)` / `var(--ink-dim)` / `var(--ink-faint)` | |
| red fill | `var(--accent)` #990000 | any other red |
| red **text** | `var(--accent-lit)` #E83F48 | `var(--accent)` as text (2.2:1, fails AA) |
| hairlines | `var(--rule)` / `var(--rule-lit)` | |
| spacing | `--s-1` (4px) … `--s-10` (128px), 4px base | raw px |
| radius | `--r-sm` 2px (default), `--r-md` 8px (toast only) | anything rounder; header comment: *"DTU is a squared off brand, so radii stay small"* |
| easing | `--ease-out` `cubic-bezier(0.23,1,0.32,1)`, `--ease-both` `cubic-bezier(0.65,0,0.35,1)` | `ease`, `ease-in-out`, `linear` |
| duration | `--t-fast` 140ms, `--t-base` 220ms | arbitrary ms |
| z-index | `--z-sticky` 100, `--z-toast` 400 | *"semantic, never 9999"* |

**Component conventions:**
- BEM-ish with double underscore: `.pending__t`, `.facts__row`, `.nudge__inner`,
  `.countdown__label`. Modifiers use `--`: `.btn--primary`, `.facts__row--egg`.
- **The panel recipe**, shared verbatim by `.pending` (505) and `.group-cta` (632) — this
  is the house panel, and the map slot and video slot should be built from it:
  ```css
    background: var(--surface);
    border: 1px solid var(--rule);
    border-left: 3px solid var(--accent);
    border-radius: var(--r-sm);
    padding: var(--s-5);
    max-width: 62ch;
  ```
- **The eyebrow/label recipe**, shared by `.pending__t` (514), `.eyebrow` (268),
  `.countdown__label` (303), `.unit__l` (331): mono font, ~12-12.5px, uppercase,
  letter-spacing 0.08em–0.14em, dim or accent-lit colour. Any new small label uses it.
- **Focus is global and must not be re-declared**: `:focus-visible` at styles.css:105-109
  gives `2px solid var(--accent-lit)`, `outline-offset: 3px`. Never `outline: none`
  (header comment at :104). Inset offset is the one permitted override, and only for
  full-bleed rows (`.facts__row--egg:focus-visible { outline-offset: -2px; }`, :465).
- **Hover is always gated**, never bare:
  ```css
  @media (hover: hover) and (pointer: fine) { … }
  ```
  Seven instances (188, 214, 409, 414, 466, 615). A touch device must never get a stuck
  hover state. `:active { transform: scale(0.97); }` (`.btn`, :406) is the touch feedback
  instead, and `.mark:active` uses `scale(0.96)`.
- **Touch targets:** `.btn` `min-height: 48px` (:392); `@media (pointer: coarse)` block at
  :231-235 forces 44px minimums; `.nudge__close` is an explicit 44×44. D-23's 44px
  requirement is met by joining the coarse-pointer block, not by one-off rules.
- **Responsive breakpoints in use:** 900px (nav collapse), 640px (facts stack to one
  column, :470), 620px (countdown grid), 560px (nudge), 480px (hero buttons stack full
  width). The notes list should reuse the 640px `.facts__row` stack rule rather than
  inventing a breakpoint. The map/video slots should stack at 480px if they need to.
- **Transitions name their properties explicitly**, never `transition: all`:
  ```css
    transition: transform var(--t-fast) var(--ease-out),
                background var(--t-fast) var(--ease-out),
                border-color var(--t-fast) var(--ease-out),
                color var(--t-fast) var(--ease-out);
  ```
- **Reduced motion is already handled globally** at styles.css:678-686 — it nukes all
  animation and transition durations to 0.01ms. D-22 is therefore satisfied for anything
  built from CSS transitions with no extra work. It is **not** satisfied for anything
  driven from JS: the smooth scroll (D-20) needs its own check, since `html {
  scroll-behavior: smooth }` (:58) is already reset to `auto` under reduced motion at
  :679 but a JS `scrollIntoView({behavior:'smooth'})` would bypass that. Use
  `window.matchMedia('(prefers-reduced-motion: reduce)').matches` to pick the behavior,
  or rely on the existing CSS `scroll-behavior` and native anchor jumps, which already
  work and already respect the preference.
- **The notes block (D-16)** copies `.facts` outright (styles.css:443-472): `dl` with
  `border-top`, `.facts__row` as `display: grid` with
  `grid-template-columns: minmax(180px, 260px) 1fr`, `dt` at 14.5px `--ink-dim`, `dd` at
  15.5px `--ink`, each row `border-bottom: 1px solid var(--rule)`. Either reuse the
  `.facts` classes directly or define `.notes` as a copy; reusing is truer to D-16's
  "reusing the institutional styling of the course fact table."
- Every group of rules is preceded by a `/* --- ... --- */` banner with a one-line
  rationale in the same dry voice as the JS: *"Pending placeholders. These must read as
  deliberate, never as broken."* (:502-503).

---

## Shared Patterns

### Toast confirmation
**Source:** `app.js:382-394`, `#toast` markup at index.html:284, `.toast` CSS at
styles.css:647-663.
**Apply to:** the copy-address action (D-10), and any other success confirmation.
```javascript
  function toast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    // Next frame, so the transition actually runs from the hidden state.
    requestAnimationFrame(function () { toastEl.setAttribute('data-show', '1'); });
```
Call it as `toast(t('loc.copied'))`. The element is already `role="status"
aria-live="polite"`, so the announcement is free. Do not build a second confirmation
surface.

### i18n lookup with English fallback
**Source:** `app.js:55-60`
**Apply to:** every guest-facing string in the new renderers.
```javascript
  function t(key) {
    var table = COPY[lang] || {};
    if (table[key] != null) return table[key];
    if (COPY.en && COPY.en[key] != null) return COPY.en[key];
    return '';
  }
```
Note it returns `''`, never `undefined`, so `if (!val) return;` is the safe guard
(app.js:69). New render code should treat empty string as "no copy for this" rather than
printing it.

### Config-null degradation
**Source:** `renderSchedule` app.js:220-230, `renderNudge` app.js:285/314, `renderDeadline`
app.js:262-265.
**Apply to:** address absent, video absent, poster absent, directions absent, notes
absent (D-19).
Three established shapes, in order of preference:
1. Hide the element entirely: `if (isNaN(deadlineMs)) { if (el) el.hidden = true; return; }`
2. Fall back to translated placeholder copy: the `facts.location.tbd` branch.
3. Suppress the whole block rather than render an empty shell — `renderNudge` returns
   without showing the bar when there is nothing to say. This is the pattern D-16's
   "all entries null means the whole block is absent" asks for.

### Config defensive access
**Source:** app.js:222, 242, 285, 336
```javascript
      var venue = CFG.venue || {};
      var wa   = (CFG.whatsapp || {}).inviteUrl;
      var p = CFG.photos || {};
```
**Apply to:** every read of `CFG.venue`, `CFG.door`, `CFG.venue.notes`.

### localStorage through `store`
**Source:** app.js:21-30. Namespaced `c03102.`, wrapped in try/catch, returns `null`/`false`
on failure.
**Apply to:** any state this phase wants to remember. Never touch `window.localStorage`
directly.

### The `enrollmentReady()` tripwire
**Source:** app.js:335-339
```javascript
  function enrollmentReady() {
    var p = CFG.photos || {};
    var configured = Boolean(p.supabaseUrl && (p.supabaseKey || p.supabaseAnonKey));
    return configured && Boolean($('#enrol-form'));
  }
```
`CFG.photos.supabaseUrl` and `supabaseKey` are **both already set** in config.js:140-141,
so `configured` is currently `true` and the only thing keeping the nudge bar down is the
absence of `#enrol-form`. **Nothing in this phase may introduce an element with id
`enrol-form`, and nothing may modify this function.** Flagged in CONTEXT.md and confirmed
against the live code.

---

## No Analog Found

| Concern | Why there is no analog | What to do instead |
|---|---|---|
| `IntersectionObserver` lazy mount (D-08) | No observer exists anywhere in the codebase. Closest relatives are the `visibilitychange` listener (app.js:183) and the rAF reveal in `showNudge` (app.js:341). | Write it fresh in ES5 style, guarded: `if (!('IntersectionObserver' in window)) { mountMap(); return; }` so ancient browsers get the map immediately rather than never. Disconnect on first mount. Create once, outside the re-render path. |
| Clipboard API with fallback (D-10) | No clipboard code exists. `store` (app.js:21-30) is the model for the try/catch-degrade discipline, not the API. | Three-tier: `navigator.clipboard.writeText` → `document.execCommand('copy')` → select the address text node. Confirm the first two through `toast(t('loc.copied'))`. |
| `<iframe>` / `<video>` element creation | The codebase has never created an element in JS. Every DOM write to date is `textContent` / `setAttribute` / `hidden` on markup that already exists. | `document.createElement` with `setAttribute`, never `innerHTML`. This is a genuinely new pattern for the file, so it deserves the section banner and the explanatory comment the house style expects. |
| Platform detection for Apple Maps (D-06) | No UA sniffing anywhere. | Keep it to a few lines, comment the reasoning, and honour D-06's fail-open rule: inconclusive → show both. |
| Aspect-ratio media slot CSS (D-09, D-14) | No `aspect-ratio` usage in styles.css. | New rule, but built from the `.pending` panel recipe plus `aspect-ratio`, so it reads as the same family. |

---

## Metadata

**Analog search scope:** entire repository. The site is five files: `index.html` (291
lines), `app.js` (419), `config.js` (175), `copy.js` (353), `styles.css` (687). All five
read in full; no other source files exist.
**Files scanned:** 5
**Pattern extraction date:** 2026-08-13
