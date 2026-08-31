---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 04.1
current_phase_name: the-upload-rebuilt
status: complete
stopped_at: v24 live. Full session record in .planning/quick/260831-adm-plus-one-admin-and-pocket-clock/. Android still awaits a first-pick retest (force the portal open from admin.html to test before the day).
last_updated: "2026-08-31T12:15:00.000Z"
last_activity: 2026-08-31
last_activity_desc: v22 plus one + admin, v23 pocket clock + album door, v24 takeaway lede. See quick/260831-adm for the whole of it. All proved untrusted-position and in real Chrome.
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 19
  completed_plans: 19
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-13)

**Core value:** A guest standing outside the building in the dark finds the right door in under ten seconds.
**Current focus:** Phase 04 — photos

## Current Position

Phase: 04.1 (the upload rebuilt) — COMPLETE
Plan: 2 of 2 shipped
Status: The uploader is a card that joins the page's data-awake softening, its transcript
reads as chips, and one video per guest of up to 60 seconds and 50 MB is LIVE end to end.
Migration applied 2026-08-28 and proved on the wire from the untrusted position.

Live video facts a new session must know:
  - photos.kind exists, defaulted 'photo'. The fifteen original rows are photos.
  - The storage path contract lives in FOUR places, not three: storagePath() and
    STORAGE_PATH_RE in app.js, STORAGE_PATH_RE in album.js, and photos_storage_path_check
    in the database. Change one, change all four, in one commit.
  - The bucket is 50 MiB and accepts image/jpeg, video/mp4, video/quicktime.
  - enforce_photo_limit raises TWO names: photo_limit_reached and video_limit_reached.
    Both are P0001, so the client separates them on the message, which is our own token.
  - Nothing is re-encoded. There is no build step, so the bucket ceiling is the only real
    size control.

Progress: [██████████] 100%

## Live status

**The site is deployed and public.** Read this before assuming anything is hypothetical.

