---
phase: 03-enrollment-identity-and-the-group
reviewed: 2026-08-15T00:00:00Z
depth: standard
files_reviewed: 6
files_reviewed_list:
  - app.js
  - config.js
  - copy.js
  - index.html
  - styles.css
  - supabase/schema.sql
findings:
  critical: 2
  warning: 10
  info: 7
  total: 19
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-08-15
**Depth:** standard
**Files Reviewed:** 6
**Status:** issues_found

## Summary

Six files, ~2,100 new lines in `app.js`, ~750 in `styles.css`, two new schema sections.
The house disciplines that were claimed hold up under direct check:

- **No markup strings anywhere.** `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
  `document.write`, `eval` and `new Function` return zero hits across `app.js`,
  `index.html`, `config.js` and `copy.js`. Every guest-supplied value reaches the DOM
  through `textContent` (`recordRow` app.js:1900, `buildRecord` app.js:1914). The read
  path for social proof (`renderSocialProof` app.js:2399 → `recordRow` → `dd.textContent`)
  is clean. **No XSS found.**
- **`guest_id` does not leak into the DOM, a URL, or a log.** It travels only in a POST
  body (`sbRequest` app.js:1264). `amend_enrollment` is `volatile`, so PostgREST refuses
  GET and the uuid never lands in a query string. No `console.*` calls exist in any
  reviewed file.
- **Copy is complete.** Automated diff of `copy.js` against every key used in `app.js`
  and `index.html`: zero keys missing from `en`, zero missing from `it` or `da`, zero
  `{token}` mismatches across the three tables.
- **`amend_enrollment` is correctly shaped as a definer function.** `set search_path = ''`
  with `public.enrollments` fully qualified; the only unqualified callables (`coalesce`,
  `nullif`, `now()` via the trigger) resolve through the always-implicit `pg_catalog`. It
  returns `integer` and never a row. The revoke/grant pair repeats the argument list
  verbatim and matches the signature.

What did not hold up is the interaction *between* the plans, which is where both
BLOCKERs and most WARNINGs sit. Two findings deserve naming up front:

1. **The in-flight withdrawal is not isolated from the panel it lives in.** Every claim
   in the 03-05 header comment — "the block always terminates somewhere defined", "there
   is no path here where the interface tells somebody they have withdrawn while the
   database still counts them" — is falsifiable by tapping a *second, still-enabled*
   control on the same panel while the first request is out. See CR-01.
2. **Section 8 turned `guest_id` into a bearer write credential, and section 3 publishes
   it.** `photos` has an unrestricted anon SELECT policy exposing `guest_id` and a full
   `name`. The schema's own stated model ("guest ids are unguessable uuids that never
   appear on the page") stops being true the moment phase 4 writes a row. See CR-02.

## Critical Issues

### CR-01: In-flight withdrawal is not isolated — the panel's other controls stay live, and every failure branch downstream is unsound

**File:** `app.js:2801-2871` (with `app.js:2690-2695`, `app.js:2715-2722`, `app.js:2614-2646`)

**Issue:**
`setWithdrawState()` disables only the buttons *inside* the confirmation box:

```js
$$('button', box).forEach(function (el) { el.disabled = busy; });   // app.js:2805
```

`box` is the `.withdraw-confirm`. The return panel's other three controls — **Change your
registration** (`data-action="edit"`, app.js:2200), **Forget my details on this device**
(`data-action="forget"`, app.js:2214) — are siblings in `.panel__row` / `.panel__acts` and
stay enabled for the whole 12-second request window. This is asymmetric with the submit
path, where `setFormState` disables `$$('input, select, textarea, button', form)`
(app.js:1834) and the form *is* the entire body, so nothing else is reachable.

Each of the three live controls calls `refreshEnrollmentState()` → `renderEnrollment()` →
`host.textContent = ''` (app.js:2348), which detaches the whole panel including the
in-flight box. `doWithdraw`'s continuation (app.js:2849) then runs unconditionally against
module state and storage without re-checking that the box is still mounted. Three distinct
defects fall out:

**(a) The failure branch becomes completely invisible.** After teardown, `box.parentNode`
is still the (now detached) `.panel__row`, so the guard `if (!row) return;` passes:

```js
setWithdrawState(box, 'idle');       // writes to a detached node
var row = box.parentNode;            // detached .panel__row — truthy
row.textContent = '';
row.appendChild(amendPendingLine()); // appended into a detached subtree
focusAmendPending(row);              // .focus() on a detached node is a no-op
```

The error message is rendered into a subtree that is not in the document, and focus drops
to `<body>`. On a network failure, `PGRST202`, a non-2xx, or a malformed body, the guest
receives **no signal of any kind** — the exact silent-failure class this whole phase was
built to eliminate.

**(b) The success branch resurrects storage the guest just asked to have cleared.** Tap
Confirm withdrawal → tap Forget my details on this device. `forgetIdentity()`
(app.js:2715) runs `identity.clear()`, removing `enrolled` from localStorage *and* from
`store.mem`. The withdrawal then resolves `ok` and runs `store.set('enrolled', '0')`
(app.js:2851), writing `c03102.enrolled = "0"` straight back onto the device, and sets
`withdrawnShown = true` so the guest who was shown an empty form is thrown onto "You are
unregistered". This directly violates the invariant documented at `identity.clear`
(app.js:1205-1214): *"a flag left sitting at the string 0 is residue: it is a record that
this device was once used to register, which is exactly the fact they asked to have
removed."*

**(c) Two contradictory RPCs race the same row.** Tap Confirm withdrawal → tap Change your
registration → submit the edit. `handleAmend` → `saveAmendment` → `amendEnrollment` sends
`p_withdrawn: false` (app.js:1343) while the withdrawal RPC carrying `p_withdrawn: true`
(app.js:1404) is still out. The database keeps whichever `UPDATE` commits last; the UI
keeps whichever promise settles last. These are independent. The result is a device that
says "You are unregistered" while `withdrawn = false` in the table, or the reverse — the
precise outcome the header comment at app.js:2821-2826 asserts is unreachable.

**Fix:** Freeze the whole enrollment body for the duration of the request, and make the
continuation a no-op if the box it belongs to was torn down.

```js
function setWithdrawState(box, state) {
  box.setAttribute('data-state', state);
  var busy = (state === 'submitting');

  // The whole body, not just the box: the edit, forget and again controls are
  // siblings of this box and every one of them tears it down mid request.
  var body = $('#enrol-body');
  $$('button, a.enrol-act', body || box).forEach(function (el) {
    if (busy) el.setAttribute('disabled', 'disabled'); else el.removeAttribute('disabled');
  });
  ...
}

