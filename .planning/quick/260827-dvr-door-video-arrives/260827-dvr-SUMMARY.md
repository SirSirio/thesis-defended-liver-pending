---
id: 260827-dvr
slug: door-video-arrives
kind: quick
created: 2026-08-27
completed: 2026-08-27
status: complete
mode: inline
files_modified:
  - config.js
  - assets/door.mp4 (new)
  - assets/door-poster.jpg (new)
  - .gitignore
---

# Quick task 260827-dvr: summary

**The door video is live. Two config lines, no code changed, and the file a guest
downloads outdoors is 3.3 MB instead of 8.7 MB.**

Phase 02 held up its end: the entire slot, player, poster path, error route and aspect
handling were already built and waiting on `videoSrc`. Nothing in `app.js`, `index.html`,
`styles.css` or `copy.js` was touched.

## The encode

The source is the interesting part of this task. `EntranceVideo.mp4` is 1280x720, 21.4s,
8.7 MB, H.264 at 3.1 Mbit/s, no rotation metadata, landscape. It is aerial footage over
trees, and foliage in motion is close to worst case for a block based codec: a routine
CRF 25 / preset slow re-encode produced **9.9 MB, larger than the source**. The bitrate
was not waste, it was grain and leaves.

Denoising before scaling is what actually paid:

```
hqdn3d=4:3:9:9, scale=960:540:lanczos, libx264 crf 31 preset slower, aac 56k mono, +faststart
```

**3.3 MB, a 62% cut.** Checked against the source at the frame that matters, the courtyard
arrival at 0:19: the door, the notice on the wall and the bicycles are all still legible.
540p is not a compromise here, the slot is 327 CSS pixels wide on a phone and 720p was
never going to be resolved on it.

`+faststart` moves the moov atom to the front, so playback can begin before the file
finishes arriving. On the local preview server that is invisible, because `tools/preview.js`
does not honour Range requests and returns the whole file. GitHub Pages does honour them.

## The poster

`assets/door-poster.jpg`, 64 KB, the frame at 0:19: the courtyard the clip arrives at,
with the door, the bike rack and the wall sign in shot. Deliberately the destination and
not the first frame, which is a dim road junction 300 metres away and tells a guest
nothing. With `preload="metadata"` this image is the whole of what most guests will ever
see of the clip, so it carries the section on its own.

## The config change

```js
videoSrc: 'assets/door.mp4',          // Set 2026-08-27. 21s, 960x540, 3.3 MB
posterSrc: 'assets/door-poster.jpg',  // The courtyard the clip arrives at
```

`aspect` stays `'16/9'`. The clip is genuinely landscape and carries no rotation side data,
so the tall-slot branch is correctly not taken.

## Verification

Chromium at a 390x844 viewport against `tools/preview.js`:

| Truth | Result |
|---|---|
| The player mounts, not the pending panel | Pass. A `<video>` is in `.video-slot` |
| The file loads and decodes | Pass. `readyState` 4, `error` null, 960x540, 21.4s |
| The slot is the shape of the clip | Pass. `--video-aspect: 16/9`, box 327x184, no `data-orient` |
| The iOS inline pair survived | Pass. `playsinline` and `muted` both set as attribute **and** property |
| Native controls, metadata only preload | Pass |
| The poster is attached and serves | Pass. HTTP 200 |
| A language switch does not rebuild the player | Pass. EN to DA, `v1 === v2`, same node re-appended, no refetch, no error |
| Nothing else on the page moved | Pass. The slot was already rendering at 16/9 as a pending panel |

Not verified, and it needs a real device: whether iOS Safari plays it inline rather than
taking the whole screen. That is D-13, it is an emulation blind spot exactly like the rest
of `02-DEVICE-PASS.md`, and it joins the device pass already owed.

## What is still pending in this section

`door.directions` is still null, so the section shows **"Door instructions pending"** above
a working video. This is correct, not a regression, and it is the highest value input the
owner has left: D-12 makes the written directions the *primary* path and the video the
supporting one, because someone standing outside in the dark on one bar of signal reads
three lines of text long before a 3.3 MB file arrives. `venue.notes` (entrance, floor,
buzzer, parking) is null for the same reason and matters just as much in a 76 unit
kollegium.

The video is the nice half of this section. The text half is the useful half, and it is
still empty.

## Housekeeping

`EntranceVideo.mp4` stays in the working tree as the owner's master copy and is now
gitignored. The repository ships the 3.3 MB derivative only. Delete the master whenever
you like, `assets/door.mp4` does not depend on it.
