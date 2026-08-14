---
phase: 02-practical-information
verified: 2026-08-14T12:00:00Z
status: gaps_found
score: 11/17 must-haves verified
behavior_unverified: 5
overrides_applied: 0
gaps:
  - truth: "A slow or blocked map embed tells the guest in three languages that the address above already works (mounting, ready, blocked states in a fixed ratio box)"
    status: partial
    reason: "The 8000ms slow-failure path reaches the blocked state, but the fast-failure path does not. The iframe load handler sets data-state=ready and clears mapTimer for ANY completed document, and Google's error pages, captive portals, rate-limit interstitials and a DNS-blocked network's browser error page all fire load. styles.css then hides .map-wait entirely on ready. loc.map.blocked ships in en, it and da and is unreachable on the most common failure network, which is exactly the bad-connection case in the phase Done-when."
    artifacts:
      - path: "app.js"
        issue: "Lines 595-598: the load listener sets ready unconditionally and clears the blocked timer. Line 618: the timer's early exit trusts that ready state."
      - path: "styles.css"
        issue: "Lines 737-742: .map-slot[data-state=\"ready\"] .map-wait is faded to opacity 0 and visibility hidden, suppressing the line that carries the blocked message."
    missing:
      - "Treat load as 'a document arrived', not 'a map arrived': stop clearing mapTimer inside the load handler."
      - "Replace the ready early exit in the timeout with a check that the frame is actually painting content (for example frame.clientHeight > 0), or document that ready means 'a document arrived' and shorten the timeout accordingly."
      - "Either fix, or delete loc.map.blocked in all three languages so the repo does not carry copy no guest can reach."
  - truth: "DEL-02 and DEL-03 are satisfied (works on iOS Safari, Android Chrome, desktop Chrome and Firefox; usable on a mid-range phone on mobile data)"
    status: partial
    reason: "REQUIREMENTS.md lines 199-200 mark DEL-02 and DEL-03 as complete with [x], but the D-23 real-device pass that defines them has not been run. 02-04-SUMMARY.md itself states these abstain to human review rather than passing silently, and STATE.md names the device pass as the phase's one outstanding item. The traceability document therefore claims a verification that has not occurred."
    artifacts:
      - path: ".planning/REQUIREMENTS.md"
        issue: "DEL-02 and DEL-03 checked [x] ahead of the device pass they depend on."
    missing:
      - "Revert DEL-02 and DEL-03 to [ ] until the D-23 pass on real iOS Safari and real Android Chrome is recorded, then check them with the evidence."