function doWithdraw(btn) {
  var box = withdrawBox(btn);
  if (!box) return;
  if (box.getAttribute('data-state') === 'submitting') return;

  var ident = identity.get();
  setWithdrawState(box, 'submitting');

  withdrawEnrollment(ident).then(function (res) {
    // The panel was replaced under us (language switch, or a control that
    // escaped the freeze). Nothing this continuation writes can be believed
    // and nothing it renders can be seen, so it must not run.
    if (!document.contains(box)) return;

    if (res.result === 'ok' || res.result === 'gone') { ... }
    ...
  });
}
```

Guard the same way in `handleSubmit` / `handleAmend` (`if (!document.contains(form)) return;`)
so a torn-down form cannot write module state either.

---

### CR-02: `guest_id` is a bearer write credential, and the `photos` policy publishes it (with full names) to every visitor

**File:** `supabase/schema.sql:73-79`, `supabase/schema.sql:128-131`, `supabase/schema.sql:263-299`

**Issue:**
Section 8 changed what a `guest_id` *is*. Before this phase, holding one bought nothing:
the `anon can amend own enrollment` UPDATE policy cannot match rows (no SELECT policy), and
there is no read path. After this phase, `amend_enrollment` is `security definer`, bypasses
RLS, accepts `p_guest_id` as its only credential, and will rewrite `name`, `extra_guests`,
`note`, `lang` and `withdrawn` on the matching row. `guest_id` is now a password.

Section 3 hands that password out:

```sql
create table if not exists public.photos (
  id           uuid primary key default gen_random_uuid(),
  guest_id     uuid not null,          -- the amendment credential
  name         text not null,          -- the FULL name, unsplit
  storage_path text not null unique,
  created_at   timestamptz not null default now()
);

