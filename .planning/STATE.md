---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 04
current_phase_name: photos
status: executing
stopped_at: Phase 4 UI-SPEC approved
last_updated: "2026-08-15T22:32:20.240Z"
last_activity: 2026-08-27
last_activity_desc: Quick task 260827-dvr, the door video is live
progress:
  total_phases: 3
  completed_phases: 2
  total_plans: 19
  completed_plans: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-13)

**Core value:** A guest standing outside the building in the dark finds the right door in under ten seconds.
**Current focus:** Phase 04 — photos

## Current Position

Phase: 04 (photos) — EXECUTING
Plan: 1 of 5
Status: Executing Phase 04
Last activity: 2026-08-17 — Completed quick task 260817-txl: save the date, mobile menu, motion layer

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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 260817-txl | Save the date as the hero anchor, add to calendar, full screen mobile menu, GSAP motion layer | 2026-08-17 | 6ff3d3c | [260817-txl-frontend-motion-and-save-the-date](./quick/260817-txl-frontend-motion-and-save-the-date/) |
| 260827-dvr | The door video arrives: denoised 3.3 MB encode, poster frame at the courtyard, two config lines | 2026-08-27 | 49ac19f | [260827-dvr-door-video-arrives](./quick/260827-dvr-door-video-arrives/) |
| 260817-ulc | Five second DTU-to-dynamic morph announced by a peristaltic dispense, responsive aura, album split into own photos plus a gallery with a lightbox, progressive disclosure, course index sheet, sideways scroll fixed | 2026-08-17 | 38799b7 | [260817-ulc-course-index-sheet-and-progressive-discl](./quick/260817-ulc-course-index-sheet-and-progressive-discl/) |

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
