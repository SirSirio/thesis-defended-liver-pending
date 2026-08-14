---
phase: 02-practical-information
reviewed: 2026-08-14T00:00:00Z
depth: standard
files_reviewed: 5
files_reviewed_list:
  - app.js
  - config.js
  - copy.js
  - index.html
  - styles.css
findings:
  critical: 3
  warning: 10
  info: 6
  total: 19
status: issues_found
---

# Phase 2: Code Review Report

**Reviewed:** 2026-08-14
**Depth:** standard
**Files Reviewed:** 5
**Status:** issues_found

## Summary

Reviewed the location, map, access and video work in `app.js`, plus the supporting
`config.js`, `copy.js`, `index.html` and `styles.css` changes. Project constraints
were honoured and are not reported: `app.js` contains zero `const`/`let`, zero arrow
functions and zero `.innerHTML` assignments; every config-derived value reaches the
DOM through `createElement` + `textContent` or `setAttribute` on a fixed-prefix URL,
so there is no injection surface anywhere in the new rendering code. Copy tables were
verified mechanically: EN/IT/DA are all exactly 113 keys with zero drift in either
direction. The venue address publication (T-02-04) is treated as an accepted owner
decision and is not a finding.

Three defects are serious enough to block. The countdown renders literal `NaN` values
the moment `startsAt` is not parseable, which is precisely the "broken placeholder"
outcome the project forbids and which `config.js`'s own header promises cannot happen.
The nudge deadline arithmetic is off by one whole day and will tell guests the wrong
thing on the two days it matters most, including announcing that registration "closes
today" after it has already closed. And `config.js` publishes a live Supabase
publishable key against a schema whose UPDATE policy is `using (true)` with no
`guest_id` predicate, so any anonymous holder of that key can overwrite the entire
enrollments table.

The remaining warnings cluster around three habits: unguarded DOM dereferences inside
functions that already learned to guard their first lookup, timers held without
handles, and cross-function contracts expressed as class-name sniffing rather than as
shared values.

No `<structural_findings>` block was supplied with this review, so there is no
structural substrate section below.

## Critical Issues

### CR-01: Countdown renders `NaN` when `startsAt` is unset or unparseable

**File:** `app.js:115`, `app.js:117-122`, `app.js:133-158`

**Issue:** `phase()` explicitly detects the unparseable case (`if (isNaN(startMs)) return 'before';`)
but the `'before'` branch it routes to then does arithmetic on `startMs` without
re-checking it. `Math.max(0, NaN)` is `NaN`, so `left`, `totalSec`, `d`, `h`, `m` and
`s` are all `NaN`. `pad()` does not survive this either: `NaN < 10` is `false`, so it
falls through to `String(NaN)`. The hero renders `NaN : NaN : NaN : NaN` at 7.5rem,
and `#cd-sr` announces "NaN days, NaN hours, NaN minutes" to screen readers, once a
minute, forever.

This is reachable from any config state the owner is invited to use. `config.js:1-9`
promises "Anything set to null shows a polite placeholder on the site instead of
breaking", and `formatSchedule()` (`app.js:193-207`) honours that promise for the same
value while the countdown directly above it does not. A typo in the ISO string
produces the identical result. It is the one failure mode the phase's placeholder
discipline exists to prevent, sitting in the largest element on the page.

**Fix:** Give the invalid clock its own state rather than letting it fall into the
`'before'` maths. `styles.css:382-383` already hides `.countdown__clock` for any state
other than `before`, so a fourth state costs no new CSS.

```js
function phase(now) {
  if (isNaN(startMs)) return 'unset';     // was: 'before'
  if (now < startMs) return 'before';
  if (!isNaN(endMs) && now >= endMs) return 'over';
  return 'live';
}

function renderCountdown() {
  if (!els.root) return;

  var now = Date.now();
  var state = phase(now);
  els.root.setAttribute('data-state', state);

  if (state === 'unset') {
    // Same register as every other pending state on the page.
    if (els.status) {
      els.status.textContent = t('facts.location.tbd');
      els.status.hidden = false;
    }
    if (els.note) els.note.hidden = true;
    if (els.sr) els.sr.textContent = '';
    return;
  }

  if (state === 'before') {
    /* ... unchanged ... */
  }
  /* ... unchanged ... */
}
```

