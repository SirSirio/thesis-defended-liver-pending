---
phase: 02-practical-information
verified: 2026-08-14T11:25:00Z
status: passed
re_verification: yes
score: 14/17 must-haves verified
behavior_unverified: 3
overrides_applied: 3
supersedes: "gaps_found report of 2026-08-14T12:00:00Z (pre-fix)"
overrides:
  - requirement: ACC-01
    truth: "Video plays inline on real iOS Safari with no fullscreen takeover (D-23)"
    reason: "Not testable. door.videoSrc is null (config.js:108), and app.js:871 returns the
      pending panel without constructing a <video> element at all, so there is nothing on the
      page to play. Blocked on the owner supplying a door video, not on willingness to test.
      Attribute correctness IS verified in source: playsinline, muted, controls and
      preload=metadata are set as both attribute and property in one construction path."
    recheck_when: "door.videoSrc is set to a real file"
    waived_by: owner
  - requirement: DEL-02
    truth: "Works on iOS Safari, Android Chrome, desktop Chrome and Firefox"
    reason: "Real-device pass deliberately waived by the owner. No build step, no device
      harness, and none may be added (locked constraint). Sheet exists at 02-DEVICE-PASS.md
      if it is ever run."
    waived_by: owner
  - requirement: DEL-03
    truth: "Usable on a mid-range phone on mobile data"
    reason: "Same waiver as DEL-02. Note the bad-network case this requirement turns on is the
      one gap 1 closed, and that fix IS verified in source and by independent code review."
    waived_by: owner
---

# Phase 2: Practical Information — Re-Verification (post gap closure)

**Phase Goal:** The core value delivered. A guest outside the building can find the door.
**Done when:** the address and door instructions are findable in seconds on a phone, at night,
on a bad connection.
**Status:** passed, with three owner-waived backstop items recorded above.

## Why this report supersedes the previous one

The prior report (`gaps_found`, 11/17) was written before plan `02-05` existed. That plan was
written and executed specifically to close its two gaps, in commits `703ab95`, `f59c8eb`,
`249a75a`, `daca094`. This report re-derives against the tree as it now stands.

## Gap 1 — CLOSED

*The blocked map state was unreachable on the fast-failure network.*

An iframe `load` event fires for any completed document, so Google's 403/404/429 pages, captive
portals and DNS-block error pages all set `data-state="ready"` and cleared `mapTimer`; CSS then
hid `.map-wait`, suppressing `loc.map.blocked` on the most common failure network.

Verified closed:

| Check | Evidence |
|---|---|
| `load` no longer cancels the fallback timer | The listener now contains only `slot.setAttribute('data-state','ready')` — no `clearTimeout` |
| Guidance reaches every failure family | New `loc.map.fallback` key renders into `p#loc-map-note`, revealed by `.map-slot[data-state="ready"] + .map-note` (styles.css:781) |
| Reveal is not source-order dependent | `0-3-0` against `.map-note`'s `0-1-0`; figure recorded in the stylesheet comment at styles.css:751 |
| No reflow when the map lands | `.map-note` hides by `visibility`, never leaves flow; zero `display:` inside the block |
| `loc.map.blocked` is not dead copy | The 8000ms timer and its `ready` guard are untouched; the no-document path still reaches `blocked` |
| Copy parity | en/it/da at 114 keys each, key sets byte-identical, no en/em dashes |

Independently confirmed by the post-fix code review (`02-REVIEW.md`, committed `7556a98`), which
probed the adjacency invariant across the language-switch rebuild and the null-address teardown
and found the two-channel contract holding in all four load/timer orderings.

WR-04's drafted `frame.clientHeight > 0` check was deliberately **not** wired: `.map-slot iframe`
is `position:absolute; inset:0; height:100%`, so its measured height is the slot's height and is
non-zero for an error page exactly as for a working map. It discriminates nothing.

## Gap 2 — CLOSED

*Requirement checkboxes claimed verifications that had not occurred.*

`.planning/REQUIREMENTS.md` now records exactly nine phase-02 IDs checked — `LOC-01`, `LOC-02`,
`LOC-03`, `LOC-04`, `LOC-05`, `ACC-02`, `ACC-03`, `ACC-04`, `ACC-05` — and exactly three
unchecked: `ACC-01`, `DEL-02`, `DEL-03`. The three unchecked are the three this report waives
above; they remain `[ ]` deliberately, because a waiver is not a verification and checking them
would recreate the exact defect this gap existed to close.

## Warning — CLOSED

`.planning/STATE.md`'s owner-input table now names the venue address as set from `config.js:44`
per D-01, and carries its own row for the written door directions (`door.directions`, still null),
which D-12 makes the fast path on a weak signal.

## Outstanding, carried forward

Not phase-02 truths, recorded so they are not lost:

- **CR-01** (`app.js:117-145`) — countdown renders `NaN:NaN:NaN:NaN` when `startMs` is `NaN`.
  `'2026-10-03 16:00'` parses in V8 and returns `NaN` in Safari: invisible on desktop, total on
  guests' phones. Phase-01 code.
- **CR-02** (`app.js:1074-1132`) — `Math.ceil` of `(-1,0]` yields `-0`, so "Registration closes
  today" shows for 24 hours after the deadline while `renderDeadline()` correctly hides the hero
  line. Phase-01 code.
- **CR-03** (`supabase/schema.sql:106-108`) — policy `"anon can amend own enrollment"` is
  `to anon using (true) with check (true)`; any anonymous client can rewrite any guest's row.
  Phase-03 territory, must close before enrollment ships.
- **WR-01** — `.map-slot iframe` hides with `opacity:0`, which does not remove it from the
  accessibility tree, so a screen reader in `blocked` state reads both the fallback sentence and
  whatever Google served. Partially undercuts the gap-1 fix for screen-reader users.
- **WR-06** — private residential address and hosting window published on GitHub Pages with rich
  OG tags, no `robots.txt` and no `noindex`. Sharpens in phase 3 when names arrive.

---

_Verified: 2026-08-14T11:25:00Z_
_Closed with three owner-waived backstop items. `02-DEVICE-PASS.md` remains for the pass if ever run._
