---
phase: 04-photos
verified: 2026-08-17T21:30:00Z
status: gaps_found
score: 9/14 must-haves verified
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: null
  previous_score: null
  note: "Initial verification. No prior 04-VERIFICATION.md existed."
gaps:
  - truth: "Every file a guest picked is answered by name, and no picked file is ever dropped without a visible row (PH-05)."
    status: failed
    reason: >-
      settleBatch() writes the terminal summary and then destroys it in the same synchronous
      task whenever the batch takes the guest to the quota. No frame is painted between the
      write and the wipe, so the answer PH-05 exists to guarantee is never visible. On the
      server-refusal route the per-file refusal rows themselves are created and destroyed in
      that same task, so files the guest picked vanish with no message at all.
    artifacts:
      - path: "app.js"
        issue: >-
          app.js:4967-4984 writes photoStatus and photoAlert; app.js:4996-4999 immediately
          calls renderPhotos(), which at app.js:5112 runs host.textContent = '' and at
          app.js:5136-5141 resets photoBatch, photoStatus and photoAlert to empty. Reached
          synchronously from hitQuota() (app.js:4905-4932) -> runNextFile() (app.js:4813)
          -> settleBatch(), so the photos.refuse.server row and every photos.refuse.extra
          row for still-waiting files are never painted.
    missing:
      - "Carry the settled batch outcome into the quota body (retained status + alert + transcript rendered under quotaPanel()), or defer the flip to the next renderPhotos() so the partial/refused body stands until the guest acts."
      - "Correct or delete settleBatch()'s comment at app.js:4993-4995, which claims the guest sees the transcript finish before the file closes over it."
  - truth: "The photos section uses the identity enrollment already gave the guest, and follows it when it changes."
    status: failed
    reason: >-
      renderPhotos() is absent from refreshEnrollmentState(), the single fan-out every
      enrollment mutation runs through. The photos body is a pure function of ident.name,
      ident.guest_id and identity.photoCount(), all written by the enrollment controls, and
      none of them re-render it.
    artifacts:
      - path: "app.js"
        issue: >-
          renderPhotos() has exactly two call sites outside its own settle path: app.js:149
          (applyLanguage) and app.js:237 (syncPhotosGate, which fires only on an open/closed
          flip). refreshEnrollmentState() at app.js:2499-2506 calls renderEnrollment,
          renderDeadline, renderNudge and renderSocialProof and not renderPhotos. All nine
          enrollment mutation sites (app.js:2742, 2803, 2813, 2871, 2879, 2915, 3125, 3194)
          funnel through it.
      - path: "app.js"
        issue: >-
          runBatch() at app.js:4729 reads photoIdent = identity.get() with no guard. After
          forgetIdentity() (app.js:2903-2925) the standing .uploader is still on the page,
          so a pick uploads the object (app.js:4850) and then POSTs guest_id:null into a
          table declaring guest_id uuid not null (supabase/schema.sql:149) - one orphan
          object per picked file, reported as photos.err.server ("The archive refused it").
    missing:
      - "Add renderPhotos() to refreshEnrollmentState(); the mid-batch skip guard at app.js:5081-5085 already makes this safe at any time."
      - "Guard runBatch(): after photoIdent = identity.get(), bail to the gate when guest_id or name is missing, so a drifted identity cannot spend bytes."
  - truth: "One batch-level retry re-runs only the failed rows, and a retry can never double-count against the five-photograph limit."
    status: failed
    reason: >-
      The row insert carries no idempotency key and no network classification, so a
      successful write whose response arrived after sbRequest's 12 second timeout is
      indistinguishable from one that never landed. It is marked failed, and failed is
      exactly the state the retry re-drives - with a freshly minted object key.
    artifacts:
      - path: "app.js"
        issue: >-
          sbRequest resolves { ok:false, code:'NETWORK' } at 12000ms (app.js:1367-1378).
          classifyPhotoInsert (app.js:3990-4005) has no NETWORK branch and returns
          photos.err.server, so the row is set failed (app.js:4880). retryFailedFiles clears
          rec.path (app.js:5043) and runNextFile mints a new uuid unconditionally
          (app.js:4837), so the retry writes a second object and a second row: two tiles of
          one photograph, two of five slots, one extra orphan.
    missing:
      - "Derive the object key once per record and reuse it across attempts (stop clearing rec.path on retry, stop minting when it is set), so a repeated insert collides on storage_path unique (supabase/schema.sql:151)."
      - "Teach classifyPhotoInsert that 409/23505 on storage_path means already recorded (return 'ok'), placed alongside and not inside the P0001 branch, because the BEFORE INSERT trigger fires ahead of the unique constraint (supabase/schema.sql:65-70)."
      - "Add the missing NETWORK branch to classifyPhotoInsert so a dropped connection is not reported as the archive refusing (WR-01)."
