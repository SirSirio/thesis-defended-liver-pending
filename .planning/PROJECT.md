# Thesis Defended, Liver Pending

## What This Is

A single-page invitation site for Sirio's master's graduation party, styled as a mock DTU
institutional course page. Guests open it from a link in a chat, find out when and where
the party is, watch a short video showing which door to actually use, and upload photos
into a shared album. It is dark, heavily animated, and deadpan funny.

Published as a static site on GitHub Pages at
`sirsirio.github.io/thesis-defended-liver-pending`.

## Core Value

**A guest standing outside the building in the dark finds the right door in under ten
seconds.** Everything else on the site is decoration around that.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Enrollment form, so the host knows who is actually coming
- [ ] Huge countdown to 3 October 2026, 16:00, with automatic before / during / after states
- [ ] Address as copyable text, keyless Google Maps embed, and native map app links
- [ ] Door access video, playing inline on iOS Safari
- [ ] Photo upload to a shared album, 5 per person, no login
- [ ] Persistent visitor identity via `localStorage`, name asked once
- [ ] Italian and English copy behind a language toggle
- [ ] Kahoot link hidden until a time gate or an easter egg unlocks it
- [ ] DTU-parody dark design with the degradation arc described in DESIGN-BRIEF.md
- [ ] Single config file holding every volatile value

### Out of Scope

- Real authentication — a party does not need accounts, and the owner explicitly ruled it out
- Server-side anything — GitHub Pages is static, and adding a backend adds a thing that can break the week of the party
- Cryptographically hiding the Kahoot link — page source is public, and "fun to find" is the actual goal
- Hard enforcement of the 5-photo limit — soft limits are correct for this audience
- Reproducing DTU's official logo or implying any DTU affiliation

## Context

- The owner graduated from DTU (Technical University of Denmark). The parody is of his own
  alma mater, which is why it reads as affectionate rather than as impersonation.
- The joke depends on DTU CourseBase being instantly recognisable to a chunk of the guest
  list. Classmates will find it funnier than relatives, and that asymmetry is acceptable.
- Guest list is mixed Italian and international, mixed technical ability, mostly on phones
  on mobile data.
- The owner has limited time and does not want to review work in detail. Decisions get made
  and defaults get chosen without asking. Iteration over pre-approval.

## Constraints

- **Static hosting only.** No server process, no build-time secrets. Dynamic behaviour runs
  in the browser or against a service that accepts direct browser calls.
- **Supabase free tier** for photo storage and the album index. The anon key ships in public
  JS by design, protected by row-level rules.
- Mobile-first. Assume a mid-range phone on mobile data, at night, possibly outdoors.
- No build step if reasonably avoidable. Fewer moving parts means fewer failures in the week
  before the party.
- The date is provisional and will likely change. Every volatile value lives in one config
  file, editable without touching application code.
- The site must look finished and be shareable while address, video, Kahoot link, and
  Supabase credentials are still placeholders.

## Open Items

Not blockers. Each has a graceful placeholder.

| Item | Needed for | Owner |
|---|---|---|
| Venue address | Maps embed, map links | Sirio |
| Door access video file | Access section | Sirio |
| Kahoot game link | Easter egg unlock | Sirio |
| Confirmed date and start time | Countdown target | Sirio |
| Supabase project URL and anon key | Photo upload | Sirio (free signup) |
