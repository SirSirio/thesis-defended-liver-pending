---
phase: 04-photos
verified: 2026-08-17T23:55:00Z
status: human_needed
score: 12/14 must-haves verified
behavior_unverified: 2
overrides_applied: 0
re_verification:
  previous_status: gaps_found
  previous_score: 9/14
  verified_against: "working tree at commit de5c92a; phase-04 source identical to 1685d55 (git diff 1685d55..HEAD touches zero photos-path lines)"
  gaps_closed:
    - "Every file a guest picked is answered by name, and no picked file is ever dropped without a visible row (PH-05) - CR-02"
    - "The photos section uses the identity enrollment already gave the guest, and follows it when it changes - CR-01"
    - "One batch-level retry re-runs only the failed rows, and a retry can never double-count against the five-photograph limit - CR-03"
  gaps_remaining: []
  regressions: []
  new_warnings:
    - "W-A: the CR-02 fix contradicts 04-UI-SPEC.md in four stated places ('no queue' under the punchline). Spec not amended."
    - "W-B: 04-DEVICE-PASS.md has no row for CR-01's new in-session behaviour and has not been touched since before the fixes."
    - "W-C: supabase/schema.sql section 11 ships in the file and is absent from the database (owner action, honestly documented)."
    - "W-D: renderPhotos() in the enrollment fan-out widens D-12 - an enrollment mutation now refetches the album."
    - "W-E: a lost insert response for a guest who thereby reached five is answered on retry by P0001 before 23505, so the row reads 'This one was not added' for a photograph that was added."
behavior_unverified_items:
  - truth: "A phone can pick photographs and see each one arrive in the album (roadmap Done-when, PH-01/PH-03/PH-04 end to end)."
    test: "Walk 04-DEVICE-PASS.md Tables A to E on a real iOS Safari and a real Android Chrome, serving the working tree over the LAN."
    expected: "Five photographs upload, each becomes a tile carrying the uploader's first name, and the section then shows the quota panel instead of the control."
    why_human: "No build step, no test suite, no device harness - a locked project property. Nothing in the repository exercises pick -> decode -> XHR -> insert -> album read, and 67 of 67 sheet rows read Pending."
  - truth: "A portrait iPhone photograph lands the right way up in the album, and an HEIC pick arrives as a JPEG (D-17 as refined, 04-05 must-have)."
    test: "04-DEVICE-PASS.md Table A rows A1 and A3, on an iPhone, with a photograph the phone itself took."
    expected: "Upright, not rotated a quarter turn, not mirrored, honouring any rotation applied in the phone's Photos app."
    why_human: "The implementation is the deliberate ABSENCE of rotation code. Presence checks can only confirm no rotation matrix exists; whether naturalWidth/naturalHeight report oriented dimensions on the real engine is settleable on a device only."
