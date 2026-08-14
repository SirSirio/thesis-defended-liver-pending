---
phase: 02-practical-information
reviewed: 2026-08-14T11:20:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app.js
  - config.js
  - copy.js
  - index.html
  - styles.css
findings:
  critical: 2
  warning: 7
  info: 7
  total: 16
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-08-14T11:20:00Z
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Five source files reviewed at standard depth: `app.js` (1251 lines), `config.js`, `copy.js`,
`index.html`, `styles.css`. Scope covers the four commits landed by plan 02-05 (`703ab95`,
`f59c8eb`, `249a75a`, `daca094`) plus the phase-02 code they modify.

**The 02-05 map-slot fix holds up.** I traced every render path and could not break the two-channel
error contract:

- The adjacency invariant is intact. `#location-body` only ever contains
  `[#loc-data, #loc-map, #loc-map-note]`. `renderLocation()` wipes the host with
  `host.textContent = ''` **only** on the branch where `#loc-data` is absent (app.js:333-337),
  which is the first render and nothing else, so the language-switch rebuild cannot orphan the
  caption. The teardown path removes slot and note together (app.js:473-479).
- The `+` reveal wins on specificity as claimed: `.map-slot[data-state="ready"] + .map-note` is
  0-3-0 against `.map-note` at 0-1-0 (styles.css:771-781). Not order-dependent.
- The state machine is sound in all four orderings I could construct: fast success
  (`load` -> `ready`, timer no-ops), no document at all (timer -> `blocked`), slow success
  (timer -> `blocked`, then `load` -> `ready`, note revealed, wait layer fades), and the case the
  fix exists for (Google 403 / captive portal / DNS block fires `load` -> `ready` -> caption
  revealed). Removing the `clearTimeout` from the `load` listener was the correct edit.
- `copy.js` key parity verified programmatically: 114 keys in each of `en`, `it`, `da`, zero
  missing and zero extra in either translation. `loc.map.fallback` is present in all three.

What the fix does **not** cover is what the reveal costs at the accessibility layer (WR-01) and how
easily the invariant can be broken by phase 03/04 without any signal (WR-07).

**Carried-forward findings, not phase-02 regressions.** CR-01 and CR-02 are phase-01 countdown and
nudge code, unchanged by 02-05, and both are still live in `app.js`. They are reported again because
they are real and still open. CR-03 from the previous review (Supabase `anon can amend own
enrollment` policy with `using (true) with check (true)`) is **still present** at
`supabase/schema.sql:106-108` — any anonymous client can rewrite any other guest's enrollment row.
That file is outside this review's file scope, so it is not counted in the totals above, but it must
not be lost: it is phase-03 territory and it is unmitigated.

Deliberate project constraints (ES5-only `app.js`, no build step, keyless `output=embed`, `null`
door/notes config, public Supabase publishable key, no test harness) were treated as locked and are
not reported.

## Structural Findings (fallow)

No `<structural_findings>` block was supplied with this review invocation. The cross-module facts
below (dead CSS selectors, unused copy keys, dead config branches) were derived directly and appear
under Info rather than here.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Countdown renders literal `NaN` when `startsAt` fails to parse

**File:** `app.js:117-145` (with `app.js:101`, `app.js:115`)
**Phase ownership:** phase 01. Not touched by 02-05. Still open.

**Issue:** `phase(now)` returns `'before'` when `startMs` is `NaN` (app.js:118), which routes
straight into the arithmetic branch. `Math.max(0, NaN - now)` is `NaN`, not `0` — `Math.max` returns
`NaN` if any argument is `NaN`. Every derived value inherits it, and `pad()` (app.js:115) has no
numeric guard: `NaN < 10` is `false`, so it falls to `String(NaN)` and returns the string `'NaN'`.
The largest element on the page renders `NaN : NaN : NaN : NaN`, and `#cd-sr` announces
`"NaN days, NaN hours, NaN minutes"` to screen readers.

This is not theoretical. `config.js:21-24` tells the owner in capitals *"TO CHANGE THE DATE: edit the
line below. That is the whole job."* A plausible typo — `'2026-10-03 16:00+02:00'` with a space
instead of `T`, or a stray trailing character — parses fine in V8 and returns `NaN` in Safari's
`Date.parse`. The failure would then be invisible on the owner's desktop Chrome and total on the
guests' iPhones.

