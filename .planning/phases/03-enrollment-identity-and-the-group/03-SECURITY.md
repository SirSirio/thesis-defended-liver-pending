---
phase: 03-enrollment-identity-and-the-group
audited: 2026-08-17
asvs_level: 1
block_on: high
threats_total: 62
threats_closed: 59
threats_open: 2
threats_open_nonblocking: 1
accepted_risks: 10
status: blocked
register_authored_at_plan_time: true
---

# Phase 3 Security Verification

The register was authored at plan time: all nine `*-PLAN.md` files carry a parseable
`<threat_model>` block, so this audit verified that each declared mitigation is present in the
implementation. It did not scan for new threats.

**Threat IDs are keyed `{plan}:{id}` throughout, and that is not decoration.** IDs are not unique
across the nine plans. `T-03-35`, `T-03-36`, `T-03-37`, `T-03-38` and `T-03-39` each appear twice,
in different plans, with different categories and severities. The dangerous pair is
`03-06:T-03-38` (Denial of service, **high**, open) against `03-07:T-03-38` (Tampering, medium,
closed): keyed on the bare id, this file would report an open blocker as closed. Any future
re-audit must preserve the qualifier.

---

## Verdict

**BLOCKED.** Two high-severity threats are open. Phase advancement is blocked until
`threats_open` reaches 0.

Both open blockers are the same underlying gap, and it is an evidence gap rather than a code
defect. The structural work is present and verified in source; what is missing is the observation
on real hardware that both mitigations name as their evidence.

| Threat | Category | Sev | Expected mitigation | Actual |
|---|---|---|---|---|
| `03-02:T-03-09` | Denial of service | high | Measure the bar rather than guess it, verified on real hardware at four viewport sizes and recorded on `03-DEVICE-PASS.md` | **Half present.** The structural half is verified: `app.js:3638` sets `--nudge-h` from `bar.offsetHeight`, `app.js:3659-3661` re-measures through a ResizeObserver, `app.js:3667-3668` through `visualViewport`. The evidence half is absent: `03-DEVICE-PASS.md` Table A carries four of thirteen rows, and the four named viewport sizes are not among them. |
| `03-06:T-03-38` | Denial of service | high | "It is the first table on the device sheet. The phase does not reach a passed state while it is unanswered." | **Open by the plan's own admission.** `03-06-SUMMARY.md` records "Carried, and not pretended otherwise." `03-VERIFICATION.md` frontmatter still reads `status: human_needed`. Honest carry, not concealment, but open and blocking. |

Both close with one action: finish `03-DEVICE-PASS.md` Table A on real iOS Safari and real
Android Chrome, then re-run `/gsd-secure-phase 03`.

Partial progress on 2026-08-17: the owner ran a real-device pass and answered the first four
rows of Table A (countdown, address, door video, footer). The remaining nine rows are unanswered
and were deliberately not inferred from that pass, because rotation, the Danish two-line
re-measure, the dismiss jump, the post-dismiss toast and the four specific viewport sizes each
test behaviour a scroll-and-look pass does not exercise.

---

## Open, non-blocking

Below the `high` block threshold, so it does not gate advancement. It is a real reachable defect
rather than a documentation gap, and it is recorded here so it is not lost.

**`03-08:T-03-46` — Information disclosure, medium.** The declared mitigation is that the
`stillMounted` guard prevents `store.set('enrolled','0')` writing back a record that this device
was once used to register, after the guest has asked to be forgotten. The guard at `app.js:3143`
sits *below* the `ok`/`gone` branch that performs the write, so it does not cover this path. The
in-code justification offers a substitute mechanism, `setWithdrawState` freezing `#enrol-body`,
and the auditor falsified it by tracing a reachable route around the freeze:

1. A withdrawal is in flight, so every button inside `#enrol-body` is disabled.
2. The guest taps a language button in the page header, which is **outside** the frozen subtree.
3. `renderEnrollment` (`app.js:2429`) selects `body='return'`. Its early exit at `app.js:2464` is
   gated on `body === 'form'` only, so `host.textContent = ''` runs and `buildReturnPanel` mounts
   a **fresh, enabled** Forget button, because `panelButton` sets no `disabled`.
4. The guest taps Forget, `identity.clear()` runs, the in-flight continuation then resolves and
   writes the residue back.

Two ways to close it, and the choice is the owner's rather than the auditor's: move `stillMounted`
above the `store.set`, carrying a separate flag for the database-confirmed withdrawal so the
device cannot claim "registered" after the database accepted the withdrawal; or extend the freeze
to the language controls for the duration of the request.

---

## Closed: 59 of 62

Verified by running each declared gate and reading its actual output, not by reading the claim.
Highlights rather than the full table.

### Schema (`supabase/schema.sql`)