human_verification:
  - test: "Walk all 67 rows of .planning/phases/04-photos/04-DEVICE-PASS.md on both platforms."
    expected: "Each Pending overwritten with Pass, Fail or Not tested plus a reason."
    why_human: "human_verify_mode is end-of-phase; plans 04-01 to 04-04 deferred 31 <human-check> observations into this sheet and it is entirely unwalked."
  - test: "W-A - the design decision the CR-02 fix took on the owner's behalf. Read 04-UI-SPEC.md line 389, line 876 point 3, line 1159 and line 1165, then look at the quota body the code now builds."
    expected: "Owner either amends the UI-SPEC to permit the carried status line, alert line and transcript under the punchline, or sends CR-02 back to the review's second option (defer the flip)."
    why_human: "The spec says 'Nothing else. No button, no queue' in four places and attributes it to D-23; the code now appends a status line, an alert line and up to five queue rows inside that panel. The spec is self-contradictory (line 1162 requires the refused files be named in queue rows AND the control flip to a body that has none), so a person has to choose which half is binding. This is a taste and contract call, not a correctness call."
  - test: "W-B - add device-pass rows for the three fixed behaviours, then walk them. (1) Register in-session and scroll to the photos section WITHOUT reloading. (2) Press 'forget this device' with the upload control standing, then try to pick. (3) Fail one upload, tap the retry control once."
    expected: "(1) the gate is gone. (2) the control is replaced by the gate and a pick spends no bytes. (3) the album gains exactly ONE tile and the remaining count drops by exactly ONE."
    why_human: "04-DEVICE-PASS.md has not been touched since 13e2927, before any fix landed. Row D11 covers only the reload path; the whole point of CR-01 is the no-reload path, and there is no row for it. Table E rows E3-E7 do cover CR-02 and CR-03."
  - test: "W-C - apply supabase/schema.sql to project aplaxdplwnnlezffatal (Dashboard > SQL Editor > paste the whole file > Run)."
    expected: "photos_name_check and photos_storage_path_check exist on public.photos. Expect the alter to validate existing rows."
    why_human: "Section 11 exists in the repository and nowhere else, which the file's own STATUS block states plainly. Nothing in a terminal can apply it."
  - test: "W-D - confirm the widened reading of D-12 is acceptable: an enrollment mutation (register, amend, discard an edit, withdraw, forget, register again) now rebuilds the photos section, which refetches public.album."
    expected: "Owner accepts a section rebuild as being in the same class as the language chain rather than as a D-12 refetch trigger, or asks for a narrower renderer that skips the album on this path."
    why_human: "D-12 says the album refetches after a successful upload 'and on nothing else'. renderPhotos() already refetched on a language tap and on the open/closed flip before this fix, so the reading was already wider than the sentence; CR-01 widens it further. A judgment call the fixer flagged and did not decide."
  - test: "W-E - review the copy shown in one residual edge case: the insert response is lost on the wire AND that lost insert took the guest to five. The retry's insert then meets the BEFORE INSERT trigger before the unique constraint, so it receives P0001 rather than 23505."
    expected: "Owner accepts, or asks for wording that does not assert 'This one was not added' about a photograph that was added."
    why_human: "Not a double count and not a lost slot - the local count self-heals to five and the album holds one tile for one photograph. Only the sentence on that one row is untrue. It interacts with the 04-04 prohibition 'MUST NOT tell a guest their upload failed when the bytes were accepted' and with device row E9."
  - test: "Judgment-tier prohibition review (6 items across 5 plans) - see the Prohibitions table below."
    expected: "Owner confirms each must-NOT still holds now that the three blockers are closed."
    why_human: "Judgment-tier prohibitions carry a non-authoritative LLM-judge verdict only. Item 5 was 'at risk' in the previous pass; it is now materially better but carries the W-E residue."
  - test: "Backstop truths: 12 long-text / overflow claims declared verification: backstop across the five plans, PLUS one the CR-02 fix newly invalidated - 04-UI-SPEC.md line 1165 argued the quota panel's only overflow axis is the copy itself because it carries no queue. It now can."
    expected: "Each renders without overflow or wrapping at 320px in the named language, including the quota panel with a five-row transcript and a long Danish file name under it."
    why_human: "Declared non-inferable at plan time; no rendering engine in this environment. Device row E10 covers photos.full.body only and predates the transcript."
---

# Phase 4: Photos Verification Report

**Phase Goal:** Guests can upload to a shared album, using the identity enrollment already gave them.
**Done when:** a phone can upload five photos and see them in the album, and the sixth is refused with a joke rather than an error.
**Verified:** 2026-08-17T23:55:00Z
**Status:** human_needed
**Re-verification:** Yes - after gap closure. Previous: gaps_found, 9/14.

## What was verified against

