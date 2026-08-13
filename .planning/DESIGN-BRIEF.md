# Design Brief

Contract for the `design-taste` skill. Read this before writing any UI code.

## Design Read

> Reading this as: a **mock DTU institutional page** for friends and family on phones,
> with a **deadpan-bureaucratic-turning-unhinged** language, leaning toward
> **DTU's own corporate identity rendered in dark mode** rather than any off-the-shelf
> design system.

## The concept

The party is presented as **an official DTU course**, laid out the way DTU CourseBase
lays out a real one: course number, ECTS points, prerequisites, learning objectives,
scope and form, exam form, location, responsible lecturer.

The joke is that every field is filled in with total sincerity and completely absurd
content. The humour never winks. The layout stays institutional while the content is
ridiculous, which is what makes it funny to anyone who has ever read a DTU course page
at 2am while planning next semester.

**Course 03102 — Advanced Celebration Techniques**
(the number encodes 03/10, the party date. Nobody will notice. That is fine.)

### The degradation arc

The page opens sober and institutional, and progressively falls apart as the guest
scrolls. This is the structural device that lets motion be genuinely crazy without ever
burying the practical information.

| Zone | Section | Behaviour |
|---|---|---|
| Sober | Header, hero countdown, course facts | Institutional. Restrained motion. Instantly readable. |
| Slipping | Learning objectives, schedule | Small things misbehave. Hover states get strange. Text occasionally corrects itself. |
| Unhinged | Location, door video, photo upload | Full spectacle. Particles, chaos, physics. |
| Collapsed | Footer, easter egg zone | The institutional mask comes off completely. |

Practical information lives in the **sober** and **unhinged-but-anchored** zones, never
behind an animation gate.

## Dials

- **DESIGN_VARIANCE 8** — institutional grid up top, deliberately broken further down.
- **MOTION_INTENSITY 9** — with a hard floor: countdown, address, and door video stay
  instantly legible. Spectacle never delays them.
- **VISUAL_DENSITY 6** — DTU pages are information-dense. That density is part of the
  parody. Dense, not cluttered.

## Palette

**Page Theme Lock: dark for the entire page.** No section flips to light. The physical
scene: a university building at night, one red emergency-exit sign still lit.

Built from DTU's real identity ([designguide.dtu.dk/colours](https://designguide.dtu.dk/colours)):

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0B0C` | Page base. Off-black, never pure `#000`. |
| `--surface` | `#141416` | Raised blocks, course-data panels. |
| `--ink` | `#F4F4F5` | Body text. Off-white, never pure `#fff`. |
| `--ink-dim` | `#A1A1A6` | Secondary text. Verify 4.5:1 against `--bg`. |
| `--accent` | `#990000` | **DTU corporate red. The single locked accent.** |
| `--accent-lit` | `#E83F48` | DTU secondary red. Glow, hover, focus rings only. |
| `--rule` | `#2A2A2E` | Hairlines and table rules. Institutional. |

**Accent Consistency Lock:** DTU red is the only accent, used identically in every
section. The rest of the DTU secondary palette (`#2F3EEA`, `#1FD082`, `#F6D04D`,
`#FC7634`, `#79238E`) appears **only in transient motion** — confetti, particles,
easter-egg moments. Never as a UI accent, never as a section theme.

Contrast note: `#990000` on `#0B0B0C` fails text contrast badly. Use it for fills,
rules, and large display type only. Any red **text** uses `--accent-lit`, verified.

## Typography

DTU's corporate font is Neo Sans Pro, which is commercial. Free stand-ins that carry the
same squarish institutional-technical character:

| Role | Family | Notes |
|---|---|---|
| Display | **Saira** | Squarish geometric, closest free relative to Neo Sans. Headlines, countdown. |
| Body | **IBM Plex Sans** | Institutional, excellent Italian and Danish coverage. Not Inter. |
| Data | **IBM Plex Mono** | Course numbers, ECTS, the fact table. Carries the bureaucratic tone. |

Three families, paired on a real contrast axis. Countdown digits use **tabular figures**
so the layout does not jitter every second. Display letter-spacing floor `-0.04em`,
clamp max `6rem`.

## Copy rules

- **English, Italian and Danish, via toggle**, English primary. Jokes written natively in
  each, never translated word for word. A pun that dies in translation gets replaced with
  a different joke.
- Danish is a **complete translation**, not a gag. The classmates this parody targets
  hardest are Danish, and the CourseBase vocabulary (`skemaplacering`, `læringsmål`,
  `kursusansvarlig`) is the part they will actually recognise.
- All three tables hold identical key sets. Missing keys fall back to English.
- Register: deadpan institutional. The site never admits it is joking.
- **Zero em dashes anywhere on the page.** Non-negotiable.
- No buzzwords, no fake-perfect numbers, no generic placeholder names.

## Hard constraints

- Countdown, address, and door video are readable in under three seconds by someone
  standing outside a building in the dark. This outranks every aesthetic decision.
- `prefers-reduced-motion` fallback on every animation. The degradation arc becomes a
  static tonal shift rather than motion.
- Touch targets at least 44px. Most guests are on phones.
- Animate `transform` and `opacity` only. Duration under 300ms for UI feedback;
  ambient/scroll motion may run longer.
- One corner-radius system. DTU is a squared-off brand, so radii stay small: 2px and 8px.

## Attribution boundary

This is a personal party invitation in the visual style of the host's own university,
not a DTU communication. Accordingly:

- Do not reproduce the official DTU logo. Build a wordmark in the same spirit instead.
- Do not imply DTU endorsement, sponsorship, or involvement.
- Footer carries a plain line stating it is a personal invitation with no affiliation,
  in both languages. Small, dry, and in keeping with the joke.

## Pre-flight

Before shipping any UI, run the full matrix in
`.claude/skills/design-taste/reference/pre-flight.md`. The Iron Law applies: the first
version is a draft, not the deliverable.
