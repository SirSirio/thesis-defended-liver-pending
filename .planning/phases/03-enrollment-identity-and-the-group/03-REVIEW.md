---
phase: 03-enrollment-identity-and-the-group
reviewed: 2026-08-15T11:32:50Z
depth: standard
scope: "gap closure only, git diff ac1b2ac..HEAD -- app.js config.js styles.css supabase/schema.sql"
files_reviewed: 4
files_reviewed_list:
  - app.js
  - config.js
  - styles.css
  - supabase/schema.sql
findings:
  critical: 3
  warning: 2
  info: 4
  total: 9
status: issues_found
---

# Phase 3 gap closure: Code Review Report

**Reviewed:** 2026-08-15T11:32:50Z
**Depth:** standard
**Files Reviewed:** 4 (471 insertions / 79 deletions)
**Status:** issues_found

## Summary

Sixteen of the nineteen prior findings are genuinely closed, and I checked each one against
the shipped file rather than against the summaries:

| Prior ID | State in this tree |
|---|---|
| CR-02 `photos` read path | closed for **reading** (`public.album` + `revoke select`), **but see CR-01 below**: the same revoke breaks the write path |
| WR-01 `daysUntil` `-0` | closed. `deadlinePassed()` is `Date.now() > deadlineMs`, byte-equal to what `renderDeadline` used before, and it is called **above** the bucketing in `renderNudge`. I reproduced the calendar ladder at twelve offsets: `-1h/-12h/-23.9h` now hide the bar, `+2h/+8h/+15h` give `0`, `+30h` gives `1`, `+3.5d` gives `3`. The two surfaces agree. |
| WR-02 amend policy | closed, and the `drop policy if exists` correctly survives in the file |
| WR-03 toast hide timer | closed, both handles compared against `null` |
| WR-04 `amendPending` | closed |
| WR-05 NETWORK vs PGRST202 | closed, split correctly |
| WR-06 `forgetIdentity` | closed, fourth flag reset and focus landing both present |
| WR-07 `nudgeShowFrame` | closed. No half-shown state: `hideNudge` cancels the frame *and* still runs its 240ms teardown, so the bar always ends `hidden` with `data-nudge` released. No path leaves a cancelled frame with the handle still set. |
| WR-08 `AbortController` | closed. `Promise.race` against a **resolving** timeout; the executor runs synchronously so `timer` is assigned before use; `wire` carries its own `.catch` so the race can never reject; `clearTimeout` runs on both outcomes. A browser with `fetch` and no `AbortController` settles as `NETWORK` at 12s. |
| WR-09 `proofSeq` | closed, and checked above `host.textContent = ''`, which is the correct placement |
| WR-10 `extra_guests` | closed at 4/4, documented at both sites, and the `drop constraint if exists` / `add constraint` pair is name-matched and idempotent across repeated runs |
| IN-02 `.group-cta` | deleted; zero references across all three files |
| IN-04 `res.ok` | closed; 409 still reaches its own test |
| IN-05 `search_path` | added to both remaining functions |
| IN-07 `renderCountdown` | guard added (see IN-02 below for its shape) |
| IN-01, IN-03, IN-06, `enrol.withdrawn.body` | declined by 03-09 with reasons; **not re-raised here** |

Schema idempotency holds under a second and third whole-file run: every new statement in
sections 9 and 10 is `create or replace` / `grant` / `revoke` / `drop … if exists` + `add`,
the `ALTER TABLE` drop subcommand is processed before the add subcommand in the same
statement, and section 1's inline check on a fresh database is auto-named
`enrollments_extra_guests_check`, which is exactly the name section 10 drops and re-adds.

What did not hold up is, again, the interaction between the fixes. All three Critical
findings below are **regressions introduced by the gap closure itself**, not survivals from
before it:

1. The revoke that closed the read path also closes the read the photo-limit trigger needs,
   so anonymous photo INSERT — the one privilege 03-07 says it deliberately preserved — is
   now refused. (CR-01)
2. The mounted guard added to protect the withdrawal continuation now throws away a
   **confirmed** withdrawal, leaving the device saying "you are registered" while the
   database says withdrawn. Before this diff that same sequence behaved correctly. (CR-02)
