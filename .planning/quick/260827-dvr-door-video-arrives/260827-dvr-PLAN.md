---
id: 260827-dvr
slug: door-video-arrives
kind: quick
created: 2026-08-27
status: complete
mode: inline
unblocks: ACC-01, ACC-02, ACC-03
---

# Quick task 260827-dvr: the door video arrives

The owner delivered `EntranceVideo.mp4` into the repository root. Phase 02 built the
whole video slot against `door.videoSrc: null` precisely so this day would be a config
change and nothing else (see 02-04-PLAN.md and the ROADMAP "Deferred to owner" table).
This task is the owner input landing, not a feature.

## Why this is a quick task and not a phase

No new code. Phase 02 plan 04 already shipped the player, the pending panel, the error
route, the aspect handling and the no-reflow guarantee. The only decisions left are
which bytes to ship and which frame to show first.

## Tasks

1. **Encode for the guest standing outside on mobile data.** The source is 1280x720,
   21.4s, 8.7 MB at 3.1 Mbit/s. It is drone footage over foliage, which is the most
   expensive thing H.264 can be asked to carry, so a straight CRF 25 re-encode came out
   *larger* than the source (9.9 MB). Denoise first, then scale, then encode.
2. **Cut a poster frame** so the slot is not a black rectangle while the file loads.
   `preload="metadata"` means the poster is the only thing a guest sees until they press
   play, so it has to be the single most useful still in the clip.
3. **Two config lines**, `videoSrc` and `posterSrc`. `aspect` is already `'16/9'` and the
   clip is landscape, so it is not touched.
4. **Verify in a browser at a phone viewport**: the player mounts rather than the pending
   panel, the box is 16/9, no media error, and a language switch re-appends the same node
   rather than rebuilding it.

## Not in scope

`door.directions` stays null. The written directions are a *separate* owner input, and
D-12 makes them the primary path rather than the video's fallback: text is read faster
than video loads, outdoors, at night, on a weak signal. The section still says the door
instructions are being confirmed, above a working video. That is the honest state.
