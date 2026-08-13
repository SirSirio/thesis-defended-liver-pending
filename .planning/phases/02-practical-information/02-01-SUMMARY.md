---
phase: 02-practical-information
plan: 01
subsystem: location-section
tags: [location, address, clipboard, maps, i18n, touch-targets]
status: complete
requires:
  - phase 1 design system (.btn, .pending, .facts, toast(), t(), $, $$)
  - config.js venue block
  - copy.js three language tables
provides:
  - "app.js pendingBlock(titleKey, bodyKey)"
  - "app.js renderLocation()"
  - "app.js wireLocation()"
  - "app.js isApplePlatform()"
  - "app.js directionsUrls(address)"
  - "#loc-data, the rebuilt child of #location-body"
  - ".addr .addr__label .addr__value .addr__note .dirs .copybtn CSS"
  - "copy.js loc.lede loc.address loc.copied.toast loc.copy.failed loc.copy.failed.toast"
affects:
  - "plan 02 appends #loc-map as a sibling of #loc-data"
  - "plan 02 and 03 reuse pendingBlock() for their own pending states"
  - "the course fact table now shows the address with no code change"
tech-stack:
  added: []
  patterns:
    - "renderX() zero-arg contract, joined to the applyLanguage() re-render chain"
    - "wireX() one-shot delegated listener wiring, called from init()"
    - "createElement plus textContent only, never a markup string"
    - "container split into a rebuilt child and a persistent sibling"
key-files:
  created: []
  modified:
    - config.js
    - copy.js
    - index.html
    - app.js
    - styles.css
decisions:
  - "The address is split on its first comma for display only; venue.address stays intact for the clipboard and both map URLs"
  - "Apple platform detection fails open: no readable signal shows both buttons"
  - "Location touch target minimums moved out of the shared coarse pointer block, because that block sits above .btn and lost the cascade"
metrics:
  duration: 7m
  completed: 2026-08-13
actuals:
  tokens: 5100
  tasks: 3
  commits: 4
---

# Phase 02 Plan 01: Location Data Core Summary

The confirmed address now renders from config through `renderLocation()` in three languages, with a three tier clipboard cascade that never fails silently and both map handoffs opening a route rather than a pin.

## What Was Built

`#location-body` is now split into two separately owned children. `#loc-data` is cleared and rebuilt by `renderLocation()` on every language switch; the map slot that plan 02 adds will be a sibling that survives those rebuilds, which is what stops a language switch from tearing down a mounted iframe and making the guest pay Google a second time on mobile data.

Inside `#loc-data`, a non-empty `venue.address` produces a labelled `.addr` data field in IBM Plex Mono at 19px, split across two lines on its first comma, followed by a `.dirs` action row holding Google, Apple and Copy in that order. A null address produces exactly one `.pending` block and nothing else: no disabled buttons, no dead affordances, no empty shell.

| Task | Name | Commit | Key files |
|---|---|---|---|
| 1 (tracer) | End to end address, config to rendered DOM in three languages | `27cc4e9` | config.js, copy.js, index.html, app.js, styles.css |
| 2 | Copy address, three tier cascade, four button states | `1fd9996` | copy.js, app.js, styles.css |
| 3 | Google and Apple directions handoffs with platform detection | `c91d48b` | app.js, styles.css |
| Rule 1 fix | Touch target minimums made to actually apply | `00e877f` | styles.css |

## Verification Results

All seven plan-level verification items pass, plus every task gate.

| # | Check | Result |
|---|---|---|
| 1 | `node --check app.js` | exit 0 |
| 2 | copy.js parity | 98 keys, three byte-identical key sets |
| 3 | config.js address | 45 chars, code point 229 at index 5, proving UTF-8 rather than a mangled codepage |
| 4 | `enrol-form` tripwire | exactly 2, both pre-existing, `enrollmentReady()` untouched |
| 5 | `--ink-faint` | exactly 4, unchanged, no new element on the failing token |
| 6 | dash scan | zero U+2014 and zero U+2013 across all five files |
| 7 | `<iframe` in index.html | zero |
| ES5 | `const`/`let`/arrow/`innerHTML` | zero, zero, zero, zero |

### Behaviour proven beyond the source gates

The plan routes DOM behaviour to `human-check` because the project forbids a build step and has no DOM harness. That constraint was respected: no test infrastructure was added to the repo. `app.js` was instead driven through a throwaway DOM stub in the scratchpad, which confirmed the three states the must-have truths describe.

- **Address set, EN:** `#loc-data` contains `.addr` with the label "Address" and two spans reading `Trongårdsvej 46` and `2800 Kongens Lyngby, Denmark`, then `.dirs` with the Google anchor and the copy button.
- **Language switched to DA:** the label becomes "Adresse" and the button becomes "Kopiér adresse" while the address string itself is byte-identical. The static `.pending` shipped in `index.html` is correctly discarded on first render.
- **Address blanked:** exactly one `.pending` block, zero map slots, zero directions buttons, zero copy buttons.
- **Simulated iOS Safari:** all three buttons in the order Google, Apple, Copy, the Apple href carrying `daddr=` and `dirflg=d`, both anchors carrying `target="_blank"` and `rel="noopener"`.
- **Apple detection across seven browser shapes:** iOS Safari, iPadOS 13+ reporting `MacIntel`, and macOS Chrome all show the button; Android Chrome, Windows Chrome and Linux Firefox all hide it; a navigator with no readable signal shows it, per D-06's fail-open rule.