behavior_unverified_items:
  - truth: "The copy button confirms success by swapping its label to loc.copied for 2000ms and firing a toast, and confirms failure by swapping to loc.copy.failed for 4000ms, through a three tier cascade that never fails silently"
    test: "On a real phone, tap Copy address. Then tap it repeatedly. Then test in an in-app browser (Instagram or Messenger) and with clipboard permission denied."
    expected: "Label swaps and reverts once per tap with no stacked reverts; the address including the a-ring pastes byte for byte; when both clipboard APIs refuse, the address text is selected on the page and the failure toast fires. Never a silent failure."
    why_human: "The three tier cascade is a runtime state machine over navigator.clipboard, document.execCommand and a Selection range. No test exercises the transitions and clipboard permission behaviour only exists on a real device."
  - truth: "The map frame is created only when the section approaches the viewport (400px rootMargin), the mount is idempotent, and a missing IntersectionObserver degrades to eager rather than to absent"
    test: "Open the page with devtools Network open and do not scroll. Then scroll to Location. Then reload and scroll past Location fast enough to fire several intersection callbacks."
    expected: "Zero requests to google.com before Location approaches; exactly one iframe and one request after; the observer disconnects after the first mount and no second frame appears."
    why_human: "IntersectionObserver firing, disconnection and the one-shot guard are runtime ordering invariants. The guard is present in source (app.js:554) but no test exercises the transition."
  - truth: "A language switch rebuilds both sections without a page reload, never remounts a loaded map, and re-appends the held video element rather than rebuilding it"
    test: "With the map loaded, switch EN to DA to IT with the Network panel open. With a video file configured, start playback and switch language mid-playback."
    expected: "No second request to google.com, the same iframe node, the slot stays in ready, both sub-headings and the frame title translate; playback continues uninterrupted and no metadata is refetched."
    why_human: "Node identity across re-render is a cleanup invariant. The module scope holds are present in source (app.js:452, 846-848) but presence cannot prove the node survives the rebuild."
  - truth: "Verified by hand on real iOS Safari and real Android Chrome before the phase closes (D-23, declared verification: backstop) — DEL-02, DEL-03, ACC-01"
    test: "Serve the working tree with tools/preview.js, reach 127.0.0.1:4173 from a phone on the same LAN, and check: video plays inline with no fullscreen takeover; clipboard copy including the a-ring and the o-slash; Google Maps opens a route in the native app on both platforms; Apple Maps opens on iOS and its button is absent on Android; both jumps land with the heading below the sticky bar; the back link measures at least 44px; the jump is instant with Reduce Motion on."
    expected: "Every item passes on both platforms."
    why_human: "Declared verification: backstop in 02-04-PLAN.md. The project forbids a build step and has no device or DOM harness, which is a locked constraint. Inline playback with no fullscreen takeover is the single behaviour this phase most needs and it cannot be proven from source."
  - truth: "At a 320px viewport with the real address present the page does not scroll horizontally, and Danish note labels do not truncate (declared verification: backstop)"
    test: "At 320px in Danish, with all seven venue.notes filled and door.directions set, check for horizontal scroll and truncated labels. Also confirm the in-slot pending panel fills the video slot rather than floating centred in it, with one border and no nested box, and that a 9/16 slot caps at 360px."
    expected: "No horizontal scroll, no truncated label, the panel fills the slot."
    why_human: "Rendering outcome. overflow-wrap: break-word is present at styles.css:557 and :849, and .video-slot .pending uses min-height rather than height, but only a real viewport shows the result."
---

# Phase 2: Practical Information Verification Report

**Phase Goal:** The core value delivered. A guest outside the building can find the door.
**Done when:** the address and door instructions are findable in seconds on a phone, at night, on a bad connection.
**Verified:** 2026-08-14T12:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Verdict in one paragraph

The phase goal is substantially achieved and the implementation is unusually disciplined: the
confirmed address renders from `config.js` through a real render chain, both map handoffs open a
route with the a-ring surviving encoding, the keyless embed contacts Google only on approach, the
written directions and notes render three and seven shapes respectively from one config value each,
and the video slot ships complete against a file that does not exist. I found no stubs, no dead
affordances, no hardcoded display data and no debt markers. Two gaps stand between this and a clean
pass, and neither is a missing feature. First, the map's blocked state — built, styled and written
in three languages — is unreachable on the fast-failure network, which is the exact bad-connection
case the Done-when names. Second, DEL-02 and DEL-03 are checked off in REQUIREMENTS.md ahead of the
device pass that defines them. Five further truths are present and wired but behaviourally
unproven, including the one behaviour the phase most needs (inline playback on real iOS Safari),
and those are the declared D-23 backstop rather than an omission.

## Goal Achievement

### Observable Truths