create policy "anon can view album"
  on public.photos for select
  to anon using (true);                -- every column, every row, to anybody
```

`GET /rest/v1/photos?select=*` with the publishable key returns every uploader's
`guest_id` and full `name`. The moment phase 4 writes its first row, anyone can:

- withdraw arbitrary guests: `POST /rest/v1/rpc/amend_enrollment {"p_guest_id":"<harvested>","p_withdrawn":true}`
- rewrite arbitrary guests' names and notes on the host's list
- read every uploader's **full** name — the thing the `attendees` view (schema.sql:170-177)
  exists solely to prevent, defeated by a sibling table with no projection at all

Today the table is empty, so this is not yet exploitable — but it is a defect *in this
file*, introduced by this phase's change to what a `guest_id` means, and it is armed by a
phase-4 insert rather than by any further schema edit. The schema's own security statement
at line 92-93 ("guest ids are unguessable uuids that **never appear on the page**") is
already false as written.

**Fix:** Mirror the `enrollments` / `attendees` pattern. Never expose `photos` directly.

```sql
-- The album is public. The credential and the surname are not.
drop policy if exists "anon can view album" on public.photos;

create or replace view public.album as
  select
    split_part(trim(name), ' ', 1) as first_name,
    storage_path,
    created_at
  from public.photos;

grant select on public.album to anon;
revoke select on public.photos from anon;
```

Then point phase 4's read at `/rest/v1/album`. Additionally, ensure phase 4 does not embed
`guest_id` in `storage_path` — the bucket is public (schema.sql:184-196), so a path is as
readable as a column.

## Warnings

### WR-01: `daysUntil()` returns `-0` for an expired deadline, so the bar nags "Registration closes today" for 24 hours after it closed

**File:** `app.js:3070-3072`, `app.js:3122-3128`

**Issue:** `Math.ceil` of a small negative number is `-0`, and `-0 === 0` is `true` in JS.
Verified:

| deadline offset | `daysUntil` | branch taken | message |
|---|---|---|---|
| +12 h (still open) | `1` | `days === 1` | "Registration closes **tomorrow**." |
| −12 h (**closed**) | `-0` | `days === 0` | "Registration closes **today**." |
| −23.9 h (**closed**) | `-0` | `days === 0` | "Registration closes **today**." |
| −25 h | `-1` | `else` | hidden |

Two consequences. First, for a full day after registration has closed the bar tells guests
it is still open — while `renderDeadline()` (app.js:3096) correctly uses
`Date.now() > deadlineMs` and has already hidden the hero line, so the two surfaces
contradict each other on the same screen. Second, `nudge.enrol.today` is **unreachable in
its intended meaning**: there is no positive offset that produces `0`, so the string only
ever renders after the deadline has passed. Phase 3 is what made this path live —
`enrollmentReady()` gated the whole bar off until `#enrol-form` existed.

**Fix:** Close the deadline on the same test `renderDeadline()` uses, before bucketing days.

```js
var left = isNaN(deadlineMs) ? null : deadlineMs - Date.now();
if (left !== null && left <= 0) { hideNudge(bar); return; }   // closed, stop asking

var days = left === null ? null : Math.ceil(left / 86400000);
var msg;
if (days === null || days > 7) msg = t('nudge.enrol.text');
else if (days > 1)             msg = t('nudge.enrol.soon').replace('{n}', days);
else                           msg = t('nudge.enrol.last');   // final 24 h
```

