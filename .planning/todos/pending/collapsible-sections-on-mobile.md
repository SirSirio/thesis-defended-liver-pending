---
id: collapsible-sections-on-mobile
created: 2026-08-17
source: owner, phase 04 device test
resolves_phase: 5
severity: medium
kind: design
---

# The long sections should collapse on mobile

Owner observation from a real phone: **the page is too long**. Several sections are walls of text
that a guest has to scroll past to reach anything else.

Named by the owner, in the order they said them:

| Section | `id` | Heading | Certainty |
|---|---|---|---|
| Course information | `#info` | `facts.heading` | wanted |
| Learning objectives | `#objectives` | `obj.heading` | wanted |
| Building access | `#access` | `access.heading` | wanted |
| Location | `#location` | `loc.heading` | "probably" — owner was less sure |

There is **no accordion pattern anywhere in the project today**: zero `<details>`, zero `<summary>`,
zero accordion CSS in `index.html`, `styles.css` or `app.js`. So this introduces a new component,
which is a reason to do it inside the Phase 5 design pass rather than as a patch, alongside
[[album-split-and-redesign]] and [[frontend-redesign]].

## Constraints that are easy to get wrong here

- **Location must stay instant.** `ROADMAP.md` Phase 2's goal is "a guest outside the building can
  find the door", and Phase 5's done-when says "the practical information is still instant". A
  guest standing in the cold tapping a header to reveal the address is worse than scrolling past
  it. If `#location` collapses at all, the address itself should stay visible and only the
  supporting detail should fold. Same argument applies with slightly less force to `#access`.
- **Collapse on mobile, not everywhere.** The complaint is about phone length. A desktop viewport
  has the room, and collapsing there hides content for no gain.
- **`prefers-reduced-motion`** — Phase 5 owns DSG-05 and any expand animation has to honour it.
- **Deep links must still work.** The nav links to `#info`, `#location`, `#access`. Landing on a
  collapsed section from a nav tap has to open it, not scroll to a closed header.
- **Three languages.** Any new control label goes in `copy.js` in en, it and da, with identical key
  sets. The site reads its strings from there and nowhere else.
- Native `<details>`/`<summary>` gets keyboard support, screen reader semantics and find-in-page
  for free. A hand rolled version gets none of those unless it is built for them.
