---
phase: 03-enrollment-identity-and-the-group
verified: 2026-08-15T12:19:36Z
status: human_needed
score: 4/8 scope truths verified
behavior_unverified: 4
overrides_applied: 0
requirements:
  total: 33
  satisfied: 24
  unchecked: 9
re_verification:
  previous_status: gaps_found
  previous_score: 2/8
  gaps_closed:
    - "Supabase project setup, tables, row level rules (shared with phase 4) — gap 1, closed by 03-07 and re-probed first-hand here"
    - "Returning guest sees their own registration, and can edit or withdraw it (ENR-06) — gap 2, closed by 03-08 plus the CR-02/CR-03 regression fixes, driven behaviorally here"
    - "Nudge bar with its two states, plus the deadline framing (NDG-07) — gap 3, closed by 03-09 plus the WR-01 regression fix, swept behaviorally here"
  gaps_remaining: []
  regressions:
    - "None in source. One process regression found: the gap-closure code review report was never written to disk (see finding N-01 below). Not a code defect and not a scope truth, so it does not change the status, which is human_needed on the device pass regardless."
gaps: []
deferred: []
behavior_unverified_items:
  - truth: "Enrollment form: name, guest count, optional note, validation on blur (ENR-09, ENR-10)"
    test: "On real iOS Safari with VoiceOver and real Android Chrome with TalkBack: blur a name field that was typed into and then cleared; submit with airplane mode on"
    expected: "The field error is DESCRIBED when the control takes focus and is not announced over the guest; the submit failure is ANNOUNCED immediately through the alert banner; every typed value survives the failure; the submit button never stays locked"
    why_human: "aria-describedby versus role=alert politeness is a runtime property of a real assistive stack, and a genuine network fault cannot be simulated in source. Table B of 03-DEVICE-PASS.md is entirely unrun. The one half of this that WAS desk-closable — the button locked forever on a browser with fetch but no AbortController — is fixed and verified in source (sbRequest now races a resolving timeout)"
  - truth: "Confirmed count as social proof, optional first-name attendee list (ENR-07, ENR-08)"
    test: "Once eight people have registered, load the page and read the Expected attendance block"
    expected: "Two rows in the fact table's grammar, the total in tabular figures, first names only, comma separated, sorted with the Danish extra vowels after z"
    why_human: "The live count is 1 against a threshold of 8, so the block's correct state today is absent. It has never rendered. The arithmetic is verified against the live wire body but not a rendered pixel"
  - truth: "WhatsApp group handoff, presented the instant enrollment succeeds (WA-02, WA-03, WA-04, WA-06)"
    test: "Set whatsapp.inviteUrl, then on a phone with WhatsApp installed enrol and tap the success panel CTA, then the #wa section CTA. Separately, with the link still null, read the success panel"
    expected: "Each CTA opens the WhatsApp app rather than a browser page on the first tap; the bar stops asking after either; with no link the success panel reads as complete and deliberate rather than as a gap"
    why_human: "whatsapp.inviteUrl is null by design and is the shipping state, so the configured path cannot be demonstrated at all. Whether the linkless panel reads as deliberate is a visual judgment nobody has made"
  - truth: "Nudge bar with its two states, plus the deadline framing (NDG-01, NDG-02)"
    test: "Tables A and F of 03-DEVICE-PASS.md, on real iOS Safari and real Android Chrome at 320x568, 375x667, 390x844 and 430x932"
    expected: "The bar is pinned to the bottom of the viewport in both data-state values; each of the countdown clock, the address value and the door video slot can be scrolled clear of the bar; the footer's last line is fully visible at maximum scroll"
    why_human: "The deadline ladder half of this truth is now closed and verified behaviorally (see Behavioral Spot-Checks). The layout half is not: the bar has never rendered on any device in the life of this site, and every row depends on env(safe-area-inset-bottom) or on iOS Safari's collapsing toolbar, neither of which exists at a desk"
