# Phase 03 deferred items

Out-of-scope discoveries from the closing sweep (plan 03-06). Nothing here was fixed, because
none of it was caused by this plan's changes and this plan modifies no source file.

## 1. Three touch targets are declared 4px short of the UI contract

**Found:** 03-06 task 1, while filling Table D of `03-DEVICE-PASS.md`.

**What:** `03-UI-SPEC.md` §Touch Target Geometry asks for **52px at a coarse pointer** for the
text input, the guest-count segment and the select overflow branch, with the reason "matches the
input it sits between, so the three field rows are one rhythm". `styles.css` declares:

| Selector | Declared | Required at coarse pointer |
|---|---|---|
| `.field__input` | `min-height: 48px` (line 1287), no coarse block | 52px |
| `.field__select` | `min-height: 48px` (line 1287), no coarse block | 52px |
| `.seg > span` | `min-height: 48px` (line 1384), no coarse block | 52px |

Every other row of the touch-target table is declared correctly, including the two that take a
coarse override to 56px and the four that take one to 52px, so this is three misses in a rule
the file otherwise applies consistently.

**Why it is deferred rather than fixed:**

1. It is not a regression. It has been the shipped state since plan 03-01 and no later plan
   moved it, so the closing sweep's job of catching one plan undoing another's work is not
   what found it.
2. It is not an accessibility failure. 48px clears the 44px floor the brief and WCAG both set.
   It is a shortfall against this phase's own stricter target.
3. This plan modifies no source file, by design, and its threat register (T-03-34) is
   specifically about this plan touching shipped values on a repository that deploys on push.
4. Changing touch geometry at phase close, with the device pass unrun, swaps a measured 4px for
   an unmeasured change. The right moment to fix it is with a phone in hand, which is the same
   moment Table D is answered.

**Where to pick it up:** Table D of `03-DEVICE-PASS.md` carries a Declared column recording all
three, and `.planning/WINDOWS.md` carries the ledger entry. A one-line coarse-pointer block
beside the existing ones fixes it.

---

## 2. Disposition ledger for every finding of the phase 3 code review (plan 03-09)

**This is a decision record, not a backlog.** An item listed below as declined has been
**decided**, not postponed for lack of time. Each one was read, weighed against a stated reason,
and left in place deliberately. If a later reader disagrees with a decision, the thing to do is
argue with the reason, not to assume the item was forgotten.

It accounts for **all nineteen findings** in
`.planning/phases/03-enrollment-identity-and-the-group/03-REVIEW-pre-gap-closure.md`, plus the two
rows marked Info in `03-VERIFICATION.md`'s `## Anti-Patterns Found` table, one of which is not an
item in the review's own numbering. Nothing is absent from the list, because a finding with no
recorded disposition is indistinguishable from a finding that was dropped.

> **File reference corrected 2026-08-15.** When this section was written, that review was named
> `03-REVIEW.md`. A second review ran afterwards, over the gap-closure diff, and took that name;
> the review this ledger describes was renamed to `03-REVIEW-pre-gap-closure.md`. The two use
> **separate ID sequences**, so `CR-01` means one thing here and a different thing in the newer
> file. Section 3 below covers the newer review. Read the ID together with the file it came from,
> never on its own.

### 2a. Declined, each with a reason

**IN-01. `enrollmentReady()` re-implements `sbConfigured()` verbatim.** Declined. D-13 and
`.planning/STATE.md` both lock that function, and the duplication is documented at the site as
deliberate. The review is right that copy-paste is how the two will eventually disagree, and one
of them already carries an extra clause. But the fix belongs to a change that is allowed to touch
the gate, and this gap-closure pass is not one: the whole nudge bar hangs off `enrollmentReady()`,
and re-pointing it at `sbConfigured()` while also rewriting the ladder above it would put two
independent changes behind one set of gates.

**IN-03. Five copy keys defined in all three languages and never used**
(`hero.cta.location`, `footer.lang`, `lang.it`, `lang.en`, `lang.da`). Declined. Fifteen dead
strings, pre-existing rather than introduced by this phase. The better of the two available fixes
is not deletion: it is wiring `lang.*` into the language switch buttons' accessible names, which
would give three two-letter controls a readable name in the guest's own language. That is a UI
change with a device-pass consequence, and it belongs with Table F rather than with a desk sweep.
Deletion is also the largest available way to break the trilingual parity contract (five keys out
of three tables in one edit) for the smallest available gain.

