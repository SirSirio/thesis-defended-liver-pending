---
phase: 04-photos
gate: workflow.api_coverage_gate
api: Supabase Storage + Supabase PostgREST (project aplaxdplwnnlezffatal)
base_url: https://aplaxdplwnnlezffatal.supabase.co
transport: plain fetch for PostgREST (D-06), one XMLHttpRequest for the storage write (D-18)
generated: 2026-08-16
---

# Phase 4 — External API Coverage

**Why this file exists.** The detector fired `detected: true` on the line "Supabase Storage REST:
`POST {url}/storage/v1/object/{bucket}/{path}` to write" in `04-CONTEXT.md`. This phase talks to
two Supabase services directly from a phone, with a key that is public by design, and
`workflow.api_coverage_gate` is deliberately re-armed for this phase in `ROADMAP.md`.

**What it enumerates.** Every capability of Supabase Storage and of the PostgREST surface on
`public.photos` / `public.album` that this phase either uses or deliberately declines. Full
coverage is the default; every `OPT-OUT` carries a reason, because an un-reasoned opt-out is the
un-decided hole this gate exists to close.

**A second integration starts from the same baseline.** Phase 3's `COVERAGE.md` enumerated
PostgREST for `enrollments`; this file re-enumerates the surface for `photos` and `album` from
full coverage rather than inheriting phase 3's opt-outs.

Every row marked probe-verified was settled against the live project on 2026-08-15
(`04-RESEARCH.md` §Wire Contract S1 to S8, §THE PROOF), not inferred from documentation.

**Table format.** The matrix is the three-column `Capability | Decision | Reason` shape the
`api-coverage` gate parses. Row numbers live inside the capability cell so the prose below can
keep referring to "row 12", "rows 28, 31, 33, 34" and so on. Where a reason did not fit the cell,
it is trimmed here and carried verbatim under `## Long-form reasons`.

---

## Supabase Storage

| Capability | Decision | Reason |
|---|---|---|
| 1. `POST /storage/v1/object/{bucket}/{path}` (create object) | **INTEGRATE** | PH-03, the write path. Probe-verified `200` with `{Key, Id}`. Note `200`, not `201`. |
| 2. `GET /storage/v1/object/public/{bucket}/{path}` (public read) | **INTEGRATE** | PH-04. The tile `src` and D-10's `href` are the same plain URL. No key, no headers, `Access-Control-Allow-Origin: *`. |
| 3. Public URL construction from `storage_path` | **INTEGRATE** | `sbUrl() + '/storage/v1/object/public/' + bucket + '/' + storage_path`, after the D-20 shape allowlist. |
| 4. `apikey` request header on the write | **INTEGRATE** | Probe-verified: `apikey` alone passes the gateway on Storage exactly as on PostgREST. |
| 5. `cache-control: max-age=31536000` on the write | **INTEGRATE** | Sets `Cache-Control: public, max-age=31536000` on every future public read. Without it every tile is refetched on every page view. Probe-verified both ways. See note 5. |
| 6. `Content-Type: image/jpeg` on the write | **INTEGRATE** | What is stored is what is served back, regardless of the bytes. Set explicitly rather than relying on `blob.type`. |
| 7. `xhr.upload.onprogress` (determinate progress) | **INTEGRATE** | PH-05. `fetch` has no upload progress event and never will (D-18). |
| 8. Storage error body `statusCode` field | **INTEGRATE** | Storage answers outer HTTP `400` for everything with the real status in `body.statusCode`. Classified separately from PostgREST. |
| 9. `storage.buckets`: `file_size_limit`, `allowed_mime_types` | **INTEGRATE** | D-24. Applied through `supabase/schema.sql` §6 in SQL, not over REST, because no REST route for bucket admin is reachable with a publishable key. |
| 10. `GET /storage/v1/object/{bucket}/{path}` (authenticated read) | OPT-OUT | The bucket is public by design and row 2 needs no key. A keyed read would add a header to every tile for nothing. |
| 11. `POST /storage/v1/object/list/{bucket}` (list objects) | OPT-OUT | The album index is `public.album`, not the bucket. Listing would return orphaned and unattributed objects, exactly the set the album must not show. |
| 12. `PUT /storage/v1/object/{bucket}/{path}` (overwrite) | OPT-OUT | **Security decision.** No update policy exists on `storage.objects` and deliberately never will. Probe-verified `403` / `AccessDenied`. See note 12. |
| 13. `x-upsert: true` header | OPT-OUT | Same root cause as row 12. Probe-verified `403` / `AccessDenied`. It can achieve nothing except a confusing error. |
| 14. `POST /storage/v1/object/move` | OPT-OUT | Needs the update policy row 12 refuses. Renaming an object would also not un-publish a path already handed out through `public.album`, which is the reasoning behind D-20. |
| 15. `POST /storage/v1/object/copy` | OPT-OUT | No use case. It duplicates bytes on a free tier for a party album. |
| 16. `DELETE /storage/v1/object/{bucket}/{path}` | OPT-OUT | **Security and product decision.** No delete policy exists on `storage.objects`, by design (V2-01, D-19). Probe-verified refused. See note 16. |
| 17. `POST /storage/v1/object/sign/{bucket}/{path}` (signed read URL) | OPT-OUT | Signed URLs expire and cost one request per image, which breaks a `loading="lazy"` grid and adds N round trips on party wifi. The bucket is public by design and schema §9 is built around that fact. |
| 18. `POST /storage/v1/object/upload/sign/...` (signed upload URL) | OPT-OUT | Signing needs a server. There is none: GitHub Pages, static, no build step. |
| 19. Resumable / TUS upload | OPT-OUT | D-16 lands a typical photograph at 300 to 500KB. A resumable protocol for a half-megabyte file is machinery with no payload. |
| 20. S3-compatible multipart endpoint | OPT-OUT | Same reason as row 19, plus it needs S3 credentials this project does not have and must not have. |
| 21. Image transformation on read (`/render/image/public/...`) | OPT-OUT | A paid Supabase feature. D-16's client-side downscale makes the originals small enough that a transform would buy nothing. Named in `04-CONTEXT.md` `## Deferred Ideas`. |
| 22. Bucket list / get / empty / delete over REST | OPT-OUT | Owner dashboard operations, not site capabilities. A publishable key must never be able to empty a bucket. |
| 23. `Authorization: Bearer <key>` on Storage | OPT-OUT | **Probe-verified hard failure.** A `sb_publishable_` key is not a JWT; Storage answers `403` / `Invalid Compact JWS`. The key travels in `apikey` and nowhere else. |