The working tree at commit `de5c92a`. Two phase-03 commits (`0ffbfc1`, `de5c92a`, a WhatsApp
glyph and invitation card) landed in `app.js` **during** this verification pass and moved every
phase-04 line number by +54. `git diff 1685d55..HEAD -- app.js` filtered to photos-path
identifiers returns **zero** changed lines, so the code under verification is exactly as the
thirteen fix commits left it. All line numbers below are HEAD's.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A phone picks photographs and each becomes an object, a row and a tile (PH-01, PH-03, roadmap Done-when, first clause) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Whole chain present and wired, unchanged by the fixes except for the better: `validateFile`, `downscaleToJpeg` (now with a 20s settling timer at 3915 and `release()` on all four paths), `storagePath`, `uploadObject` 3995, `insertPhotoRow` 4152, `renderAlbum` 4237. Storage-then-row order (D-19) intact at 5145/5155. Nothing in the repository exercises it; 67/67 device rows Pending. |
| 2 | Five per guest with the remaining count shown before the picker (PH-02) | ✓ VERIFIED | `photosMaxPerGuest()` 4392 reads `CFG.photos.maxPerGuest` (config.js:237 = 5, never a literal); `photosRemaining()` 4399 = `max(0, max - stored)`. Regression check after WR-06 touched config.js: value unchanged, now carrying a three-file warning naming schema.sql section 4 and the three copy keys. |
| 3 | The sixth is refused with a joke rather than an error (roadmap Done-when, second clause; PH-02, D-23) | ✓ VERIFIED | Ladder at 5437 selects `full`; `quotaPanel()` 4757 still leads with `photos.full.title` + `photos.full.body` and still renders no control and no remaining count. Copy re-executed across all three languages: 192 keys each, key sets identical, 0 em/en dashes, 0 error/failed/sorry (and it/da equivalents) in `photos.full.*` and `photos.refuse.*`. The joke is intact. What now follows it is the CR-02 carry - see W-A. |
| 4 | No picked file is ever dropped without a visible row; the batch always ends in a named answer (PH-05) | ✓ VERIFIED (was FAILED) | **CR-02 closed, behaviourally proven.** `settleBatch()` 5237 now hands `{status, alert, batch, announced}` to module-scope `photoQuotaSummary` at 5306 across the swap; `renderPhotos()` clears it only when the body is not `full` (5479); `quotaPanel(photoQuotaSummary)` 5497 renders it. Driving the shipped `settleBatch` source with stubs: an overflow batch (2 landed, 3 refused) survives the wipe with `photos.status.partial {ok:2,bad:3}`, `photos.refuse.extra {n:3}` and **all five rows** (same array identity as the picked batch, while module `photoBatch` is emptied to 0). A server-refusal batch (0 landed, 5 refused) survives with `{ok:0,bad:5}` and five rows. Driving the shipped `quotaPanel` source: joke, then the counted sentence, then a `role="alert"` line created empty and filled on the next frame, then five named `queue__row`s carrying their reasons. The false comment is corrected in place (5288-5296: "That sentence used to be false"). |
| 5 | Every file is re-encoded to JPEG at `maxEdgePx`/`jpegQuality` before a byte reaches the network, and is never upscaled (PH-06, D-16) | ✓ VERIFIED | `Math.min(1, ...)` cap and `toBlob(..., 'image/jpeg', quality)` unchanged. WR-03/WR-04 strengthened it: `var timer = setTimeout(finish(null,'photos.err.decode'), 20000)` at 3915, cleared in `finish()` at 3920; `release()` defined at 3892 and called on the `!ctx` branch, the `drawImage` catch, and both encoder-callback returns. No rotation matrix anywhere. |
| 6 | Type, size and zero-byte checks all run before the decode (PH-07, D-21) | ✓ VERIFIED | The CR-01 guard was inserted ABOVE the validation loop, so ordering is unchanged: the whole picked list is walked at 5047-5062 and only then does 5074 call `runNextFile()`. Behaviourally confirmed - with a healthy identity the trace is `renderQueue -> preparing -> VALIDATE -> VALIDATE -> runNextFile`. |
| 7 | The album displays uploads with the uploader's name, read through `public.album` (PH-04) | ✓ VERIFIED | `renderAlbum` 4237: GET `/rest/v1/album?select=first_name,storage_path,created_at`, 8000ms, silent on failure (D-14). Rows filtered through `STORAGE_PATH_RE` 4277 before being counted. WR-05 fix verified: the head node is held (4297), `tileBroken()` decrements `shown` and rewrites it in place via the new `albumHeadText()` 4171, falling to the empty sentence at zero. Count and tiles can no longer disagree. |
| 8 | With Supabase unconfigured the section explains uploads open later instead of erroring (PH-08) | ✓ VERIFIED | Ladder 5420: `!sbConfigured() \|\| !IDENTITY_OK` -> `pending`, returning above the album. Unchanged by the fixes. |
| 9 | The photos section uses, and follows, the identity enrollment gave the guest (phase goal clause) | ✓ VERIFIED (was FAILED) | **CR-01 closed, both halves.** Half one: `renderPhotos()` is now the last statement of `refreshEnrollmentState()` at **app.js:2514**, and all eight enrollment mutation sites (2751, 2812, 2822, 2880, 2888, 2924, 3134, 3203) funnel through that one function - `forgetIdentity()` 2912 among them at 2924. Half two: the guard at **app.js:5009**, driven behaviourally against the shipped `runBatch` source. Healthy identity -> validate -> `runNextFile`. `{guest_id:null,name:null}`, `{guest_id:'g-1',name:''}` and `{guest_id:null,name:'Ada'}` each produce **exactly one call, `renderPhotos`**: `validateFile` is never touched, `runNextFile` is never reached, `photoBatch` ends at length 0. The failure mode the gap named - a pick after `forgetIdentity()` uploading bytes and POSTing `guest_id: null` - is structurally unreachable. |
| 10 | A retry re-runs only failed rows and can never double-count against the limit (04-04 must-have) | ✓ VERIFIED (was FAILED) | **CR-03 closed, all four parts.** (a) `var path = rec.path \|\| storagePath()` at **5132**, `rec.path = path` at 5137 - minted once per record. (b) `retryFailedFiles()` 5343 no longer nulls `rec.path`; 5365-5370 says so in as many words. (c) The 23505 branch is at **4133, a sibling `if` after the P0001 branch at 4122, not nested inside it** - confirmed by reading and by execution: P0001 still returns `limit` and 23505 returns `ok`, as two distinct outcomes. (d) `storageDuplicate(xhr)` 4068, consumed at `uploadObject` **4031** as `settle({ok:true, duplicate:true})`, so the retry's object write can reach the insert at all. 13/13 behavioural cases pass, including the negative ones: a 413 EntityTooLarge and a 415 InvalidMimeType body are NOT read as duplicates. WR-01's `NETWORK` branch is present at 4141, and WR-02's model-level busy guard at 5357. |
| 11 | 04-DEVICE-PASS.md records every D-30 line as a checked observation on a real phone (04-05 must-have) | ⚠️ PRESENT_BEHAVIOR_UNVERIFIED | Sheet exists, `status: pending`, `performed:` empty, 81 Pending tokens across 41 numbered rows in tables A-I (67 observations). Unchanged since `13e2927`, which predates every fix commit. Table E rows E3-E7 happen to cover CR-02 and CR-03 well; **nothing covers CR-01's new no-reload behaviour** (row D11 is the reload path only). See W-B. |
| 12 | The bucket carries a byte-counted 3 MiB ceiling and an `image/jpeg` allow-list, applied by an insert that updates rather than skips (04-05 must-have, D-24) | ✓ VERIFIED | schema.sql section 6 untouched by the fixes: `file_size_limit 3145728`, `allowed_mime_types array['image/jpeg']`, `on conflict (id) do update`. Applied by the owner 2026-08-17 and proved on the wire (4 MiB declared image/jpeg -> 413 EntityTooLarge, its public read -> 400; text/plain -> 415 InvalidMimeType). |
| 13 | Nothing in this phase adds a read or delete rule; the raw tables stay unreadable to the publishable key (04-05 prohibition) | ✓ VERIFIED | Regression check after WR-07 added section 11: `grep -i "for delete"` still returns zero, and section 11 (schema.sql:618-628) contains only two `alter table ... add constraint ... check (...)` statements. No policy, no grant, no view. `public.photos` still has no select policy. |
| 14 | The config and copy contract: three config keys documented for a non-programmer, 192 keys per language at identical key sets, zero em/en dashes (CFG-01, CFG-04, LNG-04/05/06, DSG-06) | ✓ VERIFIED | Re-executed against copy.js at HEAD: en/it/da 192 total and 40 `photos.*` each; sorted key sets identical across all three; 0 U+2013/U+2014 across 576 strings. config.js still carries `opensAt`, `maxEdgePx`, `jpegQuality` with owner-facing comments, and `maxPerGuest` now carries WR-06's three-file warning. |