Then either delete `nudge.enrol.today` from all three tables or re-derive it from the
calendar date (`same local day as the deadline`), which is what the string actually claims.

---

### WR-02: `anon can amend own enrollment` grants unrestricted mass-write on every row and is now dead code held inert only by an unrelated missing policy

**File:** `supabase/schema.sql:112-116`

**Issue:**
```sql
-- Anyone holding a guest_id may amend that registration.
create policy "anon can amend own enrollment"
  on public.enrollments for update
  to anon using (true) with check (true);
```

The comment describes a per-guest rule; the policy implements no rule at all. It authorises
anon to UPDATE **every row** with **any values**. The only thing stopping it today is that
Postgres requires SELECT policies to evaluate an `UPDATE ... WHERE`, and there is no SELECT
policy — an adjacent, unrelated fact. Section 8 replaced this policy's purpose entirely
(the definer function bypasses RLS), so it is dead code *and* a loaded foot-gun: adding any
SELECT policy on `enrollments` — a future host-facing feature, or Supabase's one-click
"Enable read access for all users" template — converts it in one step into unauthenticated
mass rewrite of every guest's name and note.

**Fix:** Drop it. Nothing in `app.js` sends a PATCH to `/rest/v1/enrollments`; the only
write paths are the POST insert (app.js:1318) and the RPC (app.js:1346, 1406).

```sql
-- Superseded by public.amend_enrollment in section 8. An update sent straight
-- from the browser is the silent-success failure this design exists to avoid,
-- and a permissive policy left standing here becomes mass write access the day
-- anyone adds a select policy to this table.
drop policy if exists "anon can amend own enrollment" on public.enrollments;
```

---

### WR-03: `toast()`'s inner hide timer is untracked, so a second toast fired inside the 260 ms fade window is killed on arrival

**File:** `app.js:3283-3295`

**Issue:** The outer timer is held and cleared; the nested one is not.

```js
if (toastTimer) clearTimeout(toastTimer);
toastTimer = setTimeout(function () {
  toastEl.removeAttribute('data-show');
  setTimeout(function () { toastEl.hidden = true; }, 260);   // never cleared
}, 2400);
```

A toast fired between t=2400 ms and t=2660 ms of a previous one sets `hidden = false` and
`data-show="1"`, and then the stale inner timer fires and sets `hidden = true`
(`[hidden] { display: none !important; }`, styles.css:101) — the new message vanishes
without ever being read. Phase 3 is the first to make this reachable: it adds two toasts
(`enrol.updated.toast` app.js:2629, `enrol.identity.cleared` app.js:2721) fired from
controls that sit two rows apart on the same panel. It also breaks the file's own stated
rule, applied correctly to `copyRevert` (app.js:746), `mapTimer` (app.js:712) and
`nudgeHideTimer` (app.js:3240): *"One timer, held at module scope and cleared before it is set."*

**Fix:**
```js
var toastTimer = null;
var toastHideTimer = null;

function toast(msg) {
  if (!toastEl) return;
  if (toastTimer)     { clearTimeout(toastTimer);     toastTimer = null; }
  if (toastHideTimer) { clearTimeout(toastHideTimer); toastHideTimer = null; }

  toastEl.textContent = msg;
  toastEl.hidden = false;
  requestAnimationFrame(function () { toastEl.setAttribute('data-show', '1'); });

  toastTimer = setTimeout(function () {
    toastTimer = null;
    toastEl.removeAttribute('data-show');
    toastHideTimer = setTimeout(function () {
      toastHideTimer = null;
      toastEl.hidden = true;
    }, 260);
  }, 2400);
}
```

---