behavior_unverified_items:
  - truth: "A phone can pick photographs and see each one arrive in the album (the roadmap Done-when, PH-01/PH-03/PH-04 end to end)."
    test: "Walk 04-DEVICE-PASS.md Table A through Table E on a real iOS Safari and a real Android Chrome, serving the working tree with node tools/preview.js from the LAN address."
    expected: "Five photographs upload, each becomes a tile in the album with the uploader's first name, and the section then shows the quota panel instead of the control."
    why_human: "The project ships no build step, no test suite and no device harness. Every artifact on this path is present and wired, but nothing in the repository exercises pick -> decode -> XHR -> insert -> album fetch, and 67 of 67 rows in 04-DEVICE-PASS.md read Pending."
  - truth: "A portrait iPhone photograph lands the right way up in the album, and an HEIC pick arrives as a JPEG (D-17 as refined, 04-05 must-have)."
    test: "04-DEVICE-PASS.md Table A row A1 and row A3, on an iPhone, with a photograph the phone itself took."
    expected: "Upright, not rotated a quarter turn, not mirrored, honouring any rotation applied in the phone's Photos app."
    why_human: >-
      The truth is the deliberate ABSENCE of rotation code (app.js:3756-3773) relying on the
      rendering engine's image-orientation default. Presence checks can only confirm no
      rotation matrix exists; whether naturalWidth/naturalHeight report oriented dimensions
      on the real engine is settleable on a device only. 04-05's own must-have calls this
      the one claim in the design contract a terminal cannot settle.
human_verification:
  - test: "Walk all 67 rows of .planning/phases/04-photos/04-DEVICE-PASS.md on both platforms."
    expected: "Each Pending overwritten with Pass, Fail or Not tested plus a reason."
    why_human: "human_verify_mode is end-of-phase; plans 04-01 through 04-04 deferred 31 <human-check> observations into this sheet and it is entirely unwalked."
  - test: "Judgment-tier prohibition review (6 items across 5 plans) - see the Prohibitions table below."
    expected: "Owner confirms each must-NOT still holds after the three blockers are closed."
    why_human: "Judgment-tier prohibitions carry a non-authoritative LLM-judge verdict only. Two of them (D-23 framing, and never calling a declined submission a failed upload) interact directly with the CR-02 and WR-01 defects."
  - test: "Backstop truths: 12 long-text / overflow claims declared verification: backstop across the five plans (Danish and Italian strings at 320px, throttled-connection progress, quota panel line counts)."
    expected: "Each renders without overflow or wrapping at 320px in the named language."
    why_human: "Declared non-inferable at plan time; no rendering engine in this environment."
---

# Phase 4: Photos Verification Report

