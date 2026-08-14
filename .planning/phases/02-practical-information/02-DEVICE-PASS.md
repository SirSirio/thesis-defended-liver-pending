---
phase: 02-practical-information
status: pending
decision: D-23
requirements: [ACC-01, DEL-02, DEL-03]
performed:
---

# Phase 2 Device Pass Record (D-23)

**This sheet closes nothing.** It is an empty record, not evidence. Creating it verifies no
behaviour, satisfies no requirement and changes no status. It exists so that the D-23 pass on real
iOS Safari and real Android Chrome has exactly one place to be written down, and so that `ACC-01`,
`DEL-02` and `DEL-03` can later be checked against something written rather than against somebody's
recollection of an evening. Until every row below carries a result, phase 02 is `human_needed` and
not `passed`.

## Preconditions

1. Serve the working tree from the repository root with `node tools/preview.js`, or with
   `Preview locally.cmd`. It listens on 127.0.0.1:4173.
2. Reach that address from a phone on the same LAN, using the machine's own address on the network
   rather than 127.0.0.1. **This is the one step only a human can establish**, and it is why this
   pass cannot be automated: the project ships no build step and no device harness, and that is a
   locked constraint rather than an omission.
3. Have both platforms in hand. A pass recorded on one phone is half a pass.

Record the browser and OS version in the Note cell of the first row of each table, so a later reader
knows what was actually tested.

## Table A. Real iOS Safari

| Check | Result | Note |
|---|---|---|
| The door video plays inline, with no fullscreen takeover on tap | | |
| Copy address puts the address on the clipboard byte for byte, including the a-ring and the o-slash | | |
| Open in Google Maps opens a route in the native Google Maps app | | |
| Open in Apple Maps is present and opens a route in the native Apple Maps app | | |
| The jump to Building access lands with the heading below the sticky bar, not under it | | |
| The jump back to Location lands with the heading below the sticky bar, not under it | | |
| The back link measures at least 44px on its shortest side | | |
| With Reduce Motion on, both jumps are instant rather than smooth scrolled | | |

## Table B. Real Android Chrome

| Check | Result | Note |
|---|---|---|
| The door video plays inline, with no fullscreen takeover on tap | | |
| Copy address puts the address on the clipboard byte for byte, including the a-ring and the o-slash | | |
| Open in Google Maps opens a route in the native Google Maps app | | |
| The Apple Maps button is absent from the page entirely | | |
| The jump to Building access lands with the heading below the sticky bar, not under it | | |
| The jump back to Location lands with the heading below the sticky bar, not under it | | |
| The back link measures at least 44px on its shortest side | | |
| With Reduce Motion on, both jumps are instant rather than smooth scrolled | | |

Note on the video rows: `door.videoSrc` ships null, so the video rows can only be exercised once a
clip exists in `config.js`. Until then, record them as blocked on owner input rather than as passed.

## Table C. Remaining backstop items

These are the other behaviours phase 02 wired but could not prove from source. They belong on the
same evening as the pass above.

| Check | Result | Note |
|---|---|---|
| At a 320px viewport in Danish, with all seven `venue.notes` filled and `door.directions` set, the page does not scroll horizontally and no note label truncates | | |
| The in-slot pending panel fills the video slot rather than floating centred in it, with one border and no nested box, and a 9/16 slot caps at 360px | | |
| The clipboard cascade under repeated taps: one label swap and one revert per tap, with no stacked reverts | | |
| The clipboard cascade inside an in-app browser, Instagram or Messenger | | |
| The clipboard cascade with clipboard permission denied: the address is selected on the page and the failure toast fires, never a silent failure | | |
| With the Network panel open and no scrolling, zero requests to google.com before Location approaches, and exactly one after | | |
| A language switch with the map loaded fires no second request to google.com, and the slot stays in its ready state | | |
| With google.com blocked or intercepted, the fallback sentence is readable under the frame in the current language | | |
| With no route to Google at all, so that no document completes within eight seconds, the waiting line reads the blocked message and the frame is still there | | |

The last two rows are the runtime outcome of the fix plan 02-05 shipped. No source assertion in that
plan proves them, and the project has no network harness, so they are owed here rather than assumed.

## The rule for checking the three requirement IDs

`ACC-01`, `DEL-02` and `DEL-03` in `.planning/REQUIREMENTS.md` may be checked **only** once every row
on this sheet carries a result and this sheet's `status` is no longer `pending`. This is a rule, not
a suggestion. A checkbox that claims a verification which has not occurred destroys the only signal a
milestone audit reads, and phase 02 has already had to correct that once.

When the pass is done: fill `performed:` with the date, change `status:` to `complete`, and only then
edit the three checkboxes.