### WR-04: `doWithdraw`'s pending branch never sets `amendPending`, so the "not recordable" answer evaporates on the next render

**File:** `app.js:2862-2869` (compare `app.js:2634-2641`)

**Issue:** `handleAmend`'s pending branch sets `amendPending = true` before re-rendering,
so `buildReturnPanel` (app.js:2198) keeps showing the line on every subsequent render.
`doWithdraw`'s equivalent branch replaces the row in place and writes nothing to module
state. The next render for any reason — a language switch, a later `refreshEnrollmentState()` —
rebuilds the panel from scratch with `amendPending` still `false`, so the explanation
disappears and the Withdraw button returns. The guest taps it, gets the same silent
non-result, and has no way to learn that the function is missing rather than that their tap
missed. It also means two different code paths disagree about what "the amend function is
absent" persists as.

**Fix:** Set the flag before re-rendering, and let the renderer own the placement.

```js
if (res.result === 'pending') {
  amendPending = true;
  var row = box.parentNode;
  if (!row) return;
  row.textContent = '';
  row.appendChild(amendPendingLine());
  focusAmendPending(row);
  return;
}
```

---

### WR-05: A transient network failure during withdrawal permanently removes the only way to withdraw, with no retry

**File:** `app.js:2840-2871`, copy key `enrol.amend.pending` (`copy.js:131`)

**Issue:** `withdrawEnrollment` maps a network failure (`status: 0`, `code: 'NETWORK'`,
app.js:1293) into the same terminal branch as `PGRST202`. The row is then replaced by
`amendPendingLine()` — a `<p>`, not a control — and the Withdraw button is gone for the
rest of the page's life. The copy says *"Changes cannot be recorded yet. Tell the host
directly. Your registration stays as it is."*, which is correct for a missing function and
actively wrong for a dropped packet on mobile data: the recovery is *retry*, and retry has
just been taken away.

This is asymmetric with the phase's own design elsewhere. The form's wire-failure state
deliberately keeps the control and relabels it `enrol.retry` (app.js:1844), for a reason
spelled out at app.js:2607-2613. Withdrawal, the single request the same comment calls "the
one request that most needs to be believed" (app.js:2023), gets no retry at all.

**Fix:** Split the two branches, which `withdrawEnrollment` already distinguishes.

```js
if (res.result === 'pending') { /* function missing → the static line, as today */ }

// The wire failed. Keep the confirmation standing so the guest can press again.
setWithdrawState(box, 'failure');
var q = $('.withdraw-confirm__q', box);
if (q) q.textContent = t('enrol.fail.body');   // "Check your connection and submit again."
var yes = $('#enrol-withdraw-yes', box);
if (yes) { yes.textContent = t('enrol.retry'); yes.focus(); }
```

---

### WR-06: `forgetIdentity()` resets three of four session flags and drops focus to `<body>` when used from the withdrawn panel

**File:** `app.js:2715-2722`

**Issue:**
```js
function forgetIdentity() {
  identity.clear();
  successShown = false;
  amendPending  = false;
  editing       = false;      // withdrawnShown is not reset
  refreshEnrollmentState();
  toast(t('enrol.identity.cleared'));
}
```

The withdrawn panel carries its own Forget control (app.js:2264), added by 03-05 after
`forgetIdentity` was written by 03-04. From there, `withdrawnShown` stays `true`, so
`renderEnrollment` re-selects `body = 'withdrawn'` (app.js:2325) and rebuilds the panel —
destroying the button the guest just pressed. The comment justifying the missing focus move
(app.js:2709-2714) reasons only about the form: *"The only focusable thing left is the name
field, and putting a caret in it would throw the soft keyboard up."* On the withdrawn panel
there is no name field; focus falls to `<body>` and the next Tab restarts at the top of the
page. That is precisely the outcome app.js:2506-2509 says every path in this section must
prevent.

