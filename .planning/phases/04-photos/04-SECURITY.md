---
phase: 04
slug: photos
status: verified
# threats_open = count of OPEN threats at or above workflow.security_block_on severity (the blocking gate)
threats_open: 0
asvs_level: 1
created: 2026-08-17
---

# Phase 04 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

The register was authored at plan time across all five plans and carries 33 unique threat IDs: 32
numbered rows plus `T-04-SC`, the supply chain row repeated identically in every plan. All 33 were
re-verified against HEAD on 2026-08-17, after the thirteen code review fix commits, rather than
against the SUMMARY files' own claims. Four paths the fixes touched (retry, settle, the classifiers
and the upload) were traced at L2 and L3 depth even though the configured level is L1.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| Phone to site | A guest's browser loads static files from a public URL. There is no login and no session. | A `guest_id` uuid held in localStorage, a first name, picked image bytes |
| Site to Storage | `XMLHttpRequest` POST to the public `party-photos` bucket, authenticated with the publishable key | Re-encoded JPEG bytes, an object key of the form `{yyyy-mm-dd}/{fresh-uuid}.jpg` |
| Site to PostgREST | `fetch` to `/rest/v1/photos` and `/rest/v1/album`, same publishable key | `guest_id` and first name outbound; first name, `storage_path` and date inbound |
| Database to browser | `public.album`, a definer view over `public.photos` | First name, `storage_path`, `created_at`. Deliberately never `guest_id` |
| Owner to project | Supabase dashboard and SQL editor | DDL, and the only delete path that exists anywhere |

The load-bearing boundary is the fourth. Since phase 3 the `guest_id` is the entire credential for
amending a registration, so any read path that hands one out is a password disclosure. `public.album`
does not carry the column, which is a stronger promise than a rule about who may read it.

---

## Threat Register