Note that `renderSchedule()` already guards this exact condition (`if (isNaN(startMs)) return
t('facts.location.tbd')`, app.js:194) and `renderDeadline()` guards its twin (app.js:1092). The
countdown is the only consumer of a parsed date that does not.

**Fix:** Give `phase()` an explicit unparseable state and render the copy that already exists for
"we do not know yet", rather than falling through to arithmetic.

```js
function phase(now) {
  if (isNaN(startMs)) return 'unknown';
  if (now < startMs) return 'before';
  if (!isNaN(endMs) && now >= endMs) return 'over';
  return 'live';
}

function renderCountdown() {
  if (!els.root) return;

  var now = Date.now();
  var state = phase(now);
  els.root.setAttribute('data-state', state);

  // Nothing to count down to. The clock is hidden by the same CSS that hides
  // it in the live and over states, and the label carries the message.
  if (state === 'unknown') {
    var lbl = $('.countdown__label', els.root);
    if (lbl) lbl.textContent = t('facts.location.tbd');
    if (els.status) els.status.hidden = true;
    if (els.note) els.note.hidden = true;
    if (els.sr) els.sr.textContent = '';
    if (tick) { clearInterval(tick); tick = null; }
    return;
  }

  if (state === 'before') { /* ...unchanged... */ }
  /* ...unchanged... */
}
```

and add the matching hide rule beside the existing pair at `styles.css:382-383`:

```css
.countdown[data-state="live"] .countdown__clock,
.countdown[data-state="over"] .countdown__clock,
.countdown[data-state="unknown"] .countdown__clock { display: none; }
```

Belt and braces, harden `pad()` too, since it is the last line of defence:

```js
function pad(n) { return (typeof n === 'number' && isFinite(n)) ? (n < 10 ? '0' + n : String(n)) : '--'; }
```

---

### CR-02: Nudge deadline arithmetic is off by one, and says "closes today" for 24 hours after it closed

**File:** `app.js:1074-1076` (`daysUntil`), `app.js:1126-1132` (`renderNudge`)
**Phase ownership:** phase 01. Not touched by 02-05. Still open.

**Issue:** Two separate defects in one expression.

`daysUntil()` returns `Math.ceil((ms - Date.now()) / 86400000)` — a count of 24-hour blocks rounded
*up*, which is not the number of calendar days remaining. With the shipped
`deadline: '2026-09-26T23:59:00+02:00'` (config.js:138):

| Moment (Europe/Copenhagen) | raw diff | `daysUntil` | message shown | truth |
|---|---|---|---|---|
| 25 Sep 12:00 | 35.98 h | 2 | "Registration closes in 2 days." | closes **tomorrow** |
| 26 Sep 12:00 | 11.98 h | 1 | "Registration closes tomorrow." | closes **today** |
| 27 Sep 12:00 | −11.98 h | **0** | **"Registration closes today."** | closed **yesterday** |
| 28 Sep 12:00 | −35.98 h | −1 | (bar hidden) | correct |

Every message in the ladder is one step behind the truth. Worse, the third row: `Math.ceil` of a
value in `(-1, 0]` is `-0`, and `-0 === 0` is `true` in JavaScript, so the `days === 0` branch
(app.js:1131) fires for a **full 24 hours after the deadline has passed**. A guest opening the page
on the 27th is told registration is still open today, and handed a CTA to a closed form.

This also puts two components on the same page in direct contradiction. `renderDeadline()` correctly
compares instants (`Date.now() > deadlineMs`, app.js:1100) and hides the hero deadline the moment it
passes; `renderNudge()` keeps a fixed bar at the bottom of that same screen insisting it closes
today.

**Fix:** Gate on the instant first, then count *calendar* days in the venue's timezone rather than
24-hour blocks.