**Fix:**
```js
function forgetIdentity() {
  var fromWithdrawn = withdrawnShown;

  identity.clear();
  successShown  = false;
  amendPending  = false;
  editing       = false;
  withdrawnShown = false;      // the identity is gone; there is no registration to have left
  refreshEnrollmentState();
  toast(t('enrol.identity.cleared'));

  // The panel that held the control was rebuilt or replaced under it. The name
  // field is deliberately not focused, so land on the section heading instead
  // of dropping to the document body.
  if (fromWithdrawn) {
    var head = $('#enrol .section__h');
    if (head) { head.setAttribute('tabindex', '-1'); head.focus(); }
  }
}
```

---

### WR-07: `hideNudge()` does not cancel `showNudge()`'s pending `requestAnimationFrame`, so `registerAgain()` slides the bar in over the keyboard and then snaps it away

**File:** `app.js:3226-3247`, `app.js:2878-2884`

**Issue:** `showNudge` schedules `data-show="1"` in a rAF; `hideNudge` removes the attribute
synchronously and sets a 240 ms teardown, but the queued rAF is never cancelled. Trace
`registerAgain()`:

1. `refreshEnrollmentState()` → `renderNudge()`. The guest withdrew, so `enrolled` is `'0'`
   and `enrollmentReady()` is now true (the form just rendered) → `showNudge(bar)` →
   `bar.hidden = false`, rAF queued.
2. `focusNameField()` fires `.focus()`, which dispatches `focusin` synchronously →
   `hideNudge(bar)` → `removeAttribute('data-show')` (a no-op; it was never set) + 240 ms timer.
3. Next frame: the stale rAF sets `data-show="1"` → the bar **slides in** over the keyboard
   the focus call just raised.
4. 240 ms later: `bar.hidden = true` → it disappears with no transition.

The bar also carries the wrong message throughout ("You have not registered yet", pointed at
a form the guest is already typing into), which is exactly what the `focusin` yield at
app.js:2927-2939 was written to prevent.

**Fix:** Hold the frame handle and cancel it, the same way the timers are handled.

```js
var nudgeShowFrame = null;

function showNudge(bar) {
  if (nudgeHideTimer)  { clearTimeout(nudgeHideTimer); nudgeHideTimer = null; }
  bar.hidden = false;
  measureNudge();
  document.body.setAttribute('data-nudge', '1');
  if (nudgeShowFrame) cancelAnimationFrame(nudgeShowFrame);
  nudgeShowFrame = requestAnimationFrame(function () {
    nudgeShowFrame = null;
    bar.setAttribute('data-show', '1');
  });
}

function hideNudge(bar) {
  if (nudgeShowFrame) { cancelAnimationFrame(nudgeShowFrame); nudgeShowFrame = null; }
  bar.removeAttribute('data-show');
  ...
}
```

Also move `focusNameField()` ahead of `refreshEnrollmentState()`'s nudge pass, or have
`registerAgain()` set a flag the bar reads, so the bar is never asked to show in the tick
the form takes focus.

---

### WR-08: `sbRequest`'s timeout is a no-op without `AbortController`, and the promise then never settles — the submit button stays locked forever

**File:** `app.js:1264-1295`

**Issue:**
```js
var ctl = ('AbortController' in window) ? new AbortController() : null;
var timer = setTimeout(function () { if (ctl) ctl.abort(); }, timeoutMs || 12000);
```

With no `AbortController`, the timer fires and does nothing. `fetch` hangs, neither `.then`
nor `.catch` runs, and `handleSubmit`'s `setFormState(form, 'submitting')` (app.js:2554) is
permanent: every input, the textarea and the submit button stay `disabled` with no recovery
short of a reload. This falsifies two written invariants — *"never rejects, so ... no code
path can leave the submit button locked"* (app.js:1246-1247) and *"Every branch of the
submit path ends in a call to this, so no code path can leave the button locked"*
(app.js:1828-1829). The same hole disables the withdraw confirmation permanently
(app.js:2847). The affected population is small (fetch present, AbortController absent), but
the fix is three lines and the invariant is load-bearing for the whole phase.