| Threat ID | Category | Component | Severity | Disposition | Mitigation | Status |
|-----------|----------|-----------|----------|-------------|------------|--------|
| T-04-01 | Information disclosure | `storagePath()`, album render | high | mitigate | `storagePath()` mints a CSPRNG uuid unrelated to `guest_id` and returns `null` rather than degrade. `guest_id` reaches exactly two places: the POST body and localStorage. The album select does not request it and the view does not carry it. | closed |
| T-04-02 | Tampering | Album caption render | high | mitigate | Captions and accessible names via `createElement` + `textContent` + `setAttribute`. Zero `innerHTML` / `outerHTML` / `insertAdjacentHTML` assignments in `app.js`. | closed |
| T-04-03 | Tampering | `photoPublicUrl()` | high | mitigate | `STORAGE_PATH_RE` is an anchored allowlist applied before any count or concatenation. A non-matching row is skipped and excluded from the head count. No scheme is reachable because the path is appended after a fixed prefix. | closed |
| T-04-04 | Spoofing | Both service calls | high | mitigate | The key travels in `apikey` only, on both services. Zero `Bearer` / `Authorization`. No `apikey=` in any URL. `config.js` holds a `sb_publishable_` key; no secret-prefixed key exists in the repository. | closed |
| T-04-05 | Denial of service | `validateFile()`, `downscaleToJpeg()` | medium | mitigate | Validation runs across the whole picked list before any decode begins. Every file releases its object URL, image source and canvas backing store before the next. | closed |
| T-04-06 | Elevation of privilege | Storage content type handling | medium | accept | See accepted risk R-03. | closed |
| T-04-07 | Tampering | `storage.objects` policies | low | accept | See accepted risk R-04. Structural claim re-verified after the CR-03 fix. | closed |
| T-04-08 | Repudiation | Upload and insert path | high | mitigate | Success is proved by reading `public.album` back, never by a status code. Status is tested by range, never against a literal. Storage is written before the row so a failure leaves an invisible orphan rather than a broken tile. Residual W-E below. | closed |
| T-04-09 | Denial of service | Public insert policy | medium | accept | See accepted risk R-01. | closed |
| T-04-10 | Tampering | Queue row render | high | mitigate | The file name cell is `createElement` + `textContent`, with an empty-name fallback to a copy key. | closed |
| T-04-11 | Information disclosure | `classifyStorage()` | medium | mitigate | The classifier returns copy keys only. `storageBodyStatus()` is the sole reader of an error body and returns a status code, never a message. Zero `.message` occurrences in `app.js`. | closed |
| T-04-12 | Denial of service | XHR and driver | high | mitigate | All four terminal handlers wired, an unconditional 60 second timeout, a settling timer on the decode, and a resolving timeout inside `sbRequest`. | closed |
| T-04-13 | Denial of service | Sequential driver | medium | mitigate | Exactly one `waiting` record is claimed per pass, and all three releases run before the callback. | closed |
| T-04-14 | Repudiation | Progress bar | high | mitigate | The fill is capped at 0.92 until the response, the state word advances only on a measured completion, and a non-computable length holds at 0.92 from the first event. | closed |
| T-04-15 | Tampering | `renderPhotos()` re-entry | medium | mitigate | The renderer returns early while preparing or uploading, sets a pending flag, and renders once on settle from the batch model. | closed |
| T-04-16 | Elevation of privilege | Local photo count | medium | accept | See accepted risk R-02. | closed |
| T-04-17 | Denial of service | `photosOpen()` | high | mitigate | `isNaN` on the parsed value returns open, and `null` opens immediately. Parse failure and absence both open. This is the one place in the phase where a wrong default is unrecoverable from a phone. | closed |
| T-04-18 | Tampering | `photosRemaining()` | low | mitigate | `Math.max(0, …)` clamp, and the ladder routes a count at or above the maximum to the quota body. The database trigger is the floor either way. | closed |
| T-04-19 | Information disclosure | `buildGatePanel()` | medium | mitigate | The gate carries a heading, a lede and one anchor to `#enrol`. The only `createElement('input')` in the photos region has `type = 'file'`. | closed |
| T-04-20 | Denial of service | Opening gate tick | low | mitigate | The gate rides the countdown's existing interval, which remains the only `setInterval` in the file, and returns early unless the boolean flips. | closed |
| T-04-21 | Repudiation | `photos.refuse.server` | high | mitigate | All three languages state that the register already holds five and that this one was not added. Residual W-E below. | closed |
| T-04-22 | Information disclosure | `classifyPhotoInsert()` | medium | mitigate | Both classifiers return copy keys. No message property reaches a text node anywhere in the region. | closed |
| T-04-23 | Denial of service | Refusal handling | high | mitigate | Re-tested after CR-03. The `P0001` branch is evaluated before the new `23505` branch, as sibling conditions rather than nested ones. `hitQuota` mints no path, sends nothing, and refuses every waiting row. The new branch did not weaken the unconditional treatment. | closed |
| T-04-24 | Denial of service | `retryFailedFiles()` | high | mitigate | Only records in the failed state are reset; `done` and `refused` are skipped. `rec.path` is deliberately retained across attempts so a duplicate insert collides on the `storage_path` unique constraint. A busy guard prevents a second concurrent driver. | closed |
| T-04-25 | Tampering | `settleBatch()` | high | mitigate | One terminal state computed from the records, reached from all three call sites including the post-`hitQuota` path. | closed |
| T-04-26 | Denial of service | Orphaned object | low | accept | See accepted risk R-05. | closed |
| T-04-27 | Repudiation | `schema.sql` header | high | mitigate | The header records the gate as passed with wire evidence rather than a status code: a 4 MiB `image/jpeg` refused `413 EntityTooLarge` with its public read answering 400, and a `text/plain` upload refused `415 InvalidMimeType`. Live-confirmed 2026-08-17. | closed |
| T-04-28 | Denial of service | Bucket record | high | mitigate | `file_size_limit = 3145728` with an updating conflict clause rather than a skipping one, live on the wire. A ceiling per object, not per project; the free tier and the owner's dashboard remain the recourse against volume. | closed |
| T-04-29 | Tampering | The two size numbers | medium | mitigate | The `config.js` comment and the `schema.sql` §6 comment each name the other and each states the two numbers must not be reconciled into one. | closed |
| T-04-30 | Information disclosure | §6 type list comment | medium | mitigate | The comment states that Supabase validates the declared type rather than the bytes, and names the list as hygiene rather than a wall. | closed |
| T-04-31 | Information disclosure | `schema.sql` policies | high | mitigate | Zero delete policies in the file, zero select policies on `public.photos`, zero invoker views, four `security definer` declarations intact, §9's revoke intact. §11 adds two check constraints and no policy, grant or view. | closed |
| T-04-32 | Information disclosure | Cleanup proof | medium | mitigate | Cleanup was proved through `public.album` returning `[]` and nine objects answering 400, rather than through the blocked table. | closed |
| T-04-SC | Tampering | Dependency supply chain | low | accept | See accepted risk R-06. | closed |