```js
// Calendar days between now and the deadline, counted in Europe/Copenhagen so
// "tomorrow" means the next date on the wall, not 24 hours from this instant.
function daysUntil(ms) {
  var tz = { timeZone: 'Europe/Copenhagen', year: 'numeric', month: '2-digit', day: '2-digit' };
  function dayNumber(d) {
    var parts;
    try { parts = new Intl.DateTimeFormat('en-CA', tz).format(d); }
    catch (e) { return Math.floor(d.getTime() / 86400000); }   // en-CA gives YYYY-MM-DD
    return Math.floor(Date.parse(parts + 'T00:00:00Z') / 86400000);
  }
  return dayNumber(new Date(ms)) - dayNumber(new Date());
}
```

and make the passed-deadline case unambiguous in `renderNudge()`:

```js
if (!isNaN(deadlineMs) && Date.now() > deadlineMs) { hideNudge(bar); return; }

var days = isNaN(deadlineMs) ? null : daysUntil(deadlineMs);
var msg;
if (days === null || days > 7) msg = t('nudge.enrol.text');
else if (days > 1)             msg = t('nudge.enrol.soon').replace('{n}', days);
else if (days === 1)           msg = t('nudge.enrol.last');
else                           msg = t('nudge.enrol.today');   // days <= 0, deadline not yet passed
```

The `Date.now() > deadlineMs` guard must come first: it is the same test `renderDeadline()` already
uses, and putting it here is what stops the two components disagreeing.

---

## Warnings

### WR-01: The map iframe is keyboard-focusable and exposed to assistive tech while it is invisible

**File:** `styles.css:720-730`, `app.js:634-637`

**Issue:** `.map-slot iframe` is hidden with `opacity: 0` and revealed with
`iframe[data-show="1"] { opacity: 1 }`. Opacity zero does **not** remove an element from the tab
order or from the accessibility tree. `mountMap()` sets `data-show="1"` on the next animation frame
unconditionally (app.js:637), independently of `data-state`, so the frame is at full opacity in the
`blocked` state too — sitting behind an opaque `.map-wait` overlay (`background: var(--surface)`,
`z-index: 1`, styles.css:643-653).

Two consequences, both in states the phase deliberately designed for:

1. **During `mounting`** (up to 8s, and indefinitely if `load` never fires): the frame is fully
   transparent but focusable. A keyboard guest tabbing from the "Copy address" button lands inside a
   Google Maps document they cannot see. `.map-slot iframe:focus-visible { outline-offset: -3px }`
   (styles.css:785) draws a ring around a box with nothing visible in it. That is a WCAG 2.4.7
   Focus Visible failure and a 2.4.3 Focus Order failure.
2. **In `blocked` state**: the frame is at opacity 1 behind an opaque panel that says "The map did
   not load." A screen reader reads both — the failure message *and* whatever Google actually
   served. The overlay blocks the mouse but not the Tab key and not the virtual cursor. This
   directly undercuts what 02-05 was fixing: the guest is told the map failed and simultaneously
   handed the failed content.

**Fix:** Hide the frame with a property that removes it from the a11y tree and the tab order, and
reveal it on the same state signal the rest of the slot keys on, rather than on a separate
`data-show` flag that no state can revoke.

```css
.map-slot iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
  opacity: 0;
  visibility: hidden;          /* takes it out of the tab order and the a11y tree */
  transition: opacity var(--t-base) var(--ease-out),
              visibility 0s linear var(--t-base);
}

/* Revealed by the slot's own state, never by a flag set before the state is known.
   Zero delay on visibility here, so the frame becomes reachable as it fades in. */
.map-slot[data-state="ready"] iframe {
  opacity: 1;
  visibility: visible;
  transition: opacity var(--t-base) var(--ease-out), visibility 0s;
}
```

Then delete the now-redundant `data-show` write and its rAF in `app.js:637`, and delete
`.map-slot iframe[data-show="1"]` at styles.css:730. The reveal becomes a pure function of
`data-state`, which is the same discipline `.map-wait` and `.map-note` already follow.

---

### WR-02: `renderCountdown` rewrites the polite live region once per second in `live` and `over` states

**File:** `app.js:168-172`

**Issue:** The `before` branch is carefully throttled — `lastSrMinute` exists precisely so screen
reader users are "informed instead of assaulted" (app.js:150-151). The `live`/`over` branch has no
such guard. It runs on the same 1000ms interval (`app.js:180`) and unconditionally executes:

