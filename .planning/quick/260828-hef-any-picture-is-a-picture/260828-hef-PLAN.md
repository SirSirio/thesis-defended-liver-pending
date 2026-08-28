---
id: 260828-hef
slug: any-picture-is-a-picture
kind: quick
created: 2026-08-28
status: complete
mode: inline
resolves_todo: photo-rejections-unexplained
depends_on: 260828-rfd
---

# Quick task 260828-hef: any picture is a picture

The owner restated the requirement in one line: **pictures and video of any format or
kind, visible to everyone once uploaded, sixty seconds for a video and five items each.**
And asked whether it is solved. It is not, and the gap has a name.

## The gap

HEIC. Every iPhone shoots it by default, and every recent Samsung and Pixel can be set to
under a "high efficiency" switch, which also swaps video to HEVC. When the picker is the
photo album the operating system converts to JPEG on the way out, which is why
`accept="image/*"` is load bearing and never widened. When the picker is Files, a share
sheet or a cloud provider, the HEIC arrives as itself, and **no Chromium anywhere can
decode it**: not on Android, not on Windows, not on a Mac. Safari can.

That is also the best remaining explanation for the Android report in 260828-rfd, where
photographs and videos both failed on one phone and both worked on an iPhone. A phone on
the high efficiency setting produces exactly that pair, and iOS reads both natively. The
video half was closed by 260828-rfd's container reader. This task closes the photo half.

It has been flagged since 2026-08-17 as the one image cause with no free fix, awaiting the
owner's call on a dependency. "Any format" is that call.

## What to build

**A HEIC reader the site carries itself**, loaded only when a HEIC is actually on the
table. libheif compiled to WebAssembly, from `libheif-js` 1.19.8, LGPL-3.0.

- The **split** build, `libheif.js` at 81 KB plus `libheif.wasm` at 1.0 MB, not the
  single file bundle, which carries the same binary as base64 and is a third larger.
- **The browser's own decoder runs first** and decides every file it can decode. Safari,
  and every JPEG everywhere, never fetch these bytes. Only when that decode fails AND the
  file's own signature says HEIF does the reader load, once per page.
- **The signature is read from the bytes**, never from `file.type`, because a HEIC that
  came through Files arrives with an empty type or `application/octet-stream` as often as
  with `image/heic`.
- The decoded picture goes through **the same scale and JPEG encode as every other
  photograph**, so the stored object is still a `.jpg` of at most 1600px, the album needs
  no change, and the path contract in its four places is untouched.
- The wasm is fetched by hand and handed in as `wasmBinary`, because this build compiles
  synchronously and would otherwise attempt a synchronous XHR for a megabyte on the main
  thread. Every failure, a 404, an offline phone, no WebAssembly, lands on the same
  refusal the guest would have read yesterday.
- The decode budget is **replaced, not shared**: the twenty second decode timer becomes
  ninety seconds on this path, because on party wifi the download alone can exceed twenty.

`check.html` learns the same trick, so a report from the owner's phone shows both facts:
the browser could not open it, and the site's reader could.

## Not in scope

- **Video transcoding.** There is still no re-encoding of video, and no free way to add
  it. What phones produce (MP4 and MOV in H.264 or HEVC, 3GP, WebM) is accepted. H.264
  plays everywhere; HEVC plays on every phone of the last several years and on most
  desktops. MKV and AVI cannot play in any browser and no phone records them.
- **Widening `accept`.** Still never. See the comment at the input.

## Verification

1. The reader proved in Chrome before integration: factory shape, init time, decode time.
2. A real HEIC through the real uploader in an Android profile, in every guise the field
   produces: declared `image/heic`, empty type, `application/octet-stream` with no
   extension, and a mixed batch. Each lands ON RECORD as a JPEG, and the vendor files are
   fetched **once** per page and **never** for a JPEG only batch.
3. The failure path: the wasm 404s, the script fails. Each refuses promptly with the
   existing sentence and leaves the control open. No hang.
4. Three pages, two viewports, zero errors, zero overflow.
5. Deployed, and the live bytes and the wasm's content type confirmed.