**Fix:** Race the fetch against the timeout instead of depending on abort alone.

```js
function sbRequest(method, path, body, prefer, timeoutMs) {
  var ctl = ('AbortController' in window) ? new AbortController() : null;
  var ms = timeoutMs || 12000;
  var timer = null;
  var settled = false;

  var timeout = new Promise(function (resolve) {
    timer = setTimeout(function () {
      if (ctl) ctl.abort();
      // Resolves regardless of whether the abort could take effect, so the
      // request always terminates somewhere defined.
      resolve({ ok: false, status: 0, code: 'NETWORK', body: null });
    }, ms);
  });
  ...
  return Promise.race([wire, timeout]).then(function (out) {
    clearTimeout(timer);
    return out;
  });
}
```

---

### WR-09: `renderSocialProof()` has no in-flight guard, so a stale response can overwrite a fresher head count

**File:** `app.js:2399-2462`

**Issue:** The function is called from `applyLanguage()` (app.js:142) and from
`refreshEnrollmentState()` (app.js:2382), with no dedup, no cancellation and no
generation token. Each call issues an independent 8-second GET and, on settle,
unconditionally does `host.textContent = ''` followed by an append. Two overlapping calls
that resolve out of order leave the **older** response on screen. The reachable case is the
one that matters: withdraw (fires request A, which will not include the withdrawing guest),
then switch language within the round trip (fires request B). If A resolves last, the guest
is shown a head count that still counts them — the same "device and database disagree"
class the phase is built around, in the one widget whose entire job is to be believed.

**Fix:** A monotonic token, checked before writing.

```js
var proofSeq = 0;

function renderSocialProof() {
  var host = $('#enrol-proof');
  if (!host || !sbConfigured()) return;

  var seq = ++proofSeq;
  sbRequest('GET', '/rest/v1/attendees?select=first_name,extra_guests', null, null, 8000)
    .then(function (res) {
      if (seq !== proofSeq) return;   // a newer read is already out or already landed
      host.textContent = '';
      ...
    });
}
```

---

### WR-10: the `extra_guests` bound is enforced only in the UI — the database accepts five times the configured maximum

**File:** `supabase/schema.sql:44`, `app.js:1443-1452`

**Issue:** The column check is `between 0 and 10`; `config.js` sets
`maxGuestsPerPerson: 2` and `clampGuests`/`readGuests` enforce that client side
(app.js:2481). Nothing server side does. A hand-rolled POST or RPC with
`extra_guests: 10` is accepted, and it lands in `attendees.extra_guests`, which is summed
straight into the head count (app.js:2426) the host buys food against. This is the exact
argument section 4 of the schema makes for the photo limit — *"a limit that only exists in
JavaScript is a suggestion"* (schema.sql:137-138) — not applied to the sibling limit.

**Fix:** Either tighten the check to the real capacity, or (better, since the value lives in
`config.js`) document the divergence explicitly at both sites so a host who raises
`maxGuestsPerPerson` above 10 does not get a 23514 they cannot diagnose:

```sql
-- Keep this bound at or above config.js enrollment.maxGuestsPerPerson. It is the
-- server side floor under a limit the UI also enforces, exactly like the photo
-- limit in section 4: a bound that only exists in JavaScript is a suggestion.
alter table public.enrollments
  drop constraint if exists enrollments_extra_guests_check,
  add  constraint enrollments_extra_guests_check check (extra_guests between 0 and 4);
```

## Info

### IN-01: `enrollmentReady()` re-implements `sbConfigured()` verbatim

**File:** `app.js:1241-1244`, `app.js:3161-3165`
**Issue:** Both compute `Boolean(p.supabaseUrl && (p.supabaseKey || p.supabaseAnonKey))`.
The comment at app.js:1238-1240 says the duplication exists so the two cannot disagree —
but copy-paste is how they *will* disagree, and one already carries an extra clause.
**Fix:** `function enrollmentReady() { return sbConfigured() && Boolean($('#enrol-form')); }`