**IN-06. `newGuestId()` invoked at module load purely to compute a boolean, discarding a uuid.**
Declined. The shipped form probes the capability by exercising it, which is strictly stronger than
the proposed `typeof` check: a browser where `crypto.randomUUID` exists and throws, or exists
behind an insecure-context restriction, passes the `typeof` test and fails the real one. The cost
is one discarded uuid per page load. That is the right trade for the one boolean that decides
whether this site can mint an identity at all.

**The `enrol.withdrawn.body` wording on the `gone` branch** (`03-VERIFICATION.md`
`## Anti-Patterns Found`, Info row, `app.js:2243-2259`). The string says the numbers have been
updated, and on the `gone` branch zero rows matched so nothing was updated. Declined. The phase's
own recorded reasoning at `doWithdraw` chose to reuse the key rather than add a second sentence
saying the same thing in three languages; the two states are indistinguishable from the guest's
point of view, because in both of them the guest is not counted; and the `gone` outcome is
deliberately treated as success under D-15. Adding a key here would also break the 156-key parity
this phase has held across every plan.

**The three 48px touch targets.** Still deferred, for the four reasons written out in section 1
above, which are not restated here. Plan 03-09 carries a gate (C2) that **fails if the fix is
applied**, so this file's decision and the executable check agree with each other.

**`config.js:151`, `XXXXXXXXXXXX`** (`03-VERIFICATION.md` Info row). No action, and not a
deferral: it is an example WhatsApp URL inside an owner-facing comment, not a debt marker. The
verification report already records zero real `TODO`, `FIXME`, `TBD`, `HACK` or `PLACEHOLDER`
markers across all six files, and every plan gate since re-asserts it.

### 2b. Fixed, and where each one landed

| Finding | In one line | Landed |
|---|---|---|
| **CR-01** | In-flight withdrawal was not isolated; the panel's sibling controls stayed live and every failure branch downstream was unsound | Plan **03-08**, task 1 |
| **WR-03** | `toast()`'s inner hide timer was untracked, so a second toast inside the 260ms fade was killed on arrival | Plan **03-08**, task 3 |
| **WR-04** | `doWithdraw`'s pending branch never set `amendPending`, so the not-recordable answer evaporated on the next render | Plan **03-08**, task 1 |
| **WR-05** | A transient network failure during withdrawal permanently removed the only way to withdraw, with no retry | Plan **03-08**, task 1 |
| **WR-08** | `sbRequest`'s timeout was a no-op without `AbortController` and the promise then never settled, locking the submit button forever | Plan **03-08**, task 2 |
| **WR-09** | `renderSocialProof()` had no in-flight guard, so a stale response could overwrite a fresher head count | Plan **03-08**, task 3 |
| **IN-04** | `submitEnrollment` gated on `status === 201` while the other two wire functions gate on `res.ok` | Plan **03-08**, task 2 |
| **WR-01** | `daysUntil()` returned `-0` for a deadline just past, so the bar said registration closes today for a full day after it closed, contradicting the hero line on the same screen. This is gap 3 of `03-VERIFICATION.md` | Plan **03-09**, task 1 |
| **WR-06** | `forgetIdentity()` reset three of four session flags and dropped focus to `<body>` when used from the withdrawn panel | Plan **03-09**, task 2 |
| **WR-07** | `hideNudge()` did not cancel `showNudge()`'s queued frame, so `registerAgain()` slid the bar in over the keyboard and then snapped it away | Plan **03-09**, task 2 |
| **IN-02** | `.group-cta` was dead CSS, with zero references anywhere. Proved dead by count across all three files rather than trusted, then removed together with the `app.js` comment that existed only to warn about it | Plan **03-09**, task 3 |
| **IN-07** | `renderCountdown` guarded `els.root`, `els.sr` and the label but dereferenced six other cached nodes unguarded | Plan **03-09**, task 3 |

### 2c. Assigned elsewhere, and open at the time of writing

These four are the database half of the review and are owned by plan **03-07**, which is still
standing at a human checkpoint. They are recorded here so that this ledger accounts for all
nineteen findings, not to claim any of them is closed.

