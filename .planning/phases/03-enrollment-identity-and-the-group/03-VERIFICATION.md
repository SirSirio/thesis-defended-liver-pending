---
phase: 03-enrollment-identity-and-the-group
verified: 2026-08-15T08:22:56Z
status: gaps_found
score: 2/8 scope truths verified
behavior_unverified: 3
overrides_applied: 0
requirements:
  total: 33
  satisfied: 22
  unchecked: 11
gaps:
  - truth: "Supabase project setup, tables, row level rules (shared with phase 4)"
    status: failed
    reason: "Section 8 turned guest_id into a bearer write credential, and the pre-existing
      photos SELECT policy publishes it together with a full unsplit name. Probed live: GET
      /rest/v1/photos?select=* answers HTTP 200 to the publishable key. The table is empty
      today, so nothing leaks yet; phase 4's first insert arms it. A second policy on
      enrollments grants unrestricted anon UPDATE on every row and is held inert only by an
      unrelated missing SELECT policy."
    artifacts:
      - path: "supabase/schema.sql"
        issue: "line 128-131 `anon can view album` on public.photos is `to anon using (true)`
          over a table carrying guest_id and an unsplit name; line 113-116 `anon can amend own
          enrollment` is `using (true) with check (true)`, superseded by amend_enrollment and
          now dead code plus a loaded foot-gun; line 44 bounds extra_guests at 0..10 while
          config.js bounds it at 2, so the server floor is five times the UI bound"
    missing:
      - "Replace the direct photos read with a projecting view (first_name, storage_path, created_at) and revoke anon SELECT on public.photos, before phase 4 writes its first row"
      - "Drop policy `anon can amend own enrollment` on public.enrollments"
      - "Reconcile the extra_guests check constraint with enrollment.maxGuestsPerPerson, or document the divergence at both sites"
      - "Correct the schema comment at line 92-93 which states guest ids never appear on the page"
  - truth: "Returning guest sees their own registration, and can edit or withdraw it (ENR-06)"
    status: failed
    reason: "The withdrawal happy path works and the RPC is live, but the in-flight request is
      not isolated from the panel it lives in. setWithdrawState disables only the buttons
      inside the confirmation box; the panel's edit and forget controls stay live for the whole
      12 second window and each one tears the box out of the document. Three consequences, all
      reachable at a desk by reading, and all of them contradict invariants the phase wrote
      down for itself."
    artifacts:
      - path: "app.js"
        issue: "app.js:2805 disables `$$('button', box)` only. app.js:2849 runs its continuation
          without re-checking that the box is still mounted, so the failure branch renders
          amendPendingLine() into a detached subtree (guest gets no signal at all), the success
          branch writes store.set('enrolled','0') after forgetIdentity() cleared it (the exact
          residue app.js:1205-1214 says must not survive), and a concurrent edit races a second
          RPC carrying p_withdrawn:false against the first carrying true"
      - path: "app.js"
        issue: "app.js:2862-2869 the withdraw pending branch never sets amendPending, so the
          `not recordable` explanation evaporates on the next render and the withdraw button
          returns (compare app.js:2634 which does set it)"
      - path: "app.js"
        issue: "app.js:2840-2871 maps a NETWORK failure into the same terminal branch as
          PGRST202, replacing the control with a paragraph. A dropped packet on mobile data
          permanently removes the only way to withdraw, with no retry, on exactly the network
          profile this phase was written for"
    missing:
      - "Freeze the whole #enrol-body for the duration of the withdrawal, and make the continuation a no-op when `!document.contains(box)`"
      - "Set amendPending = true in doWithdraw's pending branch before re-rendering"
      - "Split the NETWORK branch from the PGRST202 branch and keep the confirmation standing with a retry label"
  - truth: "Nudge bar with its two states, plus the deadline framing (NDG-07)"
    status: failed
    reason: "daysUntil() returns -0 for any deadline between 0 and 24 hours in the past, and
      -0 === 0 in JavaScript, so the ladder takes the `days === 0` branch and the bar renders
      `Registration closes today.` for a full day AFTER registration closed. renderDeadline()
      uses `Date.now() > deadlineMs` and has already hidden the hero line by then, so the two
      surfaces contradict each other on the same screen. The corollary is that
      nudge.enrol.today is unreachable in its intended meaning: no positive offset produces 0.
      Independently reproduced in this verification. The configured deadline is 2026-09-26, so
      this is dated, not hypothetical."
    artifacts:
      - path: "app.js"
        issue: "app.js:3070-3072 daysUntil has no closed-deadline test; app.js:3122-3128 buckets
          days before checking whether the deadline has passed"
      - path: ".planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md"
        issue: "Table G's `exactly 0` row was exercised with a deadline of -1h and recorded
          Pass. The expectation was derived from the implementation rather than from intent,
          which makes it a seventh instance of the phase's broken-gate pattern and the only one
          the closing sweep did not catch"
    missing:
      - "Close the deadline on the same test renderDeadline() uses, before bucketing days"
      - "Either delete nudge.enrol.today from all three tables or re-derive it from the calendar date"
      - "Re-anchor Table G's zero row to a positive offset and record that it is unreachable"