Add `.countdown[data-state="unset"] .countdown__clock { display: none; }` alongside
the existing pair at `styles.css:382-383`. A dedicated `countdown.unset.*` copy pair
in all three tables would be better than reusing `facts.location.tbd` (see IN-06).

---

### CR-02: Deadline day arithmetic is off by one; the nudge states false facts

**File:** `app.js:1029-1031`, `app.js:1081-1087`

**Issue:** `daysUntil()` uses `Math.ceil` on a raw millisecond difference, so its result
is "calendar days rounded up", not "days remaining". Every branch that consumes it is
therefore shifted by one, and the two edge branches are wrong in opposite directions.

Trace it against the shipped `enrollment.deadline` of `2026-09-26T23:59:00+02:00`:

- 14 hours before the deadline (the morning of the 26th): difference is `0.58` days,
  `Math.ceil` gives `1`, the `days === 1` branch fires, and the bar says
  **"Registration closes tomorrow."** It closes today, in 14 hours.
- 30 hours before (the 25th): difference is `1.25`, `ceil` gives `2`, the `days > 1`
  branch fires, and the bar says **"Registration closes in 2 days."** It closes
  tomorrow.
- 3 hours *after* the deadline: difference is `-0.125`, `Math.ceil` returns `-0`, and
  `-0 === 0` is `true` in JavaScript, so the `days === 0` branch fires and the bar says
  **"Registration closes today."** It closed three hours ago. The `else { hideNudge }`
  guard at `app.js:1087` that was written to catch this does not run until the deadline
  is a full 24 hours in the past.

The consequence is that `nudge.enrol.today` is unreachable for any future deadline in
all three languages, `nudge.enrol.last` fires on the closing day instead of the day
before, and the bar actively solicits registrations after the form has closed.
`renderDeadline()` at `app.js:1055` has the correct guard for that last case
(`Date.now() > deadlineMs`) and `renderNudge()` does not.

Note this is currently masked: `enrollmentReady()` (`app.js:1120-1124`) returns `false`
because `#enrol-form` does not exist yet, so the enrol branch never renders. It will
unmask itself in phase 3 with no code change and no failing signal.

**Fix:** Compare calendar days in the venue's timezone, and check expiry before the day
count. Both the deadline copy and the fact table already format in `Europe/Copenhagen`
(`app.js:1037`), so the day boundary should be measured there too.

```js
// Whole calendar days between today and the deadline, in the party's timezone,
// so "closes today" means today where the party is, not where the guest is.
function daysUntil(ms) {
  var fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric', month: '2-digit', day: '2-digit'
  });
  var a = Date.parse(fmt.format(new Date()) + 'T00:00:00Z');
  var b = Date.parse(fmt.format(new Date(ms)) + 'T00:00:00Z');
  return Math.round((b - a) / 86400000);
}
```

and in `renderNudge()`, hoist the expiry guard so a passed deadline can never reach the
day-count ladder:

```js
if (!isNaN(deadlineMs) && Date.now() > deadlineMs) { hideNudge(bar); return; }

var days = isNaN(deadlineMs) ? null : daysUntil(deadlineMs);
var msg;
if (days === null || days > 7) msg = t('nudge.enrol.text');
else if (days > 1)             msg = t('nudge.enrol.soon').replace('{n}', days);
else if (days === 1)           msg = t('nudge.enrol.last');
else                           msg = t('nudge.enrol.today');   // days <= 0, not yet passed
```

`renderDeadline()`'s `data-urgent` threshold at `app.js:1059` reads the same helper and
is corrected by the same change.

---

### CR-03: Published Supabase key exposes an unrestricted anonymous UPDATE on the guest list