3. Widening the freeze from the box to the whole body while deleting the call that released
   it leaves every control in `#enrol-body` permanently disabled on the `pending` branch.
   (CR-03)

---

## Critical Issues

### CR-01: `revoke select on public.photos from anon` disables the photo-limit trigger, so every anonymous photo INSERT will now fail

**File:** `supabase/schema.sql:386` (the revoke), with `supabase/schema.sql:178-199` (the trigger function), `supabase/schema.sql:168` (the dropped SELECT policy), `supabase/schema.sql:382-385` (the comment that asserts the opposite)

**Issue:**
Section 4's limit is enforced by a trigger function that **reads the table it guards**:

```sql
create or replace function public.enforce_photo_limit()
returns trigger language plpgsql
set search_path = ''          -- added by this diff
as $$
declare current_count integer;
begin
  select count(*) into current_count
    from public.photos                       -- <— needs SELECT on public.photos
   where guest_id = new.guest_id;
  ...
```

It is **not** `security definer`. A PostgreSQL trigger function without `security definer`
executes with the privileges of the role that issued the statement, which for a PostgREST
request is `anon`. Section 9 then does:

```sql
revoke select on public.photos from anon;      -- schema.sql:386
```

So `POST /rest/v1/photos` as `anon` fires `photos_limit`, the trigger's `select count(*)`
is evaluated as `anon`, and it raises `42501 permission denied for table photos`. The insert
never lands. This is not speculative about whether the grant was direct: probe A in
`03-07-SUMMARY.md` proves it was, because the revoke took effect and turned the read from
`200 []` into `401 / 42501`. The same privilege the probe proves is gone is the one the
trigger needs.

The section 9 comment states the exact opposite, in as many words:

```sql
-- Reading, and only reading. Anonymous visitors keep the right to add a photo,
-- which is how phase 4 will upload anything at all. Taking away more than the
-- read here would take the upload with it, and nothing would notice until
-- phase 4 was built and did not work.                        -- schema.sql:382-385
```

Nothing did notice. Neither the plan's five probes nor the two added beyond it ever issued a
`POST /rest/v1/photos`; probe E exercised the *enrollments* insert instead. So the file's
STATUS header (`schema.sql:30-38`) records sections 9 and 10 as "verified against the live
database" while the one behaviour section 9 changed for phase 4 is unverified and, on this
reading, broken.

**There is a second defect underneath the first.** Dropping `anon can view album`
(`schema.sql:168`) removed the only SELECT policy on `public.photos`. Even if someone
"fixes" this by re-granting `select … to anon`, the trigger's `count(*)` would then be
filtered by RLS with no SELECT policy to match, so it would return **0 for every guest,
forever**, and the five-photo limit would be silently unenforceable — falsifying section 3's
own bullet, "The five photo limit is enforced in the database, not just in the UI", and
section 4's argument that "a limit that only exists in JavaScript is a suggestion".

**Fix:** the function must read the table with its owner's rights, which is the same
arrangement section 9 already reasons about for the view. It already carries the hardened
`search_path` and already qualifies `public.photos`, so this is a one-word change plus the
revoke that any definer function in this file gets:

```sql
create or replace function public.enforce_photo_limit()
returns trigger language plpgsql
security definer                 -- reads the table it guards, and anon cannot read it
set search_path = ''
as $$
declare
  current_count integer;
begin
  select count(*) into current_count
    from public.photos
   where guest_id = new.guest_id;

  if current_count >= 5 then
    raise exception 'photo_limit_reached';
  end if;

  return new;
end $$;

-- Same discipline as section 8: take the default away before handing it back.
-- Nothing can call this by name anyway (it errors outside a trigger context),
-- but the file should have one rule and no exceptions.
revoke all on function public.enforce_photo_limit() from public;
```

`create or replace function` keeps the existing `photos_limit` trigger binding, so no
trigger edit is needed.

**Acceptance must be a wire probe, not a source gate** — this is exactly the class of claim
03-07 was right to insist on proving:

- `POST /rest/v1/photos` with the publishable key and a throwaway `guest_id` must answer
  `201`, not `401 / 42501`.