deferred: []
behavior_unverified_items:
  - truth: "Enrollment form: name, guest count, optional note, validation on blur (ENR-09, ENR-10)"
    test: "On real iOS Safari with VoiceOver and real Android Chrome with TalkBack: blur a name field that was typed into and then cleared; submit with airplane mode on"
    expected: "The field error is DESCRIBED when the control takes focus and is not announced over the guest; the submit failure is ANNOUNCED immediately through the alert banner; every typed value survives the failure; the submit button never stays locked"
    why_human: "aria-describedby versus role=alert politeness is a runtime property of a real assistive stack, and a genuine network fault cannot be simulated in source. Table B of 03-DEVICE-PASS.md is entirely unrun"
  - truth: "Confirmed count as social proof, optional first-name attendee list (ENR-07, ENR-08)"
    test: "Once eight people have registered, load the page and read the Expected attendance block"
    expected: "Two rows in the fact table's grammar, the total in tabular figures, first names only, comma separated, sorted with the Danish extra vowels after z"
    why_human: "The live count is 1 against a threshold of 8, so the block's correct state today is absent. It has never rendered. The arithmetic is verified against the live wire body but not a rendered pixel"
  - truth: "WhatsApp group handoff, presented the instant enrollment succeeds (WA-02, WA-03, WA-04, WA-06)"
    test: "Set whatsapp.inviteUrl, then on a phone with WhatsApp installed enrol and tap the success panel CTA, then the #wa section CTA. Separately, with the link still null, read the success panel"
    expected: "Each CTA opens the WhatsApp app rather than a browser page on the first tap; the bar stops asking after either; with no link the success panel reads as complete and deliberate rather than as a gap"
    why_human: "whatsapp.inviteUrl is null by design and is the shipping state, so the configured path cannot be demonstrated at all. Whether the linkless panel reads as deliberate is a visual judgment nobody has made"
human_verification:
  - test: "Tables A to F of .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md, on real iOS Safari and real Android Chrome"
    expected: "Every row carries a result. In particular Table A: with the bar shown at 320x568, 375x667, 390x844 and 430x932, each of the countdown clock, the address value and the door video slot can be scrolled clear of the bar, and the footer's last line is fully visible at maximum scroll"
    why_human: "NDG-02 is the highest risk item in the phase. The nudge bar has never rendered on any device in the life of this site, and the reserve it replaced was short by up to 27px on a notched iPhone. Every row depends on env(safe-area-inset-bottom) or on iOS Safari's collapsing toolbar, neither of which exists at a desk"
  - test: "NDG-01: load the site on both phones and look at the bar"
    expected: "The bar is pinned to the bottom of the viewport in both data-state values, enrol and group"
    why_human: "Both states are driven and confirmed in code; nothing has been seen pinned to a real screen"
  - test: "DSG-05 observed half: turn Reduce Motion on at the OS level and drive the form"
    expected: "The sweep bar is static at full width and 0.35 opacity rather than stranded part way across; the form to success panel swap is instant; the :active scale is instant; the bar's slide is instant"
    why_human: "The two reduced-motion blocks are declared correctly and gated in source, but the observed half needs the OS setting on and a screen"
  - test: "DEL-02, DEL-03: enrol end to end on a mid-range phone on mobile data, not wifi"
    expected: "Under ten seconds, on iOS Safari and Android Chrome, and no viewport zoom when the name field takes focus"
    why_human: "The roadmap's Done-when sentence opens with this clause and it is unmeasured. Carried over from phase 2, where WINDOWS entry 1 records the same debt"
  - test: "Table D of 03-DEVICE-PASS.md: measure the three declared-short touch targets on a coarse pointer"
    expected: "The name input, the guest-count segment and the select overflow branch measure at least 52px per 03-UI-SPEC.md Touch Target Geometry"
    why_human: "styles.css declares 48px with no coarse override at lines 1289 and 1384. 48px clears the 44px floor, so this is a shortfall against the phase's own stricter contract rather than an accessibility failure. Deliberately deferred to the same moment Table D is answered (WINDOWS entry 10, deferred-items.md)"
