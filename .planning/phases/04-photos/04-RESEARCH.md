# Phase 4: Photos - Research

**Researched:** 2026-08-15
**Domain:** Supabase Storage wire protocol under RLS, client-side image downscaling in a browser, untrusted file upload from a static site
**Confidence:** HIGH on the entire database and storage wire contract, which was settled by live probe against project `aplaxdplwnnlezffatal` rather than by inference. HIGH on the security model. MEDIUM on the browser image pipeline, where two of the four load-bearing facts are documentation rather than a probe on a real phone, and the device pass (D-30) is the thing that closes them.

> **Read these three first.**
>
> 1. **The one thing `supabase/schema.sql` says is unproven is now proven.** A sixth photo under one
>    `guest_id` is refused with HTTP `400`, `code: "P0001"`, `message: "photo_limit_reached"`. This
>    was executed on the wire today. **D-26's proof task is already done**, and what remains of D-26
>    is the cleanup, which is now larger than D-26 anticipated. See `## THE PROOF` and
>    `## Owner Actions`.
> 2. **D-17's exact call, `createImageBitmap(blob, { imageOrientation: 'from-image' })`, is a
>    hazard rather than a safeguard.** `from-image` is already the default everywhere, and the
>    literal string is only accepted from Safari 16 / Chrome 112 / Firefox 111. Passing an
>    unrecognised enum into a WebIDL dictionary throws. The decision's *intent* is right and its
>    *mechanism* should change. See `## THE ORIENTATION REFINEMENT`.
> 3. **D-24 overstates what a MIME allow-list buys and understates what Supabase already gives you
>    for free.** Supabase validates the *declared* Content-Type, not the bytes, so the allow-list is
>    spoofable. But Supabase's own read path already neutralises the HTML and SVG execution vectors,
>    verified by probe. The genuine hard control in D-24 is `file_size_limit`. See `## Security Domain`.
>
> Everything else in CONTEXT.md survives intact, and a great deal of it is now confirmed rather than assumed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Copied from `04-CONTEXT.md`, abbreviated only by dropping the reversibility notes, which are
reproduced in full in the source file.

