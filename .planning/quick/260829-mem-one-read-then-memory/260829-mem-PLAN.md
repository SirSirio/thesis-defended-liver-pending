---
id: 260829-mem
slug: one-read-then-memory
kind: quick
created: 2026-08-29
status: complete
mode: inline
resolves_todo: photo-rejections-unexplained
depends_on: 260828-hef
---

# Quick task 260829-mem: one read, then never the File again

The owner, at the end of a long evening: "now I cannot upload anything, stuck at preparing,
then says the phone did not hand over the file. For anything. iPhone works. Rethink the
problem from scratch."

## What the data said before any code was touched

`public.diagnostics`, live for forty minutes, held nine refusals from the Android on v17,
every one `photos.err.unreadable`. Among them **the same 39.5 MB video that had uploaded
twice earlier that evening**, and the same JPEG from the owner's report. And one JPEG had
still landed on v17, at 22:13:18. The edge logs agreed.

So the phone was not "unable to read files". It was able to read some files some ways.
And the uploader read a file **four different ways**: an `<img>` from a blob URL, a
`<video>` from a blob URL, `FileReader` on 32 byte and 16 byte **slices**, and the XHR
upload of the File itself. On Android those are four separate trips into the phone's file
provider, and the evidence is that they do not all succeed or fail together. The code
refused at the first one that failed. That is the design flaw, and every patch of the
evening (the container walk, the retry, the beacon) added another reader on top of it.

## The rebuild, one principle

**Get the bytes into memory once, sequentially, whole, through whichever reader works,
then never touch the File again.**

- `acquireBytes(file)`: a ladder of three readers that take different paths through the
  browser: `FileReader` on the whole File, `fetch()` of a blob URL through the network
  stack, and `File.arrayBuffer()`. Each bounded by a timer. The ladder is retried five
  times over ten seconds, because Android providers refuse and then relent. The full
  record of what was tried travels on the row for the beacon.
- **No slices anywhere.** A slice is a seek, and a provider that streams through a pipe
  cannot seek. The signature, the container walk and the beacon all read the copy in
  memory.
- The `<img>` decode and the `<video>` probe are handed an in-memory `Blob`, so they read
  from the heap. The upload sends the same bytes.
- **When every reader refuses, the File is handed to the element directly**, exactly as
  before the rebuild. An image loader is a fifth reader, and nothing that worked before can
  stop working. Only when that fails too does the guest read the sentence about the phone.
- JPEG passthrough, the HEIC reader and the sixty second rule all stay, now fed from
  memory. `check.html` mirrors the same ladder and the same order, and says which reader
  produced the bytes.

## Verification

Thirteen cases through the real uploader with the wire stubbed, in four simulated provider
behaviours: nothing patched; `FileReader` refuses a File with `NotReadableError` while the
other readers work; every reader refuses while the element still reads the File; and
nothing at all can read the File. Every real fixture, both kinds, the too-long clip, the
passthrough, the HEIC, and the sentence on the last mode with the ladder's record in the
beacon. Then `check.html` under the same four, then three pages at two viewports, then
the live site.