**File:** `config.js:198-199` (credential), `supabase/schema.sql:106-108` (policy)

**Issue:** `config.js` ships a live project URL and publishable key on a public GitHub
Pages site. That is correct and intended for a publishable key, and `config.js:186-193`
argues it correctly: safety depends entirely on the row level rules. The row level
rules do not hold up their end.

```sql
create policy "anon can amend own enrollment"
  on public.enrollments for update
  to anon using (true) with check (true);
```

There is no `guest_id` predicate in either clause. Any anonymous caller holding the
published key can issue an unfiltered `PATCH /rest/v1/enrollments` and overwrite every
row in the table in one request. Names, extra guest counts and notes are all
destroyable, and because there is deliberately no SELECT policy on the raw table the
owner has no in-app way to notice or reconstruct what was there. This is a data-loss
risk, live now, independent of whether phase 3 client code exists.

The surrounding documentation makes it worse rather than better: `schema.sql:83-85`
states "Anyone who knows a `guest_id` can edit that row, but guest ids are unguessable
uuids", and `schema.sql:104` says "Anyone holding a `guest_id` may amend that
registration". The policy implements neither sentence. A maintainer auditing this later
will read the comment, believe the guard exists, and move on.

`supabase/schema.sql` is outside this phase's file list; it is reported here because
`config.js` is in scope and is the file that publishes the credential making the gap
reachable.

**Fix:** Scope the UPDATE policy to the caller's own row and make the client send its
`guest_id`. `using` controls which rows are visible to the update, `with check`
controls what they may be changed into; both need the predicate, and `guest_id` must be
immutable.

```sql
-- The guest proves ownership by sending their uuid in a request header, which
-- PostgREST exposes to the policy. Without it, no row matches and the update
-- affects nothing instead of affecting everything.
drop policy if exists "anon can amend own enrollment" on public.enrollments;
create policy "anon can amend own enrollment"
  on public.enrollments for update
  to anon
  using      (guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id')
  with check (guest_id::text = current_setting('request.headers', true)::json->>'x-guest-id');
```

Correct the two comments at `schema.sql:83-85` and `schema.sql:104` in the same change
so they describe what the policy does. Also review the `public.attendees` view
(`schema.sql:162-169`): it is owned by a superuser and therefore bypasses RLS on
`enrollments` by design, which is intended here, but it should be recorded as a
deliberate bypass rather than left implicit.

## Warnings

### WR-01: `renderCountdown()` dereferences six cached elements it never checked, once per second

**File:** `app.js:126-172`

**Issue:** The function guards `els.root` (`app.js:127`) and `els.sr` (`app.js:152`,
`app.js:172`) but dereferences `els.d`, `els.h`, `els.m`, `els.s`, `els.status` and
`els.note` unconditionally. All six ids exist in `index.html` today, so this does not
fire now. If any one is renamed or removed, the resulting `TypeError` is thrown inside
a `setInterval` (`app.js:180`) and re-thrown every second for the life of the page,
after having already killed the render pass that `applyLanguage()` (`app.js:80`) called
it from. Everything scheduled after it in `applyLanguage` — schedule, deadline, nudge,
location, access — is then dead too, because the throw propagates out of
`renderCountdown` and past those five calls.

The inconsistency is the tell: the function's author guarded the two lookups that are
optional and left the six that are assumed, which means a markup change is the only
thing standing between this page and a fully blank render.

**Fix:** Guard the group once, matching the existing `els.sr` style.

```js
if (els.d && els.h && els.m && els.s) {
  els.d.textContent = pad(d);
  els.h.textContent = pad(h);
  els.m.textContent = pad(m);
  els.s.textContent = pad(s);
}
if (els.status) els.status.hidden = true;
if (els.note) els.note.hidden = true;
```

Apply the same to `app.js:168-171`.

---

### WR-02: `renderNudge()` guards the bar but not the two nodes it writes into

**File:** `app.js:1067-1104`