---

# Phase 3: Enrollment, Identity, and the Group — Verification Report

**Phase Goal:** The host knows who is coming. Moved ahead of photos because headcount is time
sensitive and photos are not.
**Done when:** a guest on a phone enrols in under 10 seconds, lands in the WhatsApp group with
one more tap, and is never nudged again.
**Verified:** 2026-08-15T08:22:56Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Verdict in one paragraph

The code is unusually good. Six plans landed roughly 2,100 lines into `app.js` with no markup
strings, no `console` calls, no debt markers, complete trilingual copy at verified parity, and
a database that answers on the wire exactly as the plans claim. **03-06 was right that this
phase is not `passed`, and it was right for the reasons it gave.** It was not right that it
closes at `human_needed`: three defects are provable at a desk, without a phone and without the
group link, and each one falsifies an invariant this phase wrote down for itself. Two of them
were found by the code review that ran immediately before this verification and are unfixed in
the tree; the third is found here for the first time and it is a seventh instance of the
broken-gate pattern this phase recorded six times — a Table G row whose expectation was derived
from the implementation it was supposed to test. The status is `gaps_found`. The large
human-verification list underneath it is real and unchanged, and it stays owed after the gaps
close.

---

## Goal Achievement

### Observable Truths

Derived from the eight ROADMAP scope bullets, which is what the phase goal decomposes into.

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Supabase project setup, tables, row level rules (shared with phase 4) | ✗ FAILED | Tables, RLS and the migration are live and probed correct. But `anon can view album` publishes `guest_id` (now a bearer write credential) plus a full unsplit `name`, and `anon can amend own enrollment` is `using(true) with check(true)`. See CR-02, WR-02, WR-10 |
| 2 | Enrollment form: name, guest count, optional note, validation on blur (ENR-01..03, ENR-09, ENR-10) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Three fields built, blur validation with the untouched-empty suppression, `aria-describedby` written once in markup, reserved 24px error box, four `data-state` values, `role=alert` banner in the DOM from first render. The assistive and real-network halves need hardware (Table B unrun). WR-08 also leaves the button locked forever on a browser with `fetch` but no `AbortController` |
| 3 | Enrollment doubles as identity capture, so no separate name prompt exists anywhere (ENR-04, ID-01..06) | ✓ VERIFIED | `#enrol-name` is the only text `<input>` in the entire codebase; zero `prompt(`, `confirm(` or `alert(` anywhere. Identity module over the seven `c03102.*` keys, phase 1's three neither renamed nor repurposed. `store.mem` fallback behind the same interface, probed once by write-and-remove |
| 4 | Returning guest sees their own registration, and can edit or withdraw it (ENR-05, ENR-06) | ✗ FAILED | ENR-05 holds: the return panel renders from storage, never from a fetch. ENR-06 does not: the in-flight withdrawal is not isolated from the panel it lives in, so the failure branch renders into a detached subtree, the success branch resurrects storage a guest just cleared, and a concurrent edit races a contradictory RPC. See CR-01, WR-04, WR-05 |
| 5 | Confirmed count as social proof, optional first-name attendee list (ENR-07, ENR-08) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Threshold read in exactly one place, block absent below it, duplicates kept, locale-aware sort, `textContent` only, silent failure, 8s timeout, mounted below the body. Live total is 1 against a threshold of 8, so the correct state today is absent and the block has never rendered. WR-09: no in-flight guard, so a stale response can overwrite a fresher count |
| 6 | WhatsApp group handoff, presented the instant enrollment succeeds (WA-01..06) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | One config key, read verbatim at two sites with no hardcoded fallback; `whatsappButton()` returns `null` for a falsy link so no call site owns a dead control; `markGroupJoined()` is the single writer, called from all three CTAs; `#wa` ships `hidden` in static markup and the renderer only ever removes the attribute. `inviteUrl` is `null`, so WA-02, WA-03, WA-04 and WA-06 cannot be demonstrated |
| 7 | Nudge bar with its two states, plus the deadline framing (NDG-01..08) | ✗ FAILED | The reserve is measured and published as one custom property read by three consumers; the observer is guarded; the bar yields to form focus and restores only through `renderNudge()`; dismissal, the enrolled cutoff and the `wa_joined` cutoff all hold. But the deadline ladder tells guests registration is open for 24 hours after it closed, and the Table G row that should have caught it was anchored to the implementation. NDG-01 and NDG-02 additionally have never rendered on any device |
| 8 | Graceful unconfigured state, so this ships before credentials exist (ENR-12) | ✓ VERIFIED | `renderEnrollment()` branches to `pending` on `!sbConfigured() \|\| !IDENTITY_OK` and appends the inherited `pendingBlock()`, so no `#enrol-form` exists and `enrollmentReady()` stays false and the bar stays down. The static `.pending` markup ships in `index.html` and is discarded on first render |

