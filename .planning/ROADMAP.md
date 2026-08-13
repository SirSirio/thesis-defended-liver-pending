# Roadmap: Thesis Defended, Liver Pending

**Granularity:** coarse
**Mode:** yolo, auto-advance
**Phases:** 5

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

## Phase 3 — Enrollment, identity, and the group

**Goal:** The host knows who is coming. Moved ahead of photos because headcount is
time sensitive and photos are not.

- Supabase project setup, tables, row level rules (shared with phase 4)
- Enrollment form: name, guest count, optional note, validation on blur (ENR-01 to ENR-03, ENR-09, ENR-10)
- Enrollment doubles as identity capture, so no separate name prompt exists anywhere (ENR-04, ID-01 to ID-06)
- Returning guest sees their own registration, and can edit or withdraw it (ENR-05, ENR-06)
- Confirmed count as social proof, optional first-name attendee list (ENR-07, ENR-08)
- WhatsApp group handoff, presented the instant enrollment succeeds (WA-01 to WA-06)
- Nudge bar with its two states, plus the deadline framing (NDG-01 to NDG-08)
- Graceful unconfigured state, so this ships before credentials exist (ENR-12)

**Done when:** a guest on a phone enrolls in under thirty seconds, lands in the WhatsApp
group with one more tap, and is never nudged again.

---

## Phase 4 — Photos

**Goal:** Guests can upload to a shared album, using the identity enrollment already gave them.

- Upload flow: client-side downscale, validation, progress, success and failure states (PH-01 to PH-08)
- 5-photo limit with remaining count, keyed to the enrolled identity
- Shared album view with uploader names
- Graceful unconfigured state

**Done when:** a phone can upload five photos and see them in the album, and the sixth is
refused with a joke rather than an error.

---

## Phase 5 — Spectacle and polish

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
| Supabase credentials | ENR-03, PH-03 | Forms built, show "opens shortly" state |
| WhatsApp group invite link | WA-01 to WA-05 | Handoff built, section hidden until the link exists |
