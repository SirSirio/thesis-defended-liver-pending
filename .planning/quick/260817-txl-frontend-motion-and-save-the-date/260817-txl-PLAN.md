---
id: 260817-txl
slug: frontend-motion-and-save-the-date
kind: quick
created: 2026-08-17
mode: inline
status: planned
---

# Quick task 260817-txl: the date becomes the anchor, and the motion becomes real

## Why this exists

Two owner asks, and they turn out to be the same fix.

1. *"The date should be bigger than the countdown, as a save the date, and the guest should be
   highly invited to put it in their calendar."* There is no save-the-date on the page today and
   no calendar export anywhere in the project. Grepped `.planning/`, `copy.js` and `config.js`:
   zero hits for calendar, `.ics`, save the date. This is new work, not a restore.
2. *"Make it feel more expensive, add animation, something that vibrates, maybe GSAP."*
   `DESIGN-BRIEF.md` declares `MOTION_INTENSITY 9`. The shipped stylesheet contains two
   `@keyframes` and the degradation arc is three background gradients. The brief is writing
   cheques the page does not cash, and that gap is exactly what the owner felt on the phone.

## Design read

Redesign-preserve. The deadpan course-syllabus register, the trilingual copy tables, the
`data-zone` degradation arc (DSG-04) and DTU's squared-off dark identity all survive untouched.
What changes is the hero's centre of gravity and the amount of motion actually on the page.

Dials stay at the brief's values: `DESIGN_VARIANCE 8`, `MOTION_INTENSITY 9`, `VISUAL_DENSITY 6`.
This task is the first one that makes the motion dial honest.

### One deliberate deviation from `high-end-visual-design`

That skill asks for `rounded-[2rem]` squircles, glass pills and a floating detached nav. It is
overruled here by `DESIGN-BRIEF.md`'s Shape Consistency Lock (2px and 8px radii, because DTU is
a squared-off brand) and by the owner's own instruction to stay similar to a DTU website. What is
taken from the skill is its depth, its spatial rhythm, its staggered reveals and its motion
choreography. What is rejected is its surface treatment. Expensive, not Apple-cloned.

## Hard constraints, which outrank every aesthetic decision here

- Countdown, address and door video legible in under three seconds by someone standing outside a
  building in the dark. This is the project's core value and nothing below is allowed to cost it.
- `prefers-reduced-motion` collapses the entire motion layer to the existing static tonal shift.
- The page is fully legible and fully functional if GSAP never arrives. Progressive enhancement,
  not a dependency.
- Touch targets 44px minimum, 52px where the phase 3 contract requires it.
- `transform` and `opacity` only.
- Zero em dashes, in code comments and in copy alike.
- DTU red is the only UI accent. The secondary palette appears in transient motion only, which is
  the licence `DESIGN-BRIEF.md` already grants for confetti and particles.
- No regressions against the must-haves in `.planning/phases/02-practical-information/` and
  `.planning/phases/03-enrollment-identity-and-the-group/`.

## Tasks

### T1. Vendor GSAP, version the asset URLs

- `assets/vendor/gsap.min.js` and `assets/vendor/ScrollTrigger.min.js`, GSAP 3.13.0, fetched once
  and committed. Vendored rather than CDN on purpose: the guest this site is written for is
  outdoors on a weak signal, and a third-party origin that fails at 22:00 on 3 October is a
  failure mode with no upside.
- Both loaded `defer`, so they execute after `config.js` / `copy.js` / `app.js` and cannot delay
  first paint of the practical information.
- Add `?v=1` to every asset URL in `index.html`. GitHub Pages serves `Cache-Control: max-age=600`
  with no version query today, so the documented "change one line on the night" escape hatch does
  not reach a phone for up to ten minutes. Partially closes `restore-opensat-before-invitations`.

**Verify:** page renders identically with `assets/vendor/` deleted; every `src` and `href` in
`index.html` carries a `?v=`.

### T2. The date becomes the hero anchor, with add-to-calendar

- New `.savedate` block between the headline and the countdown: mono eyebrow, then the day and
  month as a single massive Saira number, then the full weekday-date-time line, then one primary
  button.
- Everything derived from `window.PARTY_CONFIG.startsAt` through `Intl` pinned to
  `Europe/Copenhagen`, the same zone `formatDate` and `calendarDaysUntil` already pin. Nothing
  about the date is hardcoded in markup or in `copy.js`, so it cannot drift from config and the
  weekday is correct in all three languages for free.
- Type scale: `.savedate__num` at `clamp(4.2rem, 26vw, 11rem)`, countdown digits demoted from
  `clamp(3rem, 12.5vw, 7.5rem)` to `clamp(1.9rem, 7vw, 3rem)`. The date outranks the countdown by
  roughly four to one at every viewport. The countdown keeps its job (urgency) and loses its job
  (spectacle).