| # | Truth (req) | Status | Evidence |
|---|---|---|---|
| 1 | Address renders from config as selectable mono text under a translated label, split on the first comma (LOC-01) | VERIFIED | `app.js:346-379` builds `.addr` / `.addr__label` / `.addr__value` with `createElement` + `textContent`; `config.js:44` holds the real 45-char address; `styles.css:557` carries `overflow-wrap: break-word`; `copy.js` has `loc.address` in all three tables |
| 2 | Copy button exists only with an address, and confirms success and failure through a three tier cascade that never fails silently (LOC-01, D-10) | PRESENT_BEHAVIOR_UNVERIFIED | Cascade present and ordered: `navigator.clipboard.writeText` (`app.js:654`), `document.execCommand('copy')` (`app.js:684`), Selection range fallback (`app.js:693-701`), each terminating in `copyFeedback()` with a toast. Structure verified; the label-swap/revert transitions and clipboard permission behaviour are exercised by no test |
| 3 | The copied string is `CFG.venue.address` byte for byte, never read back out of the DOM (LOC-01) | VERIFIED | `app.js:648-651` reads the config value directly; spot-check confirms length 45 and code point 229 at index 5 |
| 4 | The map embed is keyless and `index.html` contains zero iframes (LOC-02, D-07, D-08) | VERIFIED | `app.js:571` builds `maps?q=...&output=embed` via `createElement` + `setAttribute`; spot-check of the produced URL shows no `key=`; `grep -cE '<iframe\|<embed\|<object' index.html` = 0 |
| 5 | Both direction links are route URLs, correctly encoded, `target=_blank rel=noopener`, and Apple is absent from the DOM on a clearly non-Apple platform (LOC-03, D-05, D-06) | VERIFIED | `directionsUrls()` at `app.js:272-278`; spot-check produced `dir/?api=1&destination=Trong%C3%A5rdsvej%2046...` and `maps.apple.com/?daddr=...&dirflg=d`; `isApplePlatform()` (`app.js:290-320`) is a pure three-signal read returning `!seen` so an unreadable navigator shows both buttons; the Apple anchor is inside the `if` at `app.js:410` |
| 6 | The map never blocks first paint: the frame is created only on approach, the mount is idempotent, and a missing IntersectionObserver degrades to eager (LOC-04) | PRESENT_BEHAVIOR_UNVERIFIED | `observeMap()` (`app.js:522-545`) with `rootMargin: '400px 0px'`, capability guard falling through to `mountMap()`, disconnect after first intersection; idempotency guard `if ($('iframe', slot)) return;` at `app.js:554`. Present and wired; the ordering invariant is exercised by no test |
| 7 | A slow or blocked embed tells the guest the address above already works, via mounting/ready/blocked in a fixed ratio box (LOC-04, LOC-05, D-09) | PARTIAL / FAILED | Slow path works: 8000ms timer at `app.js:616-622` swaps in `loc.map.blocked`, frame never torn down, a late load still resolves. Fast path does not: `app.js:595-598` sets `ready` and clears `mapTimer` on ANY completed document, and `styles.css:737-742` then hides `.map-wait`. Confirmed by review WR-04. See Gaps |
| 8 | With `venue.address` null the location body holds exactly one pending block, zero buttons, zero map slot (LOC-05, CFG-03) | VERIFIED | `app.js:347-348` renders one `pendingBlock()` and constructs no `.dirs` row at all; `renderMapSlot()` runs on every path (`app.js:436`) and its no-address branch (`app.js:466-471`) disconnects the observer, clears the timer and removes the slot |
| 9 | Written directions are always visible above the video and accept a sentence, an array of one or an array of many; null renders a self-titled panel with no bare sub-heading (ACC-04, D-12, D-15) | VERIFIED | `buildDirections()` (`app.js:754-785`) branches over the three shapes, type-checks every entry, and falls to `pendingBlock('access.dir.pending.title', ...)`; `renderAccess():984-987` suppresses the sub-heading when the returned node carries `.pending`; block order in `renderAccess()` is directions, notes, video, back link |
| 10 | Practical notes render only filled rows in a fixed order, and the block including its heading vanishes when empty (ACC-04, D-16, D-17) | VERIFIED | `NOTE_KEYS` literal at `app.js:792`; `buildNotes()` skips any non-string or blank value and returns `null` when nothing was produced (`app.js:833`); the caller appends neither heading nor list (`app.js:989-993`); `config.js:65-73` ships seven null keys; labels from `t('notes.' + key)`, values from config |
| 11 | The video carries `playsinline` AND `muted` as attributes and as properties, plus `controls` and `preload=metadata`, with no autoplay and no restyled controls (ACC-01, D-13) | VERIFIED | `app.js:925-936` sets all four, the pair as both attribute and property in one construction path; `grep -c 'autoplay' app.js` = 0; no `controlsList`; no rule in `styles.css` targets a control pseudo-element |
| 12 | The slot renders at the configured ratio on every path, the poster is omitted rather than blanked when null, and both failure paths land on the same pending panel with nothing in the console (ACC-03, ACC-05, D-11, D-14) | VERIFIED | `buildVideo()` (`app.js:860-970`) returns a `.video-slot` on all four paths; `door.aspect` parsed with a landscape fallback at `app.js:869-877` and a portrait cap at `styles.css:872`; poster set only inside `if (poster)` at `app.js:942`; the error listener (`app.js:959-965`) swaps in `pendingBlock('access.pending.title', ...)` and sets `videoFailed`; `grep -cE 'console\.(log\|error\|warn)' app.js` = 0 |
| 13 | The access section is reachable in one tap from the top of the page and the jump lands on a focusable target (ACC-02, D-20) | VERIFIED | `index.html:64` topnav and `index.html:116` hero both `href="#access"`; `index.html:236,249` carry `tabindex="-1"`; `styles.css:58` smooth scroll with `styles.css:1084` resetting to `auto` under reduced motion; `styles.css:118` suppresses the ring for `:focus:not(:focus-visible)` only; `grep -c 'scrollIntoView' app.js` = 0 |
| 14 | A language switch rebuilds both sections with no reload, no duplicate listeners, no remounted map and no rebuilt video | PRESENT_BEHAVIOR_UNVERIFIED | Wiring verified: `renderLocation()` and `renderAccess()` are in `applyLanguage()` (`app.js:84-85`), each called from exactly one site; the only location listener is delegated once from `init()` via `wireLocation()` (`app.js:1188`); `#loc-map` is a sibling updated in place (`app.js:476-486`) and `videoEl` is held at module scope and re-appended (`app.js:908-911`). The node-identity invariant itself is exercised by no test |
| 15 | Verified by hand on real iOS Safari and real Android Chrome before the phase closes (DEL-02, DEL-03, ACC-01; declared `verification: backstop`) | PRESENT_BEHAVIOR_UNVERIFIED | No device pass recorded. `tools/preview.js` exists for the pass. 02-04-SUMMARY.md and STATE.md both name this as outstanding. Routed to human, and see Gaps for the premature REQUIREMENTS.md checkboxes |
| 16 | At 320px with the real address the page does not scroll horizontally and Danish labels do not truncate (declared `verification: backstop`) | PRESENT_BEHAVIOR_UNVERIFIED | Both guards present: `styles.css:557` and `styles.css:849` carry `overflow-wrap: break-word`; `.facts--notes .facts__row` restates the single-column collapse at `styles.css:844`; `.video-slot .pending` uses `min-height`. Rendering outcome unprovable from source |
| 17 | Every animation added in this phase ships its `prefers-reduced-motion` fallback in this phase (D-21, D-22) | VERIFIED | `grep -c 'prefers-reduced-motion' styles.css` = 2, matching the phase registry; `styles.css:753-760` explicitly parks the loader bar at full width and 0.35 opacity rather than leaving it wherever the global clamp dropped it; the crossfade collapses through the global rule; `styles.css:1084` makes the jump instant |