**Score:** 2/8 truths verified (3 present, behavior-unverified; 3 failed)

### Required Artifacts

Every artifact declared across the six plans exists and carries its declared `contains` pattern.

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `app.js` | identity module, request helper, renderers, panels, edit/withdraw/forget, nudge measurement, group handoff, social proof | ✓ VERIFIED | `sbRequest(` ×1, `measureNudge(` ×1, `renderSocialProof(` ×1, `withdrawEnrollment(` ×1. Parses clean under `node --check`. 143 KB, no `innerHTML`/`eval`/`console` |
| `styles.css` | form component system, panel region, receipt modifier, composed reserve, proof modifier, understated control | ✓ VERIFIED | `.field__input` ×7, `--nudge-h` ×3, `.facts--proof` ×4, `.subtle-action` ×4 |
| `copy.js` | 156 keys per table at identical key sets | ✓ VERIFIED | en 156, it 156, da 156; key sets byte-identical; zero en or em dashes |
| `index.html` | `#enrol-body`, `#enrol-proof`, `#wa` shipping hidden, translated dismiss label | ✓ VERIFIED | `id="wa"` present with `hidden`; `nudge.dismiss` on `#nudge-close` via `data-i18n` + `data-i18n-attr` |
| `config.js` | enrollment block, `whatsapp.inviteUrl`, credentials unmoved | ✓ VERIFIED | `enrollment` block with deadline / maxGuestsPerPerson 2 / showCountFrom 8 / showAttendeeList true; credentials still under `photos`, no key added, moved or lost |
| `supabase/schema.sql` | sections 7 and 8, rewritten closing block | ⚠️ WIRED, RULES UNSOUND | `amend_enrollment` ×3, `withdrawn` ×8, both owner queries adjacent in the closing block. The file is correct about what it adds and wrong about what it leaves standing — see gap 1 |
| `03-DEVICE-PASS.md` | the filled desk record and the explicit list of what still cannot be established | ✓ VERIFIED | `Performed on` ×2 (desk half filled, device Outcome deliberately empty). Table G complete, Tables A–F each carrying an honest desk note |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `applyLanguage()` | `renderEnrollment()` | appended before `renderNudge` | ✓ WIRED | app.js:129, with `renderWhatsApp()` beside it and `renderNudge()` after. `measureNudge()` last, after the string sweep |
| `renderEnrollment()` | `enrollmentReady()` | creating `#enrol-form` flips the gate | ✓ WIRED | `enrollmentReady()` at app.js:3161 is untouched and still tests `$('#enrol-form')`, exactly as STATE.md's gotcha requires |
| `submitEnrollment()` | live PostgREST | `POST /rest/v1/enrollments`, `Prefer: return=minimal`, key in `apikey` only | ✓ WIRED | One occurrence; no `Authorization` header is built anywhere in the file |
| `identity.save()` | `isEnrolled()` | the `enrolled` flag as the string `'1'` | ✓ WIRED | Written at app.js:1202, compared at app.js:3083. `identity.clear()` removes the key rather than writing `'0'` |
| `measureNudge()` | `body[data-nudge]`, `.toast`, `:root` | one custom property, three consumers | ✓ WIRED | styles.css:70 scroll-padding-bottom, :1124 body reserve, :1173 toast offset |
| focus listener on `#enrol-form` | `renderNudge()` | `focusout` restores through the renderer | ✓ WIRED | app.js:2951-2957, with a `relatedTarget` guard |
| `whatsappButton()` | `config.whatsapp.inviteUrl` | one defensive read, falsy returns null | ✓ WIRED | app.js:3020. `renderNudge` reads the same key at :3111; one source, two readers, no fallback |
| `markGroupJoined()` | `renderNudge()` | flag written once, bar re-rendered | ✓ WIRED | Single writer at app.js:2999, called from the anchor's own click handler and from the bar's CTA |
| `renderSocialProof()` | the attendees view | `GET /rest/v1/attendees?select=first_name,extra_guests` | ✓ WIRED | One occurrence, 8000ms timeout, `host.textContent=''` on every outcome |
| `schema.sql` section 8 | `app.js amendEnrollment()` | `POST /rest/v1/rpc/amend_enrollment`, integer back | ✓ WIRED | Confirmed live, see Probe Execution |
| `identity.clear()` | `store.remove()` | every phase 3 key removed from storage and the map | ✓ WIRED | Five removals at app.js:1216-1220 covering guest_id, name, extra_guests, note, enrolled |
| the withdrawn body | `enrollmentReady()` | no form inside, so the gate is false | ✓ WIRED | `buildWithdrawnPanel()` builds a heading, a lede and two controls. No `<form>` |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| Return panel receipt | `storedRecord()` | `localStorage`, by design (D-02/D-03: the DB physically cannot answer) | Yes | ✓ FLOWING |
| Social proof count and names | `res.body` | `GET /rest/v1/attendees` | Yes — live body `[{"first_name":"Sirio","extra_guests":0}]` | ✓ FLOWING |
| Deadline line and fact row | `deadlineMs` | `config.enrollment.deadline` | Yes | ✓ FLOWING |
| Nudge bar copy | `daysUntil(deadlineMs)` | the clock | Yes, but the post-deadline bucket is wrong | ⚠️ See gap 3 |
| `#wa` section CTA | `config.whatsapp.inviteUrl` | config, currently `null` | Correctly absent | ✓ FLOWING (null branch) |
| Success panel group position | `whatsappButton()` | config, currently `null` | Correctly one dim line | ✓ FLOWING (null branch) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Sources parse | `node --check app.js copy.js config.js` | clean | ✓ PASS |
| Copy tables at parity | Node: load `copy.js`, diff key sets | en 156 / it 156 / da 156, zero missing, zero extra | ✓ PASS |
| Zero em and en dashes (DSG-06) | Node: `/[–—]/` over four guest-facing files | 0 lines in each of app.js, copy.js, config.js, index.html | ✓ PASS |
| Deadline ladder, nine offsets | Node: run the shipped `daysUntil` and the ladder's branch conditions | `-1h`, `-12h`, `-23.9h` all give `-0`, all take `days === 0` → `nudge.enrol.today`. No positive offset gives 0 | ✗ FAIL — see gap 3 |
| No markup strings, no logging | grep for `innerHTML`, `outerHTML`, `insertAdjacentHTML`, `document.write`, `eval(`, `new Function`, `console.` | zero hits across all six files | ✓ PASS |
| No separate name prompt (ENR-04) | grep for `<input`, `createElement('input')`, `prompt(`, `confirm(` | one text input (`#enrol-name`) and one radio; zero dialogs | ✓ PASS |
| Enrollment end to end on a phone | — | no device, no build step, no harness (locked constraint) | ? SKIP → human |