**Issue:** `if (!bar) return;` at `app.js:1068` establishes that this function expects
its markup to be absent sometimes. It then assigns to `text.textContent`
(`app.js:1090`, `app.js:1100`) and `cta.textContent` / `cta.setAttribute`
(`app.js:1091-1093`, `app.js:1101-1105`) with no equivalent guard. `#nudge-text` and
`#nudge-cta` are children of `#nudge`, so removing the bar's inner markup while keeping
its wrapper — plausible when phase 3 restyles it — throws.

Same class as WR-01, and same reachability: latent, but the guard it is missing is one
the author already wrote three lines above.

**Fix:** `if (!bar || !text || !cta) return;` at `app.js:1071`, after both lookups.

---

### WR-03: `hideNudge()` schedules an untracked 240ms timer that can silently un-show the bar

**File:** `app.js:1126-1136`

**Issue:** `hideNudge()` sets `bar.hidden = true` on a 240ms timeout whose handle is
discarded. Nothing cancels it. `showNudge()` sets `bar.hidden = false` synchronously,
so any `hideNudge()` → `showNudge()` sequence inside a 240ms window ends with the bar
carrying `data-show="1"` (visually translated to `translateY(0)` per `styles.css:992`)
while `hidden` is `true` — present in the layout box model per the attribute, invisible,
and with `body[data-nudge="1"]` still reserving 76px of padding for a bar nobody can
see.

Every `applyLanguage()` calls `renderNudge()` (`app.js:83`), and `renderNudge()` calls
`hideNudge()` on five separate paths (`app.js:1073`, `1079`, `1087`, `1110`). Rapid
language switching therefore stacks these timers routinely. Today every stacked timer
happens to agree with the final state, because `enrollmentReady()` is `false` and the
answer is always "hide". Phase 3 flips that to a state machine where hide→show
transitions are normal, at which point this becomes a live intermittent bug that
reproduces only on fast interaction.

Every other timer in this file — `mapTimer` (`app.js:453`), `copyRevert`
(`app.js:625`), `toastTimer` (`app.js:1165`) — is held at module scope and cleared
before it is set. This one is the exception.

**Fix:** Give it the same shape as its three neighbours.

```js
var nudgeHide = null;

function showNudge(bar) {
  if (nudgeHide) { clearTimeout(nudgeHide); nudgeHide = null; }
  bar.hidden = false;
  document.body.setAttribute('data-nudge', '1');
  requestAnimationFrame(function () { bar.setAttribute('data-show', '1'); });
}

function hideNudge(bar) {
  bar.removeAttribute('data-show');
  document.body.removeAttribute('data-nudge');
  if (nudgeHide) clearTimeout(nudgeHide);
  nudgeHide = setTimeout(function () {
    nudgeHide = null;
    bar.hidden = true;
  }, 240);
}
```

---

### WR-04: The map's `load` handler treats Google's error pages as a successful map

**File:** `app.js:595-598`, `app.js:615-622`

**Issue:** The `load` event on a cross-origin `<iframe>` fires when the framed document
finishes loading, whatever that document is. An HTTP 403/404/429 from Google, a captive
portal interception, a DNS-blocked network's browser error page, or a consent
interstitial all produce a completed document and all fire `load`. The handler then
clears `mapTimer` and sets `data-state="ready"` unconditionally.

`styles.css:737-742` responds by hiding `.map-wait` entirely. The guest is left looking
at a 16:10 box containing Google's error page, with the one line written for exactly
this situation — `loc.map.blocked`, "The map did not load. Use the address or the
directions buttons above." — suppressed, and the 8s fallback that would have shown it
already cancelled. The fast-failure case, which is the common one on a blocked or
rate-limited network, is the case that defeats the fallback; only the slow-failure case
reaches it.

This is a warning rather than a blocker because the section degrades honestly at the
level that matters: the address and both directions handoffs sit above the map and are
untouched. But the phase built a blocked state, wrote it in three languages, and this
path routes around it.