**Score:** 11/17 truths verified (5 present, behavior-unverified; 1 partial)

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `config.js` | Real address, `venue.notes` seven null keys, `door.aspect`, owner-facing comments | VERIFIED | 233 lines. Address at :44 verified UTF-8. `venue.name: null` with the one-line comment the plan required at :42. Notes block documented for a non-programmer at :47-73. `aspect: '16/9'` at :116 with the upright-filming instruction |
| `copy.js` | 113 keys per table, three identical key sets, all 20 new phase-02 keys in en/it/da | VERIFIED | Loaded and counted: en 113, it 113, da 113, all three key sets byte-identical. All 28 keys this phase consumes present in all three languages |
| `app.js` | `pendingBlock`, `renderLocation`, `wireLocation`, `isApplePlatform`, `directionsUrls`, `renderMapSlot`, `observeMap`, `mountMap`, `renderAccess`, `subHeading`, `buildDirections`, `buildNotes`, `buildVideo` | VERIFIED | All 13 present and all reachable from `applyLanguage()` or `init()`. `node --check` exit 0. Zero `const`/`let`, zero arrow functions, zero `.innerHTML =` |
| `styles.css` | `.addr*`, `.dirs`, `.copybtn`, `.map-slot` three states, `.map-wait*`, `.sub-h`, `.steps`, `.dir-prose`, `.facts--notes`, `.video-slot`, `.inline-link--back` | VERIFIED | All present. The three source-order corrections are real and commented: `.dirs` coarse minimums at :601-606, `.facts--notes` collapse at :844, `.inline-link--back` at :961-971 |
| `index.html` | Location lede, `#location-body`, `#access-body`, focusable sections, zero iframes | VERIFIED | `loc.lede` at :239; both body containers ship the static `.pending` panel that JS discards on first render; `tabindex="-1"` on exactly the two jumped-to sections; zero frame elements; the address string appears nowhere in the markup, so `config.js` is the single source |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `applyLanguage()` | `renderLocation()` | in the re-render list | WIRED | `app.js:84`, exactly one call site |
| `applyLanguage()` | `renderAccess()` | in the re-render list | WIRED | `app.js:85`, exactly one call site |
| `renderLocation()` | `config.js venue.address` | defensive read of `CFG.venue` at point of use | WIRED | `app.js:326`, `346`; also `renderMapSlot():459-460`, `mountMap():556-557`, `copyAddress():649-650` — four independent defensive reads, no cached stale copy |
| `renderLocation()` | `renderMapSlot()` | single call, last line, on every path | WIRED | `app.js:436`, reached from both branches because the no-address case appends rather than returning early |
| `mountMap()` | google.com maps embed | `createElement` + `setAttribute`, `output=embed` | WIRED | `app.js:571`, keyless, `referrerpolicy` set at :578, no `sandbox` and no `allow` |
| `styles.css .map-slot` | `app.js data-state` writes | CSS keyed on the attribute, never class swaps | WIRED | `styles.css:709`, `:737`; writes at `app.js:491`, `597`, `619` |
| copy handler | `toast()` | `toast(t('loc.copied.toast'))` / failure variant | WIRED | `copyFeedback():635` receives the key from both call paths (`app.js:656`, `689`, `704`) |
| `#location-body` | `#loc-data` | child created on first render, sibling `#loc-map` never rebuilt | WIRED | `app.js:332-340` clears the container only when `#loc-data` is absent, then clears only that child |
| `buildNotes()` | `config.js venue.notes` + `copy.js notes.*` | fixed key order, translated label beside untranslated value | WIRED | `app.js:804`, `811`, `821`, `825` |
| `renderAccess()` | `buildVideo()` | third block in the fixed order | WIRED | `app.js:1000`, after directions and notes, before the back link |
| `buildVideo()` | `config.js door.*` | defensive read of `CFG.door`, poster omitted when null | WIRED | `app.js:861`, `869`, `879`, `941` |
| hero + topnav | `#access` | native anchor onto a focusable section | WIRED | `index.html:64`, `:116` → `:249` |
| back link | `#location` | `setAttribute('href', '#location')`, no click listener | WIRED | `app.js:1011-1015` |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|---|---|---|---|---|
| `.addr__value` | `venue.address` | `config.js:44`, real confirmed address | Yes | FLOWING |
| Google / Apple anchors | `directionsUrls(address)` | same config value, `encodeURIComponent` | Yes — spot-checked, both URLs resolve with `%C3%A5` | FLOWING |
| `#loc-map` iframe `src` | same config value | `config.js:44` | Yes — keyless embed URL verified | FLOWING |
| `ol.steps` / `p.dir-prose` | `door.directions` | `config.js:120`, `null` | No — renders the designed pending panel | DELIBERATE PENDING (roadmap: "placeholder handling for both") |
| `.facts--notes` | `venue.notes` | `config.js:65-73`, seven nulls | No — block absent entirely, heading included | DELIBERATE PENDING (D-16) |
| `.video-slot` | `door.videoSrc`, `door.posterSrc` | `config.js:108-109`, `null` | No — renders the pending panel at the configured ratio | DELIBERATE PENDING (D-11: the unconfigured state IS the deliverable) |
| `.map-wait__line` | `loc.map.loading` / `loc.map.blocked` | `copy.js`, three languages | Loading yes; blocked only on the slow path | PARTIAL — see gap 1 |