**Score:** 12/14 truths verified (2 present, behavior-unverified; 0 failed)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `app.js` | image pipeline, one XHR, row insert, renderPhotos, renderAlbum, the three fixes | ✓ VERIFIED | 5594 lines, `node --check` clean. Every function the fixes claim is present at the line cited, substantive, and reached: `storageDuplicate` 4068 (called 4031), `albumHeadText` 4171 (called 4181, 4303, 4304), `quotaPanel(summary)` 4757 (called 5497), the guard 5009, the path reuse 5132, the busy guard 5357. |
| `styles.css` | album grid, uploader host, queue transcript, quota, and CR-02's one new rule | ✓ VERIFIED | `#photos-body[data-body="full"] .panel__lede + * { margin-top: var(--s-5); }` at 2315, paired with the existing zeroing rule at 2303. `.uploader__status` 2164, `.uploader__alert` 2176, `.queue` 2193 and `.queue__*` are all unscoped class selectors, so the carried lines and transcript genuinely inherit the control's styling inside `.panel`. WR-09's three stale counts corrected. |
| `copy.js` | 192 keys per language, identical sets | ✓ VERIFIED | Re-executed. Untouched by the fixes (WR-06 was closed in config.js by design). |
| `config.js` | `opensAt`, `maxEdgePx`, `jpegQuality` with owner-facing comments | ✓ VERIFIED | Plus WR-06's warning on `maxPerGuest` naming schema.sql section 4 and the three copy keys, with the consequence spelled out. |
| `supabase/schema.sql` | bucket ceiling + type list, applied; new bounds honestly marked | ⚠️ PARTIAL BY DECLARATION | Sections 1-10 applied and proved. Section 11 (618-628) is in the file and not in the database, and says so twice - in a `NOT YET APPLIED` paragraph in the STATUS block (99-120) and in the section header (580-584). The regex in `photos_storage_path_check` matches `STORAGE_PATH_RE` (app.js:3963) character for character. Honest, not hollow - but W-C stands. |
| `04-DEVICE-PASS.md` | D-30 record sheet, filled on a real phone | ⚠️ PRESENT, UNWALKED, NOW STALE | Every row Pending, and the sheet predates the fixes. See W-B. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `refreshEnrollmentState()` | `renderPhotos()` | identity fan-out | ✓ WIRED (was NOT WIRED) | app.js:2514, last in the fan-out, with an eleven-line comment stating why. All eight mutation sites confirmed to funnel through it. **This was the CR-01 blocker.** |
| `runBatch()` | the ladder | identity guard before any decode | ✓ WIRED (new) | app.js:5009. Behaviourally proven to spend zero bytes on three distinct drift shapes. |
| `settleBatch()` | `quotaPanel()` | `photoQuotaSummary` carried over the body swap | ✓ WIRED (new) | 5306 -> 5479 (retained on `full`, cleared otherwise) -> 5497. Behaviourally proven to survive `photoBatch` being emptied, by array identity. **This was the CR-02 blocker.** |
| `runNextFile()` | `retryFailedFiles()` | one object key per record, not per attempt | ✓ WIRED (was PARTIAL) | 5132 mints only when `rec.path` is unset; 5343-5370 no longer clears it. **This was the CR-03 blocker.** |
| `uploadObject()` | `storageDuplicate()` | a re-upload to the same key answers ok | ✓ WIRED (new) | 4031. Without this the retry could never reach the insert, which is the part the fixer added beyond the review's list and the part the fix genuinely needs. |
| `classifyPhotoInsert()` | `hitQuota()` / `done` | P0001 -> limit, 23505 -> ok, NETWORK -> network | ✓ WIRED | 4122 / 4133 / 4141, three sibling branches. Behaviourally proven distinct. |
| `renderAlbum()` | `albumHeadText()` | broken tile decrements the stated count | ✓ WIRED (new) | 4171 / 4297-4305. In-place `textContent` rewrite, never a re-append. |
| `applyLanguage()` | `renderPhotos()` | render chain | ✓ WIRED | app.js:149, unchanged. |
| `renderAlbum()` | `public.album` | GET `/rest/v1/album`, never the photos table | ✓ WIRED | 4258-4260. |
| `schema.sql §11` | live database | owner run | ✗ NOT APPLIED (declared) | In the file only. Honestly documented; see W-C. |
| `app.js STORAGE_PATH_RE` | `schema.sql photos_storage_path_check` | one path shape, now in three places | ✓ WIRED | app.js:3963 and schema.sql:626 are the same shape (`\d` vs `[0-9]`). Both files say the three halves move in one commit. |