## Supabase PostgREST, the surface this phase touches

| Capability | Decision | Reason |
|---|---|---|
| 24. `POST /rest/v1/photos` with `Prefer: return=minimal` | **INTEGRATE** | PH-03. Probe-verified `201`, empty body. |
| 25. `GET /rest/v1/album?select=first_name,storage_path,created_at` | **INTEGRATE** | PH-04. Probe-verified `200`. The album is read through the view and never through the table. |
| 26. `order=created_at.desc` on `album` | **INTEGRATE** | D-09, newest first. Probe-verified. |
| 27. PostgREST error body `code` field | **INTEGRATE** | `P0001` is the five-photo refusal and is a normal branch, not a failure. Everything else is the failure state. Branch on `code`, never on `message`. |
| 28. `GET /rest/v1/photos` (select on the raw table) | OPT-OUT | **Security decision.** `select` is revoked from `anon` in schema §9. Probe-verified `401` / `42501`. Nothing in this phase may read it. See note 28. |
| 29. `PATCH /rest/v1/photos` | OPT-OUT | No update policy, and none is wanted: an uploaded photograph is a fact on the record, not an editable row. |
| 30. `DELETE /rest/v1/photos` | OPT-OUT | **Security and product decision.** No delete policy, by design. Probe-verified `401` / `42501`. V2-01 is the acknowledgement that delete-my-photo is known and deferred. |
| 31. `Prefer: return=representation` on the insert | OPT-OUT | **Probe-verified `401` / `42501` AND the row is not written.** The implied read-back has no grant to satisfy. The error is actively misleading. See note 31. |
| 32. `Prefer: count=exact` | OPT-OUT | The album head count is the rendered row count. A second counted request is a second claim about the same number, and the second one is always the one that disagrees. |
| 33. Filters on `album` (for example `?first_name=eq.X`) | OPT-OUT | Probe-verified live on the view, and deliberately unused. A per-guest "my photos" view would need a `guest_id` the view does not carry. See note 33. |
| 34. `select=guest_id` on `album` | OPT-OUT | **Structurally unavailable and that is the point.** Probe-verified `400` / `42703`: the column is not there to ask for. Recorded so nobody adds it back. |
| 35. `Range` / `limit` / `offset` pagination on `album` | OPT-OUT | D-11: no pagination. `loading="lazy"` means an off-screen tile costs a reserved box and no bytes. See note 35. |
| 36. Realtime / websocket subscription on `photos` | OPT-OUT | D-12: no polling and no socket. The album refetches after a successful upload and on nothing else. Holding a socket open on a phone at a party is a cost with no matching benefit. |
| 37. `@supabase/supabase-js` from a CDN | OPT-OUT | About 40KB gzipped, plus a supply chain this project does not currently have, on the page that handles guests' photographs. Consistent with phase 3's D-06 and with `04-RESEARCH.md` §Standard Stack. |
| 38. Supabase Auth (`/auth/v1/*`) | OPT-OUT | Real authentication is out of scope for the whole project. Identity is an unguessable uuid in `localStorage`. |