### Probe Execution

Run first-hand from this verification against project `aplaxdplwnnlezffatal` with the committed
publishable key. Not inherited from any summary.

| Probe | Command | Result | Status |
|---|---|---|---|
| Attendees view projection | `GET /rest/v1/attendees?select=*` | `[{"first_name":"Sirio","extra_guests":0,"created_at":"2026-08-15T01:33:47.332041+00:00"}]` HTTP 200 | ✓ PASS — exactly three columns, no ZZTEST rows, cleanup confirmed |
| Raw table stays blocked (D-02) | `GET /rest/v1/enrollments?select=*` | `[]` HTTP 200 | ✓ PASS — the control probe that makes the one above mean something |
| Migration applied (sections 7, 8) | `POST /rest/v1/rpc/amend_enrollment {"p_guest_id":"…0000","p_withdrawn":true}` | `0` HTTP 200 | ✓ PASS — not `404 / PGRST202`, so the function is live and returns an integer |
| Anonymous delete refused | `DELETE /rest/v1/enrollments?guest_id=eq.…0000` | HTTP 204, no rows affected | ✓ PASS |
| **Photos read path** | `GET /rest/v1/photos?select=*` | `[]` **HTTP 200** | ✗ **FAIL** — the read path is open, not blocked. Compare `enrollments`, whose `[]` is a blocked read. Empty today; phase 4's first insert publishes `guest_id` and a full name |