```js
els.status.textContent = t(titleKey);
els.note.textContent = t(noteKey);
if (els.sr) els.sr.textContent = t(titleKey);
```

`#cd-sr` carries `aria-live="polite"` (index.html:109). Assigning `textContent` replaces the child
text node even when the string is identical, which is a DOM mutation inside a live region. NVDA and
JAWS both re-announce on text-node replacement in a polite region regardless of whether the string
changed. The `live` state lasts from `startsAt` to `endsAt` — 11 hours per config.js:24-28 — and the
`over` state lasts forever. A screen reader user who opens the page during or after the party can be
read "The course is now in session" every second, indefinitely.

The two visible nodes are churned for no reason either: `#cd-status` and `#cd-note` are static text
once the state settles, and are re-written 86,400 times a day.

**Fix:** Write only on transition, using the same idiom as `lastSrMinute`.

```js
var lastState = null;

// ...inside renderCountdown, after `var state = phase(now);`

// The live and over states are static text. Write them once on entry, never on
// the tick, because #cd-sr is a polite live region and a rewritten text node is
// a re-announcement even when the string is identical.
if (state === lastState) return;
lastState = state;

var titleKey = state === 'live' ? 'countdown.live.title' : 'countdown.over.title';
/* ...rest unchanged... */
```

`lastState` must also be reset in `setLanguage()` (or cleared at the top of `applyLanguage()`) so a
language switch does re-render these strings once:

```js
function setLanguage(next) {
  if (SUPPORTED.indexOf(next) === -1) return;
  lang = next;
  store.set('lang', next);
  lastState = null;       // force one re-render of the static countdown strings
  lastSrMinute = null;    // and one re-announcement, in the new language
  applyLanguage();
}
```

That second line fixes a latent bug of its own: today, switching language mid-countdown leaves
`#cd-sr` reading the previous language for up to a minute, because `m !== lastSrMinute` is false.

---

### WR-03: Location and Access render last behind five unguarded DOM lookups, with no error isolation

**File:** `app.js:80-85`, with `app.js:126-145` and `app.js:1113-1136`

**Issue:** `applyLanguage()` calls six render functions in a bare synchronous sequence:

```js
renderSchedule();
renderCountdown();
renderDeadline();
renderNudge();
renderLocation();     // "The core value of the whole site" — app.js:237
renderAccess();       // "The single most useful section on this page" — copy.js:115
```

The two sections the phase banner calls the core value of the site run **last**, downstream of four
renderers that are not guarded to the same standard. `renderSchedule()` and `renderLocation()` null-
check every element they touch. `renderCountdown()` guards only `els.root` and then dereferences
`els.d`, `els.h`, `els.m`, `els.s`, `els.status` and `els.note` unconditionally (app.js:142-148,
168-171). `renderNudge()` guards only `bar` and then dereferences `text` and `cta` (app.js:1135-1137).

Any `TypeError` in that upper half — a renamed id, a removed `#cd-note`, a phase-03 edit to the
nudge markup — propagates out of `applyLanguage()` and `renderLocation()`/`renderAccess()` never
run. The page does not error visibly: it silently ships the *static English* pending blocks from
index.html:241-258 to a Danish guest standing outside the building, which is the single worst
outcome this phase exists to prevent. There is no console output and no fallback, because the whole
IIFE runs under `'use strict'` with no try/catch anywhere in the init path.

The `store` wrapper (app.js:21-30) and the three `isApplePlatform()` probes (app.js:293-315) show
this codebase already understands defensive isolation. The render sequence does not have it.

**Fix:** Two changes. First, make the render order match the stated priority — the sections that
matter most should not be able to be starved by the ones that matter least:

```js
// Location and Access first. They are the reason a guest opened the page, and
// nothing above them in this list is allowed to be able to starve them.
renderLocation();
renderAccess();
renderSchedule();
renderCountdown();
renderDeadline();
renderNudge();
```

Second, isolate each renderer so one failure cannot take the others with it:

```js
// One broken renderer must not blank the rest of the page. Nothing is logged to
// the console as a guest facing outcome; the section simply keeps whatever it
// last had, which is a readable pending block rather than nothing.
function safely(fn) {
  try { fn(); } catch (e) { /* a section that failed keeps its previous state */ }
}

safely(renderLocation);
safely(renderAccess);
safely(renderSchedule);
safely(renderCountdown);
safely(renderDeadline);
safely(renderNudge);
```

