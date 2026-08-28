---
id: 260828-rfd
slug: why-a-file-is-refused
kind: quick
created: 2026-08-28
status: complete
mode: inline
resolves_todo: photo-rejections-unexplained
---

# Quick task 260828-rfd: why a file is refused, answered by the phone itself

The owner reports that on their **Android**, neither photographs nor videos upload, and the
refusal says the browser cannot read the file. The same files, on an **iPhone**, upload.
This is the third report in this class and the second session spent guessing at it.

## What was ruled out first, and how

Nothing below is speculation. Each was checked before any code was written.

| Ruled out | How |
|---|---|
| A broken or partial deploy | Fetched the live `index.html`, `app.js`, `config.js`, `copy.js`. All 200, and the byte delta against the working tree is exactly the CRLF count, so the deploy is complete and current |
| A stale asset version | `?v=13` on every script and stylesheet in both pages, and the server returns current bytes at any `?v=` |
| Modern JS the browser cannot parse | `app.js` is ES5 throughout: no arrow functions, no template literals, no optional chaining, two `const` in the whole file, and none of `replaceAll`, `at`, `flat`, `fromEntries`, `structuredClone` |
| A Content Security Policy blocking `blob:` | There is no CSP on the page. Both decode paths rest on `URL.createObjectURL` and would both break together, which fits the report exactly, so this was worth eliminating |
| The five per guest ceiling | Queried the live table. The four guest ids holding rows are accounted for, and the device in question holds none of them |
| A bug in the client path | Drove the real page in an Android profile Chromium against the local server with the wire stubbed. A JPEG, an H.264 MP4 and an HEVC MP4 all reached **ON RECORD**, console clean |
| Re-picking the same file doing nothing | `input.value` is cleared in the change handler, so a second pick of one file still fires |

**So the cause is on the device**: the bytes, the browser build, or the codec set. None of
those can be reached from here, and this is exactly what the open todo already says:

> Reproduce first, with the actual failing files, and record the `file.name`, `file.type`
> and `file.size` of each. **Do not guess** between the three above.

That instruction has been correct since 2026-08-17 and has never been followable, because
there has been no way to get those three values off a phone. That is the thing to build.

## Task 1: the instrument

A new page, `check.html`, unlisted and linked from nothing. The owner opens it on the
failing device, picks the failing files, and reads the answer off the screen.

It reports, per file, **what the browser itself said**, never our opinion of it:

- `name`, `type`, `size`, `lastModified`
- whether `URL.createObjectURL` produced a usable handle at all
- for images: whether an `<img>` decodes it, at what natural dimensions, and whether
  `canvas.toBlob('image/jpeg')` returns bytes, which is the exact operation the uploader
  performs and the exact one that would fail
- for videos: whether `<video>` reaches `loadedmetadata`, the duration, the dimensions,
  and the `MediaError` code and message when it does not
- `canPlayType` for the four accepted containers, and the browser's own verdict on
  H.264, HEVC, VP9 and AV1
- the user agent, device memory and core count

**It touches no network.** No Supabase, no storage, no row, no key. A file picked here
cannot be uploaded by this page, which is the property that makes it safe to hand to a
phone and safe to leave on a public URL.

It reports raw browser facts rather than re-implementing `validateFile()`, so it cannot
drift out of agreement with the uploader: the two would have to disagree about what
`file.type` is.

## Task 2: stop letting the decoder veto a video

Independent of the report above, and defensible on its own.

`probeVideoDuration()` learns a clip's length by handing it to a `<video>` element. That
makes the **duration gate depend on the browser owning the codec**, which is a different
question from how long the clip is. A browser without HEVC refuses a perfectly good file
that every other guest's phone could play, and the bytes were never the problem.

The container knows. `mvhd` inside `moov` carries a timescale and a duration, in MP4, MOV
and 3GP alike, and reading it is a walk over box headers with a `DataView`. No decoder, no
dependency, no build step.

**Ordered so it cannot regress**: the `<video>` element still runs first and still decides
every case it decides today. The container read happens only on the branch that would
otherwise have refused the file. The worst case is today's behaviour.

## Task 3: the tap that lands on nothing

Found while reading. The zone's click handler is `if (e.target !== zone) return`, which is
aimed at the two buttons but catches their container as well, so a tap on the padding
around the buttons does nothing at all. Narrow it to the buttons that own their clicks.

## Not in scope

- **A HEIC decoder.** Still the one image cause with no free fix, still awaiting the
  owner's call on a ~1.5 MB lazy loaded dependency. Nothing here presumes that answer.
- **Uploading an original when the re-encode fails.** Considered and refused: the album
  renders its thumbnails from the stored object, so a 40 MB passthrough would make the
  album page unusable on mobile data. It trades a refusal the guest can see for a slow
  album everybody gets.
- **Any change to the refusal copy.** It already names the type. If it is still not
  enough, the instrument will say why, and that is the next task's input.

## Verification

1. Both fixtures and every synthetic failure case driven through `check.html` in an
   Android profile browser, and the reported facts checked against `ffprobe`.
2. The video duration fallback proved against a real MP4 with the `<video>` path forced
   to fail, and proved not to fire when the `<video>` path succeeds.
3. A photograph and a video still reach ON RECORD through the real uploader.
4. Deployed, and the live bytes confirmed before it is called done.