| Threat | Sev | Evidence |
|---|---|---|
| `03-07:T-03-35` | **critical** | `anon can view album` dropped at `:250`; `revoke select on public.photos from anon` at `:545`; `public.album` at `:517-522` projects `first_name, storage_path, created_at` only. Gate over all three view definitions counting `guest_id` returns **0**. On the wire: `GET /rest/v1/photos` answers `401 / 42501`, and `GET /rest/v1/album?select=guest_id` answers `400 / 42703`. The projection is the boundary and it holds. |
| `03-03:T-03-14` | high | `returns integer` `:459`, `security definer` `:461`, `set search_path = ''` `:462`, `where guest_id = p_guest_id` `:475`, and `revoke all ... from public` `:486` sits **before** `grant execute ... to anon` `:487`, with byte-identical argument lists. |
| `03-03:T-03-15` | high | `setof` count **0**; `returns table` count **0**. The function cannot hand back a row. |
| `03-03:T-03-16`, `03-07:T-03-39` | high | Comment-stripped `for select` count is **1**, and it is `:381` on `storage.objects`. There is no SELECT policy on `enrollments`. |
| `03-07:T-03-37` | high | The amend policy is dropped at `:232`; comment-stripped `for update` and `for delete` both count **0**. |
| `03-07:T-03-41` | high | Disposition `transfer`, and it is honored rather than merely documented: `storagePath()` mints a fresh uuid via `newGuestId()` and never reuses the identity uuid. |

### Client (`app.js`), gate battery re-run after today's three commits

`.innerHTML=` 0 · `.outerHTML=` 0 · `insertAdjacentHTML` 0 · `document.write` 0 · `eval`/`new Function` 0 ·
`Math.random` 0 · `'PATCH'` 0 · `'DELETE'` 0 · `Authorization` 0 · hardcoded `chat.whatsapp.com`/`wa.me` 0 ·
`target="_blank"` sites **5** with `rel="noopener"` sites **5**, at parity.

Notable closures: every guest string reaches the DOM through `createElement` plus `textContent`
(`03-01:T-03-01`, `03-04:T-03-21`, `03-05:T-03-31`); `amendEnrollment` branches on the returned
integer and on `PGRST202`, never on a status code (`03-01:T-03-07`); `deadlinePassed()` is read by
both `renderDeadline` and `renderNudge` above bucketing, so the hero line and the bar cannot
contradict each other (`03-09:T-03-51`, `03-09:T-03-53`).

### Regression check on today's three commits

1. **`whatsapp.inviteUrl` now live.** All four newly-reachable paths carry `target="_blank"` **and**
   `rel="noopener"`, the href is `CFG.whatsapp.inviteUrl` verbatim, and no host is hardcoded.
2. **The inline SVG mark.** `waGlyph()` clones from a static `<template>` via
   `tpl.content.firstElementChild.cloneNode(true)`; the label moved to a `span[data-i18n]` written
   with `textContent`. No markup insertion was introduced.
3. **`.github/workflows/pages.yml`.** No `pull_request_target`, no `run:` steps, and the sole
   interpolation is `${{ steps.deployment.outputs.page_url }}`, a trusted action output. No
   workflow-injection vector. `contents: read` / `pages: write` / `id-token: write` is the
   documented minimum for the OIDC Pages flow and is not over-permissioned.

---

## Accepted risks

Ten, each verified against its written rationale in the owning plan's `<threat_model>`.

| Threat | Sev | Why it is accepted |
|---|---|---|
| `03-01:T-03-06` | medium | No client-side rate limit is possible on a static site with a public insert policy. Accepting this is the cost of having no server. |
| `03-02:T-03-12` | low | |
| `03-03:T-03-18` | medium | |
| `03-03:T-03-20` | low | |
| `03-04:T-03-25` | low | |
| `03-05:T-03-29` | medium | |
| `03-07:T-03-43` | medium | |
| `03-08:T-03-50` | low | Re-verified: `apikey` only with no `Authorization` header, `return=minimal` retained, and the withdraw body carries two arguments. |
| `03-09:T-03-56` | low | |
| `T-03-SC` (×9) | low | One distinct accepted risk, restated in all nine plans. See the amendment note below. |

---

## Unregistered flags

Not blockers. Recorded because no register row covers them.

1. **The ID collision**, described at the top of this file. It is a live reporting hazard, not a
   theoretical one.
2. **`T-03-SC` needs amending.** It asserts "no package manager, no lockfile, no build step, and
   the only third-party runtime surface is the PostgREST endpoint." That was true when it was
   written and is no longer: `.github/workflows/pages.yml` pulls four `actions/*` at floating
   major tags (`@v4`, `@v5`, `@v3`, `@v4`). They are first-party GitHub-published so the risk is
   low, but this is build-time third-party surface the threat explicitly claims does not exist.
   Either SHA-pin the actions or amend the wording. Leaving both as they are is the one option
   that makes the register wrong.
3. **`path: '.'` publishes the whole repository root** as the Pages artifact, so `.planning/`,
   `.gsd/`, `supabase/schema.sql` and `tools/` are served at predictable URLs. The confidentiality
   delta is about zero, because the repository is public by design and the publishable key is
   committed deliberately. An observation, not a gap.
4. **The dropped UPDATE policy has no wire signature** on this schema, recorded honestly at
   `03-07-SUMMARY.md:87`. The declared mitigation is the source gate and the source gate passes,
   so `03-07:T-03-37` is closed. Only the dashboard proves the live database ran the drop, which
   is worth carrying forward.

---

## Audit trail

### Security Audit 2026-08-17

| Metric | Count |
|---|---|
| Threats found | 62 |
| Closed | 59 |
| Open, blocking | 2 |
| Open, non-blocking | 1 |
| Accepted risks | 10 |
| Unregistered flags | 4 |

Scope note: this audit ran after the same day's three commits (the WhatsApp invite link, the
inline SVG handoff, and the Pages deploy workflow), and all three were regression-checked rather
than assumed out of scope.