And close the two concrete gaps that make this reachable, at `app.js:142-148`:

```js
if (els.d) els.d.textContent = pad(d);
if (els.h) els.h.textContent = pad(h);
if (els.m) els.m.textContent = pad(m);
if (els.s) els.s.textContent = pad(s);
if (els.status) els.status.hidden = true;
if (els.note) els.note.hidden = true;
```

and at `app.js:1113-1114`:

```js
var text = $('#nudge-text');
var cta  = $('#nudge-cta');
if (!text || !cta) { hideNudge(bar); return; }
```

---

### WR-04: `hideNudge` schedules an untracked timeout that can hide a bar that was re-shown

**File:** `app.js:1177-1181`

**Issue:** `hideNudge()` sets a bare `setTimeout` to apply `bar.hidden = true` after the 240ms slide-
out, and keeps no handle on it:

```js
function hideNudge(bar) {
  bar.removeAttribute('data-show');
  document.body.removeAttribute('data-nudge');
  setTimeout(function () { bar.hidden = true; }, 240);
}
```

Every other timer in this file is held at module scope and cleared before it is set — `mapTimer`
(app.js:649), `copyRevert` (app.js:683), `toastTimer` (app.js:1219) — and each carries a comment
explaining why. This one breaks that rule. If `showNudge()` runs within 240ms of a `hideNudge()`,
the stale timeout fires afterwards and sets `hidden = true` on a bar that is mid-slide-in: the guest
gets a bar that appears and then vanishes, with `data-show="1"` still on it and `data-nudge` back on
`<body>`, so the 76px of reserved page padding stays behind an invisible bar. Because `renderNudge()`
runs on every `applyLanguage()` call, two rapid language taps that straddle a state change land
exactly here.

`hideNudge()` also drops `data-nudge` from `<body>` **immediately** while the bar is still visibly
sliding out, so the page content jumps up 76px underneath a bar that has not left yet.

**Fix:**

```js
var nudgeHide = null;

function showNudge(bar) {
  // Cancel any pending hide, so a bar that is being re-shown is not taken down
  // by the tail of the animation it just interrupted.
  if (nudgeHide) { clearTimeout(nudgeHide); nudgeHide = null; }
  bar.hidden = false;
  document.body.setAttribute('data-nudge', '1');
  requestAnimationFrame(function () { bar.setAttribute('data-show', '1'); });
}

function hideNudge(bar) {
  bar.removeAttribute('data-show');
  if (nudgeHide) clearTimeout(nudgeHide);
  nudgeHide = setTimeout(function () {
    nudgeHide = null;
    bar.hidden = true;
    // Released with the bar, not ahead of it, so the page does not jump up
    // 76px underneath a bar that is still on screen.
    document.body.removeAttribute('data-nudge');
  }, 240);
}
```

---

### WR-05: Four `aria-label` values are hardcoded English on a fully trilingual site

**File:** `index.html:49`, `index.html:59`, `index.html:68`, `index.html:294`

**Issue:** The site translates 114 keys into three languages and has working attribute-translation
machinery — `data-i18n` plus `data-i18n-attr` is already used for `<meta name="description">` and
the OG tags (index.html:8-9, 16-19), and `applyLanguage()` handles it at app.js:71-73. Four
accessible names bypass all of it:

```html
<a class="mark" href="#top" aria-label="Course 03102, back to top">      <!-- :49  -->
<nav class="topnav" aria-label="Sections">                               <!-- :59  -->
<div class="langswitch" role="group" aria-label="Language">              <!-- :68  -->
<button class="nudge__close" id="nudge-close" aria-label="Dismiss">      <!-- :294 -->
```

A Danish or Italian screen reader user gets `<html lang="da">` announced in Danish and then hears
"Sections", "Language", "Dismiss" read out by a Danish speech synthesiser. The `#nudge-close` case
is the most damaging: it is the *only* accessible name on that control (its visible content is
`&times;`), so the sole way to dismiss a fixed bar covering the bottom of the viewport is labelled in
a language the guest may not read. The language switcher's group label is also the one control whose
entire purpose is to serve non-English speakers.