---

## Requirements Coverage

All 33 ROADMAP requirement IDs are claimed across the six plans' `requirements` frontmatter.
**No orphaned requirements.**

### Satisfied — 22 IDs, tick these in REQUIREMENTS.md

| ID | Evidence |
|---|---|
| ENR-01 | `buildForm()` builds name and guest count; the guest control was exercised at maxima 0, 2, 4 and 5 |
| ENR-02 | `buildNoteControl()` with a 500 bound; `readFields()` coerces empty to `null`, never `''` |
| ENR-03 | `POST /rest/v1/enrollments` with the key in `apikey` only; a row written by this phase reads back through the view (`Sirio`) |
| ENR-04 | The only text input in the codebase is the enrollment name field. Zero dialogs |
| ENR-05 | `buildReturnPanel()` renders from storage, never from a fetch, which D-02 makes structurally necessary |
| ENR-08 | The view truncates to `first_name` server side and no name is split in JS; the config flag removes the name row only, read as `!== false` |
| ENR-11 | Head count and who-dropped-out queries adjacent in the closing owner block, both filtering on `withdrawn` |
| ENR-12 | Both blank-credential and no-crypto paths land in the inherited pending block and render no form |
| ENR-13 | `guest_id unique`, submit locked for the request, bounds in UI and DB. Honestly scoped by D-30 as a deliberate limit, not a real rate limit. See WR-10 for the bound divergence |
| ID-01 | Identity is captured by the enrollment form and by nothing else |
| ID-02 | v4 uuid from `randomUUID` or a `getRandomValues` fallback with version and variant bits set; minted and written to storage before the request leaves |
| ID-03 | `enrol.return.lede` greets by name from storage, no prompt |
| ID-04 | `startEdit()` re-mounts the same form prefilled; `forgetIdentity()` removes every key |
| ID-05 | Withdrawal keeps `guest_id` and `name` deliberately (D-15), so phase 4's attribution interface is in place. The 5-photo half is phase 4's |
| ID-06 | `store.mem` written unconditionally behind the same interface, probed by write-and-remove because Safari private mode throws on `setItem` rather than on access |
| WA-01 | `whatsapp.inviteUrl` is the only source; two readers, no hardcoded host, no fallback |
| WA-05 | `wa.heading` "Course announcements", `wa.body` "Practical updates go out in the group chat", in all three languages |
| NDG-03 | Register is the primary of the two hero actions (index.html:115) |
| NDG-04 | `hero.deadline` renders with the localised date, hides once enrolled or past, and goes `data-urgent` at 7 days. `#fact-deadline` carries it in the fact table |
| NDG-05 | Threshold read in exactly one place; the block is absent below it, and correctly absent at the real count of 1 against 8 |
| NDG-06 | `enrolled === '1'` stops the enrol nudge and the hero line in the same pass; the withdrawn panel contains no form, so the gate is false structurally rather than by special case |
| NDG-08 | `sessionDismissed` is read on the first line of `renderNudge()`, assigned in exactly one place, never reset; every restoration path re-enters through the renderer |

### Unchecked — 11 IDs