- Six inserts under one `guest_id`: the sixth must fail with `photo_limit_reached`, not
  succeed. (Clean up the probe rows afterwards; `anon` cannot delete them, so this is an
  owner step in the dashboard.)

---

### CR-02: the withdrawal's mounted guard discards a confirmed withdrawal, leaving the device saying "registered" while the database says withdrawn

**File:** `app.js:3003` (the guard), with `app.js:3005-3015` (the branch it skips), `app.js:2938-2950` (the freeze), `app.js:2383-2389` (the early exit that does not cover this panel)

**Issue:**
`doWithdraw` now opens its continuation with an unconditional bail-out:

```js
withdrawEnrollment(ident).then(function (res) {
  if (!stillMounted(box)) return;                 // app.js:3003

  if (res.result === 'ok' || res.result === 'gone') {
    store.set('enrolled', '0');                   // never reached
    withdrawnShown = true; successShown = false; editing = false;
    refreshEnrollmentState();
    ...
```

The guard's stated purpose (`app.js:2997-3002`) is to stop `store.set('enrolled','0')` from
resurrecting a flag `forgetIdentity()` has just removed. But 03-08's *other* fix — the
body-wide freeze at `app.js:2943` — already makes that sequence unreachable: the forget
control is a `<button>` inside `#enrol-body` and is `disabled` for the whole request. So the
race the guard was written for cannot happen, and the only sequence that can still detach
the box produces the wrong answer.

**The reachable trigger is the language switch.** The three language buttons live in the
page header (`index.html:69-71`), outside `#enrol-body`, so the freeze does not touch them.
`setLanguage` → `applyLanguage` → `renderEnrollment` (`app.js:151-155`, `app.js:129`).
`renderEnrollment` has a form-preserving early exit, but it is gated on `body === 'form'`
(`app.js:2383`); the withdrawal confirmation lives in the **return** panel, so the exit does
not apply and `host.textContent = ''` (`app.js:2391`) detaches the box.

Trace it:

1. Guest taps **Confirm withdrawal**. Body freezes. RPC leaves.
2. Guest taps **DA** while waiting on mobile data. `#enrol-body` is rebuilt from storage —
   still `enrolled = '1'` — so the **returning panel comes back showing their registration**.
3. The RPC answers `1`. The database row now has `withdrawn = true`.
4. `stillMounted(box)` is false. The continuation returns. `store.set('enrolled','0')` never
   runs, `withdrawnShown` is never set, nothing re-renders.

Final state: the host's head count no longer counts this guest, and the guest's screen says
"You are registered" with an Edit and a Withdraw control under it. That is the invariant the
function's own header comment claims to have eliminated, running in the other direction —
`app.js:2963-2970` says "There is no path here where the interface tells somebody they have
withdrawn while the database still counts them", and the mirror image is just as bad because
it is the number the host buys food against.

**This is a regression.** Before this diff the same three taps behaved correctly: the
continuation wrote storage and called `refreshEnrollmentState()`, which renders from module
state and storage rather than from the detached node, so the withdrawn panel appeared in the
freshly rebuilt body. The guard traded a race the freeze had already closed for a wrong
answer on an ordinary action.

**Fix:** the guard belongs *below* the durable branch, not above it. Storage and module
state are not attached to the DOM and are safe to write from a detached continuation; only
the last two branches actually render into `box`.

```js
withdrawEnrollment(ident).then(function (res) {
  /* The two answers that mean the guest is off the list write storage and module
     state and then re-render from them, so they are correct whether or not the box
     survived. The forget-resurrects-the-flag race this guard used to cover is closed
     by the body-wide freeze in setWithdrawState, not by returning here. */
  if (res.result === 'ok' || res.result === 'gone') {
    store.set('enrolled', '0');

    withdrawnShown = true;
    successShown = false;
    editing = false;

    refreshEnrollmentState();
    focusPanelHeading('enrol-withdrawn-title');
    return;
  }

  /* The remaining two answers render into this box and only into this box, so a
     box that has left the document has nowhere to put them. The panel was rebuilt
     under us and carries the untouched registration already, which is the truth. */
  if (!stillMounted(box)) return;

  if (res.result === 'pending') { ... }
  ...
});
```

