---
gsd_state_version: '1.0'
status: planning
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 1
  completed_plans: 1
  percent: 20
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-08-13)

**Core value:** A guest standing outside the building in the dark finds the right door in under ten seconds.
**Current focus:** Phase 2 — Practical information

## Current Position

Phase: 2 of 5 (Practical information)
Plan: 0 of 0 in current phase
Status: Ready to plan
Last activity: 2026-08-13 — Phase 1 complete. Scaffold, design system, countdown, both languages, Danish easter egg, link preview image. Scope grew mid-phase to include enrollment, the WhatsApp handoff, and the nudge bar; roadmap restructured to 5 phases.

Progress: [██░░░░░░░░] 20%

## Performance Metrics

**Velocity:**
- Total plans completed: 0
- Average duration: n/a
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**
- Last 5 plans: none yet
- Trend: n/a

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

### Pending Todos

None yet.

### Blockers/Concerns

None blocking. Five owner inputs are outstanding, each with a graceful placeholder:

| Input | Unblocks | Status |
|---|---|---|
| Venue address | Location section | Placeholder |
| Door video file | Access section | Placeholder |
| Kahoot link | Easter egg unlock | Placeholder |
| Confirmed date and time | Countdown target | Provisional 2026-10-03 16:00 |
| Supabase URL and anon key | Enrollment and photo upload | Placeholder, requires free signup |
| WhatsApp group invite link | Group handoff after enrollment | Placeholder, section hidden until set |

Concern: the DTU CourseBase joke lands hardest with classmates and may read as plain institutional design to relatives. Accepted deliberately. The practical information is legible regardless of whether the joke registers.

## Deferred Items

| Category | Item | Status | Deferred At |
|----------|------|--------|-------------|
| *(none)* | | | |

## Session Continuity

Last session: 2026-08-13
Stopped at: Project initialization complete. Planning documents written, GSD config set to yolo with auto-advance.
Resume file: None