| ID | Reason | Blocked on |
|---|---|---|
| **ENR-06** | **New finding.** CR-01: the in-flight withdrawal is not isolated. Failure branch invisible, storage residue after forget, contradictory RPC race. WR-04, WR-05 compound it | A code fix, not hardware |
| **NDG-07** | **New finding.** The ladder tells guests registration is open for 24 hours after it closed, and the gate that passed it was anchored to the implementation | A code fix, not hardware |
| NDG-01 | Both states driven in code; the bar has never been seen pinned to a real screen | Device pass |
| NDG-02 | Clearance over the countdown, address and video at four viewport sizes with the iOS toolbar collapsing. Highest risk in the phase | Device pass, Table A |
| ENR-09 | A field error described on focus rather than announced is a runtime property of VoiceOver and TalkBack | Device pass, Table B/F |
| ENR-10 | The state machine is verified in source, but the airplane-mode failure and the always-terminating sweep are device rows. CR-01(a) additionally makes the withdrawal failure genuinely silent at a desk | Device pass + the CR-01 fix |
| WA-02 | The one-tap handoff at the moment of success | `whatsapp.inviteUrl` + device |
| WA-03 | Whether a universal link opens the installed app rather than a browser page | `whatsapp.inviteUrl` + device |
| WA-04 | The `#wa` section ships hidden and correct and cannot be shown to anyone | `whatsapp.inviteUrl` |
| WA-06 | Absent-not-broken is structurally verified; whether it reads as deliberate is a judgment nobody has made | Visual judgment |
| ENR-07 | The count is built and correct and is correctly invisible at 1 against a threshold of 8. It cannot be seen until eight people register, which is the requirement working | Eight registrations |

### Adjacent IDs exercised here, owned elsewhere

`DSG-06` (zero em dashes — re-verified independently, 0 hits across four guest-facing files),
`LNG-06` (156 keys per table at identical key sets — re-verified independently), `LNG-07`,
`CFG-01`, `CFG-03`, `DSG-07`. `DSG-05`'s observed half, `DEL-02` and `DEL-03` stay unchecked
and are carried by WINDOWS entries 1 and 11.

---

## Where this report differs from 03-06

03-06's self-assessment was honest and its eleven-unchecked list was correct as far as it went.
Three differences:

1. **03-06 placed the phase at `human_needed`. It is `gaps_found`.** Three defects are provable
   at a desk with no phone and no group link. `human_needed` would say the remaining work is
   observation; it is not, it is repair and then observation.
2. **ENR-06 moves from satisfied to unchecked.** 03-06's evidence was "the live function
   answers 0/200 for both argument lists the client sends", which is true and is evidence about
   the database. CR-01 is about the client, and it was written after 03-06 closed.
3. **NDG-07 moves from "verified by this plan" to unchecked, and its Table G row is a seventh
   broken gate.** The row labelled `exactly 0` was exercised with a deadline of **-1h**, which
   is a deadline that has already passed. It recorded Pass because the ladder does render
   `nudge.enrol.today` there. The row's intent is the last day *before* closing, and no positive
   offset can reach that branch. This is precisely the failure mode WINDOWS entries 6, 7 and 9
   record — a gate whose expectation was read off the implementation — and it is the one the
   mutation sweep could not catch, because mutating the source correctly reddens a gate that is
   asserting the wrong thing.