---

### CR-03: the `pending` branch never lifts the body-wide freeze, so every control on the enrollment panel stays permanently disabled

**File:** `app.js:3023-3033`, with `app.js:2941-2943`

**Issue:**
03-08 did two things in the same commit that cancel each other out. It widened the freeze
from the confirmation box to the whole body:

```js
var busy = (state === 'submitting');
var body = $('#enrol-body');
$$('button', body || box).forEach(function (el) { el.disabled = busy; });   // app.js:2941-2943
```

and it deleted the `setWithdrawState(box, 'idle')` that used to run at the top of the
not-ok path, on the grounds (03-08-SUMMARY, Accomplishments) that it was "dead" work
immediately before the row was destroyed. It *was* dead while the freeze was box-scoped —
the box was about to be torn out anyway. Once the freeze covers the body it is the **only**
call that re-enables the edit and forget controls, which are in different rows and are not
torn out.

The `pending` branch now ends without ever leaving the `submitting` freeze:

```js
if (res.result === 'pending') {
  amendPending = true;
  var row = box.parentNode;
  if (!row) return;              // <— also returns frozen
  row.textContent = '';
  row.appendChild(amendPendingLine());
  focusAmendPending(row);
  return;                        // <— nothing re-enables anything, nothing re-renders
}
```

Result: after a `PGRST202` withdrawal the guest is left on a panel whose **Change your
registration** and **Forget my details on this device** buttons are `disabled` for the rest
of the page's life, with no re-render scheduled to rebuild them. Only a reload recovers.
`amendPending = true` is written to module state but nothing calls `refreshEnrollmentState()`
to act on it.

The `failure` branch is fine — `setWithdrawState(box, 'failure')` sets `busy = false` and
releases everything — which is what makes the omission on the sibling branch a defect rather
than a design.

Reachability: `withdrawEnrollment` maps `404 / PGRST202` to `pending` (`app.js:1451`). The
function is live today, but PGRST202 is what a **stale PostgREST schema cache** answers in
the window after any schema re-run, and this project's stated deployment procedure is the
owner pasting and re-running the whole schema file. It is also what every guest gets if the
database is ever rebuilt from the file with a caching delay.

**Fix:** release the freeze before replacing the row, and make the early `!row` exit release
it too.

```js
if (res.result === 'pending') {
  amendPending = true;

  /* Out of the freeze first. The box is about to be destroyed, but the edit and
     forget controls are in sibling rows and this is the only thing that hands
     them back. */
  setWithdrawState(box, 'idle');

  var row = box.parentNode;
  if (!row) return;

  row.textContent = '';
  row.appendChild(amendPendingLine());
  focusAmendPending(row);
  return;
}
```

This also revives the currently-dead `'idle'` label path inside `setWithdrawState`
(`app.js:2948`), which no caller reaches after this diff.

---

## Warnings

### WR-01: `calendarDaysUntil`'s catch degrades to arithmetic that reintroduces gap 3's corollary — "Registration closes tomorrow" on the last day there is

**File:** `app.js:3295-3297`, with the claim at `app.js:3273-3277` and the ladder at `app.js:3367-3375`

**Issue:** The fallback is the deleted `daysUntil` body verbatim:

```js
} catch (e) {
  return Math.ceil((ms - Date.now()) / 86400000);
}
```

The comment above it says the fallback "can still yield negative zero … and it is harmless
here only because `deadlinePassed()` runs above every caller." The negative-zero half of
that is correct and I verified it: at `-1h`, `-12h` and `-23.9h` the fallback returns `-0`,
and `deadlinePassed()` intercepts all three before the bucket is read. But the comment
accounts for only half the defect this plan set out to close. Measured against the
configured deadline `2026-09-26T23:59:00+02:00`:

| offset from deadline | calendar path | fallback | fallback renders |
|---|---|---|---|
| `+2h` (closing day) | `0` → `nudge.enrol.today` | `1` | `nudge.enrol.last` — "closes **tomorrow**" |
| `+8h` (closing day) | `0` → today | `1` | "closes **tomorrow**" |
| `+15h` (closing day) | `0` → today | `1` | "closes **tomorrow**" |
| `+30h` | `1` → "tomorrow" | `2` | `nudge.enrol.soon` — "**2 days** left" |
| `+7.4d` | `7` | `8` | drops out of the urgent bucket entirely |