- **D-01:** Upload is gated on a name and a `guest_id` in storage, not on the `enrolled` flag.
- **D-02:** A guest who has not registered sees the enrollment call to action in the photos section, never a name field.
- **D-03:** Uploads open at a configured moment, `photos.opensAt`, and once open they never close. Default the value to the party start minus three hours.
- **D-04:** The gate is evaluated against the same fixed-offset Europe/Copenhagen arithmetic the countdown already uses, never against the browser's local timezone.
- **D-05:** The closed panel states the opening moment as text, and the gate is one config line the owner can blank from their phone. `photos.opensAt: null` opens it immediately.
- **D-06:** Closed means the pending panel only, with no album below it.
- **D-07:** A grid of square thumbnails, with the institutional register in the chrome around it rather than in each row.
- **D-08:** Each tile carries the uploader's first name as an overlay caption in the institutional micro-type (PH-04).
- **D-09:** Newest first. `GET /rest/v1/album?select=first_name,storage_path,created_at&order=created_at.desc`.
- **D-10:** Every tile is a plain `<a>` to the public storage URL, opening in a new tab. The deliberate non-lightbox.
- **D-11:** Fixed aspect-ratio tiles with `loading="lazy"`, no pagination.
- **D-12:** The album refetches after a successful upload, and on nothing else. No polling.
- **D-13:** An empty album shows the upload control and one deadpan line, not a hidden section.
- **D-14:** The album failing to load is silent, and the upload control still works.
- **D-15:** `<input type="file" accept="image/*" multiple>`. If three remain and they pick five, the first three are accepted and the extra two are named in the refusal message.
- **D-16:** Every file is re-encoded to JPEG at longest edge 1600px, quality 0.82 (PH-06). Configurable as `photos.maxEdgePx` and `photos.jpegQuality`.
- **D-17:** EXIF orientation is handled explicitly, with `createImageBitmap(blob, { imageOrientation: 'from-image' })` where available.
- **D-18:** Files upload one at a time, sequentially, with determinate per-file progress (PH-05). The storage PUT specifically uses XHR, and everything else stays on `sbRequest`.
- **D-19:** The write is storage PUT first, then the `photos` row insert, and the sixth photo is refused client side before either. The database trigger stays as the floor; on `photo_limit_reached` the client sets its local count to five and shows the refusal.
- **D-20:** Storage paths are `{yyyy-mm-dd}/{fresh-uuid}.jpg`, with the UUID unrelated to `guest_id`.
- **D-21:** Validation before the decode, not just before the wire (PH-07). Refuse non-`image/*`, anything over `photos.maxFileSizeMb` (12), and anything zero-byte, all before the canvas work.
- **D-22:** The remaining count comes from `localStorage`, and that is structural rather than lazy (PH-02).
- **D-23:** The sixth photo is refused as a course regulation, never as an error and never as an apology.
- **D-24:** The bucket gets a server-side MIME allow-list and size limit, and this is the one real control available. `allowed_mime_types = '{image/jpeg}'`, `file_size_limit` roughly 3MB, applied with `on conflict (id) do update set ...`.
- **D-25:** Nothing this phase adds may hand out a `guest_id` or a full name.
- **D-26:** The sixth-photo refusal is proved on the wire, as an explicit task, and the test rows are cleaned up by the owner afterwards.
- **D-27:** A 201 is not proof, and neither is a 200 (carried forward from phase 3's D-07).
- **D-28:** MOTION_INTENSITY 3, the same restraint phases 2 and 3 held.
- **D-29:** Every animation ships with its `prefers-reduced-motion` fallback in this phase, not retrofitted in phase 5.
- **D-30:** `04-DEVICE-PASS.md`, in the shape phases 2 and 3 used, covering portrait iPhone orientation, HEIC selection, multi-select on both platforms, throttled progress, the sixth-photo refusal, 44px targets, and the grid at 320px.

### Claude's Discretion

- Exact copy in all three languages, written natively per language rather than translated. New keys for the upload control, its errors, the progress states, the refusal, the remaining count, the not-registered state and the closed state, added to all three tables at identical key sets.
- Tile size, gutter, and column count at each breakpoint, and whether the grid is square-cropped or aspect-preserving within a fixed box.
- Whether the upload control sits above or below the album.
- The visual treatment of the caption overlay, and whether it is always visible or on hover and focus only.
- Whether the remaining count is a sentence, a chip, or part of the button label.
- The precise wording of the owner-facing comments in `config.js` and `supabase/schema.sql`.
- The exact default for `photos.opensAt` beyond "party start minus three hours" if the arithmetic reads badly in the config file.

### Deferred Ideas (OUT OF SCOPE)

- Deleting or moderating a photo (V2-01), and structurally impossible from the browser today.
- Lightbox with swipe (V2-06). D-10 ships the native browser viewer instead.
- Captions, tagging, or reactions on a photo.
- Download-the-whole-album.
- The degradation arc and spectacle motion for `#photos` (phase 5, DSG-04).
- Kahoot easter egg (phase 5).
- Server-side image processing, thumbnails, or a CDN transform.
- Any per-guest view of "my photos".

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PH-01 | Guest uploads photos from a phone camera roll, no login | `<input type="file" accept="image/*" multiple>`, §Pitfall 1 on the `accept` list. Anonymous insert policy probe-verified working, §Wire Contract S2. |
| PH-02 | Limit of 5 per visitor identity, remaining count shown before upload | Count lives in `localStorage` (D-22). Database floor probe-verified at `P0001` / `photo_limit_reached`, §THE PROOF. |
| PH-03 | Uploads land in Supabase Storage and are indexed in a Supabase table | Both halves probe-verified today. §Wire Contract S2 and S5. |
| PH-04 | Shared album displays all uploads with the uploader's name | `GET /rest/v1/album` probe-verified returning `first_name` truncated server side. §Wire Contract S6. |
| PH-05 | Progress, success and failure states, never a silent failure | Determinate progress needs XHR (D-18); `fetch` has no upload progress event. §Pattern 3, §Code Examples E3. |
| PH-06 | Client-side downscale before upload | §The Image Pipeline, full recommended path with the orientation refinement. |
| PH-07 | File type and size validated before upload starts | §Pattern 2. Client checks are a UX affordance; §Security Domain says which controls are real. |
| PH-08 | With Supabase not configured, the section explains uploads open later | `sbConfigured()` at `app.js:1248` and `pendingBlock()` at `app.js:320` already exist. §Pattern 6. |
| ID-05 | Identity carries photo attribution and the 5-photo count | `identity.get()` at `app.js:1189` already returns `guest_id` and `name`. New count key joins the same layout. §Identity Handoff. |
| CFG-01, CFG-03, CFG-04 | Volatile values in config, graceful placeholders, documented inline | §Config Impact. Three new keys, all in the existing `photos` block. |
| DSG-05, DSG-06, DSG-07 | Reduced motion, zero em dashes, no animation gates | §Design Constraint Precedence. |
| DSG-08 | Passes the pre-flight matrix | The upload control has nine states; §Pattern 3 enumerates them. |
| LNG-06, LNG-07 | Identical key sets, English fallback | Verified at parity today: 156 flat dotted keys in each of `en`, `it`, `da`. §Copy Impact. |
| CD-04 | Countdown's "it is over, upload your photos" state | The same moment as D-03's `opensAt` gate from the other side. §Pitfall 8. |

</phase_requirements>

---

## Summary

This phase is in an unusually strong position, because everything that could be tested against the
live database was tested against the live database rather than reasoned about. Twenty-eight requests
were executed against project `aplaxdplwnnlezffatal` on 2026-08-15: the storage upload verb, the
authentication header shape, the collision behaviour, the public read path, the MIME handling, the
CORS preflight, the album view, and the five-photo trigger including its sixth-photo refusal. Every
number, code and header in the `## Wire Contract` section below came off the wire. There is nothing
left to guess about the server half of this phase.

The client half is where the remaining risk sits, and it concentrates in one place. Getting a
portrait iPhone photo to land the right way up in the album is the single most visible way this
phase can fail, and CONTEXT.md is right to have given it its own decision. The refinement research
adds is that the mechanism D-17 names carries more risk than the problem it solves: `from-image` is
already the default value of `imageOrientation`, the literal string is only accepted from Safari 16
onward, and Safari before 17.2 spelled the same behaviour `none`. An unrecognised enum value in a
WebIDL dictionary is a `TypeError`, not a silent ignore. Meanwhile the plain `<img>` element path,
which needs no feature detection and has no version floor at all, gets orientation right in both
Chromium and WebKit because `image-orientation: from-image` is the CSS initial value and both
engines honour it in `drawImage`. The recommendation is to make `<img>` the primary path and treat
`createImageBitmap` as an optimisation that is not worth a second code path on this project.

On security, the honest picture is better than CONTEXT.md feared in one place and worse in another.
Better: Supabase's own read path already closes the stored-execution vectors. An upload declaring
`text/html` is served back as `text/plain` with `X-Content-Type-Options: nosniff`, and an SVG is
served with `Content-Disposition: attachment` plus `nosniff`. Both were probed. Worse: the
`allowed_mime_types` allow-list D-24 leans on is validated against the *declared* Content-Type
rather than the file's bytes, so it stops accidents and casual junk but not a deliberate request.
The control in D-24 that genuinely holds against anything is `file_size_limit`, which is counted on
real bytes. D-24 should ship, with its rationale corrected.

**Primary recommendation:** ship D-24 with `file_size_limit` framed as the real control and
`allowed_mime_types` as hygiene; replace D-17's explicit options object with the `<img>` + `drawImage`
path; keep every other decision exactly as written; and treat D-26 as already discharged, replacing
it with a cleanup task whose inventory is listed verbatim in `## Owner Actions`.

---

## THE PROOF

`supabase/schema.sql` states, in its header, the one thing about this project's database that had
never been executed:

> ```
> -- One half of section 4 is still unproven on the wire: that a sixth photo
> -- under one guest_id is refused with photo_limit_reached. Proving it means
> -- writing five real rows, and nothing in this file can delete them again,
> -- because no delete rule exists for anyone. Phase 4 owns that proof, and it
> -- should carry it as an explicit task rather than assume it.
> ```
> [VERIFIED: supabase/schema.sql:54-58, quoted verbatim]

It is now proven. Six inserts were executed against the live project on 2026-08-15 under a
throwaway `guest_id`, `99999999-0000-4000-8000-000000000001`, with `name` set to `ZZTEST DeleteMe`,
the same marker phase 3 used and the owner already recognises.

```
POST /rest/v1/photos   apikey only   Prefer: return=minimal
{"guest_id":"99999999-0000-4000-8000-000000000001","name":"ZZTEST DeleteMe","storage_path":"zz-research/limit-N.jpg"}

  photo 1  ->  201 Created, empty body
  photo 2  ->  201 Created, empty body
  photo 3  ->  201 Created, empty body
  photo 4  ->  201 Created, empty body
  photo 5  ->  201 Created, empty body
  photo 6  ->  400  {"code":"P0001","details":null,"hint":null,"message":"photo_limit_reached"}
```
[VERIFIED: live probe against aplaxdplwnnlezffatal, 2026-08-15]

Read back through `public.album` immediately afterwards, all five rows were present with
`first_name` reading `ZZTEST`, which satisfies D-27's rule that a status code is not proof. A
seventh insert under a **different** `guest_id` returned `201`, confirming the limit is per guest
and not global.

### The three things this settles that a plan must be written against

| Finding | Value | Why it matters |
|---|---|---|
| Refusal code | HTTP `400`, `code: "P0001"`, `message: "photo_limit_reached"` | `P0001` is `raise_exception`. The client must branch on `code === 'P0001'`, never on the message string, which is not localised and is not part of any contract. |
| Successful insert | HTTP **`201`**, empty body | Different from the storage upload, which answers **`200`**. Two endpoints, two success codes, in the same upload of one photo. |
| Limit scope | per `guest_id` | A second identity gets its own five, which is exactly what D-22 says the soft limit is. |

### The ordering trap the probe also surfaced

The five-photo trigger is `before insert on public.photos`. It therefore fires **before** the
`storage_path` unique constraint is evaluated. Probed:

| Situation | Response |
|---|---|
| Duplicate `storage_path`, guest **below** the limit | `409`, `code: "23505"`, `duplicate key value violates unique constraint "photos_storage_path_key"` |
| Duplicate `storage_path`, guest **at** the limit | `400`, `code: "P0001"`, `photo_limit_reached` |

[VERIFIED: live probe, 2026-08-15]

So a client at five cannot distinguish a limit refusal from a path collision. This is harmless under
D-20, because the path carries a fresh UUID and a collision is a lottery win, but it means the
`P0001` branch must be treated as "you are at five" unconditionally and must not attempt a retry with
a new path. D-19's self-healing answer, setting the local count to five and showing the refusal, is
the correct handling of both.

### What this changes about D-26

D-26 asked for a task that writes five test rows, confirms the sixth is refused, and hands cleanup
to the owner. The first two thirds are done. **The plan should replace D-26's proof task with a
cleanup task**, and it should keep D-26's verification discipline: the removal is confirmed through
`public.album`, never through the blocked `photos` table. The exact inventory is in
`## Owner Actions` and it is larger than D-26 anticipated, because the storage probes left objects
behind too.

---

## THE ORIENTATION REFINEMENT

D-17 calls EXIF orientation "the single most visible way this phase can fail", and that judgement is
correct. The mechanism it names is the part to change.

### What D-17 specifies

> **D-17:** EXIF orientation is handled explicitly, with
> `createImageBitmap(blob, { imageOrientation: 'from-image' })` where available.
> [VERIFIED: .planning/phases/04-photos/04-CONTEXT.md:153-155, quoted verbatim]

### Three facts that make that call worse than doing nothing

**One. `from-image` is already the default.**

> `"from-image"` (default) - Image oriented according to EXIF orientation metadata, if present
> [CITED: developer.mozilla.org/en-US/docs/Web/API/Window/createImageBitmap]

Passing it explicitly requests the behaviour you would have got anyway.

**Two. The literal string has a version floor, and it is above the floor of the API itself.**
Support for the `imageOrientation` value `from-image` begins at Safari 16, iOS Safari 16, Chrome
112, Firefox 111. [CITED: caniuse.com/mdn-api_createimagebitmap_options_imageorientation_parameter_from-image]
`createImageBitmap` itself is partially supported from Safari 15. The gap between the two is a real
population of iPhones.

**Three. Safari used to spell the same behaviour with the opposite word.**

> "In earlier versions, this automatic orientation behavior was represented by the term `"none"` in
> the `ImageBitmapOptions`'s `imageOrientation` property. In Safari 17.2, to better reflect the
> actual functionality, this keyword is changed to `"from-image"`."
> [CITED: webkit.org/blog/14787/webkit-features-in-safari-17-2/]

An enum value a WebIDL dictionary does not recognise is a `TypeError`, not an ignored option. On the
affected Safari versions the promise rejects, and if the rejection lands in a generic catch it reads
as "this photo could not be read" for a photo that is completely fine. That is a worse outcome than
the sideways photo the decision was written to prevent, because it refuses the upload entirely.

### What to do instead

Use the `<img>` element. It has no version floor, needs no feature detection, and is correct on both
engines that matter here.

> **Initial value:** `from-image`
> [CITED: developer.mozilla.org/en-US/docs/Web/CSS/image-orientation]

> In Chrome, canvas `drawImage` will honor EXIF orientation, unless the value of `image-orientation`
> on the canvas element is `none`. In WebKit, where there is no `image-orientation` property (it is
> effectively always `from-image`), the image drawn to the canvas will honor the EXIF orientation.
> [CITED: github.com/w3c/csswg-drafts/issues/4666, "[css-images] image-orientation and canvas drawImage"]

Two consequences the pipeline depends on: `img.naturalWidth` and `img.naturalHeight` report the
**oriented** dimensions, so a portrait photo reports portrait, and the downscale arithmetic needs no
orientation-aware swap; and `ctx.drawImage(img, 0, 0, w, h)` writes the oriented pixels, so no
rotation matrix is needed either. The whole of D-17's intent is satisfied by *not* writing
orientation code.

**This is a refinement of D-17, not a reversal.** D-17's substance is "orientation is handled
explicitly and gets its own line in the device pass rather than being assumed to work." Both survive.
Only the API call changes, and the device pass line (D-30) is what closes the residual risk, because
this is the one claim in this document that a probe could not settle.

**If the planner prefers to keep `createImageBitmap` for the off-main-thread decode:** call it as
`createImageBitmap(blob)` with **no options object at all**. The default is already `from-image`,
there is no enum to get wrong, and the version floor drops back to that of the bare API. Wrap it in a
try/catch that falls through to the `<img>` path. That is two code paths where one would do, and the
recommendation is still one, but this variant is safe where D-17's literal text is not.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Picking files from the camera roll | Browser (`<input type="file">`) | OS | iOS does the HEIC to JPEG conversion itself, at the OS layer, before the browser sees a byte. |
| Decode, downscale, re-encode | Browser (canvas) | none | No server exists. This is the whole of PH-06. |
| File type and size validation before decode | Browser | Database / Storage (`file_size_limit`) | Browser for the message and for the phone's memory, bucket for the truth. Both, never one. |
| Storing the bytes | Supabase Storage | none | Direct `POST` from the phone. No proxy. |
| Indexing the upload | Database (PostgREST insert on `public.photos`) | none | Direct `POST`, verified today. |
| Enforcing five per guest | Database (`before insert` trigger, `security definer`) | Browser (`localStorage` count) | Database is the floor and is real; the browser count is the affordance and is resettable. D-22 says so honestly. |
| Keeping `guest_id` off the page | Database (absence of the column in `public.album`) | Browser (filename discipline, D-20) | Structural. A view means the column is not there to ask for. |
| Keeping surnames off the page | Database (`split_part` in the view) | none | Server side, so a full name is structurally incapable of reaching the browser. |
| Serving the album images | Supabase Storage public read path | CDN (Cloudflare in front of it) | `Access-Control-Allow-Origin: *`, no key required, verified. |
| Preventing stored content from executing | Supabase Storage response headers | none | `text/html` downgraded to `text/plain`, SVG served as an attachment, both with `nosniff`. Verified, and not something this project implements. |
| Deciding when uploads open | Browser (`config.js` `opensAt` + fixed-offset arithmetic) | none | Presentation gate, not a security boundary. Anyone can open devtools; nobody will. |
| Upload progress | Browser (`XMLHttpRequest.upload`) | none | `fetch` has no upload progress event. D-18 is correct and unavoidable. |
| Cleaning up a photo | Supabase dashboard (owner) | none | No delete policy on either the table or the bucket, by design. V2-01. |

---

## Wire Contract

Every request in this section was executed against `https://aplaxdplwnnlezffatal.supabase.co` with
the publishable key that already ships in `config.js`, on 2026-08-15. **Confidence: HIGH throughout.**
Reproduce with:

```bash
U="https://aplaxdplwnnlezffatal.supabase.co"
K="sb_publishable_Z6Cq5vFRqyUhXueQGevrYQ__j0pNRrc"
```

### S1. Authentication on Storage, which is a different service from PostgREST

CONTEXT.md flagged this as something to re-prove rather than assume. It was right to.

| Attempt | Outer HTTP | Body |
|---|---|---|
| No headers at all | `400` | `{"statusCode":"400","error":"Error","message":"headers must have required property 'authorization'","code":"InvalidRequest"}` |
| `apikey: <key>` only | passes auth | reached the bucket lookup |
| `Authorization: Bearer <key>` only | `400` | `{"statusCode":"403","error":"Unauthorized","message":"Invalid Compact JWS","code":"AccessDenied"}` |
| Both headers, same value | passes auth | reached the bucket lookup |

[VERIFIED: live probe, 2026-08-15]

**The answer is the same as PostgREST's: send `apikey` and nothing else.** The gateway synthesises
the `authorization` the Storage service demands when `apikey` is present, which is why the bare
`apikey` request gets through despite the service's own schema requiring an authorization header.
A `Bearer` header carrying a `sb_publishable_` key is rejected outright, with a message
(`Invalid Compact JWS`) that says exactly why: it is not a JWT and Storage tries to parse it as one.

This means `sbRequest` at `app.js:1287` already sends the correct header for Storage, unchanged. Its
comment, which explains the one-header decision, applies verbatim to this service too.

### S2. Uploading an object

```
POST {supabaseUrl}/storage/v1/object/{bucket}/{path}
apikey: {supabaseKey}
Content-Type: image/jpeg
cache-control: max-age=31536000

<binary body>
```

Success: **HTTP `200`** (not 201), body
`{"Key":"party-photos/zz-research/probe-post.jpg","Id":"8180e3c7-a904-4c28-acc0-134edae16e46"}`.
[VERIFIED: live probe, 2026-08-15]

Three things to carry into the code:

1. **200, not 201.** The photos row insert answers 201 and this answers 200. One upload, two
   endpoints, two success codes. Test `res.ok`, never a literal.
2. **`cache-control` on the request sets `Cache-Control` on every future public read.** Without it
   the served header is `Cache-Control: no-cache`; with `max-age=31536000` the served header becomes
   `Cache-Control: public, max-age=31536000`. Both probe-verified. This is a free and material win:
   the album is immutable content re-read by every guest on congested party mobile data, and
   `no-cache` means every tile is refetched on every page view. **Recommend setting it.** It is one
   header and it is not in CONTEXT.md.
3. **`Content-Type` is what gets stored and what gets served back.** A file uploaded with
   `Content-Type: image/jpeg` is listed with `"mimetype":"image/jpeg"` and served as `image/jpeg`,
   regardless of what the bytes actually are. Set it explicitly rather than relying on `blob.type`.

### S3. Collisions and overwrites

| Attempt | Outer HTTP | Body |
|---|---|---|
| `POST` to a path that already exists | `400` | `{"statusCode":"409","error":"Duplicate","message":"The resource already exists","code":"KeyAlreadyExists"}` |
| `PUT` to a path that already exists | `400` | `{"statusCode":"403","error":"Unauthorized","message":"new row violates row-level security policy","code":"AccessDenied"}` |
| `POST` with `x-upsert: true` | `400` | same `403` / `AccessDenied` |

[VERIFIED: live probe, 2026-08-15]

**Overwriting is structurally impossible from the site**, because §6 of the schema grants an insert
policy on `storage.objects` and no update policy. `x-upsert` and `PUT` both need the update policy
and both are refused. This is a security property worth naming: no guest can replace another guest's
photo, and no guest can replace their own. It also means the phase must never send `x-upsert`; there
is nothing it can achieve except a confusing error.

### S4. Storage error shape, which is NOT PostgREST's error shape

This is the single most likely way to write a broken error path in this phase.

| | PostgREST | Storage |
|---|---|---|
| Body | `{ "code", "message", "details", "hint" }` | `{ "statusCode", "error", "message", "code" }` |
| `code` value | Postgres SQLSTATE, e.g. `23505`, `P0001` | a string name, e.g. `KeyAlreadyExists`, `AccessDenied`, `NoSuchBucket`, `InvalidRequest` |
| Outer HTTP on failure | the real status (`400`, `401`, `404`, `409`) | **`400` for everything**, with the real status in the body's `statusCode` string |

[VERIFIED: live probe, 2026-08-15. Six distinct Storage errors were observed and every one carried an outer HTTP 400.]

`sbRequest` reads `parsed.code` and hands it back, so it *works* against Storage, but the value it
returns means something different. Any classifier shared between the two services will silently
mis-branch. **Recommendation: classify Storage responses on `res.ok` plus the body's `statusCode`
string, and keep that classifier separate from the PostgREST one.** Since D-18 routes the storage
upload through XHR anyway, the two are naturally separate; the risk is a later refactor that
"unifies" them.

### S5. Indexing the upload

```
POST {supabaseUrl}/rest/v1/photos
apikey: {supabaseKey}
Content-Type: application/json
Prefer: return=minimal

{"guest_id":"<uuid>","name":"Ada Lovelace","storage_path":"2026-10-03/<fresh-uuid>.jpg"}
```

Success: **HTTP `201`**, empty body. [VERIFIED: live probe, 2026-08-15]

Do **not** send `Prefer: return=representation`. Probed: `401`, `code: "42501"`,
`"permission denied for table photos"`, with the hint
`Grant the required privileges to the current role with: GRANT SELECT ON public.photos TO anon;`.
The row is **not** written. This is phase 3's trap reproduced on the other table, and it is worse
here because §9 of the schema revokes `select` on `photos` at the *grant* level rather than leaving
it to RLS, so the error is an honest 42501 rather than a silent nothing. Confirmed by reading back
through `public.album`: the attempted row was absent.

Error taxonomy, all probe-verified:

| Condition | HTTP | `code` | UI treatment |
|---|---|---|---|
| Success | `201` | none | Success state. Increment the local count. |
| Sixth photo under one `guest_id` | `400` | `P0001` | **Not an error.** D-23's refusal. Set local count to five (D-19). |
| `name` missing or null | `400` | `23502` | Programmer error. Should be unreachable, since D-01 gates on a name existing. |
| `storage_path` already used, guest below the limit | `409` | `23505` | Programmer error under D-20. Generic failure. |
| `return=representation` requested | `401` | `42501` | Programmer error. Remove the header. |
| `DELETE` attempted | `401` | `42501` | Nothing in this phase may call DELETE. |
| No api key | `401` | none | Unconfigured state (PH-08). |
| Network, offline, timeout | `0` | `NETWORK` | `sbRequest`'s own synthesised code. Failure state. |

### S6. Reading the album

```
GET {supabaseUrl}/rest/v1/album?select=first_name,storage_path,created_at&order=created_at.desc
apikey: {supabaseKey}
```

Returns `200` with rows shaped `{"first_name":"ZZTEST","storage_path":"zz-research/limit-5.jpg","created_at":"2026-08-15T14:41:09.147056+00:00"}`.
[VERIFIED: live probe, 2026-08-15]

D-09's exact query string works as written. Two adjacent probes confirm the guarantees D-25 depends on:

| Probe | Result |
|---|---|
| `GET /rest/v1/photos?select=*` | `401`, `42501`, `permission denied for table photos` |
| `GET /rest/v1/album?select=guest_id` | `400`, `42703`, `column album.guest_id does not exist` |

[VERIFIED: live probe, 2026-08-15]

The credential is not merely unreadable, it is not addressable. Filtering on the view's own columns
does work (`&first_name=eq.ZZTEST` returned rows), so PostgREST's filter surface is live on the
view; there is simply nothing sensitive to point it at.

### S7. Reading an image

```
GET {supabaseUrl}/storage/v1/object/public/{bucket}/{path}
```

No key, no headers. Returns `200`, `Content-Type: image/jpeg`, `Access-Control-Allow-Origin: *`.
[VERIFIED: live probe, 2026-08-15]

So the tile `src` and D-10's `<a href>` are the same plain URL string, constructed as
`sbUrl() + '/storage/v1/object/public/' + bucket + '/' + storage_path`. No signing, no expiry, no
second request.

### S8. CORS

Both preflights were probed with `Origin: https://sirsirio.github.io`:

| Endpoint | `Access-Control-Allow-Origin` | `Access-Control-Allow-Headers` | Max-Age |
|---|---|---|---|
| `/storage/v1/object/party-photos/...` | `*` | reflected: `apikey,content-type,cache-control,x-upsert` | 3600 |
| `/rest/v1/photos` | `*` | reflected: `apikey,content-type,prefer` | 3600 |

[VERIFIED: live probe, 2026-08-15]

XHR from the GitHub Pages origin will preflight and will pass. Nothing to configure.

---

## The Image Pipeline

### Recommended path, and why each line is there

```
validate  ->  objectURL  ->  <img> decode  ->  canvas drawImage  ->  toBlob(jpeg)  ->  release
```

The whole pipeline is vanilla. **No library is warranted.** The alternatives were weighed and are in
`## Alternatives Considered`; the short version is that every candidate exists to solve EXIF
orientation and HEIC decoding, and on this project's target browsers the platform already solves both.

### Fact 1: HEIC is not this project's problem, and one line of markup keeps it that way

iOS converts HEIC camera-roll picks to JPEG at the OS layer before the browser receives the file,
when the input declares `accept="image/*"`. [CITED: shkspr.mobi/blog/2020/12/coping-with-heic-in-the-browser/ and corroborating reports]

There is a Safari 17+ regression that makes this actively dangerous to "improve":

> If you create an HTML file with `<input type="file" accept="image/*,image/heic" />`, when you try
> to upload a photo with .jpeg or .png, the file name would be changed to some temporary name with
> .heic extension. If `image/heic` is removed from the accept mime type, the file object would be
> printed out as its original extension. It only happens with Safari 17+.
> [CITED: developer.apple.com/forums/thread/743049]

**D-15's `accept="image/*"` is exactly right and must not be extended.** Adding `image/heic`,
`.heic`, or `.heif` to the accept list turns a solved problem into an unsolved one. This belongs in a
code comment, because it looks like an omission and is a decision.

Even if a HEIC file does reach the pipeline, Safari decodes it natively through the system codec, so
the `<img>` path handles it; Chrome on Android cannot, and it lands in the refusal branch with a
readable message, which is D-21's stated behaviour.

### Fact 2: the canvas area limit is not the constraint, but memory is

> Safari cannot handle canvas elements having more than 16,777,216 pixels. The error message is
> "Canvas area exceeds the maximum limit (width * height > 16777216)."
> [CITED: pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/, corroborated by multiple issue trackers]

A 1600px-longest-edge destination canvas is at most about 2.6 million pixels, comfortably inside the
limit, so the *destination* is never the problem. The *source* is: a 48MP photo from a recent iPhone
Pro decodes to roughly 192MB of bitmap, and mobile Safari kills tabs under that pressure. The
mitigations, in order of how much they buy:

1. **D-21's `maxFileSizeMb` check before the decode.** This is the load-bearing one, and D-21
   already has it. A 12MB ceiling turns most of the 48MP population away before a byte is decoded.
2. **D-18's sequential processing.** One decoded bitmap alive at a time rather than five.
3. **Explicit release after each file.** `URL.revokeObjectURL(url)`, `img.src = ''`, and
   `canvas.width = canvas.height = 0`. The last of these is the one people omit and it is the one
   that actually frees the backing store on WebKit.
4. **Treat a null or implausibly small blob as failure.** The documented symptom of exceeding the
   limit is a black or blank output rather than a thrown error, and `toBlob`'s callback is
   documented to receive null:

   > `null` may be passed if the image cannot be created for any reason.
   > [CITED: developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob]

   Refuse rather than upload. D-21 already says a file the decoder cannot read is refused with a
   readable message; this is the same branch.

### Fact 3: `toBlob` with quality is universally available

> **Baseline Widely available** — This feature has been available across browsers since January 2020.
> [CITED: developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob]

> A Number between `0` and `1` indicating the image quality to be used when creating images using
> file formats that support lossy compression (such as `image/jpeg` or `image/webp`). A user agent
> will use its default quality value if this option is not specified, or if the number is outside
> the allowed range.
> [CITED: same page]

D-16's `0.82` is inside the range. Note the failure mode of getting it wrong: an out-of-range number
is silently replaced by the user agent default rather than throwing, so a typo produces bigger files
and no error. Worth a bounds clamp when reading `photos.jpegQuality` from config, since CFG-01 puts
it in a file a non-programmer edits.

### Fact 4: one-step downscale is acceptable here, with a named fallback

Drawing a 4000px source into a 1600px canvas in a single `drawImage` is a 2.5x reduction. At that
ratio, `ctx.imageSmoothingQuality = 'high'` (honoured by Chromium and WebKit, ignored by Firefox)
produces acceptable results. Larger reductions alias visibly, and the classic remedy is stepwise
halving. **Recommendation: single step, and put "does a 12MP photo look soft or aliased in the
album" on the device pass (D-30).** If it does, stepwise halving is a five-line change confined to
one function. Do not build it speculatively. [ASSUMED: the acceptability judgement at 2.5x is from
training knowledge and was not measured on a device this session.]

### Fact 5: determinate progress requires XHR, and D-18 is right about why

`fetch` has no upload progress event. The `Request` body is a stream the browser consumes; there is
no observable for bytes written. `XMLHttpRequest.upload` exposes `progress` events with `loaded`,
`total` and `lengthComputable`. [CITED: developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequestUpload]

One honesty note for the UI: `upload.progress` reports bytes handed to the socket, not bytes the
server has acknowledged. On a slow connection the bar reaches 100% and then the request sits waiting
for the response. A bar that claims 100% and then does nothing for four seconds is the "is this
broken?" moment PH-05 exists to prevent, in a new costume. **Recommend the bar caps its visible
progress at roughly 95% until `onload` fires**, or that 100% swaps the label to a "recording
submission" state. This is a small thing that the device pass on a throttled connection (D-30) will
catch if it is not designed in.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| *(none)* | n/a | n/a | Hard project constraint: static GitHub Pages, no build step, no bundler, no `package.json`. |

**No packages are installed by this phase.** There is no `package.json` in this repository, no
`npm install`, and no `<script src>` pointing off this origin. The only third-party runtime
dependencies are Supabase's REST and Storage endpoints, already wired at `config.js:212-213`.

### Browser APIs used

| API | Purpose | Support | Fallback |
|---|---|---|---|
| `<input type="file" accept="image/*" multiple>` | PH-01, D-15 | Universal | none needed |
| `URL.createObjectURL` / `revokeObjectURL` | Feeding the decoder | Universal | none needed |
| `HTMLImageElement` + `ctx.drawImage` | Decode with EXIF orientation applied | Universal; orientation honoured by Chromium and WebKit [CITED: w3c/csswg-drafts#4666] | none needed. This *is* the fallback. |
| `canvas.toBlob(cb, 'image/jpeg', q)` | PH-06 re-encode | Baseline widely available since January 2020 [CITED: MDN] | Refuse the file on `null` |
| `XMLHttpRequest` + `xhr.upload.onprogress` | PH-05 determinate progress | Universal | Indeterminate state if `lengthComputable` is false |
| `crypto.randomUUID()` | D-20 storage path | Already wrapped by `newGuestId()` at `app.js:1156`, which carries a `getRandomValues` fallback | reuse `newGuestId()` |
| `loading="lazy"` on `<img>` | D-11 | Baseline | degrades to eager, which is correct-but-costly |
| `localStorage` via `store` at `app.js:21` | D-22 count | wrapped, with an in-memory fallback | already handled |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Vanilla canvas downscale | `browser-image-compression`, `compressorjs`, `pica` | All three exist principally to paper over EXIF orientation and to offer stepwise resampling. The platform now handles orientation, and this project has a hard no-build-step constraint, so any of them arrives as a CDN `<script>` on a page whose stated target is a mid-range phone on congested mobile data. **Rejected**, and note the security angle too: a CDN script tag on the page that handles guest photos is a supply chain this project does not currently have. |
| `<img>` + `drawImage` | `createImageBitmap(blob)` | Off-main-thread decode, less jank, and a deterministic `.close()`. Buys a second code path plus a version floor, to reduce jank during a decode that already happens one file at a time. **Rejected as primary**, acceptable as an optimisation wrapped in try/catch. See `## THE ORIENTATION REFINEMENT`. |
| XHR for the storage upload | `fetch` | Loses determinate progress permanently; `fetch` has no upload progress event and no proposal to add one. D-18 already decided this. **XHR confirmed necessary.** |
| Public bucket URLs | Signed URLs with expiry | Signed URLs need a request per image and expire, which breaks a `loading="lazy"` grid and adds N round trips on party wifi. The bucket is public by design and §9 of the schema is built around that fact. **Rejected.** |
| Plain `fetch` for the row insert | `@supabase/supabase-js` via CDN | About 40KB gzipped, and it would not have changed a single finding in this document, because everything here is in Postgres and in the Storage service rather than in the client. **Rejected**, consistent with phase 3's D-06. |

**Installation:** none. No command to run.

## Package Legitimacy Audit

**Not applicable.** This phase installs no external packages. There is no `package.json` in the
repository, no dependency manifest of any kind, and no script tag pointing off this origin. The
`gsd-tools query package-legitimacy check` gate has no input to operate on.

**Packages removed due to [SLOP] verdict:** none.
**Packages flagged as suspicious [SUS]:** none.

The three image libraries named in `## Alternatives Considered` are named in order to reject them and
must not be installed. If a future plan proposes any of them, that is a change to the project's
no-build-step constraint and belongs in a decision, not in a task.

---

## Architecture Patterns

### System Architecture Diagram

```
  guest opens page
        │
        ▼
  ┌──────────────────────────────────────────────────────────┐
  │ applyLanguage()                            app.js:104    │
  │   renderSchedule / renderCountdown / renderDeadline /     │
  │   renderEnrollment / renderWhatsApp / renderNudge /       │
  │   renderLocation / renderAccess / renderSocialProof       │
  │   + renderPhotos()                          ◀── NEW      │
  └───────────────────────┬──────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │ sbConfigured()?       │  app.js:1248
              └──┬─────────────────┬──┘
              no │                 │ yes
                 ▼                 ▼
   ┌──────────────────────┐   ┌──────────────────────────────┐
   │ PENDING PANEL PH-08  │   │ now >= photos.opensAt ?      │  D-03/D-04
   │ pendingBlock()       │   │ same fixed-offset arithmetic │
   │ app.js:320           │   │ the countdown uses           │
   └──────────────────────┘   └──┬────────────────────────┬──┘
                              no │                        │ yes
                                 ▼                        ▼
                   ┌──────────────────────────┐   ┌────────────────────────┐
                   │ CLOSED PANEL      D-05   │   │ identity.get()         │
                   │ states the opening time  │   │ app.js:1189            │
                   │ NO album below it D-06   │   │ guest_id + name        │
                   └──────────────────────────┘   └──┬──────────────────┬──┘
                                                     │ no name          │ name
                                                     ▼                  ▼
                                    ┌────────────────────────┐   ┌────────────────────┐
                                    │ ENROL CTA        D-02  │   │ UPLOAD CONTROL     │
                                    │ jump link to #enrol    │   │ remaining = 5 - n  │
                                    │ never a name field     │   │ localStorage  D-22 │
                                    └────────────────────────┘   └─────────┬──────────┘
                                                                           │ file picked
                                                                           ▼
                            ┌──────────────────────────────────────────────────────────┐
                            │ PER FILE, SEQUENTIALLY                             D-18   │
                            │                                                          │
                            │  1  validate BEFORE decode                        D-21    │
                            │       type startsWith image/ , 0 < size <= 12MB           │
                            │       ─ fail ─▶ named refusal, next file                  │
                            │  2  objectURL ▶ <img> ▶ canvas ▶ toBlob(jpeg,0.82) D-16   │
                            │       EXIF orientation applied by the engine       D-17'  │
                            │       ─ null blob ─▶ named refusal, next file             │
                            │  3  release: revokeObjectURL, img.src='', canvas 0x0      │
                            │                                                          │
                            └───────────────────────────┬──────────────────────────────┘
                                                        │
                                                        ▼
                          ┌──────────────────────────────────────────────────┐
                          │ XHR POST /storage/v1/object/party-photos/         │
                          │   {yyyy-mm-dd}/{fresh-uuid}.jpg            D-20   │
                          │   apikey only, Content-Type: image/jpeg,          │
                          │   cache-control: max-age=31536000                 │
                          │   xhr.upload.onprogress ──▶ determinate bar PH-05 │
                          └──────┬───────────────────────────────┬───────────┘
                            200  │                          error│  outer 400,
                                 │                               │  body.statusCode
                                 ▼                               ▼
              ┌──────────────────────────────────┐     ┌─────────────────────┐
              │ sbRequest POST /rest/v1/photos   │     │ FAILURE state       │
              │  Prefer: return=minimal          │     │ no orphan, no row   │
              │  {guest_id, name, storage_path}  │     │ retry offered       │
              └───┬────────────┬─────────────┬───┘     └─────────────────────┘
              201 │       P0001│         other│
                  │            │              ▼
                  │            │      ┌───────────────────────────────┐
                  │            │      │ FAILURE + ORPHANED OBJECT     │
                  │            │      │ accepted and documented D-19  │
                  │            │      │ invisible: no row, no album   │
                  │            │      └───────────────────────────────┘
                  │            ▼
                  │    ┌────────────────────────────────────┐
                  │    │ REFUSAL          D-19 / D-23       │
                  │    │ local count := 5, self-healing     │
                  │    │ the joke, not an error             │
                  │    └────────────────────────────────────┘
                  ▼
   ┌──────────────────────────────────────────────┐
   │ count += 1  ▶ localStorage                   │
   │ SUCCESS state in the section body, not toast │
   │ refetch the album, once                D-12  │
   └──────────────────────┬───────────────────────┘
                          │
   ── independent, non-blocking, failure is SILENT (D-14) ──────────────────
   ┌────────────────────────────────────────────────────────────────────────┐
   │ GET /rest/v1/album?select=first_name,storage_path,created_at           │
   │     &order=created_at.desc                                      D-09   │
   │   tile = <a href={publicUrl}> <img loading="lazy" src={publicUrl}>     │
   │          + first_name overlay caption                     D-08/D-10    │
   │   empty ▶ one deadpan line, control still shown                 D-13   │
   └────────────────────────────────────────────────────────────────────────┘
```

### File impact

No new files, except the phase's own device pass record. Everything lands in the five existing root
files, exactly as phases 2 and 3 did.

```
index.html    #photos-body stays as-is (:296-305). The mount point already exists,
              already holds the phase 1 pending block, and is untouched ground:
              there is no renderPhotos() and no reference to #photos-body in app.js today.
app.js        + photosOpen()            the opensAt gate, on the countdown's arithmetic
              + photoCount get/set      new key under the c03102. prefix, via identity
              + validateFile()          D-21, before the decode
              + downscaleToJpeg()       the image pipeline
              + uploadObject()          the ONE XHR in this codebase
              + insertPhotoRow()        sbRequest, unchanged helper
              + renderPhotos()          joins the applyLanguage() chain
              + renderAlbum()           the D-09 fetch and the grid
styles.css    + the album grid, the upload control's nine states, the progress bar,
              + their prefers-reduced-motion fallbacks (D-29)
copy.js       + new keys x 3 languages, flat dotted strings, identical key sets (LNG-06)
config.js     + photos.opensAt, photos.maxEdgePx, photos.jpegQuality, in the existing
              photos block at :211-218, with comments for a non-programmer (CFG-04)
supabase/     ~ section 6 gets file_size_limit and allowed_mime_types, and its
  schema.sql    on conflict do nothing becomes on conflict do update (D-24)
              ~ header STATUS block updated: the P0001 proof is no longer outstanding
.planning/phases/04-photos/04-DEVICE-PASS.md    new (D-30)
```

### Pattern 1: The `opensAt` gate reuses the countdown's arithmetic (D-03, D-04)

The countdown parses an ISO string with an explicit offset and compares epoch milliseconds:

> ```js
> var startMs = Date.parse(CFG.startsAt);
> var endMs   = Date.parse(CFG.endsAt);
> ```
> [VERIFIED: app.js:164-165, quoted verbatim]

> ```js
>   function phase(now) {
>     if (isNaN(startMs)) return 'before';
>     if (now < startMs) return 'before';
>     if (!isNaN(endMs) && now >= endMs) return 'over';
>     return 'live';
>   }
> ```
> [VERIFIED: app.js:180-186, quoted verbatim]

The gate is the same three lines. `Date.parse` of a string carrying `+02:00` yields the same instant
in every timezone, which is the whole of D-04. **The gate must not use `new Date(y, m, d)`, must not
use `toLocaleString` for comparison, and must not read the browser's offset.**

`isNaN` handling matters and cuts the opposite way from the countdown. An unparseable `startsAt`
falls back to `'before'`, which is safe for a countdown. An unparseable or absent `opensAt` must fall
back to **open**, because D-05 makes `photos.opensAt: null` the owner's emergency lever and a
typo in that field on the night must not lock the album shut. Write it as: open unless there is a
valid future timestamp.

For the closed panel's text, `formatSchedule()` at `app.js:263` is the model. It formats on
`Europe/Copenhagen` with per-language locales:

> ```js
>     var locale = lang === 'it' ? 'it-IT' : (lang === 'da' ? 'da-DK' : 'en-GB');
>     var opts = {
>       day: 'numeric', month: 'long', year: 'numeric',
>       hour: '2-digit', minute: '2-digit',
>       timeZone: 'Europe/Copenhagen'
>     };
> ```
> [VERIFIED: app.js:266-271, quoted verbatim]

### Pattern 2: Validate before the decode, and know what each check is for (D-21, PH-07)

```js
/* Three checks, in this order, and every one of them runs before a single pixel
   is decoded. A 60MB file will exhaust memory on a mid range phone during the
   decode, long before any of it reaches the network, so "validate before the
   wire" is not enough and "validate before the canvas" is the actual rule.

   None of these is a security control. Every one of them protects a guest from
   their own mistake. The controls that hold against a crafted request are in
   the bucket record, and they are the two lines in section 6 of schema.sql. */
function validateFile(file, maxBytes) {
  if (!file || !file.size)                       return 'photos.err.empty';
  if (file.type.indexOf('image/') !== 0)         return 'photos.err.type';
  if (file.size > maxBytes)                      return 'photos.err.size';
  return null;
}
```

`file.type` on a camera-roll pick comes from the OS and is trustworthy enough for a UX check. It is
not trustworthy as a security check, and nothing downstream treats it as one.

### Pattern 3: The upload control's nine states

CONTEXT.md names this as the densest concentration of interactive states on the site, and the
routed `interaction-states.md` reference is the right lens. One attribute drives everything; CSS
reads it, JS sets it, no class juggling. This is the shape phase 3 used for the form's four states.

| `data-state` | What the guest sees | Announced |
|---|---|---|
| `idle` | The control, and the remaining count | no |
| `full` | No control. The refusal copy, D-23's punchline | no |
| `validating` | Momentary. May be invisible on a fast phone; must not flash | no |
| `refused-file` | Named files refused, with the reason, and the accepted ones still queued | yes, `role="alert"` |
| `preparing` | "Preparing 2 of 3". The decode, which on a big photo is a real second | no |
| `uploading` | "Uploading 2 of 3" above a determinate bar for the current file | no |
| `partial` | Some landed, one failed. Says exactly which. D-18's whole point | yes |
| `success` | The album refetched with their photo at the top. In the section body, not a toast | yes |
| `failed` | Nothing landed. Retry offered, selection retained | yes, `role="alert"` |

Two rules that are easy to violate, both inherited from phase 3's form:

- **`uploading` must always terminate.** XHR needs `onload`, `onerror`, `onabort` and `ontimeout` all
  wired, because a handler that is missing is a control left spinning forever. `sbRequest` earned
  this lesson the hard way, and its comment at `app.js:1268-1286` records it. The XHR wrapper owes
  the same invariant and does not inherit it.
- **`failed` and `refused-file` must not clear the file selection.** PH-05 forbids silent failure and
  a control that resets itself after a failure is a quiet one.

**Do not use `toast()`** for the success moment. `app.js:3621` is for incidental confirmations; the
rule D-11 of phase 3 set is that the primary success moment is a state change in the section body,
and D-12's album refetch is what makes that state change worth looking at.

### Pattern 4: The album grid holds its box (D-11)

The precedent is already in the file. The map slot reserves its space with `aspect-ratio` so nothing
below it moves when the content arrives:

> ```css
> .map-slot {
>   position: relative;
>   overflow: hidden;
>   width: 100%;
>   margin-top: var(--s-6);
>   background: var(--surface);
>   border: 1px solid var(--rule);
>   border-radius: var(--r-sm);
>   aspect-ratio: 4 / 3;
> }
> ```
> [VERIFIED: styles.css:641-650, quoted verbatim]

Each tile gets the same treatment: a fixed `aspect-ratio` box with `overflow: hidden`, the `<img>`
inside at `width:100%; height:100%; object-fit: cover`, and `loading="lazy"`. The box exists before
the image arrives, so a slow tile is a `--surface` rectangle rather than a collapse, and the grid
never reflows as images stream in. This is the same no-reflow guarantee D-09 of phase 2 made and
D-11 of this phase continues.

`grid-template-columns: repeat(auto-fill, minmax(<min>, 1fr))` with a `gap` is the whole layout, and
the column count at each breakpoint is Claude's discretion. Note the existing tokens: `--r-sm: 2px`,
`--r-md: 8px`, spacing on a 4px base `--s-1` through `--s-10`. [VERIFIED: styles.css:22-48]

### Pattern 5: The two-step write, and why the order is not symmetric (D-19)

```
storage POST  ──ok──▶  photos INSERT  ──201──▶  success
      │                      │
      │                      └──P0001──▶ refusal, local count := 5
      │                      └──other──▶ failure + orphaned object (accepted)
      └──error──▶ failure, nothing written anywhere
```

D-19 already reasons this out correctly and the probes confirm the asymmetry is real:

- A row before a failed PUT points at a file that does not exist. `public.album` would return it,
  the tile would render broken, and **nothing in the browser can delete either half**, because there
  is no delete policy on the table (probed: `401` / `42501`) or on the bucket (probed: `400` /
  `AccessDenied`). Broken tile, forever, in everyone's album.
- A PUT before a failed insert leaves an object nothing references. It appears in no view, in no
  page, and in no URL anyone holds. The owner can remove it from the dashboard at leisure.

The second is strictly cheaper and D-19 picks it. **The plan should carry the orphan as a written,
accepted consequence rather than as a bug**, in the same register the flagged consideration about
undeletable photos already uses.

### Pattern 6: The unconfigured and the not-yet-open states are two panels, not one (PH-08, D-05, D-06)

Both use `pendingBlock()`, which builds the `.pending` box phases 1 and 2 established:

> ```js
>   function pendingBlock(titleKey, bodyKey) {
>     var box = document.createElement('div');
>     box.className = 'pending';
> ```
> [VERIFIED: app.js:320-322, quoted verbatim]

`photos.pending.title` and `photos.pending.body` already exist in all three languages and already
say the right thing for the not-yet-open case:

> `'photos.pending.title': 'Submission portal opens later'`
> `'photos.pending.body': 'Uploads open closer to the date. Nothing is required from you now.'`
> [VERIFIED: copy.js:193-194, quoted verbatim]

D-05 wants the closed panel to state the opening moment as text, which the existing body does not do,
so the closed state needs either a new body key carrying a `{when}` substitution or a second line
appended. The unconfigured state can keep the existing pair unchanged. Two panels, one builder, and
whether they share copy keys is a small call for the planner.

### Anti-Patterns to Avoid

- **Sending `Prefer: return=representation` on the photos insert.** `401`, `42501`, and the row is
  not written. The error message blames the insert policy and the real cause is the revoked select.
- **Sending `x-upsert` or using `PUT` on storage.** Both need an update policy that deliberately does
  not exist. Refused with `AccessDenied`.
- **Branching on `res.status === 409` for a storage collision.** The outer status is `400`. The 409
  is a string inside the body.
- **Sharing one error classifier between PostgREST and Storage.** Different body shapes, different
  meanings for the same field name. See §S4.
- **Adding `image/heic` to the `accept` list.** Turns a solved problem into a Safari 17 regression.
- **Putting a `guest_id` anywhere in a filename, a URL, a `data-` attribute, or the DOM.** D-25, and
  §9 of the schema says it in writing.
- **Polling the album.** D-12. Congested party wifi, no matching benefit.
- **`res.json()` on the insert response.** `Prefer: return=minimal` answers `201` with an empty body.
  `sbRequest` already reads as text for exactly this reason; do not "simplify" it.
- **Retrying a `P0001` with a fresh path.** It is not a collision. It is the limit.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| EXIF orientation correction | A rotation matrix driven by a parsed EXIF orientation tag | `<img>` + `drawImage`, which applies it | Both Chromium and WebKit already apply it. Hand-rolled correction on top double-rotates the photo, which is the exact bug D-17 fears, arriving through the code written to prevent it. |
| HEIC decoding | A wasm HEIC decoder, or `heic2any` | `accept="image/*"`, which makes iOS convert at the OS layer | Hundreds of KB of wasm to solve a problem the platform already solved, on a page whose target is congested mobile data. |
| The five-photo limit | Client-side counting as the enforcement | The `before insert` trigger in §4, with `localStorage` as the affordance | Already built, already `security definer`, and now probe-verified. D-22 is honest that the browser half is soft. |
| Keeping surnames off the page | `name.split(' ')[0]` in JavaScript | `public.album`'s `split_part(trim(name), ' ', 1)` | Server side means the full name is structurally incapable of reaching the browser. A client-side split ships the surname in the JSON and hides it in the render. |
| Keeping `guest_id` off the page | Filtering the column out in JS | `public.album` not having the column | Probed: asking for it returns `42703`. A view is a stronger promise than a rule about rows, which §9 of the schema explains at length. |
| Preventing uploaded content from executing | A magic-byte sniffer in the browser | Supabase's own response headers, plus `file_size_limit` | Probed: `text/html` is downgraded to `text/plain` with `nosniff`, SVG is served as an attachment with `nosniff`. A browser-side sniffer protects nobody, because the attacker skips the browser. |
| Upload progress | A fake bar on a timer | `xhr.upload.onprogress` | A fake bar that finishes before the upload does is worse than no bar. |
| A UUID for the storage path | `Math.random().toString(36)` | `newGuestId()` at `app.js:1156` | Already written, already carries the `crypto.getRandomValues` fallback for old Safari, already produces a v4 UUID. Note the function returns `null` when there is no crypto at all, and that branch needs handling here as it does in enrollment. |
| A lightbox | A half-built one | `<a target="_blank">` to the public URL | D-10. The browser's own viewer gives pinch zoom, save and share for zero bytes. V2-06 defers the real one. |

**Key insight:** almost every temptation in this phase is to reimplement in JavaScript something the
database view, the storage service, or the rendering engine already does correctly. In each case the
hand-rolled version is not merely redundant, it is weaker: a client-side name split still ships the
surname, a client-side MIME sniff protects nobody, and a hand-rolled rotation actively breaks photos
that were already correct.

---

## Runtime State Inventory

This phase changes live database state and this research session already did. Included for that
reason rather than because it is a rename phase.

| Category | Items Found | Action Required |
|---|---|---|
| Stored data | **6 rows in `public.photos`**, all `name = 'ZZTEST DeleteMe'`, written by this research session to prove the five-photo trigger. Five under `guest_id 99999999-0000-4000-8000-000000000001`, one under `...0002`. They render through `public.album` today. | Owner deletes from the dashboard. Verify through `public.album`, never through the blocked table. See `## Owner Actions`. |
| Stored data | **8 objects under `party-photos/zz-research/`**, written by this research session's storage probes: `probe-post.jpg`, `probe-cache.jpg`, `probe-cors.jpg`, `probe-spoof.jpg`, `probe-not-an-image.txt`, `probe-html.html`, `probe-svg.svg`, `probe-noct.bin`. | Owner deletes the whole `zz-research` folder from the dashboard. Not visible in the album, because no `photos` row points at them. |
| Live service config | **The `party-photos` bucket record itself.** `file_size_limit` and `allowed_mime_types` are unset today, verified by successfully uploading `text/plain`, HTML, SVG and a typeless binary. The bucket record lives in Supabase, not in git, and §6's `on conflict (id) do nothing` will never update it. | D-24's schema change plus an owner re-run. Until then the bucket accepts anything. |
| OS-registered state | None. This is a static site on GitHub Pages with no scheduled tasks, no daemons, and no process manager. | none |
| Secrets and env vars | None new. `photos.supabaseUrl` and `photos.supabaseKey` at `config.js:212-213` are unchanged and are the same two values enrollment already uses. No key rotation, no new secret. | none |
| Build artifacts | None. No build step, no bundler, no installed packages, no lockfile. | none |

---

## Common Pitfalls

### Pitfall 1: Extending the `accept` attribute to "support HEIC properly"

**What goes wrong:** `accept="image/*,image/heic"` makes Safari 17+ hand back an actual `.heic` file
where `accept="image/*"` alone would have received an OS-converted JPEG. Android Chrome then cannot
decode it, and every iPhone photo starts failing on a change made to help iPhones.
**Why it happens:** it looks like an omission. Somebody reads `accept="image/*"` and thinks "HEIC is
an image, this is incomplete."
**How to avoid:** a comment on the line saying it is deliberate and naming the regression.
**Warning signs:** files arriving with `.heic` extensions in the failure log, or Android refusals
that started after an iOS-motivated change.

### Pitfall 2: Assuming a Storage error looks like a PostgREST error

**What goes wrong:** the classifier checks `res.status === 409` for a collision and never matches,
because the outer status is `400`. Or it checks `body.code === '23505'` and gets
`'KeyAlreadyExists'`.
**Why it happens:** the two services share a hostname, a key and a helper function, so they look like
one API.
**How to avoid:** two classifiers, and a comment on each saying which service it is for. §S4.
**Warning signs:** an error branch that is never reached, or a generic failure state for a condition
that has a specific message written for it.

### Pitfall 3: The success code that is 200 on one endpoint and 201 on the other

**What goes wrong:** `if (res.status === 201)` around the storage upload, which answers `200`. The
upload succeeds and the code calls it a failure, leaving an orphan and telling the guest it failed.
**Why it happens:** the row insert answers 201 and it is the more familiar of the two.
**How to avoid:** test `res.ok` / `xhr.status >= 200 && xhr.status < 300`, never a literal.
**Warning signs:** objects appearing in the bucket with no matching album row, on a path where the
guest was shown a failure.

### Pitfall 4: A `null` from `toBlob` treated as a transient error and retried

**What goes wrong:** a retry loop on a photo the device cannot encode. Each attempt re-decodes the
full-resolution source, and on mobile Safari the third attempt is where the tab dies.
**Why it happens:** `null` reads as "not ready yet" rather than "this cannot be done".
**How to avoid:** `null` is terminal for that file. Refuse with a readable message and move to the
next one. D-21 already says this.
**Warning signs:** the control sitting in `preparing` for more than a few seconds, or a tab reload
during multi-file upload on an iPhone.

### Pitfall 5: The progress bar reaching 100% and then waiting

**What goes wrong:** `upload.onprogress` reports bytes written to the socket, not bytes the server
has accepted. On a bad connection the bar completes and the state does not change for several
seconds, which is indistinguishable from a hang.
**Why it happens:** it is the honest behaviour of the event, and it only shows up on a slow link.
**How to avoid:** cap the visible bar below 100% until `onload`, or swap the label at 100%.
**Warning signs:** anything found on a throttled connection during the device pass. This is exactly
why D-30 lists throttled progress.

### Pitfall 6: A guest whose local count drifted low uploads the bytes and then gets refused

**What goes wrong:** the photo uploads fully, taking ten seconds on party wifi, and only then is the
row refused with `P0001`. The bytes are orphaned and the guest waited for nothing.
**Why it happens:** the limit is enforced on the row insert, which D-19 correctly puts second.
**How to avoid:** it cannot be fully avoided in this architecture, and D-19 already accepts it. The
mitigation is that it only occurs after a storage reset, and D-19's self-healing response makes it
happen at most once per drift. **The refusal copy must not imply the upload failed**, because it did
not; the submission was declined. That is D-23's register anyway.
**Warning signs:** none available to the site. The owner sees orphaned objects in the dashboard.

### Pitfall 7: A language switch mid-upload rebuilding the control

**What goes wrong:** `renderPhotos()` joins the `applyLanguage()` chain, and a guest who taps DA
while three files are uploading gets the control rebuilt underneath the in-flight XHRs. Progress
state is lost and the section may show `idle` while bytes are still moving.
**Why it happens:** every other section on this site is safe to rebuild at any time, so the chain
rebuilds unconditionally.
**How to avoid:** the same answer phase 3 reached for its form, recorded in `03-RESEARCH.md`
§Pattern 3: skip the rebuild while the state is `preparing`, `uploading` or `partial`, and re-sync
the labels afterwards. Skipping is simpler than restoring and is the recommendation.
**Warning signs:** the language switcher is the second thing anyone taps on a trilingual site. This
will be found by hand, or it will be found by a guest.

### Pitfall 8: The countdown inviting guests to a portal that is closed

**What goes wrong:** CD-04's "it is over, upload your photos" state fires at `endsAt` while D-03's
gate is keyed to `opensAt`. If the two ever disagree, the hero tells guests to do something the
photos section refuses.
**Why it happens:** they are the same moment described from two sides, in two files, by two decisions.
CONTEXT.md flags this in its Integration Points and it is worth restating as a pitfall.
**How to avoid:** with the recommended default of party start minus three hours, `opensAt < startsAt < endsAt`
holds and the countdown's "over" state always lands inside the open window. Whichever plan touches one
should assert the other agrees. A one-line comment in `config.js` beside `opensAt` naming the
relationship is the cheapest guard.
**Warning signs:** an owner who moves `opensAt` later than `endsAt` while fiddling on the night.

### Pitfall 9: Setting `allowed_mime_types` and then breaking the dashboard

**What goes wrong:** with a MIME allow-list active, creating folders through the Supabase dashboard
UI can be refused, because the folder placeholder object does not match the allow-list.
[CITED: github.com/supabase/supabase/issues/26359] The owner meets this while trying to clean up.
**Why it happens:** the placeholder is an object like any other.
**How to avoid:** nothing to do in code. Mention it in the schema comment beside D-24's change so the
owner is not surprised, since the owner is the only person who will ever hit it.
**Warning signs:** an owner report that they cannot make a folder in the bucket.

---

## Code Examples

### E1. The downscale, whole

```js
/* One decode, one draw, one encode, and then everything is released by hand.

   There is no orientation code here and that is the point. image-orientation
   defaults to from-image, both Chromium and WebKit honour it when an <img> is
   drawn to a canvas, and naturalWidth/naturalHeight already report the ORIENTED
   dimensions. A portrait photo reports portrait. Writing a rotation on top of
   that turns every correct photo sideways, which is the bug this was supposed
   to prevent, arriving through the code written to prevent it.

   createImageBitmap would decode off the main thread, which is nicer. It would
   also add a version floor: the imageOrientation value from-image is only
   accepted from Safari 16, and Safari before 17.2 spelled the same behaviour
   none. An enum a dictionary does not recognise throws, so the safeguard costs
   more than the risk it covers. See 04-RESEARCH.md, THE ORIENTATION REFINEMENT. */
function downscaleToJpeg(file, maxEdge, quality, done) {
  var url = URL.createObjectURL(file);
  var img = new Image();
  var settled = false;

  function finish(blob, errKey) {
    if (settled) return;
    settled = true;
    // Release before calling back, so the next file in the sequence starts on a
    // clean heap. canvas.width = 0 is the one people leave out and it is the one
    // that actually frees the backing store on WebKit.
    URL.revokeObjectURL(url);
    img.src = '';
    done(blob, errKey);
  }

  img.onerror = function () { finish(null, 'photos.err.decode'); };

  img.onload = function () {
    var w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return finish(null, 'photos.err.decode');

    // Never upscale. A small photo stays small.
    var scale = Math.min(1, maxEdge / Math.max(w, h));
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));

    var canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;

    var ctx = canvas.getContext('2d');
    if (!ctx) return finish(null, 'photos.err.decode');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';   // honoured by Chromium and WebKit, ignored by Firefox

    try {
      ctx.drawImage(img, 0, 0, cw, ch);
    } catch (e) {
      return finish(null, 'photos.err.decode');
    }

    canvas.toBlob(function (blob) {
      // null, or a blob so small it can only be a blank canvas, is terminal for
      // this file. Never retried: each retry re-decodes the full resolution
      // source, and the third attempt is where a phone gives up.
      if (!blob || blob.size < 256) {
        canvas.width = canvas.height = 0;
        return finish(null, 'photos.err.encode');
      }
      canvas.width = canvas.height = 0;
      finish(blob, null);
    }, 'image/jpeg', quality);
  };

  img.decoding = 'async';
  img.src = url;
}
```

### E2. The storage path (D-20)

```js
/* {yyyy-mm-dd}/{fresh-uuid}.jpg. The uuid is generated here and has nothing to
   do with guest_id.

   supabase/schema.sql section 9 states why, and it is not a style preference:
   the bucket is public, so a storage_path is every bit as readable as a column,
   and public.album hands the path to anyone holding the publishable key. A
   guest_id in a filename is the credential from section 8 published through the
   view that section 9 built to stop publishing it. Renaming the object later
   does not un-publish it.

   The date prefix costs nothing and makes the dashboard navigable, which is the
   owner's only tool for the cleanup this phase leaves behind. */
function storagePath() {
  var id = newGuestId();          // app.js:1156, carries its own getRandomValues fallback
  if (!id) return null;           // no crypto at all: same pending branch enrollment uses
  var d = new Date();
  var day = d.getUTCFullYear() + '-' +
            ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' +
            ('0' + d.getUTCDate()).slice(-2);
  return day + '/' + id + '.jpg';
}
```

### E3. The one XHR in this codebase (D-18)

```js
/* The deliberate exception to phase 3's D-06, and the reason is one line long:
   fetch has no upload progress event and never will, and an indeterminate
   spinner on a ten second upload over party wifi is exactly the "is this
   broken?" moment PH-05 was written against.

   Everything else about it copies sbRequest's contract deliberately: it
   resolves rather than rejects, it cannot leave the caller locked, and the key
   travels in apikey and nowhere else. All four terminal handlers are wired.
   Three of four is a control that spins forever on the fourth.

   cache-control is not decoration. Without it every album image is served
   Cache-Control: no-cache and is refetched on every page view. With it the
   served header is public, max-age=31536000. Verified on the wire. */
function uploadObject(path, blob, onProgress, done) {
  var xhr = new XMLHttpRequest();
  var settled = false;

  function settle(out) { if (!settled) { settled = true; done(out); } }

  xhr.open('POST', sbUrl() + '/storage/v1/object/' + CFG.photos.bucket + '/' + path, true);
  xhr.setRequestHeader('apikey', sbKey());
  xhr.setRequestHeader('Content-Type', 'image/jpeg');
  xhr.setRequestHeader('cache-control', 'max-age=31536000');
  xhr.timeout = 60000;   // a photo on party wifi is not a 12 second request

  xhr.upload.onprogress = function (e) {
    if (e.lengthComputable) onProgress(e.loaded / e.total);
  };

  xhr.onload = function () {
    // 200, not 201. The photos row insert answers 201 and this answers 200, in
    // the same upload of the same photo. Test the range, never a literal.
    if (xhr.status >= 200 && xhr.status < 300) return settle({ ok: true });

    // Storage errors are NOT shaped like PostgREST errors. The outer status is
    // 400 for everything and the real one is a string inside the body:
    //   { statusCode, error, message, code }
    // with code being a name like KeyAlreadyExists, not a Postgres SQLSTATE.
    var code = null;
    try { code = JSON.parse(xhr.responseText).statusCode; } catch (e) { }
    settle({ ok: false, status: xhr.status, code: code });
  };

  xhr.onerror   = function () { settle({ ok: false, status: 0, code: 'NETWORK' }); };
  xhr.onabort   = function () { settle({ ok: false, status: 0, code: 'NETWORK' }); };
  xhr.ontimeout = function () { settle({ ok: false, status: 0, code: 'NETWORK' }); };

  xhr.send(blob);
}
```

### E4. The row insert and its three outcomes

```js
/* Prefer: return=minimal, and it is not relaxed. return=representation answers
   401 with code 42501 AND the row is not written, because section 9 revokes
   select on public.photos from anon. Probed on this exact table, 2026-08-15.

   Three outcomes, so the caller has three branches rather than nine. Classified
   on the code field and never on the message string, which is English, unstable,
   and embeds constraint names. */
function insertPhotoRow(ident, path, done) {
  var row = { guest_id: ident.guest_id, name: ident.name, storage_path: path };

  sbRequest('POST', '/rest/v1/' + CFG.photos.table, row, 'return=minimal')
    .then(function (res) {
      if (res.ok) return done('ok');

      // P0001 is raise_exception, and the message is the literal string
      // photo_limit_reached from the trigger in section 4. Verified on the wire.
      // It is not a failure and it is not retried with a fresh path: the trigger
      // is BEFORE INSERT, so it fires ahead of the unique constraint and a guest
      // at five sees P0001 for a path collision too.
      if (res.code === 'P0001') return done('limit');

      done('failed');
    });
}
```

### E5. The album fetch and one tile

```js
/* D-09's query, verified working today. The view carries created_at so the sort
   is available without asking for a column the page renders. Failure is silent
   (D-14): a guest can submit evidence without being able to read the register. */
function renderAlbum(host) {
  sbRequest('GET',
    '/rest/v1/album?select=first_name,storage_path,created_at&order=created_at.desc',
    null, null, 8000)
    .then(function (res) {
      if (!res.ok || !Array.isArray(res.body)) return;   // silent, D-14
      if (!res.body.length) return host.appendChild(emptyAlbumLine());  // D-13

      var grid = document.createElement('div');
      grid.className = 'album';
      res.body.forEach(function (r) { grid.appendChild(albumTile(r)); });
      host.appendChild(grid);
    });
}

/* Every value below arrives from the database and every one of them goes in
   through textContent or through a property, never through innerHTML. That is
   the same discipline pendingBlock() applies to config.js values and it is what
   keeps a guest supplied name from being an injection vector.

   The tile is a plain anchor to the public URL. That is the deliberate
   non-lightbox (D-10): the browser's own image viewer already gives pinch zoom,
   save and share for zero code and zero bytes, and a half built lightbox would
   be worse than the native one. V2-06 defers the real thing. */
function albumTile(row) {
  var url = sbUrl() + '/storage/v1/object/public/' + CFG.photos.bucket + '/' + row.storage_path;

  var a = document.createElement('a');
  a.className = 'album__tile';
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';

  var img = document.createElement('img');
  img.src = url;
  img.loading = 'lazy';        // D-11
  img.decoding = 'async';
  img.alt = '';                // decorative; the caption below carries the meaning

  var cap = document.createElement('span');
  cap.className = 'album__by';
  // First name only, and that is structural rather than a choice: public.album
  // applies split_part(trim(name), ' ', 1) server side, so a surname is not
  // there to render. Asking the view for guest_id returns 42703.
  cap.textContent = row.first_name;

  a.appendChild(img);
  a.appendChild(cap);
  return a;
}
```

### E6. The D-24 bucket change

```sql
-- ============================================================================
-- 6. STORAGE BUCKET for the photos
-- ----------------------------------------------------------------------------
-- Two limits on the bucket record itself, and they are the only rules here that
-- a crafted request cannot walk around. Everything the website checks before an
-- upload protects a guest from picking the wrong file; none of it protects this
-- bucket, because the key is public by design and anyone holding it can talk to
-- the API directly.
--
-- file_size_limit is the real one. It is counted on the bytes that arrive, so
-- it holds against anything. 3 MB, which is roughly ten times what the website
-- produces after it shrinks a photo, and small enough that nobody fills the
-- free tier.
--
-- allowed_mime_types is hygiene rather than a wall. Supabase checks the type the
-- uploader DECLARES, not the bytes, so anyone can claim image/jpeg. It still
-- earns its line: it stops accidents, and it keeps the album to one format,
-- which is what the site produces anyway.
--
-- The insert below used to end "do nothing", which never updates a bucket that
-- already exists, and this one already exists. So it updates instead, in the
-- same idempotent shape section 7 uses for the withdrawn column.
--
-- One thing to know before you meet it: with a type list set, making a folder
-- through the dashboard can be refused, because the empty placeholder file it
-- creates is not a jpeg.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('party-photos', 'party-photos', true, 3145728, array['image/jpeg'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
```

`file_size_limit` is a `bigint` in **bytes** at the SQL layer; `3145728` is 3 MiB. The `'1MB'` string
form seen in Supabase's JavaScript examples is a convenience the API parses, not the column's type.
[CITED: supabase.com/docs/guides/storage/buckets/creating-buckets and corroborating source discussion]
The free-tier global ceiling is 50 MB and this sits far under it.
[CITED: supabase.com/docs/guides/storage/uploads/file-limits]

---

## Security Domain

`security_enforcement` is `true` and `security_asvs_level` is `1` in `.planning/config.json`.
[VERIFIED: .planning/config.json, `"security_enforcement": true`, `"security_asvs_level": 1`]

### The honest model, stated first

The publishable key ships in public JavaScript by design. The storage insert policy is
`with check (bucket_id = 'party-photos')` with no other condition. Therefore **anyone who opens the
page source can upload to this bucket with a single curl command**, and no amount of client-side code
changes that. This is not a defect introduced by this phase; it is the architecture the project chose
in its very first decision, and `supabase/schema.sql` §3 states it plainly. What follows is an honest
inventory of which controls survive that fact and which do not.

### Controls that hold against a crafted request

| Control | Where | Verified how |
|---|---|---|
| Five photos per `guest_id` | `before insert` trigger, §4, `security definer` | Probe: sixth insert `400` / `P0001`. **Note it is per `guest_id`, and a fresh `guest_id` is free**, so this bounds one identity, not one person. D-22 says so. |
| No overwriting an existing object | absence of an update policy on `storage.objects` | Probe: `PUT` and `x-upsert` both `403` / `AccessDenied` |
| No deleting anything | absence of delete policies | Probe: `DELETE` on `photos` `401` / `42501`; `DELETE` on the object `403` / `AccessDenied` |
| `guest_id` is not readable | `public.album` has no such column; `select` on `public.photos` revoked from `anon` | Probe: `42703` and `42501` respectively |
| Surnames are not readable | `split_part` applied server side inside the view | Probe: `ZZTEST DeleteMe` surfaced as `ZZTEST` |
| Free-text enrollment notes stay private | no select policy on `enrollments`, unchanged by this phase | phase 3, unchanged |
| Byte-count size ceiling | `storage.buckets.file_size_limit` | **Not applied yet.** D-24. Counted on real bytes, so it holds. |
| Uploaded HTML cannot execute | Supabase downgrades `text/html` to `text/plain` and adds `X-Content-Type-Options: nosniff` on the public read | Probe, 2026-08-15 |
| Uploaded SVG cannot execute | Supabase serves `image/svg+xml` with `Content-Disposition: attachment` and `nosniff` | Probe, 2026-08-15 |
| Path traversal | Storage routes reject `..` in the path | Probe: `POST .../party-photos/../zz-escape.jpg` returned `404` `InvalidRequest`, route not matched. The path never leaves the bucket. |

### Controls that do NOT hold, and must not be described as if they do

| Claim | Reality |
|---|---|
| "Client-side type and size validation protects the bucket" | It does not. It protects the guest's phone from a decode that would kill the tab, and it protects the guest from picking a video. D-21 already says this and D-24 already says this; the plan must not soften it. |
| "`allowed_mime_types` stops non-images" | It stops files whose **declared** Content-Type or extension is wrong. Supabase's validation is by declared type, not by magic bytes, and is documented as spoofable. [CITED: github.com/supabase/storage/issues/639, "mime-type does not check uploaded files, only the filename"] Verified adjacent: HTML bytes uploaded with `Content-Type: image/jpeg` were accepted and stored with `"mimetype":"image/jpeg"`. |
| "The five-photo limit stops flooding" | It bounds one `guest_id`. Minting a new one is one line of JavaScript. `REQUIREMENTS.md` already accepted this: *"Hard 5-photo enforcement \| Soft limit is correct for the audience. Clearing storage resets it, and that is fine."* [VERIFIED: .planning/REQUIREMENTS.md:222, quoted verbatim] |
| "The album is private" | It is public and permanent. Anyone with the URL sees every photo, forever, with no delete path from the browser for anyone including the owner. V2-01 is the acknowledgement. CONTEXT.md's flagged consideration asks for one honest line near the upload control and that line should ship. |

### Applicable ASVS categories (Level 1)

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | **no** | There is no authentication and it is explicitly out of scope. Identity is an unguessable UUID in `localStorage`. |
| V3 Session Management | **no** | No sessions, no cookies, no tokens with lifetimes. |
| V4 Access Control | **yes** | Postgres RLS policies and the two owner-privileged views. Enforced by the database, not by JavaScript. The scope is honestly documented above. |
| V5 Validation, Sanitization, Encoding | **yes** | Output: every database value reaches the DOM through `textContent` or a property, never `innerHTML`. This is the existing discipline, and `pendingBlock()`'s comment at `app.js:317-319` states it. Input: `check` constraints and `not null` in the schema; `file_size_limit` in the bucket. |
| V6 Cryptography | **yes, narrowly** | `crypto.randomUUID()` with a `crypto.getRandomValues` fallback, already implemented at `app.js:1156-1174`. Nothing is hand-rolled. `Math.random` must not appear anywhere near an identifier. |
| V7 Error Handling and Logging | **yes** | No error message may leak a `guest_id`. Nothing is written to the console (the phase 2 precedent). Failure copy is guest-facing and institutional. |
| V8 Data Protection | **yes** | The album is public by design; the free-text note is private by structure. Nothing new is exposed. D-25 is the invariant. |
| V12 File Upload | **yes, the centre of this phase** | Size cap on the bucket (real), MIME allow-list (hygiene), filename generated server-side-equivalent from a fresh UUID (D-20), no user-controlled path component, no overwrite, no execution as content. |
| V13 API | **yes** | One key, `apikey` header only, HTTPS enforced by the gateway, CORS `*` on a public bucket which is correct for public content. |
| V14 Configuration | **yes** | No `sb_secret_` key anywhere; `config.js:203-204` already warns the owner in writing. |

### Known threat patterns for a static site plus Supabase Storage

| Pattern | STRIDE | Standard Mitigation | Status here |
|---|---|---|---|
| Stored XSS via uploaded HTML | Tampering / Elevation | Serve untrusted uploads with a non-executable Content-Type and `nosniff` | **Closed by Supabase**, verified by probe. Not our code. |
| Stored XSS via uploaded SVG | Tampering / Elevation | Serve SVG as an attachment | **Closed by Supabase**, verified by probe |
| MIME spoofing to bypass an allow-list | Tampering | Magic-byte validation server side | **Open.** Not available in this architecture. Impact is limited to bytes stored under a `.jpg` name and served as `image/jpeg`, which no browser executes. Accept and document. |
| Path traversal in the object key | Tampering | Reject `..`, generate the path server side | **Closed.** Probe: route not matched. Also D-20 means no user input reaches the path at all. |
| Credential leakage through a filename | Information Disclosure | Never encode an identifier into a public name | **Closed by D-20**, and §9 of the schema states the reasoning. This is the highest-value invariant in the phase, because phase 3's D-35 amend function is only safe while it holds. |
| Storage exhaustion / cost | Denial of Service | Per-object size cap, per-identity count cap | **Partly closed.** `file_size_limit` after D-24; the count cap is per `guest_id` and resettable. Residual risk accepted, consistent with `REQUIREMENTS.md`. The free tier's 1GB is the practical ceiling and the owner's recourse is the dashboard. |
| XSS via an uploader's name rendered into a tile | Tampering | Text nodes, never HTML | **Closed by construction**, provided E5's `textContent` discipline is followed. The name comes from `enrollments` via the view and is guest-supplied. |
| Overwriting another guest's photo | Tampering | No update policy | **Closed**, verified by probe |
| Reading another guest's `guest_id` and hijacking their registration | Spoofing | The credential is not published anywhere | **Closed**, verified by two probes (`42703`, `42501`) |

### The one residual risk worth stating out loud in the plan

Anyone who reads the page source can upload arbitrary bytes under 3 MB to this bucket, at a rate
limited only by Supabase's own gateway, and neither the site nor the owner can delete them from
anywhere except the dashboard. The mitigations available are the size cap and the fact that the URL
is unlisted and lives for about two months. **That is the trade this project made in its first
decision and it is the correct one for a party**, but the plan should carry it as a written accepted
risk rather than let it be discovered.

---

## Design Constraint Precedence

The two general-purpose design skills routed into this agent via `.planning/config.json` conflict
with `DESIGN-BRIEF.md` in concrete places, and the brief wins every time. Phase 3's research recorded
this table; it applies unchanged and is reproduced so the planner does not rediscover it.

| Routed skill says | DESIGN-BRIEF.md / CONTEXT.md says | Winner |
|---|---|---|
| `rounded-full` pills, `rounded-[2rem]` outer shells | *"One corner-radius system. DTU is a squared-off brand, so radii stay small: 2px and 8px."* [VERIFIED: .planning/DESIGN-BRIEF.md:112, quoted verbatim] | **Brief.** `--r-sm: 2px`, `--r-md: 8px` [VERIFIED: styles.css:32-33] |
| Glassmorphism, `backdrop-blur-2xl`, radial mesh gradients | Flat institutional dark, `--surface: #141416` on `--bg: #0B0B0C` [VERIFIED: styles.css:11-12] | **Brief.** |
| Entry animations resolving `blur-md` to `blur-0` | *"Animate `transform` and `opacity` only."* [VERIFIED: .planning/DESIGN-BRIEF.md:110-111, quoted verbatim] | **Brief.** `blur` is neither. |
| MOTION baseline 6 to 8 | D-28: MOTION_INTENSITY **3** for this phase | **CONTEXT.md.** `#photos` is the `unhinged` zone and phase 5 owns the arc (DSG-04). |
| Tailwind utility classes throughout | Plain CSS, no build step, no bundler | **Project constraint.** |
| `py-24` to `py-40` macro-whitespace | The site's existing 4px scale, `--s-1` to `--s-10` [VERIFIED: styles.css:27-29] | **Consistency.** The album must look like it belongs to the five sections already shipped. |
| "Never generate the same layout twice" | An established site with six shipped sections | **Consistency wins.** |

What the routed skills **do** contribute here, and should be honoured: the eight interactive states
per element from `interaction-states.md`, which is the right lens for a control with nine of them;
`:focus-visible` rather than `outline: none`; touch targets at 44px minimum; and
`IntersectionObserver` rather than a scroll listener, for which this codebase already has a guarded
precedent at `app.js:607-670` that degrades to an eager mount rather than to absent.

The brief's own hard constraint that outranks everything applies unchanged: *"Countdown, address, and
door video are readable in under three seconds by someone standing outside a building in the dark.
This outranks every aesthetic decision."* [VERIFIED: .planning/DESIGN-BRIEF.md:105-107, quoted
verbatim] Nothing in the photos section may be allowed to compete with those three.

---

## Config Impact

Three new keys, all inside the existing `photos` block at `config.js:211-218`, which already carries
`bucket`, `table`, `maxPerGuest: 5` and `maxFileSizeMb: 12`, all documented.
[VERIFIED: config.js:211-218, quoted verbatim in `## Existing Code` below]

| Key | Value | Note for the comment |
|---|---|---|
| `opensAt` | ISO 8601 with an explicit offset, defaulting to party start minus three hours, i.e. `'2026-10-03T13:00:00+02:00'` | Must say plainly that `null` opens uploads immediately, because D-05 makes that the owner's one-line recovery from a phone with the wrong date, on the night, with nobody at a laptop. |
| `maxEdgePx` | `1600` | The longest edge after shrinking. Bigger is prettier and roughly doubles the bytes on a connection that will be busy. |
| `jpegQuality` | `0.82` | Between 0 and 1. Clamp when reading it: an out-of-range number is silently replaced by the browser's default rather than raising, so a typo produces larger files and no error. |

**The comment must state that `maxFileSizeMb` (12) and the bucket's `file_size_limit` (3 MB) are two
different numbers doing two different jobs**, as D-21 requires, so nobody later reconciles them into
one. One protects the phone's memory before the shrink; the other protects the bucket after it.

`config.js` comments are written for a non-programmer (CFG-04) and the existing `photos` block sets
the register. Note the existing block already explains why the shared Supabase credentials live under
`photos`; extending the block rather than adding a new one is the natural home.

## Copy Impact

`copy.js` uses **flat dotted string keys**, not nested objects. New keys are added as
`'photos.upload.cta': '...'`, three tables, identical key sets.

Current state, measured this session: **156 keys in each of `en`, `it`, `da`**, at parity. Four are
`photos.*`: `photos.heading`, `photos.lede`, `photos.pending.title`, `photos.pending.body`, all in
use and all rendered from `index.html` via `data-i18n`. [VERIFIED: copy.js:191-194, 374-377, 561-564,
and a key-set count run this session]

The existing lede is the setup whose punchline D-23 has to land:

> `'photos.lede': 'Students are asked to submit photographic evidence of the evening. Maximum five per person, which is a limit chosen to protect everyone.'`
> [VERIFIED: copy.js:192, quoted verbatim]

Key groups the phase needs: the closed state (with the opening moment substituted), the
not-registered state and its jump link, the remaining count, the control's label and its per-state
labels, the per-file error reasons (`empty`, `type`, `size`, `decode`, `encode`, `network`), the
partial-success message naming which files landed, the refusal, the empty-album line, and the honest
line about photos being permanent. Written natively per language (LNG-04), Danish complete rather
than token (LNG-05), zero em dashes (DSG-06).

---

## Existing Code

Verbatim quotes of the seams this phase attaches to, so the planner does not have to re-derive them.

**The mount point, which is untouched ground:**

> ```html
>   <section class="section" id="photos" data-zone="unhinged">
>     <div class="wrap">
>       <h2 class="section__h" data-i18n="photos.heading">Documentation</h2>
>       <p class="section__lede" data-i18n="photos.lede">Students are asked to submit photographic evidence of the evening. Maximum five per person, which is a limit chosen to protect everyone.</p>
>       <div id="photos-body">
> ```
> [VERIFIED: index.html:296-301, quoted verbatim]

There is no `renderPhotos()` and no reference to `#photos-body` anywhere in `app.js` today, unlike
`#enrol`, which phase 1 had partly wired.

**The render chain `renderPhotos()` joins:**

> ```js
>     renderSchedule();
>     renderCountdown();
>     renderDeadline();
> ```
> [VERIFIED: app.js:122-124, quoted verbatim]

The chain continues through `renderEnrollment()`, `renderWhatsApp()`, `renderNudge()`,
`renderLocation()`, `renderAccess()`, `renderSocialProof()` and ends with `measureNudge()`.
[VERIFIED: app.js:122-147] `renderPhotos()` has no ordering dependency of its own; placing it
alongside `renderLocation()` and `renderAccess()` matches the page order. It must **not** be placed
after `measureNudge()`, which the file's own comment says is deliberately last.

**The identity this phase collects on ID-05's promise:**

> ```js
>   var identity = {
>     get: function () {
>       var n = parseInt(store.get('extra_guests'), 10);
>       return {
>         guest_id: store.get('guest_id'),
>         name: store.get('name'),
> ```
> [VERIFIED: app.js:1189-1195, quoted verbatim]

**The documented storage layout the new count key joins:**

> ```
>   /* The storage layout under the c03102. prefix, exactly: lang, enrolled,
>      wa_joined, guest_id, name, extra_guests, note. The first three were written
>      by phase 1 and are neither renamed nor repurposed, because live guests
>      already carry them on their devices.
> ```
> [VERIFIED: app.js:1180-1183, quoted verbatim]

The new key (suggested `photo_count`) must be added to this comment, not written to storage from
somewhere else. CONTEXT.md's Reusable Assets section asks for exactly this.

**The wire helper, reused unchanged for the row insert and the album read:**

> ```js
>   function sbRequest(method, path, body, prefer, timeoutMs) {
> ```
> [VERIFIED: app.js:1287, quoted verbatim]

**The configured check PH-08 needs:**

> ```js
>   function sbConfigured() {
>     var p = CFG.photos || {};
>     return Boolean(p.supabaseUrl && (p.supabaseKey || p.supabaseAnonKey));
>   }
> ```
> [VERIFIED: app.js:1248-1251, quoted verbatim]

**The config block being extended:**

> ```js
>   photos: {
>     supabaseUrl: 'https://aplaxdplwnnlezffatal.supabase.co',
>     supabaseKey: 'sb_publishable_Z6Cq5vFRqyUhXueQGevrYQ__j0pNRrc',
>     bucket: 'party-photos',
>     table: 'photos',
>     maxPerGuest: 5,      // also enforced in the database, see supabase/schema.sql
>     maxFileSizeMb: 12,
>   },
> ```
> [VERIFIED: config.js:211-218, quoted verbatim]

**The bucket definition D-24 changes:**

> ```sql
> insert into storage.buckets (id, name, public)
> values ('party-photos', 'party-photos', true)
> on conflict (id) do nothing;
> ```
> [VERIFIED: supabase/schema.sql:265-267, quoted verbatim]

**The album view this phase reads and must never widen:**

> ```sql
> create or replace view public.album as
>   select
>     split_part(trim(name), ' ', 1) as first_name,
>     storage_path,
>     created_at
>   from public.photos;
> ```
> [VERIFIED: supabase/schema.sql:412-417, quoted verbatim]

**The photos table shape:**

> ```sql
> create table if not exists public.photos (
>   id           uuid primary key default gen_random_uuid(),
>   guest_id     uuid not null,
>   name         text not null,
>   storage_path text not null unique,
>   created_at   timestamptz not null default now()
> );
> ```
> [VERIFIED: supabase/schema.sql:108-114, quoted verbatim]

**The trigger that is now proven:**

> ```sql
>   if current_count >= 5 then
>     raise exception 'photo_limit_reached';
>   end if;
> ```
> [VERIFIED: supabase/schema.sql:225-227, quoted verbatim]

Note that the literal `5` is hard-coded in the trigger while `photos.maxPerGuest: 5` sits in
`config.js`. They agree today. **If the owner ever raises the config value the database will refuse
the sixth anyway**, exactly as §10 warns for `maxGuestsPerPerson`. The `config.js` comment beside
`maxPerGuest` already points at the schema file; a matching note in §4 of the schema saying the two
must move together would close the loop, in the same shape §10 already uses.

---

## Owner Actions

Two actions, and they should be presented as one, in the register phase 3 used. **Neither blocks
shipping.** The site works un-migrated with an open bucket, exactly as phase 3 shipped correct in its
un-migrated state (D-36).

### 1. Re-run `supabase/schema.sql` in the SQL editor

Applies D-24's `file_size_limit` and `allowed_mime_types` to the `party-photos` bucket. Until then
the bucket accepts any bytes of any type up to the 50MB free-tier ceiling, verified by probe today.
The file remains safe to run more than once.

### 2. Delete the research artifacts, from the dashboard

This research session proved what §4 of the schema said was unproven, and nothing in the browser can
undo it. **The inventory below is exact.** Both lists were read back off the live project after the
probes finished.

**Six rows in `public.photos`**, all `name = 'ZZTEST DeleteMe'`. Dashboard > Table Editor > photos.

| `storage_path` | `guest_id` |
|---|---|
| `zz-research/limit-1.jpg` | `99999999-0000-4000-8000-000000000001` |
| `zz-research/limit-2.jpg` | `99999999-0000-4000-8000-000000000001` |
| `zz-research/limit-3.jpg` | `99999999-0000-4000-8000-000000000001` |
| `zz-research/limit-4.jpg` | `99999999-0000-4000-8000-000000000001` |
| `zz-research/limit-5.jpg` | `99999999-0000-4000-8000-000000000001` |
| `zz-research/other-1.jpg` | `99999999-0000-4000-8000-000000000002` |

Or in the SQL editor, which is faster and equally auditable:

```sql
delete from public.photos where name = 'ZZTEST DeleteMe';
```

**Eight objects in the `party-photos` bucket**, all under one folder. Dashboard > Storage >
party-photos > `zz-research` > delete the folder.

`probe-post.jpg`, `probe-cache.jpg`, `probe-cors.jpg`, `probe-spoof.jpg`,
`probe-not-an-image.txt`, `probe-html.html`, `probe-svg.svg`, `probe-noct.bin`

**Prove the removal the way D-26 and D-27 require:** through `public.album`, never through the
blocked table. The album must return `[]` afterwards.

```bash
curl -sS "https://aplaxdplwnnlezffatal.supabase.co/rest/v1/album?select=first_name,storage_path" \
  -H "apikey: sb_publishable_Z6Cq5vFRqyUhXueQGevrYQ__j0pNRrc"
# expected: []
```

This is the same shape the `ZZTEST DeleteMe` cleanup took in phase 3 (D-34), and it worked.

**Do this before the album UI is built, or before it is shown to anyone.** Left in place, the six
rows render as six broken tiles attributed to `ZZTEST`, because their `storage_path` values point at
objects that were never written. That is also a live demonstration of why D-19 puts the storage write
first.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|---|---|---|---|
| Parse the EXIF orientation tag and apply a rotation matrix before drawing | Draw the `<img>` and let the engine apply it | Chrome 81, Firefox 77, Safari 13.1 era, when `image-orientation: from-image` became the initial value | The tutorials and Stack Overflow answers that dominate search results are pre-change and will double-rotate every portrait photo. This is the single most likely thing for an executor to copy from the internet and get wrong. |
| `canvas.toDataURL()` then convert the base64 to a Blob | `canvas.toBlob(cb, type, quality)` | Baseline since January 2020 [CITED: MDN] | `toDataURL` materialises a base64 string roughly a third larger than the bytes, on a phone already under memory pressure. |
| `image/jpeg` at quality 0.9 as the default | Quality 0.8 to 0.85 for photographic content viewed on phones | ongoing | D-16's 0.82 is in the right band. |
| `<input accept="image/*,image/heic">` to "support iPhones" | `accept="image/*"` alone | Safari 17 regression | The additive fix is now the bug. See Pitfall 1. |
| `supabase-js` as the only documented way to talk to Storage | Plain HTTP against `/storage/v1/object/...` | always available, now well documented | The REST surface is stable and probe-verified here. No client library needed. |

**Deprecated / outdated:**
- `createImageBitmap` option value `none` meaning "apply EXIF orientation" — a Safari-only spelling,
  renamed to `from-image` in Safari 17.2 and now deprecated.
  [CITED: webkit.org/blog/14787/webkit-features-in-safari-17-2/]
- `xhr.onreadystatechange` for completion — `onload` / `onerror` / `ontimeout` / `onabort` are the
  four handlers, and all four are needed.

---

## Environment Availability

| Dependency | Required By | Available | Version / State | Fallback |
|---|---|---|---|---|
| Supabase Storage REST | PH-03 write path | ✓ | `party-photos` bucket exists, public, anonymous insert works, `select` works | PH-08 pending panel |
| Supabase PostgREST | PH-03 index, PH-04 album | ✓ | `public.photos` insert `201`, `public.album` read `200` | PH-08 pending panel |
| Five-photo trigger | PH-02 floor | ✓ | fires, `P0001` / `photo_limit_reached` | none needed |
| Bucket `file_size_limit` / `allowed_mime_types` | D-24 | ✗ | unset; bucket currently accepts any type and any size to the 50MB tier ceiling | Owner re-runs the schema file. Site works either way. |
| CORS from `sirsirio.github.io` | XHR upload | ✓ | `Access-Control-Allow-Origin: *`, headers reflected, max-age 3600 | none needed |
| Public read path | PH-04 tiles | ✓ | `200`, no key, `image/jpeg`, `Cache-Control` controlled at upload time | none needed |
| `crypto.randomUUID` | D-20 | ✓ | already wrapped at `app.js:1156` with a `getRandomValues` fallback and a `null` terminal branch | reuse `newGuestId()` |
| Build tooling, package manager | — | n/a | none exists and none is needed | n/a |
| A real iOS Safari and a real Android Chrome | D-30 device pass | **unknown** | cannot be probed from here | none. This is the phase's closing gate and it must be a real device. |

**Missing dependencies with no fallback:** none that block execution.
**Missing dependencies with a fallback:** the bucket restrictions, which are an owner action and are
surfaced as one rather than buried, per D-24's own reversibility note.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | A one-step 2.5x `drawImage` reduction with `imageSmoothingQuality: 'high'` produces acceptable sharpness for a phone album | The Image Pipeline, Fact 4 | Album photos look soft or aliased. Caught by the device pass (D-30). Fix is stepwise halving in one function, roughly five lines. Low risk, cheap remedy. |
| A2 | `img.decoding = 'async'` and the release sequence (`revokeObjectURL`, `img.src=''`, `canvas.width=0`) are sufficient to keep five sequential 12MP decodes inside mobile Safari's memory budget | The Image Pipeline, Fact 2 | A tab reload mid-upload on an older iPhone. Caught by the device pass. Mitigation would be a short delay between files, or refusing above a lower size ceiling. |
| A3 | `public.album` returns the whole album with no implicit row cap at the volumes this party will produce | Wire Contract S6 | An album that silently truncates at some row count. Probed only with six rows. Low risk at a party of tens of people; if the planner wants certainty, an explicit `&limit=` makes the behaviour deliberate rather than inherited. |
| A4 | The rejection shape when `allowed_mime_types` is violated is an HTTP error carrying a message of the form `mime type X is not supported` | Security Domain / D-24 | An unhandled error shape after the owner runs the migration. Impact is limited: under D-16 the site only ever uploads `image/jpeg`, so this branch is unreachable on the happy path. Could not be probed without applying the migration. |
| A5 | Supabase's `text/html` downgrade and SVG attachment behaviour are stable platform behaviour rather than an incidental property of the current gateway | Security Domain | A future Supabase change would re-open a vector this document calls closed. Both were probe-verified today; neither is documented by Supabase as a guarantee. The size cap in D-24 does not depend on this. |
| A6 | Postgres grants `execute` on new functions to `PUBLIC` by default, which is why §4's and §8's `revoke all` lines matter | Existing Code | None. The `revoke` lines are already in the applied schema and are harmless either way. Carried forward from phase 3's research, where it was also marked assumed. |

---

## Open Questions

1. **Does `photos.opensAt` want a countdown, or only a stated time?**
   - What we know: D-05 requires the closed panel to state the opening moment as text, and
     `formatSchedule()` at `app.js:263` already formats a moment per language on `Europe/Copenhagen`.
     CD-04 promises a countdown state that points at this section.
   - What is unclear: whether the closed panel should tick. CONTEXT.md does not say, and a second
     live countdown on the page is both more work and a second thing to get wrong at midnight.
   - Recommendation: **stated time only.** The hero already owns the ticking. One clock per page.

2. **Should the remaining count also appear before a guest has picked any files?**
   - What we know: PH-02 says "with remaining count shown before upload". D-22 puts the count in
     `localStorage`. Whether it is a sentence, a chip, or part of the button label is explicitly
     Claude's discretion.
   - What is unclear: whether "before upload" means before the file picker opens or before the
     transfer starts.
   - Recommendation: **before the picker.** A guest who is about to choose five when two remain is
     the case D-15's partial-acceptance rule exists to soften, and telling them first is kinder than
     telling them after.

3. **Where does the honest line about permanence live?**
   - What we know: CONTEXT.md's flagged consideration asks for one honest line near the upload
     control, in the register the enrollment note field got in phase 3. The album is public,
     permanent, and undeletable by anyone from the browser (V2-01).
   - What is unclear: whether it belongs above the control, in the lede, or in the success state.
   - Recommendation: **beside the control, before the upload**, since it is information a guest needs
     in order to decide, not after they have decided.

---

## Sources

### Primary (HIGH confidence)

- **Live probe against Supabase project `aplaxdplwnnlezffatal`, 2026-08-15.** Twenty-eight requests
  covering: Storage authentication header semantics (4), upload verb and collision behaviour (4),
  public read and Content-Type handling (5), MIME and SVG handling (3), path traversal (1), CORS
  preflight (3), object listing (2), the `photos` insert path and its error taxonomy (5), the
  five-photo trigger including the sixth-photo refusal (1). Every table cell marked
  `[VERIFIED: live probe]` came from these.
- `supabase/schema.sql` — read in full this session. §2 the table, §3 the threat model, §4 the
  trigger, §6 the bucket, §9 the album view and the naming warning behind D-20, §10 the bound
  discipline this phase should echo.
- `app.js` — `store` (:21), `applyLanguage` (:104), `startMs` / `phase` (:164, :180),
  `formatSchedule` (:263), `pendingBlock` (:320), `newGuestId` (:1156), `identity` (:1189),
  `sbConfigured` (:1248), `sbRequest` (:1287).
- `config.js:211-218`, `index.html:296-305`, `copy.js:191-194`, `styles.css:11-48, 641-650`.
- `.planning/DESIGN-BRIEF.md`, `.planning/REQUIREMENTS.md`, `.planning/config.json`.

### Secondary (MEDIUM confidence)

- developer.mozilla.org — `createImageBitmap`, `HTMLCanvasElement.toBlob`, `image-orientation`,
  `XMLHttpRequestUpload`.
- webkit.org/blog/14787/webkit-features-in-safari-17-2/ — the `none` to `from-image` rename.
- caniuse.com/mdn-api_createimagebitmap_options_imageorientation_parameter_from-image — version floors.
- github.com/w3c/csswg-drafts/issues/4666 — `image-orientation` and canvas `drawImage` in Chromium
  and WebKit.
- supabase.com/docs/guides/storage/uploads/file-limits, .../buckets/creating-buckets — the 50MB free
  tier ceiling, `allowedMimeTypes`, `fileSizeLimit`.
- github.com/supabase/storage/issues/639 — MIME validation is by filename and declared type, not by
  content.
- developer.apple.com/forums/thread/743049 — the Safari 17 `accept="image/heic"` regression.
- pqina.nl/blog/canvas-area-exceeds-the-maximum-limit/ — the 16,777,216 pixel canvas ceiling.

### Tertiary (LOW confidence)

- Community reports on iOS HEIC-to-JPEG conversion behaviour through file inputs. The behaviour is
  consistently reported across many sources and matches the Apple forum thread, but no first-party
  Apple documentation states it. Confirmation is the device pass (D-30), which already lists HEIC
  selection from the iOS camera roll.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| Database and Storage wire contract | **HIGH** | Every request executed against the live project rather than inferred. Includes the claim the schema file itself flagged as unproven. |
| The five-photo limit | **HIGH** | Proved end to end, including the sixth refusal and its exact error code, plus the per-guest scoping and the trigger-before-constraint ordering. |
| Security model | **HIGH** | Every control classified as holding or not holding was probed, including the three that turned out to be closed by Supabase rather than by us. |
| Stack choice (no packages) | **HIGH** | The project has no package manager, no build step, and a hard static-hosting constraint. There is nothing to decide. |
| Image pipeline mechanism | **MEDIUM** | Documentation and support tables rather than a probe. The orientation refinement rests on three independent sources that agree, but no photo was decoded on a real phone this session. D-30 is the closing gate. |
| Memory behaviour on mobile Safari | **MEDIUM** | Well-attested limits, but the specific mitigation set (A2) is reasoned rather than measured. |
| Copy, layout, motion | **MEDIUM** | Claude's discretion by CONTEXT.md, constrained by DESIGN-BRIEF and the six sections already shipped. |

**Research date:** 2026-08-15
**Valid until:** 2026-09-14 for the browser findings, which move slowly. The wire contract is valid
until someone changes the schema or the bucket, at which point it must be re-probed rather than
re-read: the phase 3 header records a case where a request was answered cleanly for a day and did
nothing, and the only reason anyone found out was that somebody finally posted a photo.