### Data-Flow Trace (Level 4)

| Artifact | Data variable | Source | Produces real data | Status |
|----------|---------------|--------|--------------------|--------|
| `renderAlbum` | `res.body` -> `rows` | live GET `/rest/v1/album` | Yes - real PostgREST read, filtered, counted, rendered. No static fallback | ✓ FLOWING |
| `albumTile` | `row.first_name`, `row.storage_path` | the same read | Yes | ✓ FLOWING |
| `buildUploader` remaining count | `photosRemaining()` | config + localStorage | Yes, **and no longer stale after an identity change** - the fan-out rebuilds the control, and `syncUploaderLanguage()` 5013 re-seats the figure from the model | ✓ FLOWING (was stale) |
| `renderQueue` rows | `photoBatch[]` | the picked `FileList` | Yes | ✓ FLOWING |
| `quotaPanel` transcript | `photoQuotaSummary.batch` | the same records, carried by reference across the swap | Yes - proven by array identity while `photoBatch` is emptied | ✓ FLOWING (was ⚠️ HOLLOW) |
| `quotaPanel` two lines | `summary.status`, `summary.alert` | `{key, vals}` objects captured before the wipe | Yes - rendered through `phrase()`, so they also survive a language tap | ✓ FLOWING (was ⚠️ HOLLOW) |

### Behavioral Spot-Checks

Executed against the **shipped source**, by extracting each function's own text from `app.js`
and driving it with stubs standing in for the module scope it closes over. No re-implementation.

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Delivered JS parses | `node --check app.js config.js copy.js` | all three OK | ✓ PASS |
| CR-03 classifier: P0001 and 23505 are distinct outcomes | drive `classifyPhotoInsert` over 6 inputs | null->server, ok->ok, P0001->**limit**, 23505->**ok**, NETWORK->**network**, 42501->server. 6/6 | ✓ PASS |
| CR-03 duplicate detection is broad but not indiscriminate | drive `storageDuplicate` over 7 xhr shapes | 409 outer, statusCode 409, statusCode 23505, `error:'Duplicate'` all true; **413 EntityTooLarge false, 415 InvalidMimeType false, unparseable body false**. 7/7 | ✓ PASS |
| CR-02 A: overflow batch (2 landed, 3 refused) survives the flip | drive `settleBatch` with a stubbed `renderPhotos` that empties the model exactly as the real ladder does | summary non-null; status `photos.status.partial {ok:2,bad:3}`; alert `photos.refuse.extra {n:3}`; **5 rows retained while module `photoBatch` reads 0**; same array identity | ✓ PASS |
| CR-02 B: server refusal, four files still waiting | same harness | summary non-null; alert `photos.status.partial {ok:0,bad:5}`; 5 rows retained | ✓ PASS |
| CR-02 C: all five landed | same harness | summary `null` - the quota lede answers it, by design (`bad > 0` guard at 5306) | ✓ PASS (judged: nothing was dropped, so PH-05 has nothing to report) |
| CR-02 D: partial that does not reach the allowance | same harness | `renderPhotos` not called; the control keeps its status, its alert and its retry | ✓ PASS |
| CR-02 render: what the guest actually reads | drive `quotaPanel(summary)` and `quotaPanel(null)` against a DOM stub | With a summary: joke, lede, `.uploader__status`, `.uploader__alert[role=alert]` **created empty with 1 rAF queued**, then `ol.queue` with five `queue__row`s carrying names, state words and reasons. Without: joke and lede only | ✓ PASS |
| CR-01 guard: a drifted identity spends no bytes | drive `runBatch` over 4 identity shapes | healthy -> `...preparing -> VALIDATE -> VALIDATE -> runNextFile`. All three drift shapes -> **`renderPhotos` and nothing else**, `photoBatch` length 0 | ✓ PASS |
| Copy contract | eval copy.js, count and compare | 192/192/192, 40 photos.* each, key sets identical, 0 em/en dashes | ✓ PASS |
| Quota and refusal copy carries no error framing (D-23) | per-language regex over `photos.full.*`, `photos.refuse.*` | 0 violations in en, it, da | ✓ PASS |
| No `innerHTML` anywhere | `grep -n "innerHTML\|outerHTML\|insertAdjacentHTML" app.js` | two comments only (3341, 4190), zero assignments | ✓ PASS |
| No bearer/Authorization header | `grep -ni "authorization\|bearer" app.js` | one comment at 1336 | ✓ PASS |
| Debt markers in phase files | `grep -nE "TBD\|FIXME\|XXX\|TODO\|HACK\|PLACEHOLDER"` over app.js, config.js, copy.js, styles.css, schema.sql, index.html | zero | ✓ PASS |
| End-to-end upload on a device | n/a | no test suite, no build system, no device harness (accepted project property) | ? SKIP - routed to the device pass |