| Thing | State |
|---|---|
| Live URL | https://sirsirio.github.io/thesis-defended-liver-pending/ verified serving over HTTPS, all assets 200 |
| GitHub Pages | Active, deploying from `main` at repo root. `.nojekyll` committed. |
| Repo | `SirSirio/thesis-defended-liver-pending`, all work pushed, working tree clean |
| Supabase | Project `aplaxdplwnnlezffatal` wired into config.js. **Schema applied and verified 2026-08-13.** `enrollments`, `photos` and the `attendees` view all exist and respond. Phase 3 is unblocked and testable against a live database. |
| Supabase RLS, verified | Guest can enroll (201). Raw `enrollments` reads back `[]` even holding rows, so notes stay private to the host. `attendees` view exposes first name and guest count only. Anonymous delete is refused. Note that both `[]` on a blocked read and `204` on a blocked delete look like success, so verify by inserting a row and querying after, never by status code alone. |
| Supabase key | `sb_publishable_` key, verified active by differential test. The old service_role key was exposed in chat and the owner has since disabled it. |
| Local preview | `Preview locally.cmd`, or `node tools/preview.js`, serves at 127.0.0.1:4173 |
| Pages | TWO guest facing. `index.html` is the invitation. `album.html` is the shared album, added 2026-08-18, with its own `album.css` and `album.js`. The invitation links to it from the nav, the deck tile and the photos section, and holds no gallery of its own. |
| Diagnostics | `check.html`, added 2026-08-28, **linked from nothing and not a guest surface**. The owner opens it on a device where the uploader refuses a file and it prints what the browser said: name, type, size, the decode and the re-encode as separate outcomes, the `MediaError` code, and which codecs this browser owns. A copy button puts the report on the clipboard. It touches no network at all, which is verified by the harness rather than asserted, and it deliberately does not load `styles.css`. See `.planning/quick/260828-rfd-why-a-file-is-refused/`. |
| The Android refusals, NAMED BY THE DEVICE 2026-08-28 21:55 UTC | The owner's `check.html` report on a 2.55 MB JPEG taken seconds earlier: **`NotReadableError: permission problems that have occurred after a reference to a file was acquired`**. The phone handed over a file handle and refused the bytes. Google Photos' content provider (numeric file names like `1000112036.jpg`) does this intermittently with Chromium, for pictures and video alike, which is the whole "sometimes works". Now: reads are **retried five times over ten seconds** in both upload paths and in `check.html`; a sentence `photos.err.unreadable` tells the guest to pick through Files or the gallery; and **`public.diagnostics`** (write-only for anon, proved: insert 201, select 42501, delete 401) receives one record per refused or failed row from the uploader and the whole report from `check.html`'s **Send** button. **Read that table first from now on**: `select * from public.diagnostics order by created_at desc`. |
| The Android "cannot upload" report, RESOLVED BY THE LOGS 2026-08-28 | The owner reported their Android refusing both pictures and video while an iPhone took both. Two sessions guessed at formats. **The Supabase edge logs show the phone (Chromium 151, Ecosia) uploaded 7 of 7 files that day, every `POST /rest/v1/photos` answered 201, every tile was fetched, and the owner then removed every one with `delete_own_photo`, ten calls in all.** The "same video accepted sometimes, not others" is the one video per person rule refusing the second copy of a video already on record. The refusals that DID happen were client side and never touched the network, so only `check.html` on that phone can name them. **Rule for the next session: when the owner reports an upload failure, read the edge logs by user agent FIRST** (`query_logs`, source `edge_logs`, filter `request.headers.user_agent`), before touching a line of code. Successes and removals are visible there; client refusals are not. |
| JPEG passthrough | Since 2026-08-28: when a JPEG by signature cannot be decoded or re-encoded on the phone, the original bytes are uploaded as they are, under `photos.originalMaxMb` (15). A JPEG can no longer be refused as "could not open" unless the phone will not hand over the bytes at all. Proved: undecodable 200 KB JPEG lands at its own size; a 20 MB one is still refused; a real JPEG is still re-encoded smaller; text named `.jpg` is still refused. |
| HEIC | **Decoded by the site itself since 2026-08-28.** libheif as WebAssembly in `assets/vendor/` (`libheif.js` 81 KB + `libheif.wasm` 1.0 MB, LGPL-3.0, licence beside it). Loaded only when the browser's own decode fails AND the file's bytes carry a HEIF brand, so Safari and every JPEG never fetch it. The result goes through the same 1600px JPEG encode as every photograph, so storage and the album are untouched. Fetched under the same `?v=` as `app.js`, read off its own script tag. The wasm is fetched by hand and passed as `wasmBinary` because this build compiles synchronously. `accept="image/*"` is still never widened. See `.planning/quick/260828-hef-any-picture-is-a-picture/`. |
| THE UPLOAD PIPELINE, REBUILT 2026-08-29: one read, then never the File again | The Android evidence (nine `unreadable` refusals on v17 including a video that had uploaded twice, while one JPEG still landed) showed the real flaw: the uploader read a picked File **four different ways** (`<img>` from a blob URL, `<video>` from a blob URL, `FileReader` on 32 and 16 byte **slices**, the XHR upload of the File) and refused at the first that failed, and on Android those do not succeed or fail together. Now `acquireBytes()` fetches the bytes **once, whole, never sliced**, through a ladder of three readers (`FileReader`, `fetch()` of a blob URL, `File.arrayBuffer()`), retried five times over ten seconds, and everything after works on the copy in memory: `sigOf()`, `downscaleToJpeg({buf,file})` from an in-memory Blob, `probeVideo()` from an in-memory Blob with `mp4DurationFromBuffer()` as its fallback, the upload of the same bytes. When every reader refuses, the element is handed the File directly exactly as before the rebuild, and only if that fails too is `photos.err.unreadable` shown. After a refusal that names the phone, a second control opens the Files picker (an input with no accept), and every beacon carries picker: media or files, so the table can show whether the two Android pickers read differently. The ladder waits thirty seconds and the status line says it is waiting for the phone. The last four files read (64 MB cap) are kept in memory keyed by name, size and modification time, so a re-pick after a removal never asks the phone twice; proved with pick, remove, re-pick under total refusal. The beacon carries the ladder's record (`read.via`, `read.tries`, `read.errors`) and the signature. Proved in 13 cases across four simulated provider behaviours. See `.planning/quick/260829-mem-one-read-then-memory/`. |
| Video duration | Read from the **container** in memory, not only from the decoder. `mp4DurationFromBuffer()` walks the ISO base media boxes to `mvhd`, so a browser missing a codec no longer refuses a clip whose bytes are fine. The `<video>` element still runs first and still decides everything it decided before; the container is asked only on the branch that would otherwise refuse. The one minute rule is still enforced either way, proved at 59s accepted against 62s refused with no decoder involved. |
| Course number | **31026** since 2026-08-28, encoding the whole date 3/10/26. Changed everywhere a guest sees it, including the re-rendered og-image.png. **The `c03102.` localStorage prefix and the `c03102:` event names were deliberately NOT changed**: that prefix is every guest's identity key, and renaming it would orphan every registration and every uploaded photograph. config.js says so where somebody would go looking. |
| Own-photo recovery | `public.my_photos(uuid)` is live. The removal strip is drawn from `photo_paths` in the browser, and `addPhotoPath()` did not exist until 2026-08-18, so everything uploaded before that left a count and no path: five of the fifteen rows, across two guests, were unremovable by the people who uploaded them. The client now asks the server once per load, and only when it holds fewer paths than its count. Verified live against Miao's real guest_id: empty strip to five frames with five working Remove controls. |
| Asset versions | `?v=24` on every asset in all pages including `check.html` and `admin.html` (bumped 2026-08-31, the takeaway lede). **Bump this on every deploy** or phones serve stale files for ten minutes. `index.html` itself carries no version and is cached 600s by GitHub Pages, so a hard refresh is needed to see a new deploy. |
| THE PLUS ONE, NAMED, AND +2 REMOVED (2026-08-31, v22) | `maxGuestsPerPerson` is 1. Choosing 1 reveals a required name field (`#enrol-plusone`, hidden via the field wrap when the count is 0, typed value preserved). Wire: `plus_one_name` on the insert, `p_plus_one` on `amend_enrollment` (empty string clears, exactly as the note; **the old six-argument function was DROPPED** — two overloads with defaults break PostgREST). `public.attendees` appends `plus_one_first` (first token only) and the proof list renders it as a person. Storage adds the `plus_one` key. Schema section 12. |
| THE ADMIN AND THE SCHEDULE (2026-08-31, v22) | `photos.opensAt` restored: uploads open 2026-10-03 16:00 Copenhagen. `admin.html` — unlisted, linked from nothing, noindex — takes a PIN held only as a bcrypt hash in `public.admin_secret` (RLS, no grants; **rotation SQL is in schema section 13**). RPCs, all PIN-checked server side: `admin_ok`, `admin_set_uploads` (writes `public.settings.uploads_override`: open / closed / null=schedule), `admin_remove_photo` (deletes the row; the page then deletes the object via the storage API under the "orphans only" delete policy — the only door that purges the CDN; a live object with a row cannot be deleted by anon, proved). Every guest page reads `settings` at load + every 5 minutes and obeys the override in both directions; a failed fetch leaves the schedule in charge; the admin-paused state has its own copy key `photos.paused.body`. **The PIN is NOT in this repo.** It was handed to the owner in chat on 2026-08-31; to retest the Android before the party, open admin.html, force Open now, test, set back to Follow the schedule. |
| THE POCKET CLOCK AND THE ALBUM DOOR (2026-08-31, v23) | The scheduled-closed photos panel carries a small countdown (`.minicd`, hero clock grammar at pocket size, reuses the hero's countdown.* label keys, updated by `tickMiniCountdown()` on the existing 1s tick). Absent under the admin pause and the open portal. The album page's Add yours ships `hidden`; `album.js syncAddYours()` shows it only when schedule+override say the portal takes something, schedule read synchronously so no flash. |
| THE DEAD PICK BUTTON AND THE RE-PICK, FIXED 2026-08-29 (v21) | The e8a3a82 deploy shipped `function openPicker(){ input.value=''; openPicker(); }` — it called itself instead of `input.click()`, so the first tap recursed to a stack overflow and no picker opened. That is the "last deploy broke the pick button entirely". One line. Fixed to `input.click()`. Second: the re-pick-after-delete refusal the owner reported on the rebuild. `bytesCache` keyed on `name|size|lastModified`, but the diagnostics prove the refusing phone does not report a file stably between picks, so the key missed exactly when the cache was the whole point. Re-keyed `name|size` (`bytesKey()`). Third: the Files door (`data-alt`) now persists per device via `store.set('altpicker','1')`, read back in `buildUploader()`, so a phone refused once shows the door from the first render after a reload. Fourth: reader ladder cut from 30s/8 passes to ~15s/6 passes (`report.tries > 5`, delays `[500,1000,2000,4000,7000]`) because the phone never relents on later passes. All four verified in real Chrome (Android profile, wire stubbed): 8 pipeline cases pass, 3 pages/2 viewports clean, deploy confirmed on the wire. **The one thing still unproven is a first pick on the actual phone**: the cache and the door mitigate it, but Google Photos' provider refusing the first read is the platform's, not the site's. |
| Photo removal | **Live and security verified 2026-08-18.** `public.delete_own_photo(uuid, text)` is applied. Proved from the untrusted position with the publishable key: a wrong guest_id returns 0 and leaves the row, the right one returns 1, a replay returns 0, anon cannot read `public.photos` (42501) and cannot DELETE against it (401). |
| Supabase MCP | `.mcp.json` at the repo root, project scoped, plus `enabledMcpjsonServers` in `.claude/settings.local.json`. A session can apply migrations directly after the owner authenticates once through `/mcp`. No secret is stored: project_ref is already public and auth is per user OAuth. |

## What phase 1 actually shipped

Files at repo root: `index.html`, `styles.css`, `app.js`, `config.js`, `copy.js`,
plus `assets/`, `supabase/schema.sql`, `tools/preview.js`.

- Mock DTU CourseBase structure: topbar with the 03102 badge, hero, course fact table, learning objectives, and placeholder sections for enrollment, location, access and photos
- Countdown with three automatic states, fixed timezone offset, tab-visibility resync
- Three complete languages (EN default, IT, DA), 93 keys each, verified at parity, English fallback for any gap
- Enrollment section shell, registration deadline, and the two-state nudge bar
- Link preview image, favicon, Open Graph tags

**Conventions a new session must follow:** every volatile value goes in `config.js`
and nowhere else. All copy goes in `copy.js`, in all three tables. Zero em dashes
in anything the guest sees. Placeholders must read as deliberate, never as broken.
Read `.planning/DESIGN-BRIEF.md` before writing any UI.

## Gotcha worth knowing

`enrollmentReady()` in app.js gates the nudge bar on `#enrol-form` existing in the
page, not on Supabase credentials being present. Credentials alone caused the live
site to nudge guests toward a placeholder. Phase 3 renders that form and the bar
activates itself. Do not replace this with a config flag.

## Performance Metrics

**Velocity:**

- Total plans completed: 5
- Average duration: n/a
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 02 | 5 | - | - |

**Recent Trend:**

- Last 5 plans: none yet
- Trend: n/a

**Per-Plan Metrics:**

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 02 P02 | 17m | 3 tasks | 3 files |
| Phase 02 P03 | 13m | 2 tasks | 4 files |
| Phase 02 P04 | 16m | 3 tasks | 5 files |
| Phase 02 P05 | 5m | 3 tasks | 6 files |

## Accumulated Context

### Decisions

- Init: **GitHub Pages, static, no build step.** Fewer moving parts before the party outweighs developer convenience.
- Init: **Supabase free tier** for photo storage. Only third-party service that takes direct browser uploads with a free tier and a two-value setup.
- Init: **Keyless Google Maps iframe embed** instead of the Maps JavaScript API. No API key, no billing account, no key in public source.
- Init: **`localStorage` identity, no auth.** Owner ruled out login. Soft 5-photo limit accepted as a consequence.
- Design: **DTU CourseBase parody** chosen by the owner over four proposed aesthetics. The party is presented as DTU course 03102.
- Design: **Dark theme locked page-wide**, DTU red `#990000` as the single accent, `#E83F48` for red text where contrast requires it.
- Design: **Degradation arc** from institutional to unhinged down the page. Resolves the tension between "crazy animation" and "guests must find the address".
- Design: **English, Italian and Danish toggle**, English primary, jokes written natively per language.
- Phase 1: **Danish promoted from easter egg to full language** at the owner's request. The classmates the parody targets hardest are Danish, so shipping them four strings and a shrug wasted the best part of the joke. All three tables verified at identical key sets.
- Design: **No DTU logo, no implied affiliation.** Footer states it is a personal invitation, in both languages.
- Phase 1: **Enrollment added to scope** at the owner's request, replacing the "Registration: not required" joke with a real form. Framed as course registration, which the parody was already pretending to be.
- Phase 1: **Enrollment and identity are one feature.** The form captures the name, so no separate "what is your name" prompt exists anywhere on the site, and photo attribution comes free.
- Phase 1: **Enrollment moved ahead of photos** in the roadmap. Headcount is time sensitive, photos are not.
- Phase 1: **WhatsApp handoff fires on enrollment success**, the moment a guest is most willing to tap one more thing. One config value, one tap, no QR code.
- Phase 1: **Nudge bar has exactly two states**, and stops permanently once a guest is enrolled. Escalation happens in the copy as the deadline nears, never in the frequency.
- Phase 1: **Countdown breaks the display size ceiling** from the design skill, deliberately. The brief asked for huge, and it is the reason people open the page.
- Phase 2: **The map slot is a persistent sibling of `#loc-data`**, so a language switch never remounts a loaded map or buys a second copy of the tiles on mobile data.
- Phase 2: **IntersectionObserver is guarded and degrades to an eager mount.** A missing capability degrades to early, never to absent.
- Phase 2: **The map blocked state at 8000ms is a message swap only.** The frame is never torn down, so a load at second twelve still resolves to a live map.
- Phase 2: **Written directions are always visible, above the video, never merely its fallback** (D-12). Text is read faster than video loads on a bad signal outdoors, and it still works on the evening the video does not.
- Phase 2: **A pending panel that titles itself gets no heading above it.** With `door.directions` null the panel carries the block, which reconciles the ACC-04 resolved edge against the UI contract instead of picking one of them.
- Phase 2: **`renderAccess()` re-appends the access pending panel as an interim placeholder** in the video position, so the commit landing between waves 3 and 4 is deployable on its own. Plan 04 deletes that line as it adds the real video slot.
- Phase 2: **Note labels are translated, note values are not.** Labels live in copy.js so a Danish guest never meets an English one, values stay verbatim from config.js in every language, and the config comment says so plainly.
- Phase 2: **The video slot renders at the configured ratio on every path.** The unconfigured panel and the player are the same box, so the day the owner sets one config line the video appears and nothing on the page moves.
- Phase 2: **playsinline and muted are set as attributes and as properties in one construction path**, so neither can ship without the other. Either alone fails inline playback on iOS Safari, which is the single behaviour this phase most needed.
- Phase 2: **Both video failure paths land on the same phase 1 pending panel**, absent file and broken path alike, and nothing is written to the console. To a guest a missing file and an unmade file are one event; the owner catches the difference in config.js.
- Phase 2: **The two jumped-to sections are focusable and the focus ring is suppressed for the pointer case only**, so a tap does not paint a ring around a whole section while a keyboard jump still shows where it landed.
- Phase 2: **An iframe load event proves a document arrived and nothing more.** `data-state="ready"` was redefined from 'the map is ready' to 'a document arrived', so the map guidance was promoted out of the conditional waiting layer into an always present caption, and the load handler no longer cancels the 8000ms fallback.
- Phase 2: **The map fallback caption holds its box in every state**, hidden by visibility and never removed from flow, so the moment the map paints nothing below it moves. The reserved gap while mounting and blocked is the deliberate price of the D-09 no reflow guarantee.
- Phase 2: **WR-04's frame.clientHeight check was rejected.** The frame is absolutely positioned at inset 0 with height 100%, so it measures the slot and is non-zero for Google's error page exactly as for a working map. It would close the gap on paper and leave it open in fact.
- Quick 260827-dvr: **The door clip is re-encoded rather than shipped as filmed.** Aerial
  footage over foliage is worst case for H.264, so a routine CRF 25 pass came out larger than
  the 8.7 MB source. Denoising before scaling cut it to 3.3 MB at 960x540 with the door, the
  wall sign and the bicycles all still legible. The slot is 327 CSS pixels wide on a phone, so
  720p was never being resolved anyway, and the guest paying for it is standing outdoors on
  mobile data.

- Quick 260827-dvr: **The poster frame is the destination, not the first frame.** With
  `preload="metadata"` the poster is all most guests ever see of the clip, and the opening
  frame is a dim road junction 300 metres from the door.

- Phase 2: **Requirement checkboxes are derived per ID from the verification report**, never from the summaries or from how complete the code looks. Nine phase 02 IDs checked, three left unchecked pending the D-23 device pass recorded on 02-DEVICE-PASS.md.
- Quick 260818-rmv: **One row deleted and zero rows deleted are one answer.** `delete_own_photo` returns a count and the site treats 1 and 0 identically. Distinguishing them would turn the RPC into a way to ask whether a given storage path belongs to a given guest_id, and those ids are the whole credential scheme.
- Quick 260818-rmv: **The guest_id is the credential, the storage path is not.** Paths are public URLs and every guest who opened the album holds all of them, so the function requires the pair to match a row and `public.album` still carries no guest_id (T-04-01 holds).
- Quick 260818-rmv: **The removal control lives only in the strip under the uploader**, never in the shared album, and the frame and the removal are separate hit targets rather than one target with a corner hotspot.
- Quick 260818-rmv: **The album is a page, not a section** (`album.html`). Submitting is a task and looking is not, and the two were sharing one screen. What is left on the invitation is a door that fetches nothing to draw itself.
- Quick 260818-rmv: **album.js is a second script rather than a reuse of app.js**, and the duplicated contracts (request helper, path validator, URL builder, language resolver) are named in its header. If one changes in app.js it changes here in the same commit.
- Quick 260818-rmv: **Dead render calls are deleted, not left null-guarding.** The reload bug was one dead call surviving a refactor, so the album machinery was removed from app.js rather than left pointing at an element that no longer exists.
- Quick 260818-rmv: **The album page opens already awake.** The five second DTU mask is the invitation's joke and is paid for by its hero; re-running it would hold a guest's photographs behind an animation they have already seen.
- Quick 260818-rmv: **The reveal animates transform and opacity only.** A blur or desaturate reveal was the obvious move and was declined: filter animation over forty tiles repaints the whole grid every frame on the phone the page exists for.
- Quick 260818-rmv: **A pump is legible only when the whole system is present.** Blur budget was never the problem. A reservoir it draws from, a rotor plate that makes rotation readable, and rollers drawn ON the tube rather than beside it are what made it read.
- Quick 260818-rmv: **Tubing hangs, it does not traverse.** The needle hangs in the same column as the head and the drop falls straight down onto the right hand end of the date. Routing it to the centre made the tube cross the headline, which this file had now done twice.

### Pending Todos

None yet.

### Blockers/Concerns

None blocking. Six owner inputs are tracked and four are still outstanding, each with a
graceful placeholder:

| Input | Unblocks | Status |
|---|---|---|
| Venue address | Location section | Set. config.js:44, confirmed per D-01 |
| Door video file | Access section | **Set 2026-08-27.** `assets/door.mp4`, config.js:108, quick task 260827-dvr |
| Written door directions | Access section. The fast path on a weak signal, per D-12 | Placeholder. config.js:120, door.directions is null |
| Kahoot link | Easter egg unlock | Placeholder |
| Confirmed date and time | Countdown target | Provisional 2026-10-03 16:00 |
| WhatsApp group invite link | Group handoff after enrollment | Placeholder, section hidden until set |

Supabase is fully set up. Credentials are in `config.js`, the schema is applied, and
row level rules are verified against the live database. Sections 7 and 8 (the
`withdrawn` column and the `amend_enrollment` security definer function) were applied
by the owner on 2026-08-15 and verified on the wire: the function answers `0` / HTTP 200
for an unknown guest id, the `attendees` view still projects only first name, plus one
count and joining date, and `enrollments` still returns `[]` to the publishable key.

The `ZZTEST DeleteMe` rows were removed by the owner on 2026-08-15 as the closing act of
plan 03-06, and the removal was proved through the public view rather than the blocked
table. No outstanding database cleanup.

Concern: the DTU CourseBase joke lands hardest with classmates and may read as plain institutional design to relatives. Accepted deliberately. The practical information is legible regardless of whether the joke registers.

Concern: quick task 260817-txl reshaped the hero, replaced the mobile navigation and added a
motion layer, all verified in a desktop browser at phone viewports and none of it on a real
phone. `pointer: coarse` touch targets, iOS Safari's collapsing toolbar against the nudge bar,
whether the `.ics` blob download opens the iOS calendar import sheet, and GSAP frame rates on an
older Android are the four things emulation cannot answer. A device pass is owed before
invitations go out.

Concern: quick task 260818-rmv added a whole second page, rebuilt the opening instrument and
changed the hero, and **none of it has been seen at real frame rates**. The headless browser
used for verification runs GSAP's ticker at roughly 1.5 frames per second, so every still
produced was a forced frame. Geometry, event timing and DOM state are verified. The rotor's
1.15s revolution, whether the album holds frame rate with forty tiles on an older Android, and
whether the lightbox swipe fights iOS Safari's edge back gesture, are not. The device pass owed
above now covers both tasks.

Concern, open and reported by the owner: something white moving up the sides during the opening
reads as buggy. Diagnosed as `tinyRing` in `dispensing()` (motion.js), the 287px expanding
circles each falling droplet leaves behind. The owner elected to keep the droplet system as it
is, so this is **unresolved by choice, not by oversight**. Removing only the rings while keeping
the drops is a one line change.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260817-txl | Save the date as the hero anchor, add to calendar, full screen mobile menu, GSAP motion layer | 2026-08-17 | 6ff3d3c | [260817-txl-frontend-motion-and-save-the-date](./quick/260817-txl-frontend-motion-and-save-the-date/) |
| 260827-dvr | The door video arrives: denoised 3.3 MB encode, poster frame at the courtyard, two config lines | 2026-08-27 | 49ac19f | [260827-dvr-door-video-arrives](./quick/260827-dvr-door-video-arrives/) |
| 260817-ulc | Five second DTU-to-dynamic morph announced by a peristaltic dispense, responsive aura, album split into own photos plus a gallery with a lightbox, progressive disclosure, course index sheet, sideways scroll fixed | 2026-08-17 | 38799b7 | [260817-ulc-course-index-sheet-and-progressive-discl](./quick/260817-ulc-course-index-sheet-and-progressive-discl/) |
| 260818-rmv | A guest can remove their own photograph, uploads appear without a reload, the album becomes its own page, the pump gets a reservoir and rollers that read, the course gets a name and a face | 2026-08-18 | 7834786 | [260818-rmv-delete-own-photo-and-standalone-album](./quick/260818-rmv-delete-own-photo-and-standalone-album/) |
| 260831-adm | Named plus one and no +2, opensAt 16:00 party day, admin.html with PIN (portal override + remove any photo), pocket countdown in the closed panel, album door that knows the hour, the takeaway lede | 2026-08-31 | a2ba702 | [260831-adm-plus-one-admin-and-pocket-clock](./quick/260831-adm-plus-one-admin-and-pocket-clock/) |

### Roadmap Evolution

- Phase 04.1 inserted after Phase 4: The upload rebuilt: one minute of video, and an interface that is not a form (URGENT)

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-15T21:46:50.656Z
Stopped at: Phase 4 UI-SPEC approved
Resume file: .planning/phases/04-photos/04-UI-SPEC.md

**To resume in a fresh session:** read this file, then PROJECT.md, ROADMAP.md and
DESIGN-BRIEF.md, then run `/gsd-plan-phase 2`. Phase 2 is location and door video,
and it is fully unblocked: both are built against placeholders in `config.js`, so
neither the venue address nor the video file is needed to complete the work.