So on any engine where the `try` throws — `Intl.DateTimeFormat` missing IANA zone data, or
`formatToParts` absent (pre-2017 Safari, some Android WebViews and embedded browsers) — the
bar prints "Registration closes tomorrow" on the actual closing day, and
`nudge.enrol.today` becomes unreachable again. That is precisely the outcome 03-09's own
key-decision rejected as "a second false statement printed on the day the pressure is meant
to peak" when it declined to delete the key. The degradation quietly ships the thing the
decision refused.

The fallback does not need `Intl` to be a calendar difference. It only needs to stop
dividing milliseconds:

**Fix:**
```js
    } catch (e) {
      /* Still a calendar difference, in the device's own zone rather than in
         Copenhagen, which is a shorter step than falling back to a 24 hour
         window: a window bucket cannot render "closes today" at all, and prints
         "closes tomorrow" on the last day there is. */
      var a = new Date(ms);
      var b = new Date();
      return Math.round((
        Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
        Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
      ) / 86400000);
    }
```

Then correct the comment above it: the fallback no longer yields negative zero and no longer
depends on `deadlinePassed()` to be harmless, which is a stronger sentence than the one
currently written.

---

### WR-02: the same mounted-guard shape sits on `handleSubmit` and `handleAmend`, where firing it would silently drop a registration the database has already accepted

**File:** `app.js:2630`, `app.js:2690`

**Issue:** Both continuations open with `if (!stillMounted(form)) return;` above the branch
that writes `identity.save({...})` and flips `successShown` / `amendPending`. If that guard
ever fires, the row exists in the database and the device has no record of it: the guest is
shown an empty registration form with no confirmation, no error and no banner, and the
receipt they later see is stale.

Today the guard is **dead**, and dead for a reason that is not obvious from the call site:
`renderEnrollment`'s early exit at `app.js:2383-2389` preserves a standing `#enrol-form`
across a language switch whenever the selected body is `'form'` and the mode matches, which
is exactly the state both continuations run in. Nothing else can re-render `#enrol-body`
during a submit, because `setFormState(form,'submitting')` disables every control the body
contains.

So this is latent rather than live — but it is latent on a coupling nobody wrote down. Any
future change to the early-exit condition (a new body value, an extra reconciliation case, a
mode that rebuilds) turns it into CR-02's exact failure on the insert path, which is the one
request this file calls the most important branch in it.

**Fix:** apply the same reshaping as CR-02 — never guard a durable write, guard only the DOM
work — and record the dependency at the call site:

```js
    submitEnrollment(fields, ident).then(function (res) {
      if (res.result === 'ok' || res.result === 'pending') {
        amendPending = (res.result === 'pending');
        identity.save({ ... });                 // durable, and correct detached
        successShown = true;

        // The form may have been replaced under us. refreshEnrollmentState()
        // renders from storage and module state, not from this node, so the
        // receipt appears either way; only the state call on the old node and
        // the focus landing need it to still be here.
        if (stillMounted(form)) setFormState(form, 'success');
        refreshEnrollmentState();
        focusPanelHeading('enrol-success-title');
        return;
      }

      if (!stillMounted(form)) return;   // the failure branch renders into the form
      setFormState(form, 'failure');
      showAlert(form);
    });
```

---

## Info

### IN-01: `setWithdrawState` re-enables every button in `#enrol-body` with no memory of what was disabled before

**File:** `app.js:2941-2943`
**Issue:** The release is `el.disabled = busy` across the whole body, so any control that was
legitimately disabled for an unrelated reason is silently switched on by a withdrawal
finishing. Nothing on the return panel ships disabled today, so this is currently benign, but
the freeze is the only place in the file that reaches outside its own component and it does
so without saving state.
**Fix:** mark what the freeze disabled and release only that —
`el.setAttribute('data-frozen','1')` on the way in, and on the way out only clear `disabled`
on elements carrying it.

### IN-02: `renderCountdown`'s new guard is broader than its own comment claims, and couples the two states