### Still owed to a real device (D-23)

Clipboard permission behaviour, text selection on failure, native app handoff, and measured touch targets cannot be exercised without real hardware. These remain the plan's `human-check` items and are covered by the phase's D-23 pass.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Both coarse pointer touch target minimums were dead on arrival**

- **Found during:** Task 3, while re-reading the assembled stylesheet
- **Issue:** The plan instructs putting the copy button's 52px and the directions buttons' 56px coarse pointer minimums "inside the existing coarse-pointer block". That block sits at line 231, well above `.btn { min-height: 48px }` at line 395. Media queries carry no specificity of their own, so `.copybtn` (one class) lost to `.btn` (one class) on source order and resolved to 48px. The directions rule lost the same way to the equal specificity 52px fine pointer rule declared below it, resolving to 52px instead of 56px. Every minimum in the UI-SPEC Touch Target Geometry table silently did nothing, on exactly the devices the table exists for: cold thumbs outdoors.
- **Fix:** Moved both into a `@media (pointer: coarse)` block placed immediately after the `.dirs` component rules, where source order resolves them correctly. Left a comment in the shared block pointing at the new location, and a comment at the new location explaining why it is not in the shared block, so nobody tidies it back and silently reintroduces the bug.
- **Why this is Rule 1 and not Rule 4:** no structural change. Two rules moved roughly 350 lines down the same file, same selectors, same values.
- **Files modified:** styles.css
- **Commit:** `00e877f`

Note that the plan's own guidance and `02-PATTERNS.md` both say the 44px requirement is met "by joining the coarse-pointer block, not by one-off rules". That advice holds for the block's existing entries (`.langswitch button`, `.mark`, `.facts__row--egg`) because none of them collide with a later equal-specificity rule. It does not hold for anything carrying `.btn`.

### Deliberate refusals carried out of the plan

Recorded so a later phase knows these were considered rather than forgotten:

- **No loading or error state on either directions anchor.** The OS owns the transition, and every heuristic for "did the native app open" produces false negatives on slow devices, which would show an error to a guest whose map app opened perfectly.
- **No `aria-live` on the copy button.** `#toast` already carries `role="status"` with a polite live region and is the single announcement channel. A live region on a control re-announces its own label on every change.
- **No `checkpoint:decision` on the one-way address publication.** Per the plan's stated decision 4: CONTEXT.md D-01 records the owner confirming this exact address, so gating it would be re-asking a decision already made.

## Known Stubs

None. Every affordance this plan renders is wired to real data or is absent from the DOM by construction.

`loc.pending.*` remains wired even though a real address now ships, because CFG-03 requires the config to degrade if the owner ever blanks it. That is a live degradation path, verified above, not a stub.

## Threat Flags

None. The plan's `<threat_model>` anticipated every trust boundary this plan touches, and both `mitigate` dispositions are implemented and gated.

| Threat ID | Disposition | Status |
|---|---|---|
| T-02-01 tampering via config strings written to the DOM | mitigate | Every node built with `createElement` and filled with `textContent`. Gate: zero `.innerHTML =` in app.js. |
| T-02-02 window reference leaked to an opened origin | mitigate | `rel="noopener"` on both anchors via `setAttribute`. Gate: three occurrences of the noopener string in app.js. |
| T-02-03 clipboard write | accept | Write only, guest initiated, and the string is already rendered on the same page. |
| T-02-04 private residence address on a public page | accept | Owner decision, D-01. Recorded again here so the acceptance stays visible. |
| T-02-SC dependency supply chain | accept | Nothing installed. No package manager, no lockfile, no third-party runtime asset added by this plan. |

## Notes for Plan 02

- `#loc-data` is in place. Append `#loc-map` as a **sibling** inside `#location-body`, not inside `#loc-data`, or it will be destroyed on the next language switch.
- `renderLocation()` clears `#location-body` wholesale **only** on the first call, detected by the absence of `#loc-data`. Once `#loc-data` exists it clears only that child, so a mounted map survives.
- `pendingBlock(titleKey, bodyKey)` is available and does not need rebuilding.
- copy.js stands at 98 keys per table. Plan 02's two map keys take it to 100, matching the plan's running count.

## Self-Check: PASSED

All modified files present, all four commits verified in `git log`.

| Item | Result |
|---|---|
| config.js, copy.js, index.html, app.js, styles.css | all present, all modified |
| `27cc4e9` | found |
| `1fd9996` | found |
| `c91d48b` | found |
| `00e877f` | found |
| working tree | clean before this document |