### IN-02: `.group-cta` is dead CSS

**File:** `styles.css:1136-1145`
**Issue:** Zero references in `app.js` or `index.html` (verified by grep). `app.js:3041-3043`
explicitly names it "the unused legacy class further down styles.css" and routes around it.
**Fix:** Delete the rule; the comment naming it can go with it.

### IN-03: Five copy keys are defined in all three languages and never used

**File:** `copy.js` (`hero.cta.location`, `footer.lang`, `lang.it`, `lang.en`, `lang.da`)
**Issue:** 15 dead strings. `hero.cta.location` has no `data-i18n` in `index.html` (the hero
ships `hero.cta.enrol` and `hero.cta.access`); the language switch buttons hardcode
`EN`/`IT`/`DA` (index.html:69-71) rather than reading `lang.*`; no node carries
`footer.lang`. Pre-existing, not introduced by this phase.
**Fix:** Delete, or wire `lang.*` into the switch buttons' `aria-label`, which would also
give the three-letter controls accessible names in the guest's own language.

### IN-04: `submitEnrollment` gates on an exact status while the other two wire functions gate on `res.ok`

**File:** `app.js:1320` vs `app.js:1353`, `app.js:1411`
**Issue:** `if (res.status === 201)` for the insert, `if (res.ok && ...)` for both RPCs. Any
2xx other than 201 on the insert path (a proxy normalising, a PostgREST behaviour change)
reports a written row as a failure. Not currently reachable, but the inconsistency is a
future trap in the single most important branch in the file.
**Fix:** `if (res.ok) return { result: 'ok' };` — `Prefer: return=minimal` guarantees no body
to disambiguate anyway.

### IN-05: `touch_updated_at()` and `enforce_photo_limit()` carry no `set search_path`

**File:** `supabase/schema.sql:56-61`, `supabase/schema.sql:141-155`
**Issue:** Both are invoker-rights, and `touch_updated_at` inherits `search_path = ''` when
fired from inside `amend_enrollment`, so neither is exploitable today (`now()` and `count()`
resolve through the always-implicit `pg_catalog`, and `public.photos` is qualified). But the
file applies the hardening to exactly one of its three functions, which reads as selective
rather than as a standard.
**Fix:** Add `set search_path = ''` to both, then the file has one rule with no exceptions.

### IN-06: `newGuestId()` is invoked at module load purely to compute a boolean, discarding a UUID

**File:** `app.js:1171`
**Issue:** `var IDENTITY_OK = newGuestId() !== null;` mints and throws away a v4 uuid on
every page load, and couples the capability probe to the generator's return value rather
than to the capability.
**Fix:** `var IDENTITY_OK = typeof crypto !== 'undefined' && (typeof crypto.randomUUID === 'function' || typeof crypto.getRandomValues === 'function');`

### IN-07: `renderCountdown` guards only `els.root` but dereferences six other cached nodes

**File:** `app.js:189-236`
**Issue:** `els.d`, `els.h`, `els.m`, `els.s`, `els.status` and `els.note` are used
unguarded, while `els.sr` and the label *are* guarded. All exist in `index.html` today, so
this is inconsistency rather than a live crash — but the file's defensive style is otherwise
uniform (`renderSchedule`, `renderLocation`, `renderEnrollment` all null-check every node).
Pre-existing.
**Fix:** Add a single `if (!els.d || !els.status) return;` alongside the root check.

Also in this bucket: `doWithdraw` calls `setWithdrawState(box, 'idle')` (app.js:2862)
immediately before `row.textContent = ''` destroys `box` — dead work on the failure path.
Resolved as part of CR-01.

---

_Reviewed: 2026-08-15_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
