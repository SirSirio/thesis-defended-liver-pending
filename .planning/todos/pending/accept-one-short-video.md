---
id: accept-one-short-video
created: 2026-08-17
source: owner, phase 04 device test
resolves_phase: 5
severity: medium
kind: feature
---

# One video, up to ten seconds, should be accepted

Owner decision during the phase 04 device pass: **one video per guest, maximum ten seconds**, in
addition to the five photographs.

## Why this is not a small change

Every layer of phase 04 assumes the payload is a JPEG the browser produced:

- `validateFile()` refuses anything whose type does not begin with `image/`.
- `downscaleToJpeg()` decodes into a canvas and re-encodes. **There is no canvas path for video.**
  Duration and dimensions cannot be checked without loading the file into a `<video>` element and
  waiting for `loadedmetadata`, which is a new async shape beside the existing image one.
- `uploadObject()` hardcodes `Content-Type: image/jpeg`.
- `storagePath()` ends every key in `.jpg`, and `STORAGE_PATH_RE` is an anchored allowlist that
  will reject any other extension at render time, so the album will silently skip a video row.
- The bucket carries `allowed_mime_types = array['image/jpeg']` and `file_size_limit = 3145728`
  (3 MiB). **Both must change in `supabase/schema.sql` and be re-run by the owner.** Ten seconds
  of phone video is comfortably more than 3 MiB, so the ceiling is the binding constraint, not the
  type list.
- `public.photos` has no column saying what kind of thing a row is, and `public.album` has no way
  to tell the renderer to build a `<video>` rather than an `<img>`.
- The five-limit trigger counts rows without regard to kind, so "five photos and one video" needs
  either a kind column and two counts, or a deliberate decision that the video consumes a slot.

## Decisions needed before planning

- Does the video consume one of the five slots, or is it a sixth thing?
- Is it re-encoded, or uploaded as picked? Re-encoding video in the browser is a large dependency
  and this project has no build step and no packages. Uploading as picked means the bucket ceiling
  is the only size control.
- What is the ceiling? Ten seconds of iPhone 4K is roughly 50 MB, 1080p is roughly 20 MB.
- Does it autoplay muted in the album, or show a poster and a play control?

Relates to [[photo-rejections-unexplained]], since a video picked today is refused by the same
validator and may be part of what the owner saw.