**Fix:** A same-origin page cannot inspect a cross-origin frame's contents, so a
content check is not available. The available signal is that a real Maps embed keeps
loading subresources well past its initial document, whereas an error page settles
immediately. Rather than trying to detect that, treat `load` as "stop the loading
message" and keep the timeout as an independent confirmation:

```js
frame.addEventListener('load', function () {
  // A load event only proves a document arrived, not that it is a map. Google's
  // own error pages, captive portals and rate limit interstitials all fire it.
  // So the timer is left running: if the frame is still not painting a map when
  // it expires, the guest is told, and if it is, the timer's own guard is a
  // no-op. Never clear the fallback on the strength of this event alone.
  slot.setAttribute('data-state', 'ready');
});
```

and drop the `if (slot.getAttribute('data-state') === 'ready') return;` early exit at
`app.js:618`, replacing it with a check that the frame is actually displaying content
(for example `frame.clientHeight > 0 && slot.getAttribute('data-state') === 'ready'`).
If a cheap reliable signal cannot be found, the honest alternative is to document that
`ready` means "a document arrived" and shorten the timeout, rather than leave the
blocked copy shipped-but-unreachable on the most common failure network.

---

### WR-05: Static fallback values in the fact table survive an unset config and read as real data

**File:** `app.js:1044-1052`, `index.html:182`, `index.html:135`, `index.html:171`

**Issue:** `renderDeadline()` returns early on `isNaN(deadlineMs)` (`app.js:1047-1050`)
and hides `#hero-deadline`, but never touches `#fact-deadline`. That element ships with
`26 September 2026` hardcoded in the markup and carries no `data-i18n`, so nothing else
will ever overwrite it either. Set `enrollment.deadline: null` — a state `config.js`
explicitly sanctions — and the course fact table presents a fabricated registration
deadline as fact, in all three languages, with no placeholder styling and no way for a
guest to tell.

`#fact-number` (`index.html:135`) and `#fact-host` (`index.html:171`) have the same
shape: `renderSchedule()` (`app.js:213-220`) writes them only when the config value is
truthy, otherwise the hardcoded `03102` and `Sirio` persist. Those two are benign only
because the hardcoded values happen to match the current config; they are the same
latent defect.

`#fact-schedule` and `#fact-location` are the counter-example and show the intended
pattern: both have an unconditional write path with a `facts.location.tbd` fallback.

**Fix:** Make the deadline row honour the same contract as its neighbours.

```js
function renderDeadline() {
  var el = $('#hero-deadline');
  var fact = $('#fact-deadline');

  if (isNaN(deadlineMs)) {
    // The row is never left holding the value that was hardcoded for the first
    // render. An invented date read as fact is worse than an admitted blank.
    if (fact) fact.textContent = t('facts.location.tbd');
    if (el) el.hidden = true;
    return;
  }

  if (fact) fact.textContent = formatDate(deadlineMs);
  /* ... unchanged ... */
}
```

and give `#fact-number` / `#fact-host` explicit `else` branches in `renderSchedule()`,
or drop their static text from `index.html` so an unset config fails visibly during
development rather than silently in production.

---

### WR-06: Apple Maps handoff forces driving directions; Google Maps does not

**File:** `app.js:272-278`

**Issue:** The Apple URL appends `&dirflg=d`, pinning the route to driving. The Google
URL passes no `travelmode`, so it honours whatever the guest last used. Two buttons
sitting side by side, opening the same destination, behave differently.

Driving is the wrong default for this venue specifically. `config.js:70` seeds the
transit note with "Bus 300S to Lyngby St., then 6 minutes on foot", and a student party
at a Kongens Lyngby kollegium is overwhelmingly reached by bus, bike or on foot. An
iPhone guest gets a car route and has to change the mode manually — which is one extra
tap in the cold, the exact cost D-05 cites as the reason for using directions URLs over
place URLs in the first place. The parameter works against the decision it sits inside.

**Fix:** Omit the mode and let each platform use the guest's own preference, matching
the Google branch.