human_verification:
  - test: "Tables A to F of .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md, on real iOS Safari and real Android Chrome"
    expected: "Every row carries a result. In particular Table A: with the bar shown at 320x568, 375x667, 390x844 and 430x932, each of the countdown clock, the address value and the door video slot can be scrolled clear of the bar, and the footer's last line is fully visible at maximum scroll"
    why_human: "NDG-02 is the highest risk item in the phase. The nudge bar has never rendered on any device, and the reserve it replaced was short by up to 27px on a notched iPhone. Every row depends on env(safe-area-inset-bottom) or on iOS Safari's collapsing toolbar, neither of which exists at a desk"
  - test: "NDG-01: load the site on both phones and look at the bar"
    expected: "The bar is pinned to the bottom of the viewport in both data-state values, enrol and group"
    why_human: "Both states are driven and confirmed in code; nothing has been seen pinned to a real screen"
  - test: "ENR-06 on a device: withdraw a registration on a phone, then repeat with airplane mode turned on mid-request"
    expected: "The confirmation shows the submitting state, focus lands where the panel says it does, and the airplane-mode attempt leaves the confirmation standing with the retry label rather than removing the control"
    why_human: "The state machine is now driven branch by branch at the desk against the shipped source and every branch terminates correctly (see Behavioral Spot-Checks). What that cannot show is focus behaviour, screen-reader announcement, and a real dropped packet. Table F of 03-DEVICE-PASS.md is unrun"
  - test: "DSG-05 observed half: turn Reduce Motion on at the OS level and drive the form"
    expected: "The sweep bar is static at full width and 0.35 opacity rather than stranded part way across; the form to success panel swap is instant; the :active scale is instant; the bar's slide is instant"
    why_human: "The two reduced-motion blocks are declared correctly and gated in source, but the observed half needs the OS setting on and a screen"
  - test: "DEL-02, DEL-03: enrol end to end on a mid-range phone on mobile data, not wifi"
    expected: "Under ten seconds, on iOS Safari and Android Chrome, and no viewport zoom when the name field takes focus"
    why_human: "The roadmap's Done-when sentence opens with this clause and it is unmeasured. Carried over from phase 2, where WINDOWS entry 1 records the same debt"
  - test: "Table D of 03-DEVICE-PASS.md: measure the three declared-short touch targets on a coarse pointer"
    expected: "The name input, the guest-count segment and the select overflow branch measure at least 52px per 03-UI-SPEC.md Touch Target Geometry"
    why_human: "styles.css still declares 48px with no coarse override at lines 421, 1274 and 1369. 48px clears the 44px floor, so this is a shortfall against the phase's own stricter contract rather than an accessibility failure. Deliberately deferred to the same moment Table D is answered (WINDOWS entry 10, deferred-items.md)"
  - test: "Decision needed, not a test: N-01 below. Either regenerate the gap-closure code review as a file, or record in deferred-items.md that its findings live only in commit messages"
    expected: "The five findings the commits 2d5a961, 93f74fe, 6ce6c93, d6a2ac2 and e84d93d name (CR-01 to CR-03, WR-01, WR-02 in the gap-closure ID space) have a written record somewhere, and deferred-items.md's claim to account for every review finding is either true or corrected"
    why_human: "The fixes themselves are present and verified. What is missing is the artifact, and whether that matters before phase 4 is a judgment about this project's audit trail, not something a probe can settle"
---

# Phase 3: Enrollment, Identity, and the Group — Verification Report

**Phase Goal:** The host knows who is coming. Moved ahead of photos because headcount is time
sensitive and photos are not.
**Done when:** a guest on a phone enrols in under 10 seconds, lands in the WhatsApp group with
one more tap, and is never nudged again.
**Verified:** 2026-08-15T12:19:36Z
**Status:** human_needed
**Re-verification:** Yes — after gap closure (plans 03-07, 03-08, 03-09) and a five-finding
regression fix round

---

## Verdict in one paragraph

**All three gaps are closed, and each was re-derived here rather than read off a summary.**
Gap 1 is closed on the live wire: the direct read of `public.photos` now answers 42501 where it
answered 200, `public.album` answers in its place and structurally cannot be asked for
`guest_id`, the guest bound refuses 5, and — the probe that matters most and the one this round
added — a photo insert now reaches the not-null check on `name` (23502) instead of being refused
42501 by a trigger that could not read its own table. Gap 2 is closed and was **driven**, not
read: the shipped `doWithdraw`, `setWithdrawState`, `stillMounted` and `withdrawBox` were sliced
out of `app.js` verbatim and run through all four result branches crossed with mounted and
torn-down, and every cell came out right — the durable write happens above the mounted guard, the
pending branch releases the body-wide freeze, and the wire failure keeps the control with a retry
label. Gap 3 is closed and was swept, not sampled: 25,922 clock positions across both the `Intl`
path and the `Intl`-throws catch path, in four device timezones, produce **zero** negative zeros,
**zero** disagreements between the bar and the hero line, and a `closes today` branch that is now
reachable while registration is open. The score moves from 2/8 to 4/8. **It does not move to 8/8,
and no desk evidence can move it there**: four of the eight truths assert things that have never
rendered on any screen, and the largest of them, NDG-02, is unchanged since the last report. One
new finding, rated below and not a code defect: the gap-closure code review that produced this
round's five fixes was never written to disk.

---

## Goal Achievement

### Observable Truths

