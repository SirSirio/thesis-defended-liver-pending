---
phase: 03-enrollment-identity-and-the-group
plan: 08
subsystem: ui
tags: [vanilla-js, dom, async, fetch, postgrest, promise-race, generation-token, localstorage]

requires:
  - phase: 03-enrollment-identity-and-the-group
    provides: "The withdrawal flow (03-05), the wire helpers and the amend RPC (03-03), the social proof block and the toast (03-04)"
provides:
  - "setWithdrawState freezes the whole #enrol-body for the duration of a withdrawal, so no sibling control can tear the confirmation out of the document mid request"
  - "stillMounted(node), and a mounted guard on the three async continuations in the enrollment region that write module state or storage"
  - "amendPending persisted by doWithdraw's pending branch, matching handleAmend"
  - "A wire failure on withdrawal that keeps the confirmation standing with a retry label, split from the missing-function branch"
  - "sbRequest settles on its own timeout rather than depending on an abort that may not fire"
  - "submitEnrollment gated on res.ok, agreeing with the two RPC callers about what success is"
  - "A generation token on renderSocialProof, checked above the host clear"
  - "toastHideTimer held at module scope, so a toast fired inside the previous fade window survives"
affects: [03-09, 04-photos]

actuals:
  tokens: 4503
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Mounted guard: an async continuation whose node has left the document is a no-op, never a write into a detached subtree"
    - "Generation token checked above the clear, so a superseded response neither paints nor blanks"
    - "Promise.race against a resolving timeout, so termination does not depend on AbortController being present"

key-files:
  created: []
  modified:
    - "app.js"

key-decisions:
  - "The withdrawal freeze is scoped to #enrol-body rather than to the confirmation box, and the asymmetry with setFormState is the point: there the form IS the body, here the box is a sibling of three controls that destroy it."
  - "Escape is deliberately left outside the freeze. It is a key press, not a control, and the block's own listener already declines while submitting, so UI-SPEC E5's revert contract is unchanged."
  - "A dropped packet and a missing database function are two answers with two recoveries. The wire failure keeps the control and relabels it enrol.retry; PGRST202 keeps the static not-recordable line."
  - "sbRequest's settlement is unconditional while its abort is not. The race is what makes the two written invariants true rather than merely asserted."
  - "The social proof token is checked above host.textContent = '', because clearing on a superseded response is the destructive half of the bug."
  - "Both toast timers are compared against null rather than for truthiness, so a timer id of 0 cannot silently skip its own clear."

patterns-established:
  - "stillMounted(node): the single mounted predicate for this file, degrading to true where Node.contains is absent"
  - "Gates are sliced out of the shipped source by brace matching and run in a fresh Node process; no branch condition is ever re-typed, and every gate was proved to redden against the pre-change source before the fix landed"

requirements-completed: [ENR-05, ENR-06, ENR-07, ENR-10]