No hollow props and no static fallback masquerading as live data anywhere in this phase's code. Every
rendered value traces to `config.js` or `copy.js`.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| `app.js` parses | `node --check app.js` | exit 0 | PASS |
| `config.js` and `copy.js` parse | `node --check` on both | exit 0 | PASS |
| Copy tables are at parity | load `copy.js` in node, count and compare key sets | en 113, it 113, da 113, all three identical | PASS |
| Every key this phase consumes exists in all three languages | 28-key presence check across en/it/da | zero missing | PASS |
| The real address survives URL encoding | load `config.js`, run `encodeURIComponent` | `Trong%C3%A5rdsvej%2046%2C%202800%20Kongens%20Lyngby%2C%20Denmark` in all three URLs | PASS |
| The embed is keyless | inspect the constructed embed URL for `key=` | absent | PASS |
| No frame element in shipped markup | `grep -cE '<iframe\|<embed\|<object' index.html` | 0 | PASS |
| No markup-string assignment | `grep -cE '\.innerHTML[[:space:]]*=' app.js` | 0 | PASS |
| No developer text can reach a guest | `grep -cE 'console\.(log\|error\|warn)' app.js` | 0 | PASS |
| No scripted scroll | `grep -c 'scrollIntoView' app.js` | 0 | PASS |
| ES5 discipline holds | `grep -cE '=>\|const \|let ' app.js` | 1, and it is the word "override" inside a comment at :46 — zero real occurrences | PASS |
| Phase 1 nudge untouched | `grep -c 'enrol-form' app.js` | exactly 2, both pre-existing | PASS |
| Contrast token count unchanged | `grep -c -- '--ink-faint' styles.css` | exactly 4 | PASS |
| Reduced-motion block count | `grep -c 'prefers-reduced-motion' styles.css` | 2, matching the registry | PASS |
| All 11 feature commits exist | `git log --oneline` | `27cc4e9 1fd9996 c91d48b 00e877f 9215d2a c4df325 3b51244 99a6660 dafaf00 7dd0a40 c07b811 e10f94d` all found | PASS |
| DOM rendering, IntersectionObserver, clipboard, playback | — | not runnable: no DOM harness, no test suite, and none may be added (locked project constraint) | SKIP — routed to human verification |

