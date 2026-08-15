---
phase: 04-photos
plan: 03
subsystem: photos
status: complete
tags: [photos, gate, i18n, time, css, a11y]

requires:
  - plan 04-01's renderPhotos ladder, pendingBlock(), buildGatePanel(), buildUploader()
  - plan 04-01's photos.opensAt in config.js and photos.closed.body in all three tables
  - plan 04-02's phrase(), photosRemaining(), photosMaxPerGuest(), refreshPhotosState()
  - the countdown's module-scope Date.parse and its single interval
provides:
  - photosOpenMs, the epoch value parsed once at module scope
  - photosOpen(now), the boolean gate that falls open on a parse failure
  - photosWasOpen / syncPhotosGate(), the flip tracker riding the countdown's tick
  - formatOpensAt(), the moment as text per language on Europe/Copenhagen
  - closedPanel(), the pending grammar with the moment substituted
  - the closed branch, second in the renderPhotos() ladder, with no album below it
  - the 220ms opacity body swap on #photos-body and its reduced-motion rule
  - the gate call to action's 52/56px touch geometry
affects:
  - plan 04-04 (the quota branch's position is named in the ladder; the data-show
    line in renderPhotos already covers quotaPanel's visibility)
  - plan 04-05 (device pass owns both human checks)

tech-stack:
  added: []
  patterns:
    - "a boolean gate whose parse-failure branch is inverted against its neighbour's, on purpose, because the two failures have opposite costs"
    - "a state flip tracked in one module-scope boolean and re-evaluated on an existing tick, so a second clock is never introduced"
    - "a body-swap fade owned by the container and inverted against the panel's, so a no-JS page stays visible"

key-files:
  created: []
  modified:
    - app.js
    - styles.css

decisions:
  - "The gate is re-evaluated from one call site, the first statement of renderCountdown(), which is reached by both the interval and the visibility handler through startClock(). A second explicit call in the handler would run the same integer compare twice in a row."
  - "The 220ms body swap moves to #photos-body rather than to each of the five bodies, and its data-show attribute is INVERTED against .panel's so the static index.html markup survives a page whose script never runs."
  - "Shipped names from waves 1 and 2 were kept over the plan's proposed renames: photosRemaining, buildGatePanel. Renaming working code to satisfy a grep is churn, and the phase registry in 04-01-PLAN.md only assigns this plan photosOpenMs, photosOpen and formatOpensAt."
  - "The permanence line stays IBM Plex Sans per the UI-SPEC typography table, not mono as the plan's action text said."

metrics:
  duration: 24m
  tasks: 2
  commits: 2
  completed: 2026-08-16

actuals:
  tokens: 4400
  tasks: 2
  commits: 2
---

# Phase 04 Plan 03: The Opening Gate and the Completed Ladder Summary

The portal now opens at a configured instant against a fixed offset, states that instant in three
languages, opens itself under a guest already sitting on the page without a reload or a second
clock, and cannot be locked shut by a typo in the one field an owner might mistype on the night.

## What shipped

**Task 1 — the gate, on the clock that already exists** (`edd9500`).

`photosOpenMs` is parsed once at module scope beside `startMs` and `endMs`, by the same helper,
because it is the same kind of value doing the same job. `photosOpen(now)` compares epoch
milliseconds and nothing else: no date built from separate arguments, no formatted-string
comparison, and the browser's own offset is never read.

Its `isNaN` branch is inverted against `phase()`'s three lines above it, and that inversion is the
whole point of the task. `phase()` falls back to `before`, which is safe for a countdown.
`photosOpen()` falls back to **open**, because `photos.opensAt: null` is the owner's one-line
recovery from a phone showing the wrong date, at a party, with nobody at a laptop. Written as:
closed only when there is a valid timestamp still in the future.

`formatOpensAt()` is `formatSchedule()`'s shape one for one, including the `Europe/Copenhagen` pin,
so the closed panel names the party's own local time rather than the reader's. `closedPanel()` calls
`pendingBlock('photos.pending.title', 'photos.closed.body')` and substitutes `{when}` into the
paragraph after the builder returns; the panel does not tick, because the hero owns the ticking and
there is one clock per page.

`syncPhotosGate()` is the first statement of `renderCountdown()`, above its node guards. The tracker
is one module-scope boolean, `renderPhotos()` runs only when it flips, and the file still contains
exactly one `setInterval`.

**Task 2 — the completed ladder, the body swap, and the gate's geometry** (`0abfc62`).

Most of this task's surface had already landed: waves 1 and 2 shipped `photosRemaining()`, the
labelled remaining-count field, the permanence line, `buildGatePanel()` and the `refreshPhotosState()`
re-seat. See **Deviations** for what that changed and what it did not. What this plan added is the
`.panel` visibility fix below, the body swap on `#photos-body` with its reduced-motion rule, the gate
call to action's touch geometry, and the named position for plan 04-04's quota branch.

## Verification

Every automated gate in the plan was run, plus two behavioural harnesses the plan did not ask for.

| Gate | Result |
|---|---|
| `node --check app.js` | pass |
| `photosOpen` / `formatOpensAt` / `closedPanel` present | 3 / 3 |
| `photosRemaining` / `buildGatePanel` present (see deviation 1) | 2 / 2 |
| `grep -c 'setInterval' app.js` | **1**, the countdown's own |
| `awk` over `photosOpen` for `new Date(` / `toLocaleString` / `getTimezoneOffset` | **0** |
| node probe: `photosOpen` has an explicit parse-failure branch | pass, and it returns `true` |
| `awk` over `formatOpensAt` for `Europe/Copenhagen` | 1 |
| `grep -c 'photosOpen(' app.js` | **4**, at or below the ceiling of 4 |
| `renderPhotos` returns before the album call on the closed branch | pass |
| Five named branch positions in source order, quota named in a comment | pass |
| All five ladder copy keys referenced | 5 / 5 |
| `grep -c 'photos.gate.cta' app.js` | **0**, no fourth way to say "register" |
| `createElement('input')` in the photos region | **1**, and its type is `file` |
| `awk` over the photos region for `=== 5` / `>= 5` / `< 5` | **0**, the limit is config-read |
| `awk` over `photosRemaining` for `Math.max` | 1 |
| `git diff -U0 -- styles.css` for a layout-property transition | **0** |
| `git diff -U0 -- styles.css` for a new custom property | **0** |
| `awk '/#photos-body/,/}/' styles.css \| grep -c '220ms'` | 1 |
| CSS brace balance after the edit | 329 / 329 |
| `git diff --stat` against the plan base | exactly `app.js` and `styles.css` |

### The behavioural proof

The plan's gates are greps, and a grep cannot tell a wired gate from a plausible one. Both harnesses
extract the **shipped source text** of the functions out of `app.js` by regex and drive it, so what
ran is what is committed. Scratchpad only; nothing was added to the repo.

**Harness 1, the arithmetic.** All four values of `photos.opensAt`, plus the absent case:

| Claim | Observed |
|---|---|
| A future timestamp closes the portal | `false` |
| A past timestamp opens it | `true` |
| `null` opens it | `true` |
| `'not a date'` opens it | `true` |
| An absent key opens it | `true` |
| One millisecond before the moment | closed |
| Exactly the moment, and one millisecond after | open |
| The parsed value is offset-bearing, not local | equals `Date.parse('2026-10-03T11:00:00Z')` |
| Ten ticks spanning the moment call `renderPhotos()` | **once** |
| `opensAt` is strictly earlier than `startsAt` in `config.js` | pass |

**The whole run was then repeated under `TZ=Pacific/Auckland` and every value was identical**, which
is D-04 observed rather than asserted: a guest whose phone is set to another country sees the same
instant.

The moment renders per language on Europe/Copenhagen, at 13:00 in all three:

- en: *Uploads open on 3 October 2026 at 13:00. Nothing is required from you until then.*
- it: *I caricamenti si aprono il 3 ottobre 2026 alle ore 13:00. Fino ad allora non devi fare nulla.*
- da: *Upload åbner 3. oktober 2026 kl. 13.00. Indtil da skal du ikke gøre noget.*

**Harness 2, the ladder.** `renderPhotos()`, `closedPanel()`, `buildGatePanel()` and `pendingBlock()`
driven against a minimal element stub. **This is what caught the one real defect in this plan.**

| Claim | Observed |
|---|---|
| A future moment renders `data-body="closed"` in the pending grammar | pass |
| The closed body reuses the existing pending title | pass |
| No `{when}` brace survives substitution, in any language | pass |
| **No album below the closed body (D-06)** | `renderAlbum` called 0 times |
| Blank credentials render the unchanged pending keys, no album | pass |
| The not-registered body carries the heading, the lede and one anchor | pass |
| The anchor's label is `hero.cta.enrol` verbatim and its href is `#enrol` | pass |
| **No input element of any kind in the gate body** | 0 |
| The album IS below the gate and below the control | 1 call each |
| `null`, malformed and absent `opensAt` all reach the upload body | 3 / 3 |
| Unconfigured outranks closed; closed outranks the registration gate | pass |

## Deviations from Plan

### 1. [Rule 3 - Blocking] Waves 1 and 2 had already shipped three of Task 2's builders

**Found during:** Task 2, before any edit
**Issue:** The plan asks for `remainingPhotos()`, `remainingField()` and `gatePanel()`, and gates on
`grep -q "function <name>("` for each. Plans 04-01 and 04-02 had already shipped the same three
things under different names and shapes: `photosRemaining()` (with the identical `Math.max(0, ...)`
clamp and config read), `buildGatePanel()` (with the identical heading, lede and `hero.cta.enrol`
anchor), and the remaining-count field built inline inside `buildUploader()` rather than as a
separate builder. The permanence line, the `refreshPhotosState()` re-seat and the `.uploader__acts`
touch rules were also already in place.
**Fix:** Kept the shipped names and shapes; did not rename. Three reasons. The phase registry in
`04-01-PLAN.md` assigns this plan only `photosOpenMs`, `photosOpen()` and `formatOpensAt()`, and
does not register the other three names at all, so the local table in `04-03-PLAN.md` is the only
document that disagrees. `04-02-SUMMARY.md`'s `provides:` block would become wrong. And renaming
working, harness-proved code to satisfy a grep is churn carrying real regression risk for zero
behavioural gain. The gates were run against the actual names and all pass; the *intent* of each
criterion holds. Same class as `04-01`'s deviation 1 and `04-02`'s deviation 3.
**Files modified:** none
**Commit:** n/a

### 2. [Rule 1 - Bug] The not-registered gate rendered invisible

**Found during:** Task 2, by harness 2
**Issue:** `styles.css:1541` sets `.panel { opacity: 0 }` and reveals it only on `data-show="1"`.
The enrollment section reaches its panels through `mountPanel()`, which sets that attribute.
`renderPhotos()` does not: it calls `host.appendChild(buildGatePanel())` directly. So body C, the
registration gate, was appended at zero opacity and stayed there. A guest with no stored name saw an
empty section above the album, which is the exact failure D-02 exists to prevent, and it would have
shipped: every grep in the plan passes on the broken code.
**Fix:** One line in `renderPhotos()`, after the body is appended, setting `data-show="1"` on any
`.panel` in the host. Placed in the ladder rather than in `buildGatePanel()` deliberately, so plan
04-04's `quotaPanel()` — also a `.panel`, also appended by this ladder — cannot ship with the same
defect. Written synchronously rather than on the next frame, because `#photos-body` now owns the
body-swap fade and one fade per swap is the contract.
**Files modified:** app.js
**Commit:** `0abfc62`

### 3. [Rule 3 - Blocking] Two acceptance greps are unsatisfiable as written

**Found during:** Tasks 1 and 2

**a. `grep -c "it-IT"` must return 2.** The criterion reads "one for the schedule formatter and one
for this one". The file already contained **two** locale ternaries before this plan: `formatSchedule()`
at `app.js:273` and `formatDate()` at `app.js:3388`, the latter unknown to the planner. Adding
`formatOpensAt()` makes three. The criterion's own second clause — "and no new locale table object is
introduced" — is the testable intent, and it holds: `formatOpensAt()` copies the existing one-line
ternary and declares no map. Count is 3, comprising two pre-existing formatters and this one.

**b. `awk '/function refreshPhotosState\(/,/^  }/' app.js | grep -c 'remaining'` must return at
least 1.** The function re-seats the figure through `photosRemaining()`, which is capitalised, so a
case-sensitive lowercase grep returns 0. Run case-insensitively it returns 1. The intent — the
figure is re-seated rather than the control rebuilt, so a ticking number never destroys a queue
still on screen — holds and is visible in the four-line body.

**Files modified:** none
**Commit:** n/a

### 4. [Rule 3 - Blocking] The `maxPerGuest` occurrence-count gate is satisfied by one reader, not two

**Found during:** Task 2
**Issue:** The criterion asks for `maxPerGuest` in "at least two places in the photos region". There
is exactly one: `photosMaxPerGuest()`, which every other call goes through.
**Fix:** Left at one. Two parses of one config value are two numbers that drift apart on a typo,
which is the argument `04-02`'s deviation 4 already made when it extracted `maxFileMb()` for exactly
this reason. The criterion's stated intent — "the limit is read from config and is never written as
a bare literal" — is gated by the companion grep for `=== 5` / `>= 5` / `< 5` in the photos region,
which returns **0**. Plan 04-04's `hitQuota()` adds the second occurrence.
**Files modified:** none
**Commit:** n/a

### 5. [Rule 3 - Blocking] The permanence line stays in the body face

**Found during:** Task 2
**Issue:** The plan's action text says `.uploader__note` is "in the mono micro step". The UI-SPEC's
typography table, which is the approved and binding design contract, assigns the permanence line
**IBM Plex Sans 13px / 1.5 / `--ink-dim`**, and lists `.uploader__status` separately as the mono one.
The shipped rule matches the UI-SPEC.
**Fix:** Left as the UI-SPEC specifies. The contract outranks the plan's prose, and the distinction
is real: the status line is machine chatter and the permanence line is a sentence a guest must read
and act on.
**Files modified:** none
**Commit:** n/a

### 6. [Rule 2 - Missing critical functionality] The body swap's attribute is inverted against `.panel`'s

**Found during:** Task 2
**Issue:** The obvious implementation copies `.panel` exactly: `#photos-body { opacity: 0 }` revealed
by `data-show="1"`. But `#photos-body` is not built by JavaScript — `index.html:300` ships a static
`.pending` block inside it for a guest whose script never runs, and phases 1 to 3 kept that block
deliberately. A default of zero opacity would hide it.
**Fix:** `#photos-body[data-show="0"] { opacity: 0 }`, so the attribute's *absence* is the opaque
state. `renderPhotos()` writes `"0"` before building and clears it on the next frame. The
reduced-motion rule resets both the transition and the opacity, because the container waits a frame
for its attribute and a 0.01ms transition and no transition are not the same thing when the state
change arrives after the paint — the same reason `.panel`'s rule is written out rather than left to
the global clamp.
**Files modified:** styles.css, app.js
**Commit:** `0abfc62`

## Known Stubs

None introduced by this plan. The phase's one outstanding stub is `04-02`'s: the `full` control state
is declared in `UPLOADER_STATES` and never written, because the quota body is plan 04-04's. The
position it slots into is now **named in a comment inside the ladder**, so that insertion is
unambiguous.

## Outstanding verification

**Neither `<human-check>` was performed, and their eleven observations are NOT recorded.**
`human_verify_mode` is `end-of-phase` in `.planning/config.json` and plan 04-05 is the device pass
that owns them. Both need `node tools/preview.js`, a browser, a 320px viewport and a touch pointer.

Carry to the device pass:

*From task 1 (five observations).* Exercise all four values of `photos.opensAt`:

1. A future timestamp renders the closed panel with the moment in the current language, no album.
2. A past timestamp renders the upload body with the album.
3. `null` renders the upload body.
4. `'not a date'` renders the upload body, never the closed one.
5. With a timestamp roughly thirty seconds ahead and the page left open, the section switches itself
   to the upload body within a second or two of that moment, once, without flicker.

Observations 1 to 4 are proved logically by harness 2, which drove the actual ladder source through
all four values and read back `data-body` and the album call count. Observation 5's arithmetic and
single-flip behaviour are proved by harness 1. What only a browser can settle is the 220ms opacity
swap actually running rather than degrading to an instant cut, and whether that reads as flicker.

*From task 2 (six observations).* At 320px in Danish:

1. The remaining count reads five, above the permanence line, above the button.
2. The button is at least 56px on a touch pointer and spans the full width.
3. The Danish `photos.cta` label holds one line.
4. The Danish `photos.permanent` line takes at most three lines and the button stays visible.
5. Uploading one photograph makes the figure read four, unanimated, without destroying the queue.
6. Clearing the stored name and reloading renders the registration gate with the existing register
   label, the album still below it, and no name field.

Observation 6's structure is proved by harness 2 (heading, lede, one anchor with `hero.cta.enrol`
and `href="#enrol"`, zero input elements, album rendered). **Observation 6 is also the one that would
have failed before deviation 2**, and it is worth re-running on a device to confirm the panel is
visibly there rather than merely present in the DOM. Observations 1 to 5 are typography and touch
geometry, which only a device settles.