coverage:
  - id: D1
    description: "While a withdrawal is in flight every control inside #enrol-body is disabled, including the edit and forget controls that sit outside the confirmation box"
    requirement: "ENR-06"
    verification:
      - kind: unit
        ref: "node -e gate G1 (setWithdrawState sliced from app.js, submitting then idle)"
        status: pass
    human_judgment: false
  - id: D2
    description: "A withdrawal continuation whose box has left the document writes neither storage nor DOM, while the still-mounted path keeps working"
    requirement: "ENR-05"
    verification:
      - kind: unit
        ref: "node -e gate G2 (doWithdraw sliced from app.js, document.contains false then true)"
        status: pass
    human_judgment: false
  - id: D3
    description: "doWithdraw's pending branch persists amendPending, so the not-recordable answer survives the next render"
    requirement: "ENR-06"
    verification:
      - kind: unit
        ref: "node -e gate G3 (module-scope amendPending read back from the evaluated slice)"
        status: pass
    human_judgment: false
  - id: D4
    description: "A NETWORK failure keeps the confirmation standing with enrol.fail.body and the enrol.retry label; PGRST202 still builds the not-recordable line exactly once"
    requirement: "ENR-06"
    verification:
      - kind: unit
        ref: "node -e gate G4 (failed/NETWORK and pending resolutions)"
        status: pass
    human_judgment: false
  - id: D5
    description: "Every request settles within its timeout on a browser with fetch and no AbortController, and on one with it"
    requirement: "ENR-10"
    verification:
      - kind: unit
        ref: "node -e gate W1 (sbRequest sliced from app.js against a never-settling fetch, both capability profiles)"
        status: pass
    human_judgment: false
  - id: D6
    description: "submitEnrollment reports any 2xx as a written row, and a 409 with 23505 still routes to the amend path"
    requirement: "ENR-10"
    verification:
      - kind: unit
        ref: "node -e gate W2 (submitEnrollment sliced from app.js)"
        status: pass
    human_judgment: false
  - id: D7
    description: "Of two overlapping social proof reads resolved out of order, the newer one remains on screen and the superseded one writes nothing at all"
    requirement: "ENR-07"
    verification:
      - kind: unit
        ref: "node -e gate P1 (renderSocialProof sliced from app.js, second read resolved first)"
        status: pass
    human_judgment: false
  - id: D8
    description: "A toast fired inside the previous toast's 260ms fade window stays visible and carries the newer message"
    verification:
      - kind: unit
        ref: "node -e gate P2 (toast sliced from app.js against a fake clock)"
        status: pass
    human_judgment: false
  - id: D9
    description: "The Danish enrol.withdraw.confirm.q plus the new retry label still render on at most two lines at 320px without pushing the confirm control below the fold"
    verification: []
    human_judgment: true
    rationale: "UI-SPEC E5 long-text, and 03-DEVICE-PASS.md Table E's row. A rendered pixel on a 320px viewport cannot be measured from source; the gate proves the retry branch is taken and labelled, not that it fits."

duration: 33 min
completed: 2026-08-15
status: complete
---

# Phase 3 Plan 8: Withdrawal Isolation and Wire Termination Summary

**The in-flight withdrawal is isolated from the panel it lives in: a body-wide freeze, a mounted guard on every async continuation that writes state, a retry branch split from the missing-function branch, an sbRequest that settles whether or not its abort can fire, and generation tokens closing the two remaining stale-write races.**

## Performance