Note that `copy.js` already ships `footer.lang` ("Language" / "Lingua" / "Sprog") in all three
tables and nothing uses it — see IN-02.

**Fix:** Add four keys to each of the three tables in `copy.js`:

```js
'a11y.mark': 'Course 03102, back to top',
'a11y.nav': 'Sections',
'a11y.lang': 'Language',        // reuse the existing footer.lang wording
'a11y.dismiss': 'Dismiss',
```

and wire the existing attribute path in `index.html`:

```html
<a class="mark" href="#top" data-i18n="a11y.mark" data-i18n-attr="aria-label"
   aria-label="Course 03102, back to top">
<nav class="topnav" data-i18n="a11y.nav" data-i18n-attr="aria-label" aria-label="Sections">
<div class="langswitch" role="group" data-i18n="a11y.lang" data-i18n-attr="aria-label"
     aria-label="Language">
<button class="nudge__close" id="nudge-close" type="button"
        data-i18n="a11y.dismiss" data-i18n-attr="aria-label" aria-label="Dismiss">&times;</button>
```

No JavaScript change is needed — `applyLanguage()` at app.js:66-74 already does exactly this.

---

### WR-06: A residential address plus the exact hours the occupants are hosting is published fully indexable

**File:** `index.html:3-34` (missing robots directive), `index.html:20-21`, `config.js:44`,
`config.js:24-28`

**Issue:** `config.js:44` sets a specific private residential address. `index.html` publishes it on
a public GitHub Pages origin (`og:url`, index.html:20) with full Open Graph and Twitter card
metadata explicitly designed to make the link expand richly when shared. There is **no
`robots.txt`** in the repository and **no `<meta name="robots">`** in the document head, so the page
is fully crawlable and indexable.

Cross-referenced with the rest of the page, an indexed copy publishes: the exact street address, the
exact date and window the occupants will be hosting and distracted (`startsAt` / `endsAt`,
config.js:24-28), and — as soon as the owner fills in the seven `venue.notes` keys this phase built
the renderer for (config.js:65-73) — the entrance, the staircase, the floor, the buzzer number, and
a video of the correct door. The example values in the comments are literally
`'Ring 46. The name on the buzzer is Sirio'` and `'3rd floor, first door on the right'`. Phase 02's
own deliverable is a building-entry guide.

The site is designed to be shared by link into a WhatsApp group, not to be found by search. Nothing
in the current setup enforces that distinction. This is a privacy exposure the owner is very unlikely
to have chosen deliberately, and it is one line to close.

**Fix:** Add to `index.html`, next to the other meta tags:

```html
<!-- Shared by link into a group chat, never found by search. The page carries a
     home address, the hours its occupants are hosting, and door entry
     instructions, and none of that belongs in a search index. -->
<meta name="robots" content="noindex, nofollow">
```

and add `robots.txt` at the repository root (GitHub Pages serves it, and `.nojekyll` is already
present so it will not be filtered):

```
User-agent: *
Disallow: /
```

Additionally, tighten the referrer so the invitation URL is not handed to Google and Apple when a
guest taps a directions button — see IN-05.

---

### WR-07: The map caption's adjacency invariant is enforced only by source-line proximity, and fails silently

**File:** `app.js:484-495`, `app.js:516-532`, `styles.css:781`

**Issue:** This is the weakest joint in the 02-05 fix. The reveal is
`.map-slot[data-state="ready"] + .map-note` — an adjacent sibling selector. The invariant it depends
on is enforced by nothing except two `appendChild` calls happening to sit next to each other in
source:

```js
host.appendChild(slot);     // app.js:517
/* 14 lines of comment */
host.appendChild(note);     // app.js:532
```

Correct today, and I verified every reachable path preserves it. But it has three properties that
make it a defect rather than a style note:

1. **It fails silently.** If anything is ever appended to `#location-body` between them — and
   phase 03 (`#enrol`) and phase 04 (quiz) both append into section bodies — the caption stops being
   revealed. No error, no console output, no visual difference in the success case. The only symptom
   is that the one sentence written to rescue the guest on a captive-portal network never appears, on
   exactly the network where nobody is watching.