Requirements were deliberately **not** marked complete in `REQUIREMENTS.md`, following `04-01` and
`04-02`. PH-02 and PH-08 are phase-level, and plans 04-04 and 04-05 are still outstanding.

## Threat Flags

None. No security-relevant surface was introduced beyond the `<threat_model>` register, and three of
its rows are discharged by this plan:

- **T-04-17** (a malformed `opensAt` locking every guest out on the night, severity high): the
  parse-failure branch returns open, `null` opens immediately, and both were observed across five
  input values including the absent case, under two timezones. This was the one place in the phase
  where a wrong default is unrecoverable from a phone.
- **T-04-19** (the gate body prompting for a name and creating a second identity surface): harness 2
  walked the rendered gate body and found zero input elements of any type; the whole photos region
  contains exactly one `createElement('input')` and its type is `file`.
- **T-04-20** (a second timer running once a second on a phone at a party): the gate rides
  `renderCountdown()`, the interval count in the file is still 1, and the per-tick cost is one
  integer comparison that returns early unless the boolean flips.

**T-04-18** (a stored count above the maximum) is mitigated by `photosRemaining()`'s `Math.max(0, …)`
clamp, which was already in place from `04-02` and is re-verified here. It is not fully discharged
until plan 04-04 routes a zero to the quota body.

## Self-Check: PASSED

- `app.js` and `styles.css` both present and modified
- commit `edd9500` found in `git log`
- commit `0abfc62` found in `git log`
- `git diff --stat` against the plan base `51912c3` shows exactly the two planned files, no others
- `.planning/phases/04-photos/04-03-SUMMARY.md` present
