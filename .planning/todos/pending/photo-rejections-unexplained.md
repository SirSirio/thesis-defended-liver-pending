---
id: photo-rejections-unexplained
created: 2026-08-17
source: owner device test, phase 04
resolves_phase: 5
severity: low
kind: bug
---

# Some photographs are refused that should not be

> **2026-08-28: cause 1 is FIXED and live.** `validateFile()` reported "Not an image file"
> for any `File` whose `type` is the empty string, which is what iOS and Android share
> sheets, the Files app and cloud providers hand back. `fileKind()` now falls back to the
> name's extension and only refuses when a type exists and is neither image nor video.
> Cause 2's copy now names the limit and says what to do about it. Cause 3 is gone: video is
> accepted. **This stays open only until the owner re-tests with the files that actually
> failed**, which is what the todo asks for and what no local test replaces.

> **2026-08-28, second pass: the instrument this todo has always needed now exists.**
> A further report, Android refusing both pictures and videos while the same guest's
> iPhone accepts them, was investigated and **not reproduced**: the deploy, the asset
> versions, the language level, the absence of a CSP, the five per guest ceiling and the
> whole client path were each eliminated, and a JPEG, an H.264 MP4 and an HEVC MP4 all
> reached ON RECORD in an Android profile browser. See
> `.planning/quick/260828-rfd-why-a-file-is-refused/`.
>
> The instruction below, record `file.name`, `file.type` and `file.size` and do not guess,
> has been right since the day it was written and has never been followable, because there
> was no way to get those three values off a phone. **`check.html` is now that way.** It
> reports them, the decode and the re-encode as separate outcomes, the `MediaError` code,
> and what the browser can actually read, and it copies the lot to the clipboard. It
> touches no network, verified by intercepting every request the page makes.
>
> **The next step on this todo is no longer a code change. It is a tap.**

> **2026-08-28, third pass: HEIC is closed.** The owner restated the requirement as "any
> format", which was the call the HEIC decoder had been waiting on since the 17th. The site
> now carries libheif as WebAssembly, loaded only when the browser's own decode fails on a
> file whose bytes say HEIF, so Safari and every JPEG never fetch it. Proved through the
> real uploader in every guise Files produces, and the failure path proved to refuse in
> under 300 ms with the control left open. See
> `.planning/quick/260828-hef-any-picture-is-a-picture/`. With the HEVC video half closed
> by 260828-rfd, the high efficiency camera setting is no longer a reason for a refusal on
> either kind. **What remains is the tap above.**

Owner observation from a real phone during the phase 04 device pass: the uploader works, but
**some pictures are refused and it is not obvious why**. The refusal names the file, so it is not
a silent drop, but the reason is wrong or the rule is wrong.

## Where to look

`validateFile()` in `app.js` is the whole client rule and it has exactly three refusals:

```js
if (!file || !file.size) return 'photos.err.empty';
if (String(file.type || '').indexOf('image/') !== 0) return 'photos.err.type';
if (file.size > maxBytes) return 'photos.err.size';
```

Three candidate causes, in the order they are worth testing:

1. **`file.type` arrives empty.** Some iOS and Android pickers, particularly files that came from
   the Files app, a cloud provider, or a share sheet rather than the camera roll, hand back a
   `File` with `type === ''`. That fails the `image/` prefix test and is reported as a wrong file
   type, which is a lie. The fix is to fall back to the extension, or to attempt the decode and let
   the decode be the judge.
2. **Size over 12 MB.** `photos.maxFileSizeMb` is 12. A ProRAW capture is 25 MB and up, and a
   panorama can pass 12 MB easily. Correctly refused by the current rule, but the copy says nothing
   about which limit was hit in a way a guest can act on.
3. **A Live Photo or a video picked from the library** arrives as `video/quicktime` and is refused.
   That is today's intended behaviour and it is what the sibling todo
   [[accept-one-short-video]] changes.

## What to do

Reproduce first, with the actual failing files, and record the `file.name`, `file.type` and
`file.size` of each. Do not guess between the three above. The refusal copy should then name the
real reason, and cause 1 should stop being a refusal at all.

Note that `accept="image/*"` on the input is load bearing and is documented at `app.js` around
line 4925: adding `image/heic` makes Safari hand back a real HEIC that Android Chrome cannot
decode, where `image/*` alone gets an OS converted JPEG. Do not "fix" HEIC by widening `accept`.