Derived from the eight ROADMAP scope bullets, which is what the phase goal decomposes into. The
register is carried forward unchanged from the previous report so the two are comparable.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Supabase project setup, tables, row level rules (shared with phase 4) | ✓ VERIFIED *(was ✗ FAILED)* | Eight live probes re-run first-hand, none inherited. `GET /rest/v1/photos` → **401 / 42501** (was 200). `GET /rest/v1/album?select=first_name,storage_path,created_at` → 200 `[]`; `?select=guest_id` → **400 / 42703**. `GET /rest/v1/enrollments` → 200 `[]` (control). `GET /rest/v1/attendees` → the one live row. RPC answers `0`/200. `extra_guests: 5` → **400 / 23514**. `POST /rest/v1/photos` with no name → **400 / 23502**, so the trigger ran and the constraint caught it. Nothing written by any probe, re-confirmed by a read-back |
| 2 | Enrollment form: name, guest count, optional note, validation on blur (ENR-01..03, ENR-09, ENR-10) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Unchanged from the previous report except that its one desk-closable defect is fixed: `sbRequest` now returns `Promise.race([wire, timeout])` with the timeout **resolving** rather than only aborting, so a browser with `fetch` and no `AbortController` can no longer leave the submit button locked forever. The assistive and real-network halves still need hardware. Table B unrun |
| 3 | Enrollment doubles as identity capture, so no separate name prompt exists anywhere (ENR-04, ID-01..06) | ✓ VERIFIED | Regression check re-run: zero `<input` in `index.html`, exactly two `createElement('input')` in `app.js` (one text, one radio), zero `prompt(`, `confirm(` or `alert(` in any guest-facing file. Identity module unchanged |
| 4 | Returning guest sees their own registration, and can edit or withdraw it (ENR-05, ENR-06) | ✓ VERIFIED *(was ✗ FAILED)* | Driven, not read. See the Behavioral Spot-Checks table: 8 branch/teardown combinations, all correct. `setWithdrawState` freezes `$$('button', $('#enrol-body'))`; the return panel contains **only** `<button>` controls (re-derived by reading `buildReturnPanel`), so the button-only selector is sufficient there. The ok/gone branch writes `enrolled`, `withdrawnShown` and calls `refreshEnrollmentState()` **above** the `stillMounted` guard. The pending branch calls `setWithdrawState(box,'idle')` **above** its own `if (!row) return`. The freeze is released on every mounted branch, and on the ok/gone branch by `renderEnrollment`'s rebuild, whose early exit is gated on `body === 'form'` and so cannot preserve a frozen panel |
| 5 | Confirmed count as social proof, optional first-name attendee list (ENR-07, ENR-08) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Unchanged, plus WR-09 fixed: `var seq = ++proofSeq` before the request and `if (seq !== proofSeq) return` **above** `host.textContent = ''`, which is the correct placement — a token checked one line later would still blank a fresher answer. Live total is 1 against a threshold of 8, so the block has never rendered |
| 6 | WhatsApp group handoff, presented the instant enrollment succeeds (WA-01..06) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Unchanged. `whatsappButton()` returns `null` for a falsy link; `renderNudge` reads the same key; `#wa` ships `hidden` at `index.html:254`. `inviteUrl` is `null` by design (D-37), so WA-02, WA-03, WA-04 and WA-06 cannot be demonstrated |
| 7 | Nudge bar with its two states, plus the deadline framing (NDG-01..08) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | **The deadline half is now closed.** `daysUntil` has zero occurrences in `app.js`; `deadlinePassed()` is read by `renderDeadline` at :3386 and by `renderNudge` at :3416, above the bucketing in both. 25,922-sample sweep: zero `-0`, zero bar/hero contradictions, `nudge.enrol.today` reachable 410 times while open. **The layout half is not closed and cannot be at a desk**: NDG-01 and NDG-02 have never rendered on any device |
| 8 | Graceful unconfigured state, so this ships before credentials exist (ENR-12) | ✓ VERIFIED | Regression check: `renderEnrollment` still branches to `pending` on `!sbConfigured() \|\| !IDENTITY_OK` at app.js:2360, and `host.textContent = ''` at :2391 discards the static pending markup. No `#enrol-form` exists in that state, so `enrollmentReady()` is false and the bar stays down |

**Score:** 4/8 truths verified (4 present, behavior-unverified; 0 failed) — up from 2/8.

### What would have to be true for each verified truth to be wrong

Stated deliberately, because this phase has recorded seven verification gates anchored to the
implementation rather than to intent and this report is the eighth opportunity.