- `.ics` built client-side per RFC 5545: CRLF line endings, 75-octet folding, escaped
  `TEXT` values, stable `UID`, `VALARM` at one day before. `LOCATION` from `venue.name || venue.address`.
  Delivered as a Blob download, with a `data:` URI fallback where `createObjectURL` is missing.
- One primary CTA ("Add to your calendar"), with a small secondary text link to Google Calendar
  underneath. One CTA per intent: the link is a fallback, not a competing call to action.
- New copy keys in en, it and da. No em dashes.
- On a successful save, `app.js` dispatches `c03102:saved` on `document`. It does not know that
  anything listens.

**Verify:** the generated `.ics` parses and imports; the date shown on the page and the date
inside the `.ics` both change when `startsAt` changes; the hero still fits a 390x844 viewport.

### T3. A mobile navigation that is not a hidden navigation

Today `@media (max-width: 900px)` sets `display: none` on five of the six top-bar links. On the
device every guest will actually use, the site has one navigation item. That is the single
largest usability defect on the page.

- Morphing hamburger button, two bars rotating into an X, transforms only.
- Full-screen menu panel: `position: fixed`, `inset: 0`, backdrop blur (a fixed element, which is
  where the performance guardrail allows blur), links at display size, staggered in.
- Language switch moves inside the panel on mobile so it stops competing for the bar's width.
- `aria-expanded`, `aria-controls`, Escape to close, focus moved into the panel on open and
  returned to the button on close, focus trapped while open, background scroll locked.
- **`.topnav__key` (Building access) stays visible in the bar itself, exactly as it is now.** The
  phase 2 goal is that a guest outside the building finds the door. Burying that behind a
  hamburger to satisfy a design pattern would trade the project's core value for tidiness.
- Two new copy keys, three languages.

**Verify:** all six sections reachable on a 390px viewport; keyboard-only open, traverse, escape;
Building access still one tap from the bar with no menu open.

### T4. The motion layer: make the degradation arc real

New `motion.js`, loaded `defer` last. Guards on `window.gsap` and returns silently if absent, and
guards on `prefers-reduced-motion` and returns silently if the guest asked for less. Everything
below is therefore optional by construction.

- **Scroll progress rule.** A 2px DTU-red bar under the top bar, `scaleX` driven by document
  scroll. Motivated: it is a progress indicator on a course page, which is both a real wayfinding
  aid on a long single-page site and in character.
- **The degradation arc, driven by scroll rather than declared by a gradient.** A scrubbed
  ScrollTrigger writes a `--chaos` value on `<html>` from 0 to 1 across the document. The existing
  `data-zone` backgrounds keep working untouched; the new value drives an increasing tilt on the
  unhinged sections and lifts the hero's exit-sign glow.
- **Reveal on enter.** Sections fade up 24px once. `.objectives li` and `.facts__row` stagger.
- **Save-the-date entrance.** The date number arrives with a masked reveal. Motivated: it is the
  single most important thing on the page and the motion says so.
- **Silly, and kept where the brief allows silly.** Sober zone stays sober. In slipping, the
  objectives lean as they arrive. In unhinged, sections tilt with `--chaos`. In collapsed, the
  footer lines visibly slump. Once the guest is past the unhinged threshold, the `03102` badge in
  the bar starts a periodic one-frame jitter: an institutional glitch, which is the joke.
- **Confetti in the DTU secondary palette on a successful calendar save.** Listens for
  `c03102:saved`. This is feedback for the primary action, which is a motivated animation and not
  decoration, and the secondary palette in transient motion is exactly the use `DESIGN-BRIEF.md`
  reserves it for.

**Verify:** page fully usable with `motion.js` returning early; nothing animates under
`prefers-reduced-motion: reduce`; no `window.addEventListener('scroll')` anywhere; every animated
property is `transform` or `opacity`.

## Style rules this codebase already enforces, and this task follows

- ES5 throughout `app.js` and `motion.js`. `var`, `function`, no arrow functions, no template
  literals, matching the 5,619 lines already there.
- `createElement` plus `textContent`, never `innerHTML`. Config values flow through these nodes
  and that discipline is what keeps `config.js` from being an injection vector.
- Every new user-visible string goes through `t()` and exists in all three tables.

## Out of scope, deliberately

`album-split-and-redesign`, `collapsible-sections-on-mobile`, `photo-rejections-unexplained`,
`accept-one-short-video`, and restoring `opensAt`. All still open, all separate.

## Commits

1. `chore(quick-txl): vendor gsap and version the asset urls`
2. `feat(quick-txl): make the date the hero anchor, with add to calendar`
3. `feat(quick-txl): replace the hidden mobile nav with a full screen menu`
4. `feat(quick-txl): add the motion layer the design brief already claimed`
