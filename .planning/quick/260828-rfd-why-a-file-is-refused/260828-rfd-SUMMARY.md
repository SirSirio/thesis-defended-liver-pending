---
id: 260828-rfd
slug: why-a-file-is-refused
kind: quick
created: 2026-08-28
completed: 2026-08-28
status: complete
mode: inline
files_modified:
  - check.html (new)
  - app.js
  - index.html
  - album.html
---

# Quick task 260828-rfd: summary

**The Android fault was not reproduced and is not claimed to be fixed.** What shipped is
the instrument that will name it, plus two real defects found while looking for it, both
proved before and after.

That distinction is the whole point of this file. Three sessions have now guessed at this
report and two have shipped a guess. This one did not.

## What was ruled out, and how

Every line below was checked before a character of code was written.

| Ruled out | How |
|---|---|
| A broken or partial deploy | Fetched the live `index.html`, `app.js`, `config.js`, `copy.js`. All 200, and the byte delta against the working tree is exactly the line count, which is the CRLF difference and nothing else |
| A stale asset version | `?v=13` on every script and stylesheet in both pages, and the server returns current bytes at any `?v=` |
| Modern JS the browser cannot parse | `app.js` is ES5 throughout. No arrow functions, no template literals, no optional chaining, two `const` in eight thousand lines, and none of `replaceAll`, `at`, `flat`, `fromEntries`, `structuredClone` |
| A CSP blocking `blob:` | There is no CSP on the page. Both decode paths rest on `URL.createObjectURL` and would have broken together, which fits the report exactly, so it was worth eliminating rather than assuming |
| The five per guest ceiling | Queried the live table. Four guest ids hold rows, all accounted for, and the device in question holds none of them |
| Re-picking one file doing nothing | `input.value` is cleared in the change handler |
| A bug in the client path | Drove the real page in an Android profile Chromium against the local server with the wire stubbed. A JPEG, an H.264 MP4 and an **HEVC** MP4 all reached ON RECORD, console clean |

HEVC was the leading theory going in: Android phones record it by default in efficiency
mode, iOS decodes it natively, and it would have explained the split exactly. **It decoded
without complaint.** The theory was wrong and is written down here so it is not
re-litigated next time.

So the cause is on the device: the bytes, the browser build, or its codec set. None of
those is reachable from here. That is precisely what the open todo has said since
2026-08-17:

> Reproduce first, with the actual failing files, and record the `file.name`, `file.type`
> and `file.size` of each. **Do not guess** between the three above.

Correct instruction, never followable, because there has been no way to get those values
off a phone. **That was the thing to build.**

## What shipped, one: `check.html`

An unlisted page, linked from nothing, at
`https://sirsirio.github.io/thesis-defended-liver-pending/check.html`. The owner opens it
on the failing device, picks the failing files, and reads the answer.

Per file it prints `name`, `type`, `size`, `lastModified`, then runs **the same two
operations the uploader runs** and prints what came back: for a photograph the `<img>`
decode and the canvas re-encode as two separate outcomes, because a file can decode
perfectly and still fail to encode and the two need different answers; for a video the
`<video>` metadata probe, the duration, the dimensions, and the **`MediaError` code and
message**, which is the single most useful value on the page and the one thing the
uploader throws away.

Then a device panel: user agent, memory, cores, screen, and a table of what this browser
can actually read, H.264, HEVC, AV1, VP9, QuickTime and 3GP. A browser that answers
nothing for H.264 cannot read an ordinary phone video however good the bytes are, and that
fact is invisible from every other surface on the site.

A **copy button** puts the whole report on the clipboard, so the answer arrives as text
rather than as a photograph of a screen.

Three properties are deliberate:

- **It touches no network.** Verified, not asserted: the test harness intercepts every
  request the page makes and fails if one is not same origin static. `offsite requests:
  NONE`. A file picked here cannot leave the device, which is what makes it safe to hand
  to a phone and safe to leave on a public URL.
- **It reports facts, not opinions.** It never re-implements `validateFile()`. Two copies
  of a rule drift apart; two readings of `file.type` cannot.
- **It is self contained.** It does not load `styles.css`. A diagnostic that can be broken
  by a change to the thing it is diagnosing is not one.

## What shipped, two: the decoder no longer vetoes a video

Independent of the report, and defensible on its own.