### Probe Execution

| Probe | Command | Result | Status |
|---|---|---|---|
| — | — | No probe scripts declared in any phase-02 PLAN and none exist under `scripts/*/tests/` | N/A — not a probe-based phase |

`tools/preview.js` exists but is a local static server for the human device pass, not a probe. It was
not started (Step 7b forbids starting servers).

### Requirements Coverage

| Requirement | Source plan | Description | Status | Evidence |
|---|---|---|---|---|
| LOC-01 | 02-01 | Address as text with a copy button and a confirmation on copy | SATISFIED | Truths 1, 3 verified; truth 2 confirms the cascade structure, runtime behaviour routed to human |
| LOC-02 | 02-02 | Keyless Google Maps iframe, no API key, no billing account | SATISFIED | Truth 4; embed URL spot-checked for `key=` |
| LOC-03 | 02-01 | Direct links open Google Maps and Apple Maps in the guest's own app | SATISFIED | Truth 5; native handoff itself is in the D-23 human pass |
| LOC-04 | 02-02 | Map lazy-loads and never blocks first paint on mobile data | SATISFIED | Truth 6: observer with 400px rootMargin, nothing requested before approach |
| LOC-05 | 02-01 | A placeholder address says so plainly instead of showing a broken map | SATISFIED | Truth 8: one pending block, zero dead affordances, slot removed |
| ACC-01 | 02-04 | Video plays inline on iOS Safari with `playsinline`, `muted`, `controls` | NEEDS HUMAN | Truth 11 verifies the attribute-and-property pair in source; inline playback with no fullscreen takeover is the headline D-23 item |
| ACC-02 | 02-04 | Reachable in one tap from the top of the page | SATISFIED | Truth 13; landing position under the sticky bar is in the human pass |
| ACC-03 | 02-04 | Poster frame shows before the video loads, so the section is never a black rectangle | SATISFIED (mechanism) | Truth 12: the poster path is correct and the attribute is omitted rather than blanked; no poster is configured yet, and the surface token behind the element covers that state (D-14) |
| ACC-04 | 02-03 | Written directions accompany the video for guests on bad signal | SATISFIED (mechanism) | Truths 9, 10; `door.directions` ships null so a guest currently sees the pending panel — owner input, see Warnings |
| ACC-05 | 02-04 | With no video file, a clear placeholder rather than a broken player | SATISFIED | Truth 12: no `<video>` is constructed at all on the null path |
| DEL-02 | 02-04 | Works on iOS Safari, Android Chrome, desktop Chrome and Firefox | NEEDS HUMAN | Truth 15. Marked `[x]` in REQUIREMENTS.md ahead of the pass — gap 2 |
| DEL-03 | 02-02, 02-03, 02-04 | Usable on a mid-range phone on mobile data | NEEDS HUMAN | Truth 15, truth 16. Gap 1 bears directly on this: the bad-network case is where the blocked state is defeated |

