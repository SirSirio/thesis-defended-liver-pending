---
phase: 02-practical-information
plan: 02
subsystem: location-map
tags: [location, maps, iframe, lazy-loading, intersection-observer, i18n, motion, privacy]
status: complete
requires:
  - "plan 02-01: renderLocation(), #loc-data, #location-body split"
  - "phase 1 design system (tokens, .pending panel recipe, global reduced motion block)"
  - "config.js venue.address"
  - "copy.js three language tables, and the existing loc.maptitle key"
provides:
  - "app.js renderMapSlot()"
  - "app.js observeMap(slot)"
  - "app.js mountMap(slot)"
  - "#loc-map, the persistent sibling of #loc-data"
  - ".map-slot .map-wait .map-wait__bar .map-wait__line CSS, keyed on data-state"
  - "copy.js loc.map.loading loc.map.blocked in en, it and da"
affects:
  - "plan 03 renders into #access-body and is unaffected by the slot"
  - "plan 04's video slot copies this slot's fixed ratio recipe"
  - "any later change to venue.address now also moves the map, with no second code path"
tech-stack:
  added: ["Google Maps keyless embed, runtime third party asset, no package"]
  patterns:
    - "IntersectionObserver behind a capability guard that degrades to eager"
    - "one shot mount guarded by the presence of the child it would create"
    - "createElement plus setAttribute for a third party frame, never a markup string"
    - "state carried on a data-state attribute, styled in CSS, never class swaps"
    - "module scope timer cleared before it is set, matching toast() and copyFeedback()"
key-files:
  created: []
  modified:
    - copy.js
    - app.js
    - styles.css
decisions:
  - "renderLocation() branches instead of returning early, so renderMapSlot() runs on every path and a blanked address takes its map with it"
  - "observeMap() added as a third symbol beyond the plan registry, because the plan forbids creating the observer inside a renderer"
  - "The waiting layer is opaque and above the frame, so a half painted map never shows through the line saying the map is not needed"
  - "The blocked bar parks at full width rather than freezing at a quarter, which would read as stalled progress"
metrics:
  duration: 17m
  completed: 2026-08-14
actuals:
  tokens: 5867
  tasks: 3
  commits: 3
---

# Phase 02 Plan 02: The Map Slot Summary

The interactive map now mounts itself from a keyless URL when the guest comes within 400px of
the Location section, once, and a blocked or very slow embed says in three languages that the
address above already works.

## What Was Built

`#loc-map` is a fixed ratio panel appended to `#location-body` as a sibling of `#loc-data`. It
is created once, on the first render that finds an address, and never rebuilt. Nothing reaches
Google until an `IntersectionObserver` with a 400px rootMargin reports the slot approaching the
viewport, at which point one iframe is created in JS, appended, and revealed on the next frame.
A guest who never scrolls to Location never contacts Google at all.

The slot carries its state on `data-state`, which is the idiom `renderCountdown()` and
`renderNudge()` already use, and all three states are styled from that attribute rather than
from class swaps.

| State | What the guest sees |
|---|---|
| `mounting` | The panel at its final height, a thin red rule sweeping the top edge, and one centred mono line saying the address above works without the map. |
| `ready` | The waiting layer crossfades out over 220ms and the live map crossfades in underneath it. |
| `blocked` | After 8000ms with no `load`, the line swaps to naming the address and the buttons that still work, and the sweeping rule stops and parks dim. |

| Task | Name | Commit | Key files |
|---|---|---|---|
| 1 | The map slot and its waiting layer, mounted in the mounting state | `9215d2a` | copy.js, app.js, styles.css |
| 2 | Lazy mount on approach, idempotent, with an eager fallback | `c4df325` | app.js, styles.css |
| 3 | The blocked state, which never tears down a working frame | `3b51244` | app.js, styles.css |

## Verification Results

All seven plan-level verification items pass, plus all three task gates
(`SLOT_GATE_PASS`, `MOUNT_GATE_PASS`, `BLOCKED_GATE_PASS`).

