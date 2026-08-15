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