2. **The update path cannot repair it.** `renderMapSlot()`'s language-switch branch does
   `if (note) note.textContent = ...` (app.js:493) and returns. If `#loc-map-note` is missing while
   `#loc-map` survives, it is never recreated — the caption is gone for the rest of the session.
   Every other node in this section is reconciled in both directions; this one is not.
3. **The `renderMapSlot` comment at app.js:522-527 overstates what ships.** It says the caption "is
   present in every state rather than only in the failed one." The DOM node is; the *sentence* is
   `visibility: hidden` in every state except `ready` (styles.css:778-781). That is the right
   behaviour — `blocked` carries its own message — but the comment reads as a stronger guarantee
   than the CSS provides, which is how the next maintainer deletes the `blocked` message.

**Fix:** Place the caption relative to the slot rather than relative to the host, and make the update
path self-healing. Both are one line each.

```js
// Placed relative to the slot, not to the host, so the adjacent sibling reveal
// in styles.css survives anything a later phase appends to #location-body.
note = document.createElement('p');
note.id = 'loc-map-note';
note.className = 'map-note';
note.textContent = t('loc.map.fallback');
slot.insertAdjacentElement('afterend', note);
```

and in the language-switch branch (app.js:484-495):

```js
if (slot) {
  var line = $('.map-wait__line', slot);
  if (line) {
    line.textContent = slot.getAttribute('data-state') === 'blocked'
      ? t('loc.map.blocked')
      : t('loc.map.loading');
  }
  var mounted = $('iframe', slot);
  if (mounted) mounted.setAttribute('title', t('loc.maptitle'));

  // Rebuilt rather than skipped if it went missing, and re-seated if something
  // was inserted between it and the slot. The reveal is an adjacent sibling
  // selector, so a caption that is not the slot's next sibling is a caption
  // that never appears.
  if (!note) {
    note = document.createElement('p');
    note.id = 'loc-map-note';
    note.className = 'map-note';
  }
  note.textContent = t('loc.map.fallback');
  if (slot.nextSibling !== note) slot.insertAdjacentElement('afterend', note);
  return;
}
```

Also correct the comment at app.js:522-527 to say the node is present in every state and the sentence
is revealed only in `ready`, with `blocked` carrying its own copy — so the two-channel contract is
written down where someone editing either channel will read it.

---

## Info

### IN-01: Dead CSS selectors

**File:** `styles.css:364-365`, `styles.css:183-184` vs `styles.css:1221-1222`, `styles.css:229`

- `.countdown[data-tick="1"] #cd-s { opacity: 0.82 }` (styles.css:365) — nothing in `app.js` ever
  writes `data-tick`. Verified by grep across all five files. Fully dead, with no future-phase owner.
  The `#cd-s` transition at styles.css:364 exists only to serve it.
- `.topnav { gap: var(--s-5) }` (styles.css:184) is unconditionally overridden by
  `.topnav { gap: var(--s-4) }` in the appended masthead block (styles.css:1222). The declaration at
  :184 is dead, and the `@media (max-width: 900px) { .topnav { gap: var(--s-4) } }` override at
  styles.css:229 is now a no-op setting the same value it already has.
- `.facts__row--egg` (styles.css:243, 476-480) and `.group-cta` (styles.css:1076-1085) are unused,
  but are phase-04 and phase-03 scaffolding respectively and are correctly anticipatory. No action.

**Fix:** Delete styles.css:364-365 and the `gap` declaration at styles.css:184, or set `data-tick`
in `renderCountdown` if the seconds pulse was intended to ship.

---

### IN-02: Five copy keys are unused in all three languages

**File:** `copy.js:32`, `copy.js:142`, `copy.js:144-146` (and the `it`/`da` mirrors)

`hero.cta.location` ("Find the location"), `footer.lang` ("Language"), and `lang.it` / `lang.en` /
`lang.da` are defined in all three tables and referenced nowhere in `index.html` or `app.js`.
The hero ships only `hero.cta.enrol` and `hero.cta.access` (index.html:115-116); the footer has no
language block; the switcher buttons carry hardcoded `EN` / `IT` / `DA` text (index.html:69-71).