**File:** `app.js:191-197`
**Issue:** The comment says "the function cannot render either of its two states without
these", but the past/after state (`app.js:238-242`) touches only `els.status`, `els.note`,
`els.sr` and the label; `els.d/h/m/s` are used solely by the counting state
(`app.js:212-215`). A missing `els.d` now silently suppresses the after-party message too,
which the pre-guard code would have rendered. All eight nodes exist in `index.html`, so this
is comment accuracy plus a slightly over-broad early return, not a live defect — but comment
accuracy is load-bearing in this file.
**Fix:** either split the guard per state, or trim the sentence to what is true: "any one of
these missing means the markup this function was written against is gone, and returning
quietly is better than throwing halfway through a render."

### IN-03: `toast()`'s `requestAnimationFrame` handle is still unheld, one commit after the identical rule was applied to `nudgeShowFrame`

**File:** `app.js:3566`
**Issue:** `requestAnimationFrame(function () { toastEl.setAttribute('data-show','1'); });` is
fired and forgotten, while `showNudge`/`hideNudge` in the same diff now hold and cancel
theirs, and the comment at `app.js:3548-3556` states the module-scope rule for the toast's
*timers*. I could not construct a reachable half-state for the toast — both timers are
cleared before either is set, so no stale hide can race a queued show — so this is
consistency rather than a bug.
**Fix:** hold `toastShowFrame` at module scope and cancel it beside the two timers, or add a
sentence saying why the frame is deliberately not held here when it is held twenty lines
above.

### IN-04: `forgetIdentity` writes `tabindex="-1"` onto a static heading and never removes it

**File:** `app.js:2816-2822`
**Issue:** `#enrol .section__h` is markup from `index.html:217`, not a node this file rebuilds,
so the attribute persists for the rest of the session. The same idiom in `panelHeading`
(`app.js:1985-1990`) is applied to nodes that are discarded on the next render, so this is the
first place the attribute outlives its use. Harmless — `tabindex="-1"` does not enter the tab
order — but it leaves the section heading programmatically focusable forever after one tap on
a control most guests never press.
**Fix:** remove it once focus has landed, `head.addEventListener('blur', function () {
head.removeAttribute('tabindex'); }, { once: true })`, or state at the site that the residue is
accepted.

---

## What is explicitly not a finding

- The absence of a test suite, the `node -e` gate style, the ES5 idiom, the three deferred
  48px touch targets, and the four items 03-09 declined with reasons (IN-01, IN-03, IN-06 and
  the `enrol.withdrawn.body` wording on the `gone` branch). All locked or dispositioned.
- `public.album`'s projection. I checked it three ways: `select=*` returns the three
  projected columns only; an `order` or `filter` on `guest_id` is a `42703` because the
  column is not in the view; and PostgREST cannot embed through to `public.photos` or
  `public.enrollments` because `photos.guest_id` carries no foreign key for the relationship
  detector to find. The view is a genuine trust boundary for reads.
- The album view running with its owner's rights. `public.attendees` proves the same shape
  works against an RLS-enabled base table with no SELECT policy, on this project, with a live
  row.
- Schema idempotency. Sections 9 and 10 survive repeated whole-file runs, including the
  `drop constraint if exists` / `add constraint` pair (the drop subcommand is processed
  before the add within one `ALTER TABLE`) and the `create or replace view` / `grant`
  ordering (replace preserves the grant; the grant is adjacent anyway).
- `deadlinePassed()`'s boundary. `Date.now() > deadlineMs` is the identical test
  `renderDeadline` used before the change, so the two surfaces cannot disagree by a second.
- `styles.css`. The `.group-cta` deletion is clean: zero references remain across
  `styles.css`, `app.js` and `index.html`, and the removed section header left no orphaned
  rules.
- `config.js`. The comment is accurate: with `maxGuestsPerPerson` above 4 the DB answers
  `23514`, `submitEnrollment` reads it as `failed`, and the guest gets the failure banner —
  which is what the comment promises.

---

_Reviewed: 2026-08-15T11:32:50Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Scope: `git diff ac1b2ac..HEAD -- app.js config.js styles.css supabase/schema.sql`_