| # | Check | Result |
|---|---|---|
| 1 | `node --check app.js` | exit 0 |
| 2 | copy.js parity | 100 keys, three identical key sets |
| 3 | `<iframe` in index.html | 0, so the frame exists only as a `createElement` call |
| 4 | `setAttribute('sandbox'` / `setAttribute('allow'` | 0 and 0, both UI-SPEC refusals held |
| 5 | `.innerHTML =` in app.js | 0 |
| 6 | `enrol-form` tripwire | exactly 2, both pre-existing, `enrollmentReady()` untouched |
| 7 | `--ink-faint` | exactly 4, unchanged |
| ES5 | arrow functions, `const`/`let` | 0 and 0 |
| dashes | U+2014 and U+2013 across all five files | 0 |

### Behaviour proven beyond the source gates

The plan routes runtime behaviour to `human-check` because the project has no DOM or network
harness and forbids a build step. That constraint was respected: **no test infrastructure entered
the repo.** `app.js` was driven through a throwaway DOM stub in the scratchpad, with a fake
`IntersectionObserver` and a controllable clock, which proved the following. Every claim below
is a passing assertion, not an inspection.

**Slot lifecycle and language**

- The slot is a sibling of `#loc-data`, never a child, and the container's children are in the
  order `loc-data, loc-map`.
- Switching EN to DA to IT translates the waiting line and rebuilds `#loc-data`, while the slot
  node identity is unchanged across all three switches. One slot only, at every point.
- Blanking `venue.address` removes the slot and leaves exactly one `.pending` block, zero
  `.addr`, zero `.btn`, zero `.map-slot`. Restoring the address brings the slot back in
  `mounting`.

**Mounting**

- One observer, `rootMargin: '400px 0px'`, observing the slot. Zero frames before intersection.
  A non-intersecting entry mounts nothing.
- An intersecting entry mounts exactly one frame and disconnects. Two further intersecting
  entries after that still leave exactly one frame, which is the idempotency guard doing its
  job.
- The src is exactly
  `https://www.google.com/maps?q=Trong%C3%A5rdsvej%2046%2C%202800%20Kongens%20Lyngby%2C%20Denmark&output=embed`,
  with no `key=` anywhere. The a-ring survives as `%C3%A5`, which is the whole reason the
  encoding path is shared with the directions URLs.
- `loading="lazy"`, `referrerpolicy="no-referrer-when-downgrade"`, translated `title`, and no
  `sandbox` and no `allow` attribute on the mounted element.
- The frame is appended hidden and gets `data-show="1"` on the next animation frame, so the fade
  runs from the hidden state.
- With `IntersectionObserver` absent from `window`, the frame mounts immediately at first
  render and every attribute assertion above still holds. A missing capability degrades to
  eager, never to absent.
- After the map is live, a language switch produces no second frame, keeps the same node, keeps
  the slot in `ready`, and translates the frame `title` in place.

**Blocked**

- No timer exists before the frame is mounted. Exactly one 8000ms timer is armed with it.
- On expiry the slot goes to `blocked` and the line becomes the blocked string. The frame is
  still in the DOM and its `src` is byte identical to what it was armed with.
- A language switch while blocked shows the blocked string in IT and then DA, and does not
  revert to the loading string.
- A `load` firing after the blocked message still sets `ready`, on the same frame element. The
  late load recovers, which is the entire reason the timeout is a message swap.
- A normal `load` clears the timer, so it cannot later blank a live map. Blanking the address
  also clears it.

### Still owed to a real browser (D-23)

Animation timing, the fixed ratio box, the reduced-motion branch, the crossfade, real network
timing and the true absence of a request at first paint are rendering and network behaviour that
no stub can prove. These remain the plan's three `human-check` blocks and are covered by the
phase's D-23 pass.

## Deviations from Plan

No auto-fixes were needed. Three implementation decisions went slightly beyond the letter of the
plan and are recorded rather than left to be discovered.

**1. `renderLocation()` branches instead of returning early**

The plan requires `renderMapSlot();` to be the last line of `renderLocation()` and to be called
from exactly one place, and separately requires that a blanked address removes the slot. Those
two are incompatible with the existing early return in the no-address path, which would skip the
call and strand a mounted map above a pending block. The address-present body moved into an
`else`, indentation only, no logic changed. One call site, reached on every path.

**2. `observeMap(slot)` is a third symbol, beyond the two in the plan's registry**