*Status: open · closed · open — below high threshold (non-blocking)*
*Severity: critical > high > medium > low — only open threats at or above workflow.security_block_on count toward threats_open*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| R-01 | T-04-09 | Anyone holding the page source can upload arbitrary bytes with one `curl`. The publishable key is public by design and the insert policy has no other condition. `PROJECT.md` records the trade in the project's first decision. The only real control is the bucket's byte-counted ceiling, which is live. The URL is unlisted and the album lives about two months. | Owner | 2026-08-17 |
| R-02 | T-04-16 | Clearing browser storage resets the remaining count. `REQUIREMENTS.md` records this verbatim: a soft limit is correct for the audience. The real floor is the database trigger, which is per identity. | Owner | 2026-08-17 |
| R-03 | T-04-06 | Uploaded content executing in a browser is closed by Supabase rather than by this project: `text/html` is downgraded to `text/plain` with `nosniff`, and SVG is served as an attachment. Both probe-verified, both platform behaviour rather than a documented guarantee (research assumption A5). Everything this site uploads is a re-encoded JPEG. | Owner | 2026-08-17 |
| R-04 | T-04-07 | Overwriting another guest's object is structurally impossible: no update policy exists on `storage.objects`, and the client sends no upsert header. Re-verified after the CR-03 fix made a same-key object report success, on three independent legs recorded below. | Owner | 2026-08-17 |
| R-05 | T-04-26 | A failed row insert leaves an orphaned storage object. D-19 chose this over the alternative, which is a row pointing at a file that does not exist, rendering as a broken tile in everyone's album forever, with no delete path from the browser for either half. The orphan appears in no view, no page and no URL anyone holds. | Owner | 2026-08-17 |
| R-06 | T-04-SC | No package manager, no lockfile, no build step, no `package.json`, no `node_modules`. The supply chain gate has no input to operate on. The three image libraries named in the research are named in order to reject them and must not be installed. | Owner | 2026-08-17 |

---

## Flags Raised During Audit

Neither of these opens a threat. Both are surface that arrived after the SUMMARY files were written,
which is why all five of their `## Threat Flags` sections read "None" — those claims are stale rather
than false.

**F-01 — `storageDuplicate()` treats an existing object at the same key as success.**
Introduced by the CR-03 fix so that a retried upload can reach its insert instead of dying at the
object write. The claim that a collision is unreachable was tested rather than accepted, and holds on
three independent legs: the key is `{yyyy-mm-dd}/{uuid}.jpg` where the uuid comes only from
`crypto.randomUUID` / `getRandomValues` and `storagePath()` returns `null` rather than degrade to a
weaker source; the key is minted once per record and lives only in the in-memory batch model; and
`storage.objects` carries no update policy, so even a collision cannot overwrite — the earlier bytes
stay. Cross-identity induction would require a pre-placed object at a 122-bit unguessable key.
T-04-07's structural claim survives the fix. Duplicate detection is broad but not indiscriminate: the
413 and 415 refusals the owner proved live are not read as duplicates.

**F-02 — `schema.sql` §11 is present in the file, unconfirmed in the database.**
The fixer added `photos_name_check` and `photos_storage_path_check` from review finding WR-07. The
owner reports having re-run the file since. That has not been probe-verified, and the reason is worth
recording: every probe that would prove the constraints exist also inserts a real row if they do not,
and `public.photos` has no delete path from outside the dashboard. The circumstantial case is strong —
the file is idempotent, the owner pasted it whole, and the table was empty so the `alter table` had no
existing row to reject — but circumstantial is what it remains.

This does not reopen T-04-02 or T-04-03. Both are mitigated at the render boundary in `app.js`
(`textContent` and the `STORAGE_PATH_RE` pre-filter), which is exactly where the register placed them,
and both hold regardless of what the table accepts. §11 is defence in depth for threats already closed
elsewhere, which is why it is a flag and not an open threat.

---

## Residual Findings

**W-E — one untrue sentence in one edge case.** If an insert response is lost *and* that insert took
the guest to five, the retry meets the BEFORE INSERT trigger ahead of the unique constraint, receives
`P0001`, and one transcript row reads "This one was not added" about a photograph that was. No double
count and no lost slot. The declared mitigations for T-04-08 and T-04-21 are present and correct at
HEAD; what is wrong is the wording in a case where two threats pull against each other. Evaluating
`P0001` before `23505` is required by T-04-23, and T-04-23 wins correctly. The album directly below
the sentence tells the truth. Tracked as W-E in `04-VERIFICATION.md` — an owner copy decision, not a
control gap.

**Device pass is 0 of 67.** No threat in the register names the device pass as its mitigation, so this
opens nothing here. T-04-27's blocking human gate was a separate act and was performed.

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-08-17 | 33 | 33 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-08-17