- **Duration:** 33 min
- **Started:** 2026-08-15T10:26:00Z
- **Completed:** 2026-08-15T10:59:00Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- **Gap 2 of `03-VERIFICATION.md` is closed.** `setWithdrawState` now disables every button in `#enrol-body`, not only the two inside the confirmation box. The edit and forget controls, each of which calls `refreshEnrollmentState()` and clears the host outright, are unreachable for the duration of the request. This is what makes CR-01(c) unreachable: the second `amend_enrollment` call carrying `p_withdrawn:false` cannot be started while the first carrying `true` is out.
- **`stillMounted(node)` added, and three continuations guarded with it.** `doWithdraw`, `handleSubmit` and `handleAmend` each return immediately when the node their answer belongs to has left the document. This closes CR-01(a) (a failure rendered into a detached subtree, so the guest gets no signal at all) and CR-01(b) (`store.set('enrolled','0')` written back after `forgetIdentity()` had removed it, which `identity.clear`'s own comment names as the residue a guest asked to have gone).
- **WR-04 closed.** `doWithdraw`'s pending branch sets `amendPending = true` before replacing the row, exactly as `handleAmend`'s equivalent already did, so the not-recordable explanation survives the next render instead of evaporating and handing the Withdraw button back.
- **WR-05 closed.** A wire failure no longer lands in the same terminal branch as `PGRST202`. The confirmation stays standing, the question becomes `enrol.fail.body`, the confirm control becomes `enrol.retry` and takes focus. `PGRST202` keeps the static line that says the registration is untouched. The dead `setWithdrawState(box,'idle')` that ran immediately before the row was destroyed is gone.
- **WR-08 closed.** `sbRequest` races the wire against a timeout that *resolves* rather than only aborting. On a browser with `fetch` and no `AbortController` the old timer fired into nothing, the fetch hung, neither branch ran, and `setFormState(form,'submitting')` was permanent with every typed value trapped behind it. Both written invariants (`no code path can leave the button locked`) are now true rather than asserted.
- **IN-04 closed.** `submitEnrollment` gates on `res.ok` instead of `res.status === 201`, so the three wire functions finally agree about what success is. The 409/`23505` branch is unmoved and unchanged; a 409 is not `ok`, so it reaches its own test exactly as before.
- **WR-09 closed.** `renderSocialProof` carries a module-scope generation token, claimed before the request and checked **above** `host.textContent = ''`. A superseded read writes nothing at all, so the block never flickers to empty and an older answer never replaces a fresher head count.
- **WR-03 closed.** `toast` holds its inner hide timer at module scope and clears both before setting either, so a message fired inside the previous fade window is not hidden on arrival.

## Task Commits

Each task was committed atomically:

1. **Task 1: One withdrawal, isolated from the panel it lives in, end to end** - `2813ed5` (fix)
2. **Task 2: The wire always terminates, and any 2xx is a written row** - `204d588` (fix)
3. **Task 3: Two more stale writes with the same shape, and the timer that eats a message** - `a96c3e2` (fix)

## Files Created/Modified

- `app.js` - the only file this plan touched. `setWithdrawState` (body-wide freeze), new `stillMounted`, `doWithdraw` (mounted guard, `amendPending`, split NETWORK branch), `handleSubmit` and `handleAmend` (mounted guards), `sbRequest` (`Promise.race` termination), `submitEnrollment` (`res.ok`), `renderSocialProof` (`proofSeq` token), `toast` (`toastHideTimer`).

No copy key was added, renamed or removed. `supabase/schema.sql`, `config.js`, `copy.js` and `styles.css` are untouched, and `enrollmentReady()` is unmodified per D-13.

## Verification Results

All nine plan-level checks were run from the repository root against the final file.

| # | Check | Result |
|---|---|---|
| 1 | G1: the freeze disables the edit and forget controls outside the box, and `idle` releases them | PASS |
| 2 | G2: detached continuation writes nothing; mounted continuation still writes | PASS |
| 3 | G3: `pending` leaves `amendPending` true | PASS |
| 4 | G4: NETWORK keeps the confirmation with the retry label and builds no pending line; `pending` builds it once | PASS |
| 5 | W1: `sbRequest` settles as NETWORK inside the timeout, with and without `AbortController` | PASS |
| 6 | W2: `submitEnrollment` returns ok for a 200; 409/`23505` still routes to amend | PASS |
| 7 | P1: the newer of two out-of-order reads survives, and the superseded one writes nothing | PASS |
| 8 | P2: a toast fired inside the fade window stays visible and carries the newer message | PASS |
| 9 | `node --check app.js`; zero forbidden constructs, debt markers, em or en dashes; all three copy tables at 156 keys with identical key sets | PASS |

**Every gate was proved to redden against the pre-change source before the fix landed.** `HEAD:app.js` was exported to a scratch directory outside the repository and the gates were run against it:

- G1 `freeze scope`, G2 `detached continuation still wrote`, G3 `amendPending not persisted`, G4 `NETWORK still builds the pending line`, G4 `no failure state`, G4 `no retry label` all reddened, while the paired controls (G2 mounted, G4 `pending`) stayed green.
- W1 reddened on both capability profiles (`never settled`) and W2 reported the 200 as `failed`, while the paired 409 control stayed green.
- P1 reddened on both halves (`the older read landed last`, `the superseded response wrote its own value`) and P2 reddened (`hidden on arrival`).

No file was added to the repository by any gate. `git status` is clean apart from the committed `app.js`.

## Decisions Made

- **The freeze is scoped to `#enrol-body`, with a fallback to the box.** The asymmetry with `setFormState` is the fix rather than an inconsistency: there the form is the whole body so nothing else is reachable; here the box is a sibling of controls that destroy it.
- **Escape is deliberately left outside the freeze.** It is a key press rather than a control, the block's own `keydown` listener already declines while `data-state` is `submitting`, and no second guard was added. UI-SPEC E5's "the confirmation never expires and Escape reverts it" holds unchanged.
- **The failure branch sets state before the labels.** `setWithdrawState(box,'failure')` re-seats the confirm label from `busy`, so the `enrol.retry` swap has to follow it, not precede it.
- **The `.withdraw-confirm__q` node keeps its `data-i18n`.** Removing or rewriting it was considered and rejected as dead work: a language switch runs `applyLanguage` then `renderEnrollment`, which rebuilds `#enrol-body` wholesale, so the failure box does not survive a switch for the attribute to matter.
- **Both toast timers are compared against `null` rather than tested for truthiness.** A timer id of `0` is falsy, and `if (toastTimer)` would silently skip its own clear.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The plan's P1 gate harness omitted `sbConfigured` from the evaluated slice's free variables**

- **Found during:** Task 3
- **Issue:** The task 3 `<verify>` command evaluates `renderSocialProof` with `new Function('$','sbRequest','CFG','recordRow','lang','document', ...)`. The shipped function's first statement is `if (!host || !sbConfigured()) return;`, and `sbConfigured` is neither a parameter nor a global in the harness process, so the call threw `ReferenceError: sbConfigured is not defined` before a single assertion ran. The gate was unrunnable against **any** version of the code, pre-change or post-change, and would have reported a false failure indistinguishable from a real one.
- **Fix:** Added `'sbConfigured'` to the harness parameter list and passed `function () { return true; }` as its argument. Nothing else in the gate was touched: the two P1 assertions, the P1 corollary and the P2 fake-clock sequence are byte-identical to the plan's. The shipped `renderSocialProof` was **not** changed to accommodate the harness.
- **Files modified:** None. The change is to a `node -e` invocation, not to repository source.
- **Verification:** With the amendment the gate reddened three times against the pre-change source (`the older read landed last`, `the superseded response wrote its own value`, `hidden on arrival`) and passes against the fix, which is exactly the behaviour the plan specifies for it.
- **Committed in:** n/a (gates add no file to the repository, by the plan's own contract)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No scope creep and no weakening. The single deviation repairs a gate the plan could not have run as written; the intent it asserts and the code it tests are unchanged.

## TDD Gate Compliance

Tasks 2 and 3 carry `tdd="true"`. This project has no test runner and, by the plan's explicit contract, gates add no file to the repository. There is therefore no `test(...)` commit to make: the RED artifact is a `node -e` invocation, not a file.

RED was observed and recorded before each fix, against `HEAD:app.js` exported to a scratch directory outside the repository:

- **Task 2 RED:** `W1 termination (no AbortController): never settled`, `W1 termination (with AbortController): never settled`, `W2 any 2xx: a 200 on the insert path is reported as failed`. GREEN: `204d588`.
- **Task 3 RED:** `P1 stale overwrite: the older read landed last`, `P1 stale overwrite: the superseded response wrote its own value`, `P2 toast collision: hidden on arrival`. GREEN: `a96c3e2`.

Task 1 is the tracer, and its feedback gate was run before either expansion task began: the full G1 to G4 gate plus the house-rules gate passed on the committed tracer, and was separately proved to redden on the pre-change source.

## Issues Encountered

- The P1 gate harness could not run as written. Documented in full under Deviations.
- No other issue. No fix-attempt limit was approached; every gate passed on its first run after the corresponding edit.

## User Setup Required

None - no external service configuration required. The `amend_enrollment` function this plan's branches depend on was applied and verified on the live database on 2026-08-15.

## Next Phase Readiness

- **Ready for 03-09.** WR-06, WR-07 and WR-01 are explicitly deferred to it, and all three live in `renderNudge` / `refreshEnrollmentState` / `forgetIdentity`, which this plan did not open beyond adding one guard to two form continuations.
- **Nothing owed to 03-07.** This plan touched `app.js` only; `supabase/schema.sql` and `config.js` are untouched, so the `enrollment.maxGuestsPerPerson` reconciliation is unaffected.
- **Still owed after this plan:** everything on `03-DEVICE-PASS.md` Tables A to F. Gate G4 proves the retry branch is taken and labelled; whether the Danish question plus the retry label still fits two lines at 320px without pushing the confirm control below the fold is Table E's row and is unanswered (tracked above as coverage item D9). WINDOWS entries 2, 4, 8 and 11 are unchanged by this plan.
- **No new stub, no skipped test, no unrun verify** was introduced by this plan.

---
*Phase: 03-enrollment-identity-and-the-group*
*Completed: 2026-08-15*