### Probe Execution

| Probe | Command | Result | Status |
|-------|---------|--------|--------|
| n/a | `find scripts -path '*/tests/probe-*.sh'` | no probe scripts in this project | ? SKIP (none declared, none conventional) |

The wire-level proofs this phase depends on were executed outside the repository by the owner
against project `aplaxdplwnnlezffatal` on 2026-08-17 and are recorded in the schema STATUS block:
4 MiB declared `image/jpeg` refused `413 EntityTooLarge` with its public read answering 400;
`text/plain` refused `415 InvalidMimeType`; `public.album` returning `[]`; nine `zz-research`
objects answering 400. Accepted as evidence for truth 12. **Section 11 carries no such proof and
claims none.**

### Prohibitions (judgment tier - non-authoritative, human review recommended)

| # | Prohibition | Plan | LLM-judge verdict | Flag |
|---|-------------|------|-------------------|------|
| 1 | MUST NOT publish a `guest_id` anywhere a guest can read it | 04-01 | Holds. `storagePath()` mints a fresh uuid unrelated to the identity; the album query does not ask for the column; no data attribute, URL or DOM write touches it. The CR-02 carry renders file names and copy keys only. | unverified-prohibition - human review recommended |
| 2 | MUST NOT publish a bearer credential or secret-prefixed key | 04-01 | Holds. `sb_publishable_` key in `apikey` on both services; no Authorization header exists. | unverified-prohibition - human review recommended |
| 3 | MUST NOT let a guest- or database-supplied string reach the DOM as markup | 04-01 | Holds. Zero `innerHTML` assignments. The new `queueRow` calls inside `quotaPanel` use the same `createElement` + `textContent` path. (Noted: the concurrent phase-03 `waGlyph()` work clones an inert `<template>` rather than assigning markup, so it does not breach this either.) | unverified-prohibition - human review recommended |
| 4 | MUST NOT frame reaching the limit as an error, a failure or an apology in any language | 04-04 | Holds in the copy, and the joke still leads the panel. **New surface:** the quota body can now carry `photos.err.network` ("The connection dropped") directly beneath the punchline when a batch both filled the allowance and lost a file. That is an honest answer for the lost file rather than a framing of the limit, but it is a tonal juxtaposition a person should look at. | unverified-prohibition - human review recommended |
| 5 | MUST NOT tell a guest their upload failed when the bytes were accepted | 04-04 | **Materially improved, one residue.** Was "at risk" on two counts: CR-02 meant the declined row was never painted (now painted, proven above) and WR-01 meant a dropped connection read as "The archive refused it" (now `photos.err.network`, verified at 4141). The residue is W-E: a lost insert response that itself took the guest to five is answered on retry by P0001 before 23505, so that one row says "This one was not added" about a photograph that was. No double count, no lost slot - one untrue sentence. | unverified-prohibition - human review recommended |
| 6 | MUST NOT make the raw enrollments or photos tables readable to the publishable key | 04-05 | Holds. Section 11 adds two check constraints and no policy. Every public read still goes through a view. | unverified-prohibition - human review recommended |

### Requirements Coverage