| Finding | In one line | Owner |
|---|---|---|
| **CR-02** | `guest_id` is a bearer write credential and the `photos` policy publishes it, with full names, to every visitor. Gap 1 of `03-VERIFICATION.md`, and the one that must close before phase 4 | Plan **03-07** |
| **WR-02** | The `anon can amend own enrollment` policy grants unrestricted mass-write on every row, inert today only because an unrelated SELECT policy is missing | Plan **03-07** |
| **WR-10** | The `extra_guests` bound is enforced only in the UI; the database accepts `between 0 and 10` against a config bound of 2 | Plan **03-07** |
| **IN-05** | `touch_updated_at()` and `enforce_photo_limit()` carry no `set search_path`, so the file applies its own hardening to one function of three | Plan **03-07** |

### 2d. What this ledger does not cover

The device pass. `03-DEVICE-PASS.md` Tables A to F are unanswered and NDG-02 above all: the nudge
bar has never rendered on any device in the life of this site. That is not a review finding and it
is not deferred work in the sense this file uses the word. It is owed work with a named artifact
waiting for it.

---

## 3. Disposition ledger for the gap-closure code review

Source: `.planning/phases/03-enrollment-identity-and-the-group/03-REVIEW.md`, run on
2026-08-15 over the gap-closure diff only (`app.js`, `config.js`, `styles.css`,
`supabase/schema.sql`). Nine findings, **its own ID sequence**, unrelated to section 2's.

The five that mattered were all **regressions introduced by plans 03-07, 03-08 and 03-09**: the
gap closure broke things while closing things. All five are fixed and merged, each proved red
against the pre-fix source before the fix was accepted:

| Finding | In one line | Disposition |
|---|---|---|
| **CR-01** | `revoke select on public.photos from anon` disabled the photo-limit trigger, so every anonymous photo insert failed with 42501 | **Fixed** `2d5a961`, applied to the live database and probe-verified |
| **CR-02** | The withdrawal's mounted guard sat above the durable writes, so a confirmed withdrawal could be discarded on a language switch | **Fixed** `93f74fe` |
| **CR-03** | The `pending` branch never lifted the body-wide freeze, leaving every panel control disabled until reload | **Fixed** `6ce6c93` |
| **WR-01** | `calendarDaysUntil`'s catch degraded to arithmetic that reintroduced gap 3's corollary | **Fixed** `d6a2ac2` |
| **WR-02** | The same guard shape on `handleSubmit`/`handleAmend` could drop a registration the database had accepted | **Fixed** `e84d93d` |

### 3a. Declined for now, each with a reason

These four are Info and were deliberately left out of the fix round's scope. Declined **for this
round**, not decided forever, unlike section 2a, which records settled decisions.

**IN-01. `setWithdrawState` re-enables every button in `#enrol-body` with no memory of what was
disabled before.** Declined for this round, and it moved while we were not fixing it: CR-03's fix
revives the `'idle'` path, which no caller reached after 03-08, so IN-01 went from dead code to
reachable. Still benign, because nothing on the return panel ships disabled, but that is a
property of today's markup, not a guarantee. The moment any control there ships disabled, this
becomes a real defect. Worth fixing in the same pass as IN-03.

**IN-02. `renderCountdown`'s new guard is broader than its own comment claims, and couples the two
states.** Declined for this round. The guard is correct and strictly safer than what preceded it;
the defect is that the comment describes something narrower than the code does, which is the same
class of mistake as the false section 9 comment that let CR-01 ship for a day. Comment-only fix.

**IN-03. `toast()`'s `requestAnimationFrame` handle is still unheld, one commit after the
identical rule was applied to `nudgeShowFrame`.** Declined for this round, and the least
comfortable of the four: 03-09 fixed exactly this shape for the nudge bar and did not carry it to
the toast beside it. Pairs naturally with IN-01.

**IN-04. `forgetIdentity` writes `tabindex="-1"` onto a static heading and never removes it.**
Declined for this round. A stray `tabindex="-1"` on a heading is inert for a mouse and does not
place the heading in the tab order; it is untidy rather than wrong. Cheapest of the four.

### 3b. What is still unproven on the wire

The **sixth-photo limit** (`photo_limit_reached`). CR-01's fix restored the trigger's ability to
count, and probe F proves the trigger now runs. It does **not** prove the limit still refuses a
sixth row, because proving that means writing five real photo rows, and no delete rule exists for
anyone in this schema, and nothing in the file could remove them again. **Phase 4 owns this proof and
should carry it as an explicit task rather than assume it.**