Everything else 03-06 claimed and I checked independently held: the 156-key parity, the zero
dashes, the live wire behaviour of all three endpoints, the ZZTEST cleanup, the config
restoration (clean `git status`), the three short touch targets, and the honest refusal to fill
the device Outcome table at a desk.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `supabase/schema.sql` | 128-131 | Open `select using (true)` over a table holding a write credential and a full name | 🛑 Blocker | CR-02. Probed live: HTTP 200. Armed by phase 4's first insert |
| `app.js` | 2801-2871 | Async continuation writes module state and DOM without checking the node is still mounted | 🛑 Blocker | CR-01. Silent failure, storage residue, RPC race |
| `app.js` | 3070-3072 | `Math.ceil` of a small negative yields `-0`, and `-0 === 0` | 🛑 Blocker | WR-01. Wrong copy for 24 hours after the deadline, contradicting the hero line on the same screen |
| `supabase/schema.sql` | 113-116 | `using (true) with check (true)` UPDATE policy, superseded and inert | ⚠️ Warning | WR-02. One added SELECT policy converts it into unauthenticated mass rewrite |
| `app.js` | 1264-1295 | Timeout is a no-op without `AbortController`; the promise then never settles | ⚠️ Warning | WR-08. Falsifies the phase's own "the button cannot be left locked" invariant. Small affected population |
| `app.js` | 3283-3295 | Nested hide timer untracked | ⚠️ Warning | WR-03. A second toast inside the 260ms fade is killed on arrival. This phase added the two toasts that make it reachable |
| `app.js` | 2399-2462 | No in-flight generation token on the social proof fetch | ⚠️ Warning | WR-09. A stale response can leave a head count that still counts a guest who just withdrew |
| `app.js` | 2715-2722 | `forgetIdentity()` resets three of four session flags | ⚠️ Warning | WR-06. From the withdrawn panel, focus drops to `<body>` and the panel rebuilds under the pressed control |
| `app.js` | 3226-3247 | `hideNudge()` does not cancel `showNudge()`'s queued rAF | ⚠️ Warning | WR-07. `registerAgain()` slides the bar in over the keyboard, then snaps it away |
| `styles.css` | 1289, 1384 | Three touch targets declared at 48px with no coarse override, against a 52px contract | ⚠️ Warning | Clears the 44px floor. Deliberately deferred (WINDOWS 10, deferred-items.md), to be fixed with Table D |
| `supabase/schema.sql` | 44 | `extra_guests between 0 and 10` against a config bound of 2 | ⚠️ Warning | WR-10. The server floor is five times the UI bound, and the excess is summed into the host's head count |
| `app.js` | 2243-2259 | `enrol.withdrawn.body` says "The numbers have been updated" on the `gone` branch too | ℹ️ Info | Nothing was updated when zero rows matched. Minor honesty wrinkle in a phase that is otherwise precise about this |
| `config.js` | 151 | `XXXXXXXXXXXX` | ℹ️ Info | An example WhatsApp URL in an owner comment, not a debt marker. **Zero real `TODO`, `FIXME`, `TBD`, `HACK` or `PLACEHOLDER` markers across all six files** |

---

## Gaps Summary

**Three gaps, all closable at a desk.**

**Gap 1 is the one that matters most and is the least visible.** This phase re-armed
`security_enforcement` in the roadmap specifically because it "touches real data, row level
rules, and a public anon key". Section 8 did exactly what it set out to do and did it well: a
`security definer` function with an empty search path, returning an integer and never a row, with
execute revoked from public before it is granted to anon on a verbatim-repeated signature. What
nobody checked is what that change did to the *meaning* of `guest_id` elsewhere in the same file.
It is now a password, and section 3 has been handing it out since phase 1 through a policy that
was harmless when it was written. The table is empty, so today this is a defect and not an
incident. Phase 4's first upload turns it into one. Close it before phase 4 starts, not after.

**Gap 2 is the phase's own invariant failing on its own terms.** The header comment above
`doWithdraw` says "the block always terminates somewhere defined" and "there is no path here
where the interface tells somebody they have withdrawn while the database still counts them".
Both are false, and the reason is a single asymmetry: `setFormState` disables the whole form
because the form *is* the whole body, and `setWithdrawState` copied that shape onto a box that is
a sibling of three live controls. The fix is small and is written out in `03-REVIEW.md`.

**Gap 3 is a dated bug and a lesson.** On 2026-09-27 the nudge bar will tell every unregistered
guest that registration closes today, while the hero line that would have said the same thing has
already hidden itself for being past. That is the bug. The lesson is that this phase found six
broken verification gates, wrote the pattern down three times in the ledger, mutation-tested 43
cases to guard against it, and still shipped a seventh — because mutation testing proves a gate
*can* fail, not that it is asserting the right thing. A gate anchored to the implementation
reddens perfectly when you break the implementation.

**What is not a gap.** The absence of a test suite (vanilla static site, no build step, locked
constraint). The linkless WhatsApp state (designed first, D-37, shipping state). The invisible
social proof block (1 against a threshold of 8, the requirement working). The three 48px touch
targets (above the floor, pre-existing, deliberately deferred to the device pass). The
unchecked boxes in `REQUIREMENTS.md` (03-06 deliberately left the derivation to this report; the
22-ID list above is that derivation and can now be applied).

**What stays owed after the gaps close.** Tables A to F of `03-DEVICE-PASS.md`, and NDG-02 above
all. The bar has never rendered on any device in the life of this site. No amount of desk
evidence promotes that, and this report does not try.

---

_Verified: 2026-08-15T08:22:56Z_
_Verifier: Claude (gsd-verifier)_
_Live probes run first-hand against project `aplaxdplwnnlezffatal`. No summary claim was accepted as evidence._