`wa.heading` / `wa.body` / `wa.cta` are also unused but are phase-03 scaffolding — correct to keep.
The seven `notes.*` keys are reached dynamically via `t('notes.' + key)` (app.js:867) and are live.

**Fix:** `footer.lang` and `lang.*` are the natural source strings for WR-05 — reuse them rather than
adding new keys. Delete `hero.cta.location` if the third hero button is not returning.

---

### IN-03: Dead config branch — `supabaseAnonKey` is never a key in `config.js`

**File:** `app.js:1167`

```js
var configured = Boolean(p.supabaseUrl && (p.supabaseKey || p.supabaseAnonKey));
```

`config.js:197-204` defines `supabaseUrl`, `supabaseKey`, `bucket`, `table`, `maxPerGuest`,
`maxFileSizeMb`. There is no `supabaseAnonKey` and the config comment (config.js:183-186) explicitly
states that both the newer `sb_publishable_` and the older anon JWT go in `supabaseKey`. The second
half of the disjunction can never be true.

**Fix:** `var configured = Boolean(p.supabaseUrl && p.supabaseKey);`

---

### IN-04: Translating the OG and Twitter meta tags at runtime has no effect

**File:** `index.html:16-19` (with `app.js:71-73`)

`og:title` and `og:description` carry `data-i18n` + `data-i18n-attr="content"`, so `applyLanguage()`
rewrites them on every language switch. Link-preview crawlers (WhatsApp, Telegram, Slack, Twitter)
fetch the raw HTML and never execute JavaScript, so the preview is always the English served in the
static markup. The work is harmless but misleading — it reads as if previews are localised.

The `<title>` and `<meta name="description">` translations at index.html:7-9 *are* meaningful (tab
title and in-page a11y), so only the `og:` pair is affected.

**Fix:** Either drop `data-i18n` from index.html:16-19 with a comment recording why, or keep it and
note that the served preview is English by construction.

---

### IN-05: Outbound map links use `rel="noopener"` without `noreferrer`

**File:** `app.js:406`, `app.js:416`

Both directions buttons are built with `target="_blank"` and `rel="noopener"`. `noopener` closes the
`window.opener` hole, which is the security half, but the `Referer` header still carries the full
invitation URL to `google.com` and `maps.apple.com`. Combined with WR-06, that hands the private-
invite URL to two third parties on every tap.

**Fix:** `google.setAttribute('rel', 'noopener noreferrer');` on both links (app.js:406 and
app.js:416). Nothing in the flow depends on the referrer — these are plain directions handoffs.

---

### IN-06: `#fact-deadline` keeps its hardcoded English date when the deadline is unparseable

**File:** `app.js:1092-1097`, `index.html:182`

`renderDeadline()` returns early on `isNaN(deadlineMs)` (app.js:1092-1095) after hiding the hero
line, but before the `fact.textContent = formatDate(deadlineMs)` write at app.js:1097. The course
fact table therefore keeps the static English `26 September 2026` from index.html:182 forever — in
all three languages — even though the site has concluded the deadline is unknown. This is the same
class of gap as CR-01: the `isNaN` guard protects one consumer and skips another.

**Fix:** Fall back to the copy that exists for exactly this:

```js
if (isNaN(deadlineMs)) {
  if (fact) fact.textContent = t('facts.location.tbd');
  if (el) el.hidden = true;
  return;
}
```

---

### IN-07: Reserved nudge padding is a fixed 76px while the bar itself grows by the safe-area inset

**File:** `styles.css:1027`, `styles.css:1064`

`.nudge` adds `padding-bottom: env(safe-area-inset-bottom, 0)` (styles.css:1027), so on a notched
iPhone in portrait the bar is roughly 34px taller than the flat 76px reserved by
`body[data-nudge="1"] { padding-bottom: 76px }` (styles.css:1064). The bar then covers the last line
of the footer disclaimer on exactly the device class the comment at styles.css:1015-1017 says the
site is read on.

**Fix:**

```css
body[data-nudge="1"] { padding-bottom: calc(76px + env(safe-area-inset-bottom, 0px)); }
```

---

_Reviewed: 2026-08-14T11:20:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
