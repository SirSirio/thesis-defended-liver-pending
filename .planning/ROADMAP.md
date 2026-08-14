# Roadmap: Thesis Defended, Liver Pending

**Granularity:** coarse
**Mode:** yolo, auto-advance
**Phases:** 5

Ordered so the site is shareable as early as possible. Phase 1 alone produces something
that can go in a chat message. Everything after that raises the ceiling.

---

## Phase 1: Skeleton and countdown

**Goal:** A deployed page at the real URL with a working countdown, correct structure, and
the design system in place. Shareable at the end of this phase.

- Static scaffold: `index.html`, `styles.css`, `app.js`, `config.js`. No build step.
- `config.js` with every volatile value and inline documentation (CFG-01 to CFG-04)
- Design tokens from DESIGN-BRIEF.md: palette, type scale, spacing, radii, easing curves
- Fonts self-hosted or loaded with `font-display: swap`, so slow connections still get text
- DTU CourseBase parody structure: header, hero, course fact table, section shells
- Countdown with all three states and timezone handling (CD-01 to CD-06)
- Language toggle with the full IT and EN copy layer (LNG-01 to LNG-05)
- Open Graph tags, favicon, title (DEL-04, DEL-05)
- GitHub Pages deployment from `main` (DEL-01)

**Done when:** the URL loads on a phone, the countdown is correct, both languages work, and
the page looks deliberate rather than unfinished.

---

## Phase 2: Practical information

**Goal:** The core value delivered. A guest outside the building can find the door.

**Requirements:** LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, DEL-02, DEL-03

- Location section: copyable address, keyless maps embed, native map app links (LOC-01 to LOC-05)
- Door video section: inline playback, poster frame, written directions (ACC-01 to ACC-05).
  Note that CONTEXT.md D-12 promotes the written directions from a fallback to always visible
  above the video, which supersedes the earlier wording here deliberately.

- Placeholder handling for both, so the sections read as intentional while details are pending
- Jump link from the top of the page straight to door access (ACC-02)
- Mobile and iOS Safari verification (DEL-02, DEL-03)

**Plans:** 5/5 plans complete

Plans:
**Wave 1**

- [x] 02-01-PLAN.md — Location tracer: real address, copy cascade, Google and Apple handoffs

**Wave 2** *(blocked on Wave 1 completion)*

- [x] 02-02-PLAN.md — Keyless map embed, lazy mount on approach, three slot states

**Wave 3** *(blocked on Wave 2 completion)*

- [x] 02-03-PLAN.md — Access section: written directions in three shapes, practical notes

**Wave 4** *(blocked on Wave 3 completion)*

- [x] 02-04-PLAN.md — Door video slot, pending and error states, jump path, device pass

**Wave 5** *(gap closure, blocked on Wave 4 completion)*

- [x] 02-05-PLAN.md — Make the map fallback reachable on the fast failure network, restore the truthful requirement ledger, and give the D-23 device pass a record sheet

**Done when:** the address and door instructions are findable in seconds on a phone, at
night, on a bad connection.

---

## Phase 3: Enrollment, identity, and the group

**Goal:** The host knows who is coming. Moved ahead of photos because headcount is
time sensitive and photos are not.

> **Gate re-arm:** the workflow runs lean by default (see `config.json`). Before planning this
> phase, switch `code_review`, `security_enforcement`, and `api_coverage_gate` back to `true`.
> This is the first phase that touches real data, row level rules, and a public anon key, so it
> earns the checks that Phases 1, 2, and 5 do not.

- Supabase project setup, tables, row level rules (shared with phase 4)
- Enrollment form: name, guest count, optional note, validation on blur (ENR-01 to ENR-03, ENR-09, ENR-10)
- Enrollment doubles as identity capture, so no separate name prompt exists anywhere (ENR-04, ID-01 to ID-06)
- Returning guest sees their own registration, and can edit or withdraw it (ENR-05, ENR-06)
- Confirmed count as social proof, optional first-name attendee list (ENR-07, ENR-08)
- WhatsApp group handoff, presented the instant enrollment succeeds (WA-01 to WA-06)
- Nudge bar with its two states, plus the deadline framing (NDG-01 to NDG-08)
- Graceful unconfigured state, so this ships before credentials exist (ENR-12)

**Done when:** a guest on a phone enrolls in under 10 seconds, lands in the WhatsApp
group with one more tap, and is never nudged again.

---

## Phase 4: Photos

**Goal:** Guests can upload to a shared album, using the identity enrollment already gave them.

> **Gate re-arm:** keep `code_review`, `security_enforcement`, and `api_coverage_gate` on for this
> phase too. Untrusted file upload from strangers' phones into shared storage is the one genuinely
> hard thing in this project. Slow is correct here.

- Upload flow: client-side downscale, validation, progress, success and failure states (PH-01 to PH-08)
- 5-photo limit with remaining count, keyed to the enrolled identity
- Shared album view with uploader names
- Graceful unconfigured state

**Done when:** a phone can upload five photos and see them in the album, and the sixth is
refused with a joke rather than an error.

---

## Phase 5: Spectacle and polish

**Goal:** The degradation arc, the easter egg, and the pass that makes it good rather than done.

- Degradation arc implemented across the four zones (DSG-04)
- Ambient and scroll motion, particles, the chaos zone
- `prefers-reduced-motion` fallbacks throughout (DSG-05)
- Kahoot time gate and easter egg unlock (KAH-01 to KAH-05)
- Critique pass, then refine. The Iron Law: the first version is a draft.
- Full pre-flight matrix from the design-taste skill (DSG-08)
- Em-dash sweep (DSG-06), contrast verification (DSG-03), footer affiliation line (DSG-09)
- README with the placeholder checklist (DEL-06)

**Done when:** the page is memorable, the practical information is still instant, and the
pre-flight matrix passes clean.

---

## Deferred to owner

These unblock as inputs arrive. None of them gate a phase.

| Input | Unblocks | Until then |
|---|---|---|
| ~~Venue address~~ | ~~LOC-01 to LOC-03~~ | **Resolved 2026-08-13.** Trongårdsvej 46, 2800 Kongens Lyngby, confirmed by the owner and recorded as D-01. Phase 2 ships the location section live rather than as a placeholder. |
| ~~Supabase credentials~~ | ~~ENR-03, PH-03~~ | **Resolved.** In `config.js` and verified, and the schema has since been applied. |
| Door video file | ACC-01 to ACC-03 | Placeholder player, written directions carry the section. Phase 2 builds the whole slot against `videoSrc: null`, so one config line turns it on with no code change. Film it landscape if you can; if you film it portrait, set `door.aspect` and the slot adapts. |
| Entrance, floor, buzzer, parking | Nothing, but it is the highest value input left | `venue.notes` in `config.js`. Every line optional, whole block absent when empty. For a 76 unit kollegium these are what actually get a guest to the right door, more than the video does. |
| Kahoot link | KAH-02, KAH-03 | Unlock mechanism built and testable against a dummy link |
| Confirmed date and time | CD-01 | Currently 2026-10-03 16:00, one line to change |
| WhatsApp group invite link | WA-01 to WA-05 | Handoff built, section hidden until the link exists |