`probeVideoDuration()` learned a clip's length by handing it to a `<video>` element, which
made the duration gate depend on **this browser owning this codec**. Those are two
different questions and only one of them is any of our business. Nothing is re-encoded, so
what this browser can decode has no bearing on what lands in the bucket: a browser without
a codec was refusing a clip every other guest's phone would play.

The container already knows. MP4, MOV and 3GP are ISO base media files, and the `mvhd` box
inside `moov` carries a timescale and a duration. `mp4DurationFromContainer()` walks the
box headers with a `DataView`, reading by `File.slice` so a fifty megabyte clip costs a few
kilobytes of memory, and returns **null for anything it is not certain about**. WebM is
Matroska and lands on null correctly with no special case.

**Ordered so it cannot regress.** The `<video>` element still runs first and still decides
every case it decides today. The container is asked only on the branch that would
otherwise have refused the file as unreadable. Worst case is yesterday's behaviour.

### Proved, with files the element genuinely cannot read

ProRes in `.mov` and MPEG-4 Part 2 in `.mp4` both fail Chromium with
`MediaError 4, DEMUXER_ERROR_NO_SUPPORTED_STREAMS`, confirmed through `check.html` first,
so these are real failures of the element path and not a rigged test.

| File | ffprobe | Before | After |
|---|---|---|---|
| ProRes `.mov`, 3.00 s | 3.00 | refused | **ON RECORD** |
| MPEG-4 Part 2, 8.08 s | 8.08 | refused | **ON RECORD** |
| MPEG-4 Part 2, 59.0 s | 59.00 | refused | **ON RECORD** |
| MPEG-4 Part 2, 62.0 s | 62.00 | refused | **refused, "Longer than 60 seconds"** |
| MPEG-4 Part 2, 65.0 s | 65.00 | refused | **refused, "Longer than 60 seconds"** |
| A text file named `.mp4` | not a video | refused | **refused, "could not open this video"** |
| JPEG + H.264 MP4 | | ON RECORD | **ON RECORD** |

The 59 against 62 pair is the row that matters. **The one minute rule is still enforced,
by arithmetic on the container, with no decoder involved at all**, and a file that is not a
video still cannot slip through on a null.

## What shipped, three: a tap that landed on nothing

Found by reading. The zone's click handler was `if (e.target !== zone) return`, aimed at
the two buttons but catching their container as well. The zone is 132px tall and the
button row sits across the middle of it, so the likeliest tap in the whole control did
nothing at all.

Measured against the deployed site and then against the fix, counting how many times the
picker opened:

| Tap | Deployed | After |
|---|---|---|
| bare zone | 1 | 1 |
| the button row | **0** | **1** |
| the pick button | 1 | 1, never 2 |

## Two defects of my own, caught before shipping

- **The instrument lied about `MediaError 4`.** The first draft said "the file is very
  likely fine and another phone would play it". Code 4 covers both a missing codec and a
  file that is not a video at all, and a page whose whole purpose is that nobody has to
  guess cannot open by guessing. Reworded to name both possibilities.
- **Two contrast failures in the new page.** The site's `--ink-faint` measures 3.63:1 on
  `--surface`, which is fine on the invitation where it carries decoration, and not fine
  here where every quiet label is a field name in a report read on a phone. A separate
  `--ink-label` at `#8A8A90`, 5.36:1 on `--surface` and 5.73:1 on `--bg`. Every other pair
  was measured: red verdict 4.77, green verdict 10.99, red value 4.59, green value 10.56,
  lede 7.65, button 8.11.

## Verified

Three pages, two viewports, zero console errors and zero horizontal overflow on all six.
Both original fixtures still reach ON RECORD through the real uploader.

## What is still open

- **The Android fault itself.** Unreproduced and unfixed. `check.html` exists to name it,
  and until it does, anything else would be the fourth guess.
- **HEIC** remains the one image cause with no free fix, still waiting on the owner's call
  about a lazy loaded decoder of roughly 1.5 MB.
- **Uploading the original when the re-encode fails** was considered and refused: the
  album builds its thumbnails from the stored object, so a 40 MB passthrough trades a
  refusal one guest sees for a slow album everybody gets.
- `check.html` is English only. It is an owner tool, not a guest surface, and translating
  it would put three more copies of these sentences under LNG-06 for no reader.
- Noticed in passing, not touched: `.lb__count` in `styles.css` uses `--ink-faint` on real
  12.5px text at 3.88:1. Pre existing, out of this task's scope, and `styles.css` already
  records that ratio beside the token.
