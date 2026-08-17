---
id: frontend-redesign
created: 2026-08-17
source: owner instruction
resolves_phase: 5
severity: high
kind: design
---

# The owner wants a redesign of the frontend

Owner, after seeing four shipped phases on a real phone: *"I think I would like a redesign of the
frontend."*

This is the umbrella that [[album-split-and-redesign]] and [[collapsible-sections-on-mobile]] sit
under. Treat those two as known, named symptoms rather than as the whole brief, because they were
volunteered in response to specific irritations and the owner has not yet been asked the general
question.

## Ask before designing

The scope is genuinely unclear and guessing it wrong is expensive in both directions. Worth
establishing at `/gsd-discuss-phase 5` time:

- Is this "the bones are right, make it feel finished" or "I do not like the direction"?
- Does the **degradation arc** survive? It is DSG-04, it is the concept the whole page is built
  around, and `data-zone="sober|slipping|unhinged"` is already on every section in `index.html`.
  A redesign that drops it is a different site, not a polish pass.
- Does the **writing** survive? The register is the strongest thing the project has: a fake course
  syllabus, jokes as sentences rather than fields, deliberately no em dashes. `copy.js` is roughly
  192 keys per language across three languages. A visual redesign that fights that voice will lose.
- Mobile first, given every complaint so far has been a phone complaint.

## Existing material that constrains it

- `.planning/DESIGN-BRIEF.md` — the original brief. Read before proposing anything.
- `.planning/phases/04-photos/04-UI-SPEC.md` — the phase 4 contract. Already known to be
  self-contradictory about the quota body (finding W-A in `04-VERIFICATION.md`): it requires
  refused files to be named in queue rows *and* the quota body to contain no queue. Fix that while
  the contract is open rather than inheriting the contradiction.
- Phase 5 in `ROADMAP.md` already owns the critique pass, the Iron Law ("the first version is a
  draft"), the DSG-08 pre-flight matrix, the em-dash sweep (DSG-06) and contrast verification
  (DSG-03).

Per [[use-design-skills-phase-5]], the design-taste skills drive this rather than audit it
afterwards, and that means invoking them while `UI-SPEC.md` is being written, not after the build.

## One practical warning

There is no build step and no test suite. A redesign touches `styles.css` and `index.html` across
four already-verified phases, and the only regression signal that exists is a human looking at the
page. Phases 2 and 3 both have `VERIFICATION.md` files with must-haves that a careless restyle can
silently break. Re-walk those, not just the new work.