| Requirement | Source plans | Description | Status | Evidence |
|-------------|--------------|-------------|--------|----------|
| PH-01 | 04-01, 04-02, 04-05 | Guest uploads photos from a phone camera roll, no login | ? NEEDS HUMAN | Truth 1. Path present and wired; hidden `input[type=file][multiple][accept="image/*"]` driven from a real click gesture. Never exercised on a device. |
| PH-02 | 04-03, 04-04, 04-05 | Limit of 5 per identity with remaining count shown before upload | ✓ SATISFIED | Truths 2, 3 and 10. Local affordance, DB trigger as the floor, self-healing via `hitQuota`, **and a retry that can no longer spend a second slot on one photograph** (13/13 behavioural cases). |
| PH-03 | 04-01, 04-05 | Uploads land in Storage and are indexed in a table | ? NEEDS HUMAN | Truth 1. Order verified in code, bucket and table live and proven, client path unexercised. |
| PH-04 | 04-01, 04-04 | Shared album displays all uploads with the uploader's name | ✓ SATISFIED | Truth 7. The prior caveat (a hidden broken tile still counted in the head) is closed by WR-05. |
| PH-05 | 04-02, 04-04, 04-05 | Progress, success and failure states, never a silent failure | ✓ SATISFIED (was BLOCKED) | Truth 4, proven on both quota routes. Also strengthened by WR-08 (an unmeasurable upload no longer claims "Recording") and WR-03 (a non-firing decode can no longer strand the control for the page's life). The one open question is presentational, not behavioural - W-A. |
| PH-06 | 04-01, 04-02, 04-05 | Client-side downscale before upload | ✓ SATISFIED | Truth 5. Prior caveats WR-03 and WR-04 both closed. |
| PH-07 | 04-01, 04-02, 04-05 | File type and size validated before upload starts | ✓ SATISFIED | Truth 6. |
| PH-08 | 04-01, 04-03 | Unconfigured Supabase explains uploads open later instead of erroring | ✓ SATISFIED | Truth 8. |

**Orphaned requirements: none.** The union of the five plans' `requirements` fields is
PH-01..PH-08 exactly (04-01: PH-01/03/04/06/07/08; 04-02: PH-01/05/06/07; 04-03: PH-02/08;
04-04: PH-02/04/05; 04-05: PH-01/02/03/05/06/07), and REQUIREMENTS.md lines 81-88 map no ninth
PH id to Phase 4. The non-PH ids the plans also claim (ID-05, CD-04, CFG-01/03/04,
LNG-01/04/05/06/07/08, DSG-05/06/07/08, DEL-02/03, V2-01) are cross-phase and are not this
phase's closure contract; DEL-02 and DEL-03 depend entirely on the unwalked device pass.

### Anti-Patterns Found

Every 🛑 Blocker from the previous pass is gone. All nine ⚠️ Warnings from 04-REVIEW.md are
closed in code. What follows is new or residual.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `04-UI-SPEC.md` vs `app.js` | spec 389, 876, 1159, 1165 vs app.js 4805-4812 | Code contradicts a binding contract, contract not amended | ⚠️ Warning (W-A) | The spec says the quota body carries "no queue" in four places and attributes it to D-23; `quotaPanel()` now appends a status line, an alert line and up to five queue rows. The spec is itself self-contradictory (line 1162 requires the refused files be named in queue rows and then flip to a body with none), which is what produced CR-02. Owner decision. |
| `04-DEVICE-PASS.md` | whole sheet | Human-verification sink not updated for the fixes | ⚠️ Warning (W-B) | Last touched at `13e2927`, before any fix. No row exercises CR-01's no-reload behaviour; row D11 is the reload path only. Tables E3-E7 do cover CR-02 and CR-03. |
| `supabase/schema.sql` | 618-628 | Shipped in the file, absent from the database | ⚠️ Warning (W-C) | `public.photos` still accepts an unbounded `name` and an unshaped `storage_path` from any holder of the publishable key. Documented honestly in two places; needs one owner action. |
| `app.js` | 2514 | A stated decision widened without a recorded amendment | ⚠️ Warning (W-D) | D-12 says the album refetches after a successful upload "and on nothing else". Six enrollment mutations now rebuild the section, and a rebuild ends in `renderAlbum()`. Bounded, user-initiated, not polling - but D-12 was not amended. |
| `app.js` | 4122 before 4133 | Correct ordering with an untrue sentence in one edge case | ⚠️ Warning (W-E) | Lost insert response + that insert took the guest to five -> the retry meets the BEFORE INSERT trigger first, receives P0001, and the row reads "This one was not added". The ordering is right (a guest at the maximum must read as at the maximum); only the copy is wrong, for one row, in one case. |
| `config.js` | 237 + copy.js | Configurable value still hardcoded in nine copy strings | ℹ️ Info (W-F) | WR-06 was deliberately closed by documentation rather than parameterisation, to protect the copy's voice. The review sanctions this branch; the owner may not. |
| `app.js` | 4324 / 5306 | Object retention | ℹ️ Info (W-G) | `photoQuotaSummary` holds up to five `File` handles for the life of the quota body (until the identity changes or the page reloads). OS-backed handles, not decoded bitmaps. |

**Debt markers:** zero `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` across app.js, config.js,
copy.js, styles.css, supabase/schema.sql and index.html.

### Human Verification Required

See the `human_verification` block in the frontmatter for the seven items in full. In priority
order:

1. **The device pass** - 67 rows, entirely unwalked, including the one row (Table A row A1, portrait
   iPhone orientation) that no terminal can settle and that the sheet itself names as the phase's
   blocking finding if it fails.
2. **W-A, the UI-SPEC contradiction** - the only fix that took a design decision on the owner's
   behalf. Amend the spec or send CR-02 back to the deferral option.
3. **W-B** - add three device-pass rows for the fixed behaviours before walking the sheet, or the
   pass will certify the phase without ever exercising CR-01.
4. **W-C** - run `supabase/schema.sql` so section 11 exists somewhere other than the repository.
5. **W-D**, **W-E**, the six judgment-tier prohibitions, and the thirteen backstop truths (twelve
   declared at plan time plus the one the CR-02 fix invalidated at UI-SPEC line 1165).

### Gaps Summary

**No gaps. All three prior blockers are genuinely closed, and I did not take the fix report's word
for any of them.**

**CR-01** was the only one that touched the phase goal sentence directly, and it is closed on both
halves rather than one. `renderPhotos()` is the last statement of `refreshEnrollmentState()`
(app.js:2514), and I checked that this is in fact the single funnel it claims to be: all eight
enrollment mutation sites route through that one function, `forgetIdentity()` included. The guard
at app.js:5009 I did not merely read - I extracted `runBatch`'s own source and drove it. A healthy
identity walks to `runNextFile`; `{null,null}`, a blank name and a blank guest_id each produce
exactly one call, `renderPhotos`, with `validateFile` never touched and the batch array emptied.
The failure mode named in the gap - a pick after "forget this device" that uploads bytes and POSTs
`guest_id: null` - cannot happen.

**CR-02** is closed, and the half of the question the gap flagged as a judgment call is answered
defensibly. Driving the shipped `settleBatch` with a stub that empties the model exactly as the
real ladder does, the summary survives by array identity: five rows still in the summary while
`photoBatch` reads zero. Driving the shipped `quotaPanel` against a DOM stub, the guest reads the
joke, then "2 recorded, 3 not.", then an assertive line created empty and filled on the next frame,
then all five files by name with their reasons. The all-landed case carries nothing, and I judge
that correct: PH-05 asks that no picked file be disposed of without an answer, and when every file
landed there is nothing to answer for - the lede says so in the section's own voice and the album
below is the proof. The comment that used to claim the opposite of what the code did now says so
explicitly.

**CR-03** is closed on all four parts, and the fourth - `storageDuplicate` - is the one the review
did not ask for and without which the other three would have deadlocked at the object write. The
two branches that matter I proved distinct by execution rather than by reading: P0001 still returns
`limit` and 23505 returns `ok`, as sibling branches at 4122 and 4133, so a duplicate can never be
silently re-reported as "you are at the limit". The duplicate detector is broad by design and I
checked the negatives too: a 413 EntityTooLarge and a 415 InvalidMimeType - the exact two refusals
the owner proved live on this bucket - are not read as duplicates.

What is left is not correctness. It is one design decision the fix made unilaterally, one
verification sheet that no longer covers what it needs to, and one SQL section that exists in a file
and not in a database.

**W-A is the one to actually decide.** 04-UI-SPEC.md says of the quota body, in four separate
places and with D-23 attached, "Nothing else. No button, no queue." The fix puts a status line, an
alert line and up to five queue rows there. The review anticipated exactly this collision and
offered the other branch (defer the flip); the fixer rejected it for a stated reason - a deferred
flip leaves a control standing with a remaining count of zero and an enabled pick button, which the
same spec forbids on the same page. Both branches breach the spec, because the spec asks for two
things that cannot both be true in one synchronous task: refused files named in queue rows, and a
terminal body with no queue. The fix chose the guest over the contract, which I think is the right
choice, and then did not amend the contract, which is not. A side effect: the spec's own backstop
argument at line 1165 ("the only overflow axis is the copy itself, since it carries no control, no
queue and no grid") is no longer true, and device row E10 tests only the copy.

**W-B matters more than its severity suggests.** 04-DEVICE-PASS.md has not been touched since
before the first fix commit. Table E happens to cover CR-02 and CR-03 well - E7 is precisely the
overflow-to-quota scenario and E5 is precisely "counted once per photograph, not once per attempt".
But CR-01's whole point is the no-reload path, and the only identity row in the sheet, D11, begins
"Clearing the stored name **and reloading**". Walk the sheet as it stands and the phase gets
certified without anyone ever testing the fix that touched the goal sentence.

**W-C is unchanged from the fix report's own admission** and is stated twice in schema.sql itself.
Sections 1-10 are applied and proved on the wire; section 11 is not, so `public.photos` still
accepts a name of any length and a path of any shape from any holder of the publishable key. The
file is honest about it, which is the difference between a warning and a gap.

The phase goal is achieved in code. It is not yet achieved on a phone, and 67 Pending rows plus the
five owner decisions above are what stands between the two.

---

_Verified: 2026-08-17T23:55:00Z_
_Verifier: Claude (gsd-verifier)_
