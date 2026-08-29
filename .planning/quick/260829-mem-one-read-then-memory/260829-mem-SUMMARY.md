---
id: 260829-mem
slug: one-read-then-memory
kind: quick
created: 2026-08-29
completed: 2026-08-29
status: complete
mode: inline
files_modified:
  - app.js
  - check.html
  - index.html
  - album.html
---

# Quick task 260829-mem: summary

**The upload pipeline reads a picked file once, whole, through whichever reader works, and
never touches the File again.** Every step after that, the signature, the decode, the
duration, the upload, works on the copy in memory.

## What was wrong, exactly

Not a format. Not a codec. Not a cap. The uploader read a picked File **four different
ways**: an `<img>` from a blob URL, a `<video>` from a blob URL, `FileReader` on 32 byte and
16 byte **slices**, and the XHR upload of the File. On Android each is a separate trip into
the phone's file provider and, as the owner's phone proved on 2026-08-28, they do not all
succeed or fail together: nine `unreadable` refusals on v17 including a video that had
uploaded twice that evening, while one JPEG still landed. The code refused at the first
reader that failed. Every patch of that evening, the container walk, the retry, the beacon,
stacked another reader on the same flaw.

## The rebuild

- **`acquireBytes(file)`**: three readers that take different paths through the browser,
  `FileReader` on the whole File, `fetch()` of a blob URL through the network stack, and
  `File.arrayBuffer()`, each bounded by a 45 second timer, the ladder retried five times
  over ten seconds. What it tried rides on the row and into the beacon as `read.via`,
  `read.tries` and `read.errors`.
- **No slices anywhere.** `sigOf(buf)` and `mp4DurationFromBuffer(buf)` are synchronous
  over the bytes in memory. `file.slice(` no longer appears in `app.js`.
- **`downscaleToJpeg({buf, file})`** hands the `<img>` an in-memory `Blob`. The HEIC reader
  takes the buffer. The JPEG passthrough sends the buffer.
- **`probeVideo(buf, file)`** hands the `<video>` an in-memory `Blob`, falls back to the
  container walk in memory, and the upload sends the same bytes.
- **When every reader refuses, the File is handed to the element directly**, exactly as
  before the rebuild. An image loader is a fifth reader and nothing that worked before can
  stop working. Only when that fails too does the guest read `photos.err.unreadable`.
- `check.html` mirrors the same ladder and the same order, prints which reader produced
  the bytes and what every other one said, and its verdicts match the uploader on every
  branch including the two new ones.

## Verified

Thirteen cases through the real uploader with the wire stubbed, four simulated provider
behaviours, **13 of 13 pass**:

| Provider behaviour | Cases | Result |
|---|---|---|
| nothing patched | JPEG, H.264 MP4, HEIC with empty type, ProRes MOV, 62 s clip, undecodable JPEG, text named `.jpg` | ON RECORD, ON RECORD, ON RECORD, ON RECORD (mvhd from memory), refused as too long, ON RECORD as the original, refused |
| `FileReader` refuses a File with `NotReadableError`, others work | JPEG, MP4 | both ON RECORD, read by `fetch` |
| every reader refuses, the element can still read the File | JPEG, MP4 | both ON RECORD after the 10 s ladder, read directly |
| nothing can read the File | JPEG, MP4 | the phone sentence after 11 s, beacon carries `via: null, tries: 6, errors: reader:NotReadableError, fetch:TypeError, arrayBuffer:NotReadableError` |

`check.html` under the same four behaviours: every card names the reader, the refusals
are aggregated with counts, the verdicts match, the send button posts the report (3 to
4 KB) to the write-only table and nothing else leaves the page. Three pages at two
viewports, zero errors, zero overflow.

## What the owner will see on the Android

If any of the three readers can get the bytes, the file uploads, and the diagnostics
table will say which reader it was. If none can and the element cannot either, the
sentence tells them to pick through Files or the gallery rather than Photos, and the
table will hold the exact refusals from all three readers, so the next step is a fact
and not a guess.

