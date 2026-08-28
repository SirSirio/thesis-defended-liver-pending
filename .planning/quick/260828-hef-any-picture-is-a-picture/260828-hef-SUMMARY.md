---
id: 260828-hef
slug: any-picture-is-a-picture
kind: quick
created: 2026-08-28
completed: 2026-08-28
status: complete
mode: inline
files_modified:
  - assets/vendor/libheif.js (new, 81 KB)
  - assets/vendor/libheif.wasm (new, 1.0 MB)
  - assets/vendor/libheif-LICENSE.txt (new)
  - app.js
  - check.html
  - index.html
  - album.html
---

# Quick task 260828-hef: summary

**HEIC photographs now upload from any browser, and nobody who is not uploading one pays a
byte for it.** The last image format a phone produces that the site could not take is
taken.

## What the reader is

libheif, the reference HEIF decoder, compiled to WebAssembly and vendored from `libheif-js`
1.19.8 under LGPL-3.0, licence text beside it in `assets/vendor/`. The split build,
`libheif.js` at 81 KB plus `libheif.wasm` at 1.0 MB, not the single file bundle, which
carries the same binary as base64 and is a third larger for nothing.

Proved in Chrome before a line of integration was written: the factory returns the module
synchronously when handed `wasmBinary`, `HeifDecoder` is available at once, 44 ms to
initialise, 423 ms to decode a 1280 by 854 sample and produce a JPEG.

## How it is wired

The browser's own decoder still runs first and decides every file it can decode. Only when
that fails **and** the file's first thirty two bytes carry a HEIF brand does the reader
load, once per page. The decoded picture then goes through the same scale and encode as
every other photograph, so the stored object is a `.jpg` of at most 1600px, the album
needs no change, and the path contract in its four places is untouched.

Two decisions worth recording:

- **The signature is read from the bytes, never from `file.type`.** A HEIC that came
  through Files arrives with an empty type or `application/octet-stream` as often as with
  `image/heic`. All three guises were tested.
- **The wasm is fetched by hand and passed in.** This build compiles synchronously and,
  left to locate its own binary in a browser, attempts a synchronous XHR for a megabyte on
  the main thread and fails. Fetching it first keeps the request asynchronous and gives
  every failure the same answer: null, and the refusal the guest would have read yesterday.

The decode budget on this path is ninety seconds rather than twenty, because on party wifi
the download alone can exceed twenty and refusing a good photograph at second twenty one
would be the fix failing in exactly the case it was built for.

## Verified, through the real uploader, Android profile, wire stubbed

| Case | Result | Reader fetched | Uploaded as |
|---|---|---|---|
| JPEG only, the control | ON RECORD | **never** | `image/jpeg`, 74 KB |
| HEIC declared `image/heic` | ON RECORD | js + wasm, once | `image/jpeg`, 323 KB |
| HEIC with an **empty** type, as Files hands it over | ON RECORD | once | `image/jpeg` |
| HEIC as `application/octet-stream`, **no extension** | ON RECORD | once | `image/jpeg` |
| Two HEICs and a JPEG in one batch | all three ON RECORD | **once** for the batch | 3 JPEGs |

And the failure path, which is the half that matters on a bad connection:

| Failure | Result | Time | Control |
|---|---|---|---|
| The wasm 404s | refused, "Your browser could not open this image (image/heic)" | 269 ms | open, button enabled |
| The script fails to load | same refusal | 210 ms | open, button enabled |

No hang, no stuck state, no console error. The settle guard and the timer replacement
both hold.

`check.html` runs the same path and reports both facts on one card: **decoded: no, why
not: the browser could not decode it, heif signature: yes, site reader: decoded 1280 x
854, re-encoded: yes.** So a report from the owner's phone distinguishes a HEIC the reader
handled from one it could not.

Three pages, two viewports, zero errors, zero overflow, after the change.

## The honest limits

- **The only HEIC available here is 1280 by 854**, libheif's own example file. There is no
  HEIF encoder on this machine, so a twelve megapixel iPhone HEIC has not been decoded in
  this session. Pixel count scales the decode roughly linearly, so expect a few seconds on
  a phone, inside the ninety second budget by a wide margin, but that is arithmetic and
  not a measurement. **The owner's phone is the measurement**, and `check.html` will print
  the dimensions it decoded.
- **iPhone HEICs carry a rotation box.** libheif applies it inside `decode()` by default,
  which is why there is no rotation code here, matching the reasoning above
  `downscaleToJpeg()`. Untested against a real portrait iPhone file for the reason above.
- **The Android report in 260828-rfd is still not reproduced.** This task closes the most
  likely cause. It does not claim to have closed the report; only a `check.html` run on
  that phone can.

## What "any format" now means, exactly

| Guest produces | Uploads | Everyone can see it |
|---|---|---|
| JPEG, PNG, WebP, GIF, BMP, AVIF | yes | yes, stored as JPEG |
| **HEIC / HEIF**, from any picker | **yes, now** | yes, stored as JPEG |
| MP4 or MOV in H.264 | yes | yes, everywhere |
| MP4 or MOV in HEVC | yes, since 260828-rfd | on every phone; on desktops with the codec |
| 3GP, WebM | yes | mostly; the two containers are not universal |
| MKV, AVI, RAW, DNG | no | no browser can play or open them, and no phone records them |

Video is never re-encoded and there is no free way to add that, so the HEVC row is the one
honest asymmetry left, and it is a desktop problem at a party attended on phones.