**Phase Goal:** Guests can upload to a shared album, using the identity enrollment already gave them.
**Done when:** a phone can upload five photos and see them in the album, and the sixth is refused with a joke rather than an error.
**Verified:** 2026-08-17T21:30:00Z
**Status:** gaps_found
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A phone picks photographs and each becomes an object, a row and a tile (PH-01, PH-03, roadmap Done-when, first clause) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Whole chain present and wired: `validateFile` 3749, `downscaleToJpeg` 3774, `storagePath` 3850, `uploadObject` 3901 (XHR POST `/storage/v1/object/{bucket}/{path}`, all four terminal handlers, 60s timeout), `insertPhotoRow` 4007 (POST `/rest/v1/photos`, `return=minimal`), `renderAlbum` 4090 (GET `/rest/v1/album`). Order is storage-then-row (D-19) at 4859-4860. Nothing exercises it: no test suite, no build, 67/67 device rows Pending. |
| 2 | Five per guest with the remaining count shown before the picker (PH-02) | ✓ VERIFIED | `photosMaxPerGuest()` 4200 reads `CFG.photos.maxPerGuest` (config.js:216 = 5, never a literal); `photosRemaining()` 4207 = max(0, max - stored). Rendered as a labelled `dl.facts` field in `buildUploader()` 4553-4595, above the button, re-seated by `refreshPhotosState()` 4442-4449 and `hitQuota()` 4928-4931. |
| 3 | The sixth is refused with a joke rather than an error (roadmap Done-when, second clause; PH-02, D-23) | ✓ VERIFIED | Ladder at 5109 selects `full` at count >= max; `quotaPanel()` 4536 renders `photos.full.title` + `photos.full.body` and no control, no queue, no zero count. Copy scan across all three languages of `photos.full.*` and `photos.refuse.*`: zero occurrences of error/failed/sorry, errore/fallito/scusa, fejl/mislykkedes/beklager. DB floor proven on the wire (schema.sql header: sixth insert refused 400 / P0001 / photo_limit_reached). |
| 4 | No picked file is ever dropped without a visible row; the batch always ends in a named answer (PH-05) | ✗ FAILED | `settleBatch()` writes the counted sentence (4967-4969) and the assertive line (4981-4984), then at 4996-4999 calls `renderPhotos()`, which wipes `#photos-body` (5112) and nulls `photoBatch`/`photoStatus`/`photoAlert` (5136-5141) in the same synchronous task. On the `hitQuota` route the refusal rows for every still-waiting file are also created (4921-4923) and destroyed within that same task. See CR-02. |
| 5 | Every file is re-encoded to JPEG at `maxEdgePx`/`jpegQuality` before a byte reaches the network, and is never upscaled (PH-06, D-16) | ✓ VERIFIED | `downscaleToJpeg` 3774-3831: `Math.min(1, maxEdge/max(w,h))` at 3797 caps scale at 1; `canvas.toBlob(..., 'image/jpeg', quality)` 3816-3826; called at 4826 before `uploadObject` at 4850. `maxEdgePx: 1600`, `jpegQuality: 0.82` in config.js with owner-facing comments. No rotation matrix anywhere in the phase (deliberate, 3756-3773). |
| 6 | Type, size and zero-byte checks all run before the decode (PH-07, D-21) | ✓ VERIFIED | `validateFile` 3749-3754 checks size, `image/` prefix and zero bytes. The validation loop at 4762-4777 walks the WHOLE picked list and only then does 4789 call `runNextFile()`, which is the first thing to touch the canvas. A refused file never reaches decode or wire. |
| 7 | The album displays uploads with the uploader's name, read through `public.album` (PH-04) | ✓ VERIFIED | `renderAlbum` 4090-4133: GET `/rest/v1/album?select=first_name,storage_path,created_at&order=created_at.desc`, 8000ms, never `public.photos`, never asks for `guest_id`. Rows filtered through `STORAGE_PATH_RE` (3873) before being counted or concatenated. `albumTile` 4050-4081 builds a plain anchor, `textContent` caption, `loading=lazy`, `decoding=async`. Silent on failure (4110, D-14). Host created at 5186-5189 under gate/quota/upload bodies and not under closed (D-06). |
| 8 | With Supabase unconfigured the section explains uploads open later instead of erroring (PH-08) | ✓ VERIFIED | Ladder 5092: `!sbConfigured() \|\| !IDENTITY_OK` -> `pending`, rendering the inherited `pendingBlock('photos.pending.title','photos.pending.body')` and returning above the album (5144-5147). `sbConfigured()` 1328-1331; `IDENTITY_OK` 1242. `storagePath()` 3850-3855 refuses rather than falling back to a weak generator. |
| 9 | The photos section uses, and follows, the identity enrollment gave the guest (phase goal clause) | ✗ FAILED | `renderPhotos()` is not in `refreshEnrollmentState()` (2499-2506), the single fan-out for all nine enrollment mutation sites. A guest who registers in-session keeps seeing the gate; after `forgetIdentity()` (2903) the standing uploader survives and `runBatch()` (4729) reads a null identity, uploads bytes, then POSTs `guest_id: null` into a `not null` column - one orphan object per picked file, reported as "The archive refused it". See CR-01. |
| 10 | A retry re-runs only failed rows and can never double-count against the limit (04-04 must-have) | ✗ FAILED | `sbRequest` synthesises NETWORK at 12s (1367-1378); `classifyPhotoInsert` (3990-4005) has no NETWORK branch, so a write that landed at second 13 becomes `failed`; `retryFailedFiles` clears `rec.path` (5043) and `runNextFile` mints a fresh uuid (4837). Second object, second row, second slot. See CR-03. |
| 11 | 04-DEVICE-PASS.md records every D-30 line as a checked observation on a real phone (04-05 must-have) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Sheet exists (22.5 KB, tables A-E, preconditions, the A1 portrait row called out as the phase's central claim), `status: pending`, `performed:` empty, 81 `Pending` tokens across 67 rows. Authored honestly as an empty record - the preamble forbids promoting a Pending to a pass by reading source. Deferred by design (`human_verify_mode: end-of-phase`). |
| 12 | The bucket carries a byte-counted 3 MiB ceiling and an `image/jpeg` allow-list, applied by an insert that updates rather than skips (04-05 must-have, D-24) | ✓ VERIFIED | supabase/schema.sql:344-349 - `file_size_limit 3145728`, `allowed_mime_types array['image/jpeg']`, `on conflict (id) do update`. Section 6 comment (307-340) names the ceiling as the only real control and the type list as hygiene, and does not describe either as the other. Owner applied 2026-08-17 and the orchestrator confirmed on the wire: 4 MiB declared image/jpeg refused 413 EntityTooLarge, its public read then 400; text/plain refused 415 InvalidMimeType. |
| 13 | Nothing in this phase adds a read or delete rule; the raw tables stay unreadable to the publishable key (04-05 prohibition) | ✓ VERIFIED | `grep -i "for delete"` over the whole file returns zero. The only `for select` policy is on `storage.objects` for the public bucket (358). `public.photos` gains no select policy. Confirmed live: `public.album` answers, the photos table does not. |
| 14 | The config and copy contract: three config keys documented for a non-programmer, 192 keys per language at identical key sets, zero em/en dashes (CFG-01, CFG-04, LNG-04/05/06, DSG-06) | ✓ VERIFIED | Executed against copy.js: en/it/da each 192 total and 40 `photos.*`; sorted key sets identical across all three; zero U+2013/U+2014 in any of 576 strings. config.js `photos` block carries `opensAt`, `maxEdgePx`, `jpegQuality` each with a plain-language comment, and `opensAt: null` documented as the night-of recovery. |

**Score:** 9/14 truths verified (2 present, behavior-unverified; 3 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app.js` | image pipeline, one XHR, row insert, renderPhotos, renderAlbum | ✓ VERIFIED | 235 KB, `node --check` clean. `function downscaleToJpeg(` at 3774, `function setUploaderState(` at 4224, `function photosOpen(` at 213, `function classifyStorage(` at 3963. All present, substantive and called. |
| `styles.css` | album grid, uploader host, queue transcript, permanence line, retry, quota | ✓ VERIFIED | `.album__frame` (2), `.queue__fill` (5), `.uploader__note` (1), `.uploader[data-state="partial"]` (1), `.uploader__retry` (5), `.album__tile[data-broken]` (1). |
| `copy.js` | 192 keys per language, identical sets | ✓ VERIFIED | Executed and counted - see truth 14. |
| `config.js` | `opensAt`, `maxEdgePx`, `jpegQuality` with owner-facing comments | ✓ VERIFIED | config.js photos block, lines ~210-250. |
| `supabase/schema.sql` | bucket ceiling + type list, header no longer calling the trigger unproven | ✓ VERIFIED | 344-349 and header 40-97. The STATUS block records both the P0001 proof and the 2026-08-17 bucket proof, and the cleanup of the ZZTEST rows and zz-research objects. |
| `04-DEVICE-PASS.md` | D-30 record sheet, filled on a real phone | ⚠️ PRESENT, UNWALKED | Exists and contains `portrait`. Every row Pending. Human item, not a gap (end-of-phase mode). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `applyLanguage()` | `renderPhotos()` | render chain, before `measureNudge()` | ✓ WIRED | app.js:149, with `measureNudge()` still last at 155. |
| `storagePath()` | `STORAGE_PATH_RE` | one contract, both halves | ✓ WIRED | 3850-3862 mints `{yyyy-mm-dd}/{uuid}.jpg`; 3873 anchors the identical shape; applied at 4118 before any count or concatenation. |
| `uploadObject()` | Supabase Storage | XHR POST, `apikey`, `image/jpeg`, 1y cache-control | ✓ WIRED | 3901-3936. `xhr.setRequestHeader('apikey', ...)` at 3908 and no second auth header anywhere in the file. |
| `insertPhotoRow()` | `sbRequest()` | POST `/rest/v1/photos`, `return=minimal` | ✓ WIRED | 4007-4012. |
| `renderAlbum()` | `public.album` | GET `/rest/v1/album`, never the photos table | ✓ WIRED | 4099-4101. One occurrence of `rest/v1/album` in the file; zero of `rest/v1/photos?select`. |
| `runNextFile()` | row fill via `scaleX` | per-file fraction to exactly one row | ✓ WIRED | 4850 passes a per-record closure; `scaleX` present in `setRowProgress`. |
| `renderPhotos()` | `photoBatch` | rebuild skipped while preparing/uploading | ✓ WIRED | 5081-5085 skip guard; 5003-5006 the single flag clear. |
| `photosOpen()` | `config.js photos.opensAt` | one module-scope parse, epoch compare, open on parse failure | ✓ WIRED | `photosOpenMs` (5 occurrences); `photosOpen` 213-216 returns true on NaN. |
| `renderCountdown()` | `renderPhotos()` | existing tick, render only on flip | ✓ WIRED | `syncPhotosGate()` 233-238 called as the first statement of `renderCountdown()` (249). No new interval. |
| `insertPhotoRow()` | the quota body | P0001 -> local count to max -> ladder | ✓ WIRED | 3996 -> 4867 -> `hitQuota` 4905-4908 -> ladder 5109. |
| `retryFailedFiles()` | `photoBatch` | only failed records re-run | ⚠️ PARTIAL | 5036-5046 correctly skips `done` and `refused`. But a server-side-recorded row that timed out is in `failed`, so "already recorded rows are never re-sent" does not hold - see CR-03 / truth 10. |
| `refreshPhotosState()` | `renderAlbum()` | one refetch after a successful upload, nothing else | ✓ WIRED | 4448, called from 4866 on `result === 'ok'` only. `hitQuota` deliberately does not call it (4925-4927). |
| `refreshEnrollmentState()` | `renderPhotos()` | identity fan-out | ✗ NOT WIRED | The link is absent. This is the CR-01 blocker; see truth 9. |
| `schema.sql §6` | live bucket record | owner re-run | ✓ WIRED | Applied 2026-08-17, confirmed on the wire. |
| `schema.sql §4` | `config.js photos.maxPerGuest` | a note tying the literal to the config value | ✓ WIRED | schema.sql:251; config.js:216 points back at schema.sql. |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|----------|---------------|--------|--------------------|--------|
| `renderAlbum` | `res.body` -> `rows` | live GET `/rest/v1/album` | Yes - real PostgREST read, filtered, counted and rendered; no static fallback, no mock | ✓ FLOWING |
| `albumTile` | `row.first_name`, `row.storage_path` | the same read | Yes - `textContent` and `href`/`src` from the row | ✓ FLOWING |
| `buildUploader` remaining count | `photosRemaining()` | `CFG.photos.maxPerGuest` minus `identity.photoCount()` from localStorage | Yes - integers from config and storage | ✓ FLOWING, but stale after an identity change (CR-01) |
| `renderQueue` rows | `photoBatch[]` | the picked `FileList` | Yes - the model is built from real File objects at 4734-4749 | ✓ FLOWING |
| `settleBatch` summary | `photoStatus`, `photoAlert` | computed from record states | Computed correctly, then destroyed before paint on the quota route | ⚠️ HOLLOW - see CR-02 |
| `closedPanel` | `formatOpensAt()` | `photos.opensAt` parsed once at module scope | Yes | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Delivered JS parses | `node --check app.js config.js copy.js` | all three OK | ✓ PASS |
| Copy tables load and are key-identical | `node -e` eval of copy.js, key-set compare | en/it/da 192 each, sorted key sets identical | ✓ PASS |
| No em/en dashes in any string (DSG-06) | same harness, `/[–—]/` scan | 0 violations across 576 strings | ✓ PASS |
| Quota and refusal copy carries no error framing (D-23) | same harness, per-language error-word regex over `photos.full.*` and `photos.refuse.*` | 0 violations in en, it, da | ✓ PASS |
| No `innerHTML`/`insertAdjacentHTML` anywhere | `grep -n "innerHTML\|outerHTML\|insertAdjacentHTML" app.js` | only a comment at 4038 | ✓ PASS |
| No bearer/Authorization header | `grep -ni "authorization\|Bearer" app.js` | only a comment at 1336 | ✓ PASS |
| `guest_id` never reaches DOM, URL or object key | `awk` over lines 3700-5200 | only the POST body at 4008 and the ladder read at 5101; all others comments | ✓ PASS |
| No delete policy in the schema | `grep -i "for delete" supabase/schema.sql` | zero | ✓ PASS |
| End-to-end upload | n/a | no test suite, no build system, no device harness (accepted project property) | ? SKIP - routed to device pass |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| n/a | `find scripts -path '*/tests/probe-*.sh'` | no probe scripts in this project | ? SKIP (none declared, none conventional) |

The one wire-level proof this phase depends on was executed outside the repository by the owner and
the orchestrator against project `aplaxdplwnnlezffatal` on 2026-08-17, and is recorded in the
schema header rather than in a probe script: 4 MiB declared `image/jpeg` refused `413
EntityTooLarge` with its public read answering 400; `text/plain` refused `415 InvalidMimeType`;
`public.album` returning `[]`; nine `zz-research` objects answering 400. Accepted as evidence for
truth 12 on that basis.

### Prohibitions (judgment tier - non-authoritative, human review recommended)

| # | Prohibition | Plan | LLM-judge verdict | Flag |
|---|-------------|------|-------------------|------|
| 1 | MUST NOT publish a `guest_id` anywhere a guest can read it | 04-01 | Holds. `storagePath()` mints a fresh uuid from `newGuestId()` unrelated to the identity; the album query does not ask for the column and the view does not carry it; no data attribute, URL or DOM write touches it. | unverified-prohibition - human review recommended |
| 2 | MUST NOT publish a bearer credential or secret-prefixed key | 04-01 | Holds. `sb_publishable_` key only, travelling in `apikey` on both services; no Authorization header exists in the file. | unverified-prohibition - human review recommended |
| 3 | MUST NOT let a guest- or database-supplied string reach the DOM as markup | 04-01 | Holds. Zero `innerHTML` in app.js; every caption, file name and register line is `createElement` + `textContent` or `setAttribute`. | unverified-prohibition - human review recommended |
| 4 | MUST NOT frame reaching the limit as an error, a failure or an apology in any language | 04-04 | Holds in the copy. Word scan clean across all three languages of the quota and refusal keys. | unverified-prohibition - human review recommended |
| 5 | MUST NOT tell a guest their upload failed when the bytes were accepted | 04-04 | **At risk.** `hitQuota` uses `photos.refuse.server` correctly, but CR-02 means that row is never painted on the route that produces it, and WR-01 means a dropped connection during the insert is reported as "The archive refused it" - the inverse lie. | unverified-prohibition - human review recommended |
| 6 | MUST NOT make the raw enrollments or photos tables readable to the publishable key | 04-05 | Holds. No select policy on `public.photos`; every public read goes through a view. Confirmed live. | unverified-prohibition - human review recommended |

### Requirements Coverage

| Requirement | Source plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| PH-01 | 04-01, 04-02, 04-05 | Guest uploads photos from a phone camera roll, no login | ? NEEDS HUMAN | Full path present and wired (truth 1); hidden `input[type=file][multiple][accept="image/*"]` driven from a real click gesture at 4664-4674. Never exercised on a device. |
| PH-02 | 04-03, 04-04, 04-05 | Limit of 5 per identity with remaining count shown before upload | ✓ SATISFIED | Truths 2 and 3. Local affordance plus the DB trigger as the floor, self-healing via `hitQuota`. |
| PH-03 | 04-01, 04-05 | Uploads land in Storage and are indexed in a table | ? NEEDS HUMAN | Truth 1. Storage-then-row order verified in code; the bucket and table are live and proven, the client path is unexercised. |
| PH-04 | 04-01, 04-04 | Shared album displays all uploads with the uploader's name | ✓ SATISFIED | Truth 7. Caveat WR-05: a tile hidden by `data-broken` is still counted in the head. |
| PH-05 | 04-02, 04-04, 04-05 | Progress, success and failure states, never a silent failure | ✗ BLOCKED | Truth 4. The per-file transcript and both live regions are correct for the whole of a batch and are destroyed at the one settle route that most needs them. |
| PH-06 | 04-01, 04-02, 04-05 | Client-side downscale before upload | ✓ SATISFIED | Truth 5. Caveats WR-03 (no decode timeout) and WR-04 (backing store not released on two failure paths). |
| PH-07 | 04-01, 04-02, 04-05 | File type and size validated before upload starts | ✓ SATISFIED | Truth 6. |
| PH-08 | 04-01, 04-03 | Unconfigured Supabase explains uploads open later instead of erroring | ✓ SATISFIED | Truth 8. |

**Orphaned requirements:** none. The union of the five plans' `requirements` fields covers
PH-01 through PH-08 exactly, and REQUIREMENTS.md maps no additional ID to Phase 4. The
non-PH IDs the plans also claim (ID-05, CD-04, CFG-01/03/04, LNG-01/04/05/06/07/08,
DSG-05/06/07/08, DEL-02/03, V2-01) are cross-phase requirements and are not this phase's
closure contract; ID-05, CFG-01, CFG-04, LNG-04/05/06 and DSG-06 are nonetheless evidenced by
truths 2, 5 and 14, and DEL-02/DEL-03 depend entirely on the unwalked device pass.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| app.js | 4996-4999 | State written then destroyed in the same task | 🛑 Blocker | CR-02. PH-05's guarantee fails at the terminal state. |
| app.js | 2499-2506 | Missing call in a fan-out | 🛑 Blocker | CR-01. Stale gate, stale count, and orphan uploads after "forget this device". |
| app.js | 4837 + 5043 | Non-idempotent write with a retry over it | 🛑 Blocker | CR-03. Duplicate row, duplicate object, double-counted slot. |
| app.js | 3990-4005 | Missing branch in a classifier | ⚠️ Warning | WR-01. A dropped connection is reported as the archive refusing. |
| app.js | 5032-5059 | Guard enforced only by a stylesheet | ⚠️ Warning | WR-02. A retry tap without CSS starts a second concurrent driver. |
| app.js | 3774-3831 | Stated invariant not enforced | ⚠️ Warning | WR-03. No decode timeout; a non-firing `onload`/`onerror` locks the control for the page's life. |
| app.js | 3806, 3810-3814 | Resource not released on two paths | ⚠️ Warning | WR-04. Up to 1600x1600x4 bytes held exactly when the heap is tight. |
| styles.css / app.js | `.album__tile[data-broken]`, 4069, 4126 | Count and display disagree | ⚠️ Warning | WR-05. The head can read one more than the tiles on screen. |
| copy.js, index.html:299 | 9 strings + the section lede | Configurable value hardcoded in copy | ⚠️ Warning | WR-06. Editing `photos.maxPerGuest` makes the site say "five" in three languages while refusing the fourth. |
| supabase/schema.sql | 147-153 | Missing server-side bounds | ⚠️ Warning | WR-07. `photos.name` and `storage_path` are unbounded and unshaped under `with check (true)`, while the sibling table bounds its guest text. |
| app.js | 3913-3920, 4343-4357 | State word advanced by an unmeasurable signal | ⚠️ Warning | WR-08. "Recording" shown for the whole send when progress is not computable. |
| app.js | 4171 | Declared-but-unreachable state | ⚠️ Warning | WR-09. `'full'` is in `UPLOADER_STATES` and nothing can write it. |

**Debt markers:** zero `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` in app.js, copy.js,
styles.css or supabase/schema.sql. The single `XXXXXXXXXXXX` in config.js:158 is an example
WhatsApp invite string in an owner-facing comment, not a debt marker.

### Human Verification Required

#### 1. The device pass

**Test:** Walk all 67 rows of `.planning/phases/04-photos/04-DEVICE-PASS.md` on a real iOS Safari
and a real Android Chrome, serving the working tree from the LAN with `node tools/preview.js`.
**Expected:** Every `Pending` replaced with `Pass`, `Fail` or `Not tested` plus a reason.
**Why human:** No build step, no test suite, no device harness - a locked project constraint. 31 of
the rows are `<human-check>` observations plans 04-01 to 04-04 deliberately deferred here.

#### 2. Table A row A1 - the orientation claim

**Test:** Upload a portrait photograph the iPhone itself took, and an HEIC pick from the camera roll.
**Expected:** Upright, not rotated a quarter turn, not mirrored; the HEIC arrives as a JPEG.
**Why human:** The implementation is the deliberate absence of rotation code. Presence checks can
only confirm no rotation matrix exists; whether the engine reports oriented `naturalWidth`/
`naturalHeight` is settleable on a device only. 04-05 names this the one claim in the design
contract a terminal cannot settle, and the sheet says to stop and record it as blocking if it fails.

#### 3. The six judgment-tier prohibitions

**Test:** Review the Prohibitions table above, in particular item 5.
**Expected:** Owner confirms each must-NOT still holds once the three blockers are closed.
**Why human:** Judgment-tier prohibitions carry a non-authoritative verdict only. Item 5 interacts
directly with CR-02 and WR-01.

#### 4. The twelve backstop truths

**Test:** Render the named Danish and Italian strings at 320px - `photos.cta` on the button,
`photos.permanent`, `photos.closed.body` with a substituted date, `photos.full.body`,
`photos.retry.failed`, `photos.album.empty`, `photos.album.loading`, `photos.gate.body`, the queue
state words beside a wrapped file name, and the quota panel - plus progress on a throttled
connection.
**Expected:** No horizontal scroll, no button wrapping to a second line, no panel overflow.
**Why human:** Declared `verification: backstop` at plan time. No rendering engine here.

### Gaps Summary

The phase built a large, careful and mostly correct surface. The image pipeline, the two service
classifiers, the sequential driver, the eight-state control, the opening gate on the existing clock,
the album read through the view, the copy contract and the bucket limits all verify - and the three
security prohibitions that mattered most (no published `guest_id`, no bearer credential, no string
reaching the DOM as markup) hold on the evidence.

What does not hold is state coordination at three seams, and all three land on requirements this
phase owns:

**The identity seam (CR-01, truth 9)** is the one that touches the phase goal directly. The goal
sentence is "using the identity enrollment already gave them", and the photos section never learns
that the identity changed. In the natural single-session flow - a guest arrives, registers, scrolls
down to Documentation - the section is still showing "Registered students only" and a jump back to a
form they have already filled in. Only a language tap or a reload clears it. The same missing call
makes "forget this device" actively destructive: a standing uploader over a cleared identity spends
the guest's bytes on an object the database will then refuse to reference, once per picked file,
and offers a retry that makes a second set.

**The settle seam (CR-02, truth 4)** breaks PH-05 at the exact moment the requirement exists for.
The counted sentence, the assertive line naming what did not land, and the whole transcript are all
computed correctly and then wiped by `renderPhotos()` in the same synchronous task - no frame is
painted between them. On the overflow route the guest at least saw the refused rows while the
accepted files were uploading; on the server-refusal route they never existed on screen at all, and
files the guest picked disappear with no message. `settleBatch()`'s own comment claims the opposite
of what the code does.

**The idempotency seam (CR-03, truth 10)** is the one the enrollment path already solved and this
one did not. Twelve seconds for a JSON POST on party wifi is the network this phase was written for;
past it, a row that landed is indistinguishable from one that did not, and the retry the phase is
proud of writes a duplicate - two tiles of one photograph in everyone's album, two of five slots
gone, for content the site's own copy says cannot be taken back.

All three are confined to `app.js` and none requires a schema change; WR-01 belongs in the same fix
as CR-03 and is a four-line addition. The nine warnings are real but none of them blocks the goal.

Beyond the gaps, the phase cannot be called done regardless: 67 of 67 device rows are Pending, and
the single most visible way this phase can fail - whether a portrait iPhone photograph lands the
right way up - is by design unanswerable from this terminal.

---

_Verified: 2026-08-17T21:30:00Z_
_Verifier: Claude (gsd-verifier)_