No orphaned requirements. All twelve IDs the roadmap assigns to this phase are claimed by a plan, and
no plan claims an ID the roadmap did not assign here.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `config.js` | 151 | `XXXXXXXXXXXX` | Info | Not a debt marker. It is the shape of a WhatsApp invite URL inside owner-facing documentation. No `TBD`, `FIXME`, real `XXX` or `HACK` exists in any of the five files |
| `app.js` | 595-598 | Success assumed from an ambiguous event | Warning (gap 1) | The `load` handler cannot distinguish a map from an error page, and it clears the fallback that existed for that case |
| `.planning/REQUIREMENTS.md` | 199-200 | Requirement checked ahead of its verification | Warning (gap 2) | A later milestone audit will read DEL-02 and DEL-03 as device-verified when no device pass has run |
| `.planning/STATE.md` | 142 | Stale tracking | Warning | The owner-input table still lists "Venue address — Placeholder" although `config.js:44` now carries the confirmed address (D-01), and it tracks only the door video, not the written directions |
| `app.js` | 984 | Cross-function contract carried by a CSS class name | Info | `renderAccess()` reads `directions.classList.contains('pending')`. Fragile but deliberate, forced by the plan's own acceptance criterion, and recorded in 02-03-SUMMARY.md. Review IN/WR-08 already carries it |

No `TODO`, `PLACEHOLDER`, "coming soon", "not yet implemented", empty-handler or hardcoded-empty-data
pattern was found in this phase's code. Every `return null` in the phase is a meaningful absence
(`buildNotes()` returning `null` so the caller omits the heading) rather than an unimplemented path.

### Code review findings weighed against this phase's goal

Of the three criticals in 02-REVIEW.md, only their ownership matters here:

- **CR-01 (countdown renders `NaN`)** and **CR-02 (deadline off by one)** are phase-01 countdown and
  nudge code. Real defects, not this phase's truths, and not folded into this verdict. They should be
  carried into the phase-01 debt list or the phase-5 polish pass.
- **CR-03 (Supabase RLS UPDATE policy `using (true)`)** is phase-03 territory. It is a serious
  security finding and it must be closed before enrollment ships, but no phase-02 truth depends on it.
- **WR-04 (map `load` treats error pages as success)** is this phase's code and is gap 1 above.

### Human Verification Required

Five items, listed in full in the `behavior_unverified_items` frontmatter. The headline three:

#### 1. The D-23 real-device pass (DEL-02, DEL-03, ACC-01)

**Test:** Serve the working tree with `tools/preview.js`, reach `127.0.0.1:4173` from a phone on the
same LAN, then check on real iOS Safari and real Android Chrome: inline video playback with no
fullscreen takeover; clipboard copy of the address including the a-ring; Google Maps opening a route
in the native app on both platforms; Apple Maps opening on iOS and its button absent on Android; both
jumps landing with the heading below the sticky bar; the back link measuring at least 44px; the jump
being instant with Reduce Motion on.
**Expected:** Every item passes on both platforms.
**Why human:** Declared `verification: backstop` in 02-04-PLAN.md. No build step, no device harness,
and that is a locked constraint rather than an omission. Making the preview server reachable from a
phone is the one precondition only a human can establish.