The plan says the observer is "created once and never inside a renderer", which rules out
inlining it into `renderMapSlot()`, and the registry lists only `renderMapSlot()` and
`mountMap(slot)`. A named function is the only shape that satisfies both, so `observeMap(slot)`
exists. It is called from the slot creation path only, never from the update path, which is the
acceptance criterion the registry was protecting.

**3. The blocked loader bar parks at full width, dimmed**

The plan says to stop the animation in the blocked state. Stopping it alone leaves a quarter
width bar frozen at the left edge, which reads as progress stalled at 25 percent next to a line
saying the map did not load. It is parked at full width and 0.35 opacity instead, matching the
reduced-motion treatment of the same element, so it reads as a closed rule rather than a stalled
one. There was never any progress to report.

### Deliberate refusals carried out of the plan

Recorded so a later phase knows these were considered rather than forgotten.

- **No `sandbox` on the frame.** A sandboxed Maps embed cannot run its own scripts and renders
  blank, which trades a working map for the grey box this whole slot exists to avoid.
- **No `allow="geolocation"`.** Nothing here needs the guest's position, and asking would put a
  permission prompt between a cold guest and an address.
- **No teardown on timeout.** The frame is never removed, its src is never cleared, and it is
  never stopped. A timeout that destroys a working element is worse than the wait it was meant
  to fix.
- **No graph paper texture, repeating gradient, skeleton shimmer or map pin silhouette** in the
  waiting layer. All four were rejected in the UI contract and none was added.
- **No second confirmation surface** for the map. The slot's own line is the single channel.

## Known Stubs

None. Every element this plan renders is wired to real config or is absent from the DOM by
construction. The waiting layer is a live state with real copy, not a placeholder.

## Threat Flags

None. The plan's `<threat_model>` anticipated every trust boundary this plan touches, and all
three `mitigate` dispositions are implemented and gated.

| Threat ID | Disposition | Status |
|---|---|---|
| T-02-05 information disclosure to Google | mitigate | `referrerpolicy` set, keyless URL carrying only the venue address, no position permission, and no contact with Google at all until intersection. Gates 3, 4 and the `output=embed` grep. |
| T-02-06 frame reaching into the host page | accept | Cross origin isolation plus no `postMessage` listener on the page. `sandbox` refused with its reason recorded in the source. |
| T-02-07 dead panel on a blocked network | mitigate | 8000ms message swap naming the address and the buttons, frame left intact, late load still resolves. Proven in the stub run. |
| T-02-08 tampering via the address in the src | mitigate | `encodeURIComponent` on the shared encoding path, `setAttribute` on a created element. Gate 5: zero markup string assignment in app.js. |
| T-02-SC dependency supply chain | accept | Nothing installed. The Google embed is a runtime asset, modelled as T-02-05 and T-02-06. |

## Notes for Plan 03 and 04

- `#loc-map` is now permanent inside `#location-body`. Plan 03 renders into `#access-body` and
  does not touch it.
- The fixed ratio recipe plan 04's `.video-slot` needs is in `styles.css` directly above the
  footer banner: panel fill, hairline border, `--r-sm`, `position: relative`,
  `overflow: hidden`, `aspect-ratio`. Copy the shape, not the breakpoint: the video slot's ratio
  comes from `--video-aspect` and `door.aspect`, not from a media query.
- copy.js stands at **100 keys per table**. Plan 03 adds ten (`access.dir.*`, `access.notes.heading`,
  `notes.*`) and plan 04 adds two, matching the phase registry's running count.
- `--ink-faint` is still at exactly 4 occurrences and the gate counts comment text too, so do
  not name the token in a comment. Say "the faint ink token" instead.
- The reduced-motion query count in `styles.css` is now 2. Plan 04 adds no animation, so it
  should stay at 2.

## Self-Check: PASSED

| Item | Result |
|---|---|
| copy.js, app.js, styles.css | all present, all modified |
| `9215d2a` task 1 | found in git log |
| `c4df325` task 2 | found in git log |
| `3b51244` task 3 | found in git log |
| `.planning/phases/02-practical-information/02-02-SUMMARY.md` | present |
| working tree | clean apart from the pre-existing `.planning/config.json` change and `.gsd/`, neither of which belongs to this plan |