| # | The system fails if... | Would my evidence catch it? |
|---|---|---|
| 1 | The photos read is still open / the album leaks the credential / the bound was never applied / the trigger cannot count | Yes to all four, and each by a **stated non-200 expectation** rather than by a 200: 42501, 42703, 23514, 23502. A blocked read on this schema answers `[]`/200, so a 200 would have proved nothing |
| 1 | The dropped `anon can amend own enrollment` policy is still live | **Only by inference, and the inference is stated.** A `PATCH` answers 204 with zero rows both before and after the drop, so there is no request that distinguishes them — I re-ran it and confirmed it distinguishes nothing. What does hold: probe E proves the file's **last** statement (line 470) took, and probe F proves section 4 (line 213) took after the most recent correction; the drop at line 170 sits between them in a single pasted script, and Postgres stops at the first error. Reaching line 470 requires having executed line 170 |
| 4 | The mounted guard sits above the durable write, so a language switch mid-withdrawal throws away a withdrawal the database accepted | Yes. Rows 1 and 3 of the spot-check table run the ok and gone branches **with the panel torn down** and read `enrolled` back out of the store. Both write `'0'` |
| 4 | The pending branch leaves the whole panel disabled for the life of the page | Yes. Row 5 counts the disabled buttons after settle: `0/2` |
| 4 | A control outside the freeze can still tear the box down | Partly. The freeze is `button`-only; I read `buildReturnPanel` and confirmed it builds no anchors, so nothing on that panel escapes. The **language buttons in the page header do** escape, deliberately, and the ok/gone unconditional write is the answer to that — which is the previous row |
| 7 | `calendarDaysUntil` reproduces `-0` down the `Intl`-throws catch path | Yes, and this was checked specifically because the WR-01 fix changed that fallback. The catch path builds `Date.UTC(y, m, d)` from **local date parts** and subtracts two exact midnights, so it is a calendar difference and its quotient is an exact integer; `Math.round` of an exact integer cannot be `-0`. Confirmed empirically at 12,961 clock positions on the catch path alone, in four timezones. The 03-09 summary's key-decision text still says the fallback "can still yield negative zero" — that text predates the fix and is stale; the comment at app.js:3328 is the correct one |
| 8 | An unconfigured deploy renders a form | Yes — the branch is read directly and `enrollmentReady()` tests `$('#enrol-form')` |

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app.js` | body-wide freeze, mounted guard, split failure branches, one close test, one calendar day function | ✓ VERIFIED | Parses clean under `node --check`. Exactly one definition each of 22 checked functions, zero merge-conflict markers — 03-08's and 03-09's separate-worktree edits are mutually coherent. Zero `innerHTML` / `outerHTML` / `insertAdjacentHTML` / `document.write` / `eval(` / `new Function` / `console.` |
| `supabase/schema.sql` | sections 9 and 10, section 3's two drops, section 4 with definer rights | ✓ VERIFIED | 496 lines. `create policy` appears 4 times and none of them is a read on `enrollments` or a direct read on `photos`. `revoke select on public.photos from anon` ×1, never `revoke all`. `security definer` on both `enforce_photo_limit` and `amend_enrollment`; `set search_path = ''` on all three functions. The STATUS header records four separate applications and is honest about the one half still unproven |
| `config.js` | `maxGuestsPerPerson` reconciled and documented | ✓ VERIFIED | Value unchanged at 2 since phase 1; the only edit is a comment naming the database bound as the floor. `deadline` unchanged since phase 1 at `2026-09-26T23:59:00+02:00` — confirmed by `git log -L` rather than assumed |
| `copy.js` | key parity maintained after the gap-closure round | ✓ VERIFIED | Loaded under Node: en 156 / it 156 / da 156, zero missing, zero extra. All eight `nudge.*` keys present including `nudge.enrol.today`, which is now reachable |
| `styles.css` | reserve consumers intact, `.group-cta` removed | ✓ VERIFIED | `--nudge-h` read at :70, :1124, :1158 and written once at app.js:3495. `group-cta` now has zero occurrences in all three files (IN-02 of the earlier review, applied) |
| `index.html` | `#enrol-body`, `#enrol-proof`, `#wa` hidden, `#nudge` | ✓ VERIFIED | All four present; `#wa` still ships `hidden` |
| `03-DEVICE-PASS.md` | Table G re-anchored | ✓ VERIFIED | The zero row is re-anchored to a positive offset and the old anchoring is written into the sheet as the seventh broken gate, named as such |
| `deferred-items.md` | disposition ledger | ⚠️ PARTIAL | Accounts for all 19 findings of the **pre-gap-closure** review and both Info rows of the previous verification. It does not, and cannot, cover the gap-closure review's four Info findings — see N-01 |
| `03-REVIEW.md` | the gap-closure code review | ✗ **MISSING** | The file on disk is byte-for-byte the pre-gap-closure review (identical to `03-REVIEW-pre-gap-closure.md` modulo line endings). Commit `69bbf9c` added the archive copy and did not replace the original. See N-01 |

### Key Link Verification

Re-checked, with the links the gap-closure round created added at the bottom.

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `renderDeadline()` | `deadlinePassed()` | one close test, replacing an inline comparison | ✓ WIRED | app.js:3386 |
| `renderNudge()` | `deadlinePassed()` | called **above** the day bucketing | ✓ WIRED | app.js:3416, three lines before the bucket at :3431 |
| both surfaces | `calendarDaysUntil()` | one day function | ✓ WIRED | :3390 (hero urgency) and :3431 (bar ladder). Zero occurrences of `daysUntil` |
| `setWithdrawState()` | `#enrol-body` | `$$('button', body \|\| box)` | ✓ WIRED | app.js:2964-2965. Falls back to the box when the host is missing |
| `doWithdraw()` continuation | `stillMounted(box)` | placed **below** the two durable branches | ✓ WIRED | Durable writes at :3039-3045, guard at :3054 |
| `doWithdraw()` pending branch | `setWithdrawState(box,'idle')` | placed **above** the `parentNode` early return | ✓ WIRED | :3074 above :3076-3077 |
| `handleSubmit` / `handleAmend` | `stillMounted(form)` | guard on the cosmetic call only, never on the durable write | ✓ WIRED | :2661, :2722, :2732 are `if (stillMounted(form)) setFormState(...)`; :2669 and :2739 guard only the failure banner |
| `sbRequest()` | its own timeout | `Promise.race([wire, timeout])`, timeout **resolves** | ✓ WIRED | :1291-1298, :1326-1329 |
| `renderSocialProof()` | `proofSeq` | token checked above `host.textContent = ''` | ✓ WIRED | :2464, :2476, :2480 in that order |
| `hideNudge()` | `nudgeShowFrame` | `cancelAnimationFrame`, compared against `null` | ✓ WIRED | :3566 |
| `toast()` | `toastHideTimer` | nested timer held at module scope | ✓ WIRED | :3610, :3625, :3635-3636 |
| `forgetIdentity()` | `withdrawnShown` | fourth flag reset, focus landed | ✓ WIRED | :2825 reads it before clearing, :2834 resets, :2838-2844 lands focus |
| `app.js` album read | `public.album` | *(phase 4 owns the call site)* | n/a | No album read exists in `app.js` yet, correctly — 03-07 hands the precondition to phase 4 |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| Return panel receipt | `storedRecord()` | `localStorage`, by design (D-02/D-03) | Yes | ✓ FLOWING |
| Social proof count and names | `res.body` | `GET /rest/v1/attendees` | Yes — live body `[{"first_name":"Sirio","extra_guests":0,...}]` | ✓ FLOWING |
| Deadline line and fact row | `deadlineMs` | `config.enrollment.deadline` | Yes | ✓ FLOWING |
| Nudge bar copy | `calendarDaysUntil(deadlineMs)` + `deadlinePassed()` | the clock, in Europe/Copenhagen | Yes, and now correct in every bucket | ✓ FLOWING *(was ⚠️)* |
| `#wa` section CTA | `config.whatsapp.inviteUrl` | config, currently `null` | Correctly absent | ✓ FLOWING (null branch) |
| Album read path | — | `public.album` exists and answers `[]` | Correctly empty; phase 4 writes the rows | ✓ FLOWING (empty) |

### Behavioral Spot-Checks

Every check below runs the **shipped source**, sliced out of `app.js` by line range with no branch
condition re-typed. None of the PLAN files' own gates was reused: two are known broken and one is
hour-dependent.

**B1. The withdrawal state machine.** `withdrawBox` (2872-2882), `stillMounted` (2896-2900),
`setWithdrawState` (2960-2972) and `doWithdraw` (3010-3103) extracted verbatim and run in a
mini-DOM, four result branches crossed with panel-survives / panel-torn-down.

| branch | panel torn down | buttons frozen during | still disabled after | `enrolled` | `amendPending` | `withdrawnShown` | refresh called | box state | row content | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| ok | no | 4/4 | 4/4 (stub) | `'0'` | false | true | 1 | submitting | — | ✓ |
| ok | **yes** | 4/4 | 4/4 (detached) | **`'0'`** | false | **true** | **1** | submitting | — | ✓ **CR-02 fix: the durable write survives teardown** |
| gone | no | 4/4 | 4/4 (stub) | `'0'` | false | true | 1 | submitting | — | ✓ |
| gone | **yes** | 4/4 | 4/4 (detached) | **`'0'`** | false | **true** | **1** | submitting | — | ✓ |
| pending | no | 4/4 | **0/2** | `'1'` | **true** | false | 0 | **idle** | `[pending line]` | ✓ **CR-03 fix: the freeze is released** and **WR-04 fix: `amendPending` persists** |
| pending | yes | 4/4 | 4/4 (detached) | `'1'` | false | false | 0 | submitting | — | ✓ no-op into a live document |
| failed | no | 4/4 | **0/4** | `'1'` | false | false | 0 | **failure** | `[enrol.fail.body][enrol.retry]` | ✓ **WR-05 fix: the control survives with a retry label** |
| failed | yes | 4/4 | 4/4 (detached) | `'1'` | false | false | 0 | submitting | — | ✓ no-op into a live document |

The `4/4` in the "frozen during" column is the load-bearing one: the four buttons are the two
inside the confirmation box **and the edit and forget controls in the sibling `.panel__acts`**.
The previous report's CR-01(b) and CR-01(c) — storage residue after forget, and two contradictory
RPCs racing the same row — are both unreachable while those two are disabled.

The "4/4 still disabled" cells on the ok/gone rows are a **harness artifact**: my
`refreshEnrollmentState` is a stub. I closed that hole by reading `renderEnrollment` directly —
its form-preserving early exit is gated on `body === 'form'`, and a withdrawal selects
`body = 'withdrawn'`, so `host.textContent = ''` runs and every frozen button is discarded.

**B2. The deadline ladder.** `deadlinePassed` (3307-3309) and `calendarDaysUntil` (3337-3362)
extracted verbatim, driven against the committed deadline `2026-09-26T23:59:00+02:00` with a
proxied clock.

| offset from deadline | `passed` | days | `-0`? | bar | hero |
|---|---|---|---|---|---|
| deadline + 2 days | true | -2 | no | hidden (close test) | hidden |
| deadline + 1 hour | true | -1 | no | hidden (close test) | hidden |
| deadline + 1 ms | true | 0 | **no** | hidden (close test) | hidden |
| deadline − 1 ms | false | 0 | no | `nudge.enrol.today` | shown, urgent |
| deadline − 8 h | false | 0 | no | `nudge.enrol.today` | shown, urgent |
| deadline − 23 h | false | 0 | no | `nudge.enrol.today` | shown, urgent |
| deadline − 25 h | false | 1 | no | `nudge.enrol.last` | shown, urgent |
| deadline − 2 d | false | 2 | no | `nudge.enrol.soon(2)` | shown, urgent |
| deadline − 7 d | false | 7 | no | `nudge.enrol.soon(7)` | shown, urgent |
| deadline − 8 d | false | 8 | no | `nudge.enrol.text` | shown |
| deadline − 40 d | false | 40 | no | `nudge.enrol.text` | shown |

Identical on the `Intl`-throws catch path.

| Sweep | Command | Result | Status |
|---|---|---|---|
| Every ladder position, −3 d to +60 d, 7-minute steps, **both** `Intl` paths | `node ladder.mjs` | 25,922 samples: **0** negative zeros, **0** bar/hero contradictions, `nudge.enrol.today` reachable **410** times **while registration is open** | ✓ PASS |
| Same sweep under `TZ=Pacific/Auckland`, `America/Los_Angeles`, `UTC` | `TZ=… node ladder.mjs` | 0 / 0 in all three. `today` count shifts to 393 under UTC, which is the catch path degrading the zone and nothing else | ✓ PASS |
| Sources parse | `node --check app.js copy.js config.js` | clean | ✓ PASS |
| Copy tables at parity | Node: load `copy.js`, diff key sets | en 156 / it 156 / da 156, zero missing, zero extra | ✓ PASS |
| Zero em and en dashes (DSG-06) | Node: `/[–—]/` over six files | 0 in every file, `supabase/schema.sql` included | ✓ PASS |
| No markup strings, no logging | grep 6 patterns × 5 files | 0 hits everywhere | ✓ PASS |
| No separate name prompt (ENR-04) | grep for inputs and native dialogs | one text input, one radio, zero dialogs | ✓ PASS |
| `daysUntil` deleted | `grep -c "daysUntil" app.js` | **0** | ✓ PASS |
| Worktree coherence | 22 function names, `grep -c "function X("` | exactly 1 each; zero conflict markers | ✓ PASS |
| Enrollment end to end on a phone | — | no device, no build step, no harness (locked constraint) | ? SKIP → human |

### Probe Execution

Run first-hand from this verification against project `aplaxdplwnnlezffatal` with the committed
publishable key. Not inherited from any summary and not from the task brief.

| Probe | Command | Result | Status |
|---|---|---|---|
| **A. Photos read path** | `GET /rest/v1/photos?select=*` | **HTTP 401** `{"code":"42501","message":"permission denied for table photos"}` | ✓ **PASS — gap 1's headline, closed.** Was HTTP 200 |
| **B1. Album view answers** | `GET /rest/v1/album?select=first_name,storage_path,created_at` | HTTP 200 `[]` | ✓ PASS. Was HTTP 404 |
| **B2. Album cannot be asked for the credential** | `GET /rest/v1/album?select=guest_id` | HTTP 400 `42703 column album.guest_id does not exist` | ✓ PASS — the only projection claim that survives an empty table |
| **C1. Raw enrollments stays blocked** | `GET /rest/v1/enrollments?select=*` | HTTP 200 `[]` | ✓ PASS (control) |
| **C2. Attendees view still answers** | `GET /rest/v1/attendees?select=*` | HTTP 200, one row, `Sirio` | ✓ PASS (control) |
| **D. Amend RPC still live** | `POST /rest/v1/rpc/amend_enrollment` with an unmatched uuid | HTTP 200, body `0` | ✓ PASS — zero-row by construction, touches no registration |
| **E. Guest bound reconciled** | `POST /rest/v1/enrollments {extra_guests: 5}` | HTTP 400 `23514 enrollments_extra_guests_check` | ✓ PASS — rejected, nothing written |
| **F. Photo insert path** | `POST /rest/v1/photos` with no `name` | HTTP 400 **`23502` not-null on `name`** | ✓ **PASS — the trigger ran.** Before the section 4 correction the same request answered `42501` before any column was looked at. Proves owner's rights without writing a row |
| **G. Dropped UPDATE policy** | `PATCH /rest/v1/enrollments?guest_id=eq.…` | HTTP 204, no body | **INCONCLUSIVE, by construction.** 204 both before and after the drop. Recorded so nobody later reads it as proof. The drop is established by the whole-file-run inference above instead |
| **Read-back after the write attempts** | `GET /rest/v1/attendees`, `GET /rest/v1/album` | one row / `[]`, unchanged | ✓ PASS — probes E and F wrote nothing |

---

## Requirements Coverage

All 33 ROADMAP requirement IDs are claimed across the nine plans' `requirements` frontmatter,
verified by extracting every plan's list and taking the union. **No orphaned requirements.**

### Satisfied — 24 IDs (was 22)

| ID | Evidence |
|---|---|
| **ENR-06** | **Moves to satisfied.** Gap 2 closed and driven branch by branch: the freeze reaches every control on the panel, the durable write survives teardown, the pending branch releases the freeze and persists its explanation, and the wire failure keeps the control with a retry label |
| **NDG-07** | **Moves to satisfied.** Gap 3 closed and swept: the escalation is in the copy only, every branch renders in the meaning its string claims, and the two surfaces read one close test |
| ENR-01 | `buildForm()` builds name and guest count |
| ENR-02 | `buildNoteControl()` with a 500 bound; empty coerced to `null` |
| ENR-03 | `POST /rest/v1/enrollments` with the key in `apikey` only; now gated on `res.ok` rather than an exact 201 |
| ENR-04 | The only text input in the codebase is the enrollment name field. Zero dialogs |
| ENR-05 | `buildReturnPanel()` renders from storage, never from a fetch |
| ENR-08 | `attendees` truncates server side; `album` now does the same for the other table |
| ENR-11 | Head count and who-dropped-out queries adjacent in the closing owner block |
| ENR-12 | Both blank-credential and no-crypto paths land in the pending block |
| ENR-13 | `guest_id unique`, submit locked for the request, and the bound now reconciled at 4 in both places and proved on the wire |
| ID-01 | Identity captured by the enrollment form and by nothing else |
| ID-02 | v4 uuid minted and written before the request leaves |
| ID-03 | `enrol.return.lede` greets by name from storage |
| ID-04 | `startEdit()` re-mounts prefilled; `forgetIdentity()` now removes every key **and** resets all four session flags |
| ID-05 | Withdrawal keeps `guest_id` and `name` deliberately (D-15) |
| ID-06 | `store.mem` fallback behind the same interface |
| WA-01 | `whatsapp.inviteUrl` the only source, two readers, no fallback |
| WA-05 | `wa.heading` / `wa.body` in all three languages |
| NDG-03 | Register is the primary of the two hero actions |
| NDG-04 | Hero line hides on `deadlinePassed()`, urgency threshold reads `calendarDaysUntil` |
| NDG-05 | Threshold read in exactly one place, correctly absent at 1 against 8 |
| NDG-06 | `enrolled === '1'` stops the enrol nudge and the hero line in the same pass |
| NDG-08 | `sessionDismissed` read on the first line of `renderNudge()`, assigned once, never reset |

### Unchecked — 9 IDs (was 11)

| ID | Reason | Blocked on |
|---|---|---|
| NDG-01 | Both states driven in code; never seen pinned to a real screen | Device pass |
| NDG-02 | Clearance over the countdown, address and video at four viewport sizes with the iOS toolbar collapsing. **Highest risk in the phase, unchanged** | Device pass, Table A |
| ENR-09 | A field error described on focus rather than announced is a runtime property of VoiceOver and TalkBack | Device pass, Table B/F |
| ENR-10 | **Reason narrowed.** The desk half is now sound in both directions — the withdrawal failure branch is visible and the submit button can no longer lock forever. What remains is the airplane-mode observation | Device pass only |
| WA-02 | The one-tap handoff at the moment of success | `whatsapp.inviteUrl` + device |
| WA-03 | Whether a universal link opens the installed app | `whatsapp.inviteUrl` + device |
| WA-04 | The `#wa` section ships hidden and correct and cannot be shown to anyone | `whatsapp.inviteUrl` |
| WA-06 | Absent-not-broken is structurally verified; whether it reads as deliberate is a judgment | Visual judgment |
| ENR-07 | Correct and correctly invisible at 1 against a threshold of 8 | Eight registrations |

**Bookkeeping:** all 33 IDs are still `- [ ]` in `.planning/REQUIREMENTS.md`. The 24-ID list above
is the derivation the previous report deferred and can now be applied.

### Adjacent IDs exercised here, owned elsewhere

`DSG-06` (re-verified independently, 0 dashes across six files), `LNG-06` (re-verified, 156 keys
per table at identical key sets), `LNG-07`, `CFG-01`, `CFG-03`, `DSG-07`. `DSG-05`'s observed
half, `DEL-02` and `DEL-03` stay unchecked and are carried by WINDOWS entries 1 and 11.

---

## New Findings

### N-01 — ⚠️ WARNING: the gap-closure code review has no artifact

`03-REVIEW.md` in the working tree is the **pre-gap-closure** review, byte-for-byte identical to
`03-REVIEW-pre-gap-closure.md` apart from line endings (`diff` reports `1,700c1,700`; both are 700
lines of the same text). Commit `69bbf9c` *added* the archive copy and never replaced the
original, so the archive step half-ran.

The consequence is that the five findings this fix round closed exist **only as commit subject
lines**:

- `2d5a961` CR-01 give `enforce_photo_limit` its owner's rights so anon photo insert works
- `93f74fe` CR-02 write a confirmed withdrawal whether or not the box survived
- `6ce6c93` CR-03 release the body wide freeze on the not-recordable branch
- `d6a2ac2` WR-01 keep `calendarDaysUntil` a calendar difference when `Intl` throws
- `e84d93d` WR-02 never guard a durable write on the submit and amend paths

Two things follow, and the first is worse than the second:

1. **These CR-/WR- numbers collide with a different, live ID space.** `CR-01` in the file on disk
   is the withdrawal-isolation finding; `CR-01` in the commit log is the photo-limit trigger.
   `WR-02` on disk is the mass-write policy; `WR-02` in the log is the durable-write guard. Any
   later reader following a commit message into `03-REVIEW.md` lands on the wrong finding, and
   both readings are plausible.
2. **`deferred-items.md` §2 claims to account for "all nineteen findings" in `03-REVIEW.md`.**
   That sentence is true of the file it points at and false of the review that actually ran last.
   The gap-closure review's four Info findings therefore have **no recorded disposition** — and
   this phase's own standard, written into that same ledger, is that "a finding with no recorded
   disposition is indistinguishable from a finding that was dropped."

**This is not a code defect.** All five fixes are present in the tree and every one of them is
independently verified above. It is an audit-trail defect, and it is rated WARNING rather than
BLOCKER for that reason. It is in the human list because the remedy is a judgment: regenerate the
review, or record in `deferred-items.md` that this round's findings live in the commit log and
renumber the reference.

### N-02 — ℹ️ Info: the detached path drops two non-durable signals

On the `pending` and `failed` branches, a panel torn down mid-request (only reachable through the
three language buttons in the page header, which are outside the freeze by design) makes the
continuation a no-op, so `amendPending` is not set and no failure banner appears. This is
defensible and is argued at the site: on both branches the registration is untouched, the rebuilt
panel shows the truth, and the withdraw control is back. Recorded because it is the one asymmetry
left between the mounted and detached paths, and because the argument for it is a judgment rather
than a fact.

### N-03 — ℹ️ Info: three Table G Result cells describe a function that no longer exists

Rows 1 to 3 of Table G record Pass against offsets exercised with the deleted millisecond
`daysUntil` (`+12h → daysUntil 1 → nudge.enrol.last`). Under `calendarDaysUntil` a +12h offset is
usually the **same** calendar day and now correctly renders `nudge.enrol.today`. The sheet says
this in its own note and keeps the cells deliberately as a historical record. No gap: the sweep in
B2 above re-establishes all five branches against the shipped code, independently of Table G.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `.planning/…/03-REVIEW.md` | whole file | Stale artifact carrying a colliding ID space | ⚠️ Warning | N-01 |
| `.planning/…/deferred-items.md` | §2 preamble | Ledger claims completeness over the wrong review | ⚠️ Warning | N-01 |
| `styles.css` | 421, 1274, 1369 | Three touch targets at 48px with no coarse override, against a 52px contract | ⚠️ Warning | Clears the 44px floor. Deliberately deferred (WINDOWS 10, `deferred-items.md`), to be fixed with Table D |
| `app.js` | 2243-2259 | `enrol.withdrawn.body` says "The numbers have been updated" on the `gone` branch too | ℹ️ Info | Nothing was updated when zero rows matched. Declined in the ledger |
| `app.js` | 3054 | Detached path drops `amendPending` and the failure banner | ℹ️ Info | N-02 |
| `config.js` | 158 | `https://chat.whatsapp.com/XXXXXXXXXXXX` | ℹ️ Info | **Read literally this trips the `XXX` debt-marker gate, and it is deliberately not being treated as one.** It is an illustrative URL inside an owner-facing comment explaining where to find the invite link. The gate exists so completion is auditable; flagging an example URL serves nothing. **Zero real `TODO`, `FIXME`, `TBD`, `HACK` or `PLACEHOLDER` markers across all six source files** |

**Every blocker from the previous report is gone.** `supabase/schema.sql:128-131` (open select
over the credential), `app.js:2801-2871` (unguarded async continuation) and `app.js:3070-3072`
(`-0`) are all closed and independently re-verified. So are seven of the previous report's
warnings: WR-02, WR-03, WR-06, WR-07, WR-08, WR-09 and WR-10.

---

## Gaps Summary

**No gaps.** All three of the previous report's failed truths are closed, and each was closed by
evidence generated in this verification rather than accepted from a summary:

- **Gap 1** by eight live probes, four of which are stated non-200 expectations, plus a whole-file
  ordering argument for the one truth that has no wire signature — and the argument is written out
  rather than asserted.
- **Gap 2** by driving the shipped state machine through all eight branch/teardown combinations
  and reading the store and the disabled counts back out, which is what distinguishes the two
  regressions this round introduced and fixed from a source-level "the function exists" check.
- **Gap 3** by a 25,922-sample sweep in four timezones across both `Intl` paths, aimed
  specifically at the catch path the WR-01 fix rewrote.

**One new finding, rated WARNING, N-01.** It is documentation, not code, and it does not block
phase 4. It does mean this phase's own completeness rule is currently unmet for four Info findings
nobody can now enumerate.

**What is not a gap.** No test suite (vanilla static site, no build step, locked constraint). The
linkless WhatsApp state (D-37, the shipping state). The invisible social proof block (1 against a
threshold of 8, the requirement working). The three 48px touch targets (above the floor,
pre-existing, deliberately deferred). The unproven sixth-photo limit (proving it needs five
undeletable rows; phase 4 owns it, and the schema header says so). The unchecked boxes in
`REQUIREMENTS.md` (the derivation is above and can now be applied).

**What stays owed, and it is the whole reason this is not `passed`.** Tables A to F of
`03-DEVICE-PASS.md`, and **NDG-02 above all**. The nudge bar has never rendered on any device in
the life of this site. Four of the eight scope truths are present and wired and behaviorally
unexercised on a screen, and no desk evidence promotes them. The status is `human_needed` because
of that list, not because of anything left broken in the code.

---

_Verified: 2026-08-15T12:19:36Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification after gap closure. Live probes re-run first-hand against project `aplaxdplwnnlezffatal`; withdrawal and deadline behaviour driven against source sliced verbatim from `app.js`. No summary claim was accepted as evidence, and two summary claims were found stale and are named above._