```js
function directionsUrls(address) {
  var q = encodeURIComponent(address);
  return {
    google: 'https://www.google.com/maps/dir/?api=1&destination=' + q,
    // No dirflg: Apple then opens on the guest's last used mode, the same way
    // the Google link does. Most guests arrive on the 300S, not by car, and a
    // forced car route is the extra tap D-05 exists to remove.
    apple: 'https://maps.apple.com/?daddr=' + q
  };
}
```

If a default is genuinely wanted, `dirflg=r` (transit) matches the venue and the config
note far better than `d` does — but symmetry with the Google button is the stronger
argument.

---

### WR-07: A stale CSS comment now flatly contradicts the markup about trademark use

**File:** `styles.css:159-160`, `index.html:50-53`

**Issue:** `styles.css:159-160` reads:

> Not the DTU logo. A course number in a red square, which is the visual language of the
> parody without borrowing anyone's actual mark.

That was true before this phase. `index.html:50-53` now ships
`assets/dtu-logo.png` and describes it as the "Official DTU White RGB lockup,
unaltered, from designguide.dtu.dk". The CSS comment is not merely outdated, it asserts
the exact opposite of what the page does, and it sits directly above `.mark__badge`,
which is the element a maintainer would read it as describing.

This matters beyond tidiness. The footer disclaimer (`copy.js:139`) carefully states no
affiliation, which is a considered position about using a university's identity in a
parody. Anyone auditing that position later will find a comment in the stylesheet
telling them no actual mark is borrowed, and stop looking. Whether shipping the
unaltered official lockup is acceptable is the owner's call; a comment that hides the
question from the next reader is not.

**Fix:** Rewrite the comment to describe what is actually there.

```css
/* The badge sits beside the official DTU lockup shipped in index.html, and
   inverts to an outlined chip on the red band (see the masthead block at the
   foot of this file). The mark itself is used unaltered and unlicensed, as a
   parody; the footer disclaimer at copy.js 'footer.disclaimer' is the position
   that covers it. Do not delete that disclaimer without revisiting this. */
```

---

### WR-08: The directions heading is decided by sniffing a CSS class off a returned node

**File:** `app.js:983-987`, `app.js:250-265`, `app.js:784`

**Issue:** `renderAccess()` decides whether to emit the "Written directions" sub-heading
by testing `directions.classList.contains('pending')` on whatever `buildDirections()`
returned. That makes `pendingBlock()`'s presentational class name a load-bearing
API contract between two functions, with nothing marking it as such at either end.
`pendingBlock()` (`app.js:250-252`) sets `box.className = 'pending'` as styling, and
`styles.css:517-524` treats it as styling.

The failure is silent in both directions. Rename or add to that class — a BEM change, a
`pending pending--inline` variant, a utility class appended for the video slot — and
either a heading appears above a "Door instructions pending" panel that already titles
itself, or the heading vanishes from real written directions and the numbered steps
lose their label. Neither throws, neither logs, and both only show up by looking at the
page in the right config state.

The same file already demonstrates the robust pattern one function away:
`buildNotes()` (`app.js:833`) returns `null` for the empty case and `renderAccess()`
tests the return value itself (`app.js:989-993`).

**Fix:** Have `buildDirections()` report its own state instead of encoding it in a class
name, matching `buildNotes()`.

```js
// Returns null when there is nothing to title, exactly as buildNotes() does.
// The caller supplies the pending panel, so no class name is load bearing.
function buildDirections() {
  /* ... unchanged, but the final line returns null instead of pendingBlock() ... */
  return null;
}

// in renderAccess():
var directions = buildDirections();
if (directions) {
  host.appendChild(subHeading('access.dir.heading'));
  host.appendChild(directions);
} else {
  // Self titling panel, so no sub-heading above it (D-18).
  host.appendChild(pendingBlock('access.dir.pending.title', 'access.dir.pending.body'));
}
```

---

### WR-09: Reserved nudge space ignores the safe-area inset the bar adds to itself

**File:** `styles.css:1025`, `styles.css:988`