## The honest limit

No Android was in the room. The four behaviours are simulations of the errors the phone
reported, not the phone. The rebuild is defensible on its own, a pipeline that refuses at
the first of four readers is wrong whatever the phone does, but the proof that it fixes
this phone is one upload on that phone.

## Addendum: the re-pick, and bytes that are not read twice

The owner, on the rebuild: "much better, works at the first try. But if I delete one
picture and resubmit it, I get the phone-did-not-hand-over sentence."

The logs for those two minutes: three uploads in a row at 06:08, first try. Five
removals. Then the re-pick of a JPEG refused by all three readers, then the re-pick of
**the same 39.5 MB video that had just uploaded** refused by all three readers, then the
pick after that of the same video landing again. So a re-pick fails or succeeds per pick,
at the provider's whim, and nothing on this side can make the phone hand over a file it
has decided not to.

But the page held those exact bytes in memory a minute earlier. `acquireBytes()` now keeps
the last few files it read, keyed by name, size and modification time, which is the
identity a picker hands back and which two different files do not share. A re-pick
answers from memory before a single reader is asked. Four files or sixty four megabytes,
oldest out.

Proved through the real uploader with the real Remove control: pick, remove, then pick the
same file again with every reader and the element made to refuse it. The JPEG lands in
583 ms and the clip in 876 ms, no reader consulted, no beacon filed. Thirteen of thirteen
pipeline cases unchanged.

What this does not cover, honestly: a re-pick after the page was reloaded, because the
memory is gone with the page. That case is the provider's, and the sentence still tells
the guest what to do.

## Addendum 2: the other door, and what is and is not proven

The owner, fairly: "how can you be sure it is the phone and not a bug in the website?"

What is proven: the refusals happen inside the browser's own file reading APIs, all three
readers at once, at the very first read after the pick, with the same `NotReadableError`
the stripped down `check.html` reproduces with no uploader involved; the same code reads
other files on the same phone, and the same file on other picks; iOS has never produced
it. What is not ruled out: that the way the site opens the picker, `accept="image/*,
video/*"` with `multiple`, is what steers Android into the picker whose provider
misbehaves. That is a website thing in the only sense that matters, and it can be tested
rather than argued.

So the uploader now has **a second door**. After any refusal that named the phone, a
control appears beside the pick button: "Choose through Files instead". It opens an input
with no `accept` at all, which is what makes Android open the storage framework's Files
picker rather than the gallery. Every record carries which door it came through, and the
beacon carries it as `picker: media | files`, so the diagnostics table will show whether
the two routes read differently on that phone. If Files always reads, the picker is the
cause and the door is the fix; if Files refuses too, it is the file, and that is settled.

Three smaller things beside it, all proved:

- **The ladder waits thirty seconds, not ten**, seven passes at 0.5, 1, 2, 3, 5, 8 and 10
  seconds. A provider fetching a cloud item on demand can take longer than ten for a
  twenty megabyte clip on mobile data, and refusing at second eleven would be refusing the
  file exactly while it was on its way.
- **The status line says what it is waiting for**: "Still waiting for the phone to hand
  over file 1 of 1", three languages, 267 keys at parity, instead of half a minute of
  Preparing with nothing moving.
- **`input.value` is no longer cleared in the change handler**, on the way into a read of
  the very Files that pick produced. It is cleared on the way into the picker instead,
  which preserves the one reason it was ever cleared: picking the same file twice still
  fires change.

Proved: before any refusal the door is hidden; during the ladder the waiting line shows;
after the refusal the door is visible, labelled, and opens the Files input and not the
media one; a readable pick through it lands in 146 ms; a refusal through it is tagged
`files` in the beacon. Thirteen of thirteen pipeline cases, the re-pick from memory, and
three pages at two viewports unchanged.
