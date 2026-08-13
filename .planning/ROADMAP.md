# Roadmap: Thesis Defended, Liver Pending

**Granularity:** coarse
**Mode:** yolo, auto-advance
**Phases:** 4

Ordered so the site is shareable as early as possible. Phase 1 alone produces something
that can go in a chat message. Everything after that raises the ceiling.

---

## Phase 1 — Skeleton and countdown

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

## Phase 2 — Practical information

**Goal:** The core value delivered. A guest outside the building can find the door.

- Location section: copyable address, keyless maps embed, native map app links (LOC-01 to LOC-05)
- Door video section: inline playback, poster frame, written fallback directions (ACC-01 to ACC-05)
- Placeholder handling for both, so the sections read as intentional while details are pending
- Jump link from the top of the page straight to door access (ACC-02)
- Mobile and iOS Safari verification (DEL-02, DEL-03)

**Done when:** the address and door instructions are findable in seconds on a phone, at
night, on a bad connection.

---

## Phase 3 — Photos and identity

**Goal:** Guests can upload to a shared album without an account.

- `localStorage` identity: name prompt, UUID, persistence, reset, private-browsing fallback (ID-01 to ID-06)
- Supabase project setup, storage bucket, index table, row-level rules
- Upload flow: client-side downscale, validation, progress, success and failure states (PH-01 to PH-08)
- 5-photo limit with remaining count
- Shared album view with uploader names
- Graceful unconfigured state, so this ships before credentials exist

**Done when:** a phone can upload five photos and see them in the album, and the sixth is
refused with a joke rather than an error.

---

## Phase 4 — Spectacle and polish

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
| Venue address | LOC-01 to LOC-03 | Placeholder, section states it is pending |
| Door video file | ACC-01 to ACC-03 | Placeholder player, written directions carry the section |
| Kahoot link | KAH-02, KAH-03 | Unlock mechanism built and testable against a dummy link |
| Confirmed date and time | CD-01 | Currently 2026-10-03 16:00, one line to change |
| Supabase credentials | PH-03, PH-04 | Upload UI built, shows "opens later" state |