**Issue:** `.nudge` sets `padding-bottom: env(safe-area-inset-bottom, 0)`, so its
rendered height is its content height plus the device inset. The page reserves room for
it with a flat `body[data-nudge="1"] { padding-bottom: 76px; }`, which contains no such
term. On a notched or gesture-bar iPhone the inset is roughly 34px, so the bar is about
34px taller than the space reserved for it and covers the bottom of the footer
disclaimer — on precisely the devices the comment above the rule says the site is read
on ("Pinned to the bottom on phones, which is where this site is read").

The 76px is also a measured constant with no link to what it measures: `.nudge__inner`
is `var(--s-3)` padding on a `min-height: 44px` CTA, so any change to either silently
invalidates it, and `styles.css:1027-1031` already shrinks that padding below 560px
without adjusting the reservation.

**Fix:** Carry the inset into the reservation, and derive the rest from the tokens it
is actually made of.

```css
/* Reserve room so the bar never sits on top of the footer text. The safe area
   term is not optional: .nudge adds the same inset to its own height, so a flat
   number under-reserves by exactly that much on every notched phone. */
body[data-nudge="1"] {
  padding-bottom: calc(44px + (var(--s-3) * 2) + env(safe-area-inset-bottom, 0px));
}
```

---

### WR-10: The screen reader countdown keeps announcing in the previous language for up to a minute

**File:** `app.js:124`, `app.js:152-157`, `app.js:88-93`

**Issue:** `#cd-sr` is only rewritten when the minute value changes
(`if (els.sr && m !== lastSrMinute)`). `setLanguage()` updates `lang`, calls
`applyLanguage()`, and `applyLanguage()` calls `renderCountdown()` — but `m` has not
changed, so the guard holds and the live region retains its previous contents. A guest
who switches to Danish continues to have "12 days, 4 hours, 30 minutes" announced in
English until the next minute boundary, up to 59 seconds later, from the element
`app.js:150-151` describes as the calm accessible summary.

The per-minute throttle is right and should stay; it simply has no exception for the
one event that invalidates its cached key.

**Fix:** Invalidate the cache when the thing it is caching changes.

```js
function setLanguage(next) {
  if (SUPPORTED.indexOf(next) === -1) return;
  lang = next;
  store.set('lang', next);
  // The per minute throttle caches on the minute value, which a language switch
  // does not change. Without this the live region keeps announcing in the
  // language the guest just left, for up to 59 seconds.
  lastSrMinute = null;
  applyLanguage();
}
```

## Info

### IN-01: Twenty-four copy entries are defined in all three languages and referenced nowhere

**File:** `copy.js:32`, `copy.js:93-95`, `copy.js:141-145` and the IT/DA equivalents

**Issue:** Verified mechanically against every `data-i18n` in `index.html` and every
`t('...')` in `app.js`, accounting for the `notes.` dynamic prefix and the indirect
`titleKey`/`labelKey`/`noteKey` lookups. Eight keys are unreferenced, times three
languages: `hero.cta.location` (the hero ships `hero.cta.access` instead),
`wa.heading`, `wa.body`, `wa.cta` (no WhatsApp section exists in the markup),
`footer.lang`, and `lang.it` / `lang.en` / `lang.da` (the switcher uses hardcoded
`EN`/`IT`/`DA` at `index.html:69-71`).

Key parity itself is clean: all three tables are exactly 113 keys with zero drift, so
the phase's stated constraint holds.

**Fix:** Delete the entries that phase 3 and 4 have no plan to use, or add a one-line
`// reserved for phase 3` marker above the `wa.*` group. Silent dead keys make the next
parity check harder to trust.

---

### IN-02: Three CSS blocks target selectors nothing emits

**File:** `styles.css:364-365`, `styles.css:243`, `styles.css:476-480`, `styles.css:1037-1046`