**Totals:** 38 capabilities enumerated, **13 INTEGRATE, 25 OPT-OUT**.

---

## Long-form reasons

The seven rows whose reasoning did not fit a table cell, verbatim.

**Note 5 — `cache-control: max-age=31536000`.** Sets `Cache-Control: public, max-age=31536000` on
every future public read. Without it the served header is `no-cache` and every tile is refetched
on every page view, on congested party mobile data. Probe-verified both ways.

**Note 12 — `PUT /storage/v1/object/{bucket}/{path}`.** **Security decision.** No update policy
exists on `storage.objects` and deliberately never will, so no guest can replace another guest's
photograph or their own. Probe-verified `403` / `AccessDenied`. Nothing in this phase may send it.

**Note 16 — `DELETE /storage/v1/object/{bucket}/{path}`.** **Security and product decision.** No
delete policy exists on `storage.objects`, by design (V2-01, D-19). Probe-verified refused. The
owner's only recourse is the dashboard, and CONTEXT.md's flagged consideration ships one honest
line saying so near the control.

**Note 28 — `GET /rest/v1/photos`.** **Security decision.** `select` is revoked from `anon` in
schema §9 because the table carries a `guest_id`, which §8 turned into a bearer write credential,
next to a full unsplit name. Probe-verified `401` / `42501`. Nothing in this phase may read it.

**Note 31 — `Prefer: return=representation` on the insert.** **Probe-verified `401` / `42501` AND
the row is not written.** The implied read-back has no grant to satisfy. The error blames the
insert policy and is actively misleading. Phase 3's trap, reproduced on the other table.

**Note 33 — filters on `album`.** Probe-verified live on the view, and deliberately unused. A
per-guest "my photos" view would need a `guest_id` the view does not carry, and adding one back
republishes the credential D-25 exists to protect. Named in `## Deferred Ideas`.

**Note 35 — pagination on `album`.** D-11: no pagination. `loading="lazy"` means an off-screen
tile costs a reserved box and no bytes. Research assumption A3 notes an explicit `&limit=` would
make the behaviour deliberate; declined so the album cannot silently truncate a party.

---

## The opt-outs that are architecture, not omission

1. **No overwrite, no move, no delete (rows 12, 13, 14, 16, 29, 30).** Six capabilities are
   unavailable for one reason: `storage.objects` and `public.photos` carry an insert policy and
   nothing else. That is what makes "no guest can replace or remove another guest's evidence" a
   structural fact rather than a promise. It is also the whole of V2-01, and it is why the phase
   ships an honest line saying an upload cannot be taken back from the site.

2. **No read of the raw table, no `guest_id` column anywhere (rows 28, 31, 33, 34).** Four
   capabilities are unavailable because `public.album` does not project the credential and the
   grant underneath is revoked. Phase 3's `amend_enrollment` is only safe while this holds. Adding
   a select grant or a `guest_id` column would restore all four at once, which is exactly why it
   is a one-way door.

3. **No signed URLs and no transforms (rows 17, 18, 21).** All three want a server. There is none,
   and D-16 makes the originals small enough that the absence costs nothing.

## What this phase adds to the API surface

`storage.buckets` gains `file_size_limit = 3145728` and `allowed_mime_types = {image/jpeg}` on the
`party-photos` record, applied by re-running `supabase/schema.sql` §6 (plan 04-05). The honest
framing, which the plan carries rather than softening: `file_size_limit` is counted on real bytes
and therefore holds against a crafted request; `allowed_mime_types` is validated against the
**declared** Content-Type and is hygiene rather than a wall. Both are worth their line, and only
one of them is a control.