#### 2. The clipboard cascade under real conditions

**Test:** Tap Copy address on a phone, repeatedly; then in an in-app browser; then with clipboard
permission denied.
**Expected:** One label swap and revert per tap with no stacked reverts, the a-ring pasting byte for
byte, and on total refusal the address selected on the page with the failure toast fired.
**Why human:** A three tier runtime state machine over `navigator.clipboard`, `execCommand` and a
Selection range. Source proves the ordering, not the outcome.

#### 3. Lazy mount and node survival

**Test:** With the Network panel open, load the page without scrolling, then scroll to Location, then
switch language three times with the map loaded.
**Expected:** Zero requests to google.com before approach, exactly one after, one iframe node
throughout, and the slot staying in `ready` across switches.
**Why human:** IntersectionObserver firing and node identity across a rebuild are runtime invariants.
The guards are in source; presence cannot prove the transition.

### Gaps Summary

**Gap 1 — the blocked map state is unreachable on the network it was written for.**
This phase built a three-state map slot, wrote `loc.map.blocked` in English, Italian and Danish, and
styled a dedicated parked-bar treatment for it. The 8000ms slow-failure path reaches it correctly and
the refusal to tear down a working frame is right. But an iframe's `load` event fires for any
completed document, and Google's 403/404/429 pages, a captive portal, a rate-limit interstitial and a
DNS-blocked network's own error page are all completed documents. `app.js:595-598` responds by
setting `ready` and clearing the timer, and `styles.css:737-742` then fades the waiting layer out
entirely. The guest on a blocked network gets Google's error page inside a bordered panel with the one
sentence written for that exact moment suppressed, and the fallback that would have said it already
cancelled. This is the fast-failure case, which is the common one, and it sits directly under the
"on a bad connection" clause of the phase Done-when.

It is a defect inside a must-have truth rather than a missed feature, and the section still degrades
honestly at the level that decides the goal: the address and both directions buttons sit above the map
and are untouched, so a guest can still find the door. That is why this report says the phase goal is
substantially achieved while the status is `gaps_found`. The fix is small and the review already
drafted it. The alternative — documenting that `ready` means "a document arrived" and shortening the
timeout — is acceptable and would need an override rather than code.

**Gap 2 — DEL-02 and DEL-03 are checked off ahead of the pass that defines them.**
`REQUIREMENTS.md:199-200` marks both complete. 02-04-SUMMARY.md states plainly that they abstain to
human review, STATE.md names the device pass as the phase's one outstanding item, and 02-04-PLAN.md
declares them `verification: backstop`. Three artifacts agree the pass has not happened and the
traceability document says it has. Revert both to `[ ]` until the pass is recorded. This costs two
characters and preserves the only signal a milestone audit will read.

**Warning, not a gap — the door instructions are content-empty and only half-tracked.**
`door.videoSrc`, `door.posterSrc` and `door.directions` all ship null. For the video that is the
deliverable by D-11 and correct. For the written directions the roadmap likewise anticipates
placeholder handling. But the Done-when clause "the address and door instructions are findable in
seconds" is currently half-met by content: the address is there, the door instructions are two
designed pending panels. STATE.md's owner-input table tracks the door video and not the written
directions, and still lists the venue address as a placeholder although it is now set. Since the
written sentence is the fast path on a weak signal — the entire argument behind D-12 — it deserves its
own row. One line of `config.js:120` closes it.

**After the gaps close:** re-verification should confirm gap 1 in source and gap 2 in
REQUIREMENTS.md, then the phase still routes to the human device pass. Closing the gaps changes the
status from `gaps_found` to `human_needed`, not to `passed`.

---

_Verified: 2026-08-14T12:00:00Z_
_Verifier: Claude (gsd-verifier)_