**Issue:** `.countdown[data-tick="1"] #cd-s` — no code ever sets `data-tick` on
`#countdown`; `app.js:131` sets `data-state` only, so the seconds tick styling is
unreachable. `.facts__row--egg` (three separate rule blocks) — the class appears nowhere
in `index.html` or `app.js`; it is phase 4 easter egg scaffolding. `.group-cta` — no
element carries it.

**Fix:** Mark the phase 4 scaffolding as such in a comment, and delete
`.countdown[data-tick="1"]` along with the `transition` on `#cd-s` that exists only to
serve it.

---

### IN-03: `.mark__badge`'s original declarations are fully overridden and its comment is stale

**File:** `styles.css:159-172`, `styles.css:1128-1135`

**Issue:** The masthead block appended at the foot of the file overrides `background`
and `color` on `.mark__badge` completely, so `background: var(--accent)` and
`color: #fff` at `styles.css:165-166` are dead declarations. The append-only structure
is deliberate and documented at `styles.css:1093-1099`, so this is expected drift
rather than a mistake — but it leaves two rule blocks for one component with the
earlier one lying about the result. See also WR-07, which is the same block's comment.

**Fix:** Leave the structure alone; note in the first block that its fill is superseded
by the masthead block, so nobody debugs a colour by editing the rule that loses.

---

### IN-04: Translating the OG and title meta tags client-side cannot affect link previews

**File:** `index.html:7-19`

**Issue:** `<title>`, `og:title` and `og:description` carry `data-i18n` and are rewritten
by `applyLanguage()` (`app.js:66-74`). Link unfurlers — WhatsApp, iMessage, Telegram,
Slack — fetch the raw HTML and never execute the scripts, so a preview always shows the
English static content regardless. The `<title>` rewrite is genuinely useful for the
browser tab; the two `og:` rewrites do nothing at all.

Given the site's stated distribution channel is being pasted into a chat, this is worth
knowing rather than fixing: there is no client-side fix, and static English is the right
default.

**Fix:** None available without prerendering. Add a comment above the `og:` block so the
next person does not spend time debugging why the Danish preview never appears.

---

### IN-05: The copy revert timer holds a button the next render may already have replaced

**File:** `app.js:632-643`, `app.js:427-431`

**Issue:** `copyFeedback()` captures `btn` in a 2000ms (or 4000ms on failure) timeout.
`renderLocation()` clears `#loc-data` (`app.js:339`) and builds a fresh copy button on
every language switch. A guest who copies the address and switches language within that
window leaves the timer mutating a detached node, while the visible replacement button
renders with the default `loc.copy` label and no `data-state`.

The outcome is benign — the fresh button is already in the correct reverted state — but
the confirmation the guest was mid-way through reading vanishes early, and the timer is
one of the few in this file that is not cleared by the code that invalidates its target.

**Fix:** Clear `copyRevert` at the top of `renderLocation()`, alongside the existing
`#loc-data` teardown.

---

### IN-06: The schedule row's unset state borrows a location-specific copy key

**File:** `app.js:194`

**Issue:** `formatSchedule()` returns `t('facts.location.tbd')` when `startsAt` is
unparseable, so the "Scheduled" / "Skemaplacering" / "Orario" row falls back to a string
authored for the Location row. It reads acceptably today in all three languages
("To be announced", "Da comunicare", "Oplyses senere"). It stops reading acceptably the
moment anyone sharpens that string toward its actual subject — "Venue to be announced",
"Lokale oplyses senere" — which is a natural edit to make, and which would put a
sentence about the venue into the time field with nothing to catch it.

CR-01's fix compounds this by proposing the same key for a third unrelated purpose.

**Fix:** Add a dedicated neutral key rather than sharing one across three fields.

```js
'facts.tbd': 'To be announced',   // en
'facts.tbd': 'Da comunicare',     // it
'facts.tbd': 'Oplyses senere',    // da
```

and point `formatSchedule()`, `renderSchedule()`'s location fallback and CR-01's unset
countdown state at it, leaving `facts.location.tbd` free to become venue-specific.

---

_Reviewed: 2026-08-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
