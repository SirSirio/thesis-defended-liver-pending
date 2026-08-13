# Phase 2: Practical information - Context

**Gathered:** 2026-08-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the two sections a guest actually opens this site for: where the party is, and
which door to use. Location section (LOC-01 to LOC-05), door access section (ACC-01 to
ACC-05), deliberate placeholder handling for anything the owner has not supplied yet, the
jump path from the top of the page to door access (ACC-02), and verification on real
mobile browsers (DEL-02, DEL-03).

Out of this phase: enrollment and the WhatsApp handoff (phase 3), photo upload (phase 4),
the degradation arc and spectacle motion (phase 5).

</domain>

<decisions>
## Implementation Decisions

### Venue and address

- **D-01:** The address is real and confirmed. `Trongårdsvej 46, 2800 Kongens Lyngby,
  Denmark` goes into `config.js` as `venue.address`. The location section ships live in
  this phase, not as a placeholder. Note the spelling: the owner wrote "trongårdvej", the
  street is **Trongårdsvej**, with an s. Use the verified spelling everywhere.
- **D-02:** The venue is a 76 unit kollegium with multiple entrances. This is precisely the
  problem the site exists to solve, so the access section carries real weight rather than
  being decoration. `venue.note` and the written directions must be able to name a specific
  entrance, staircase, and floor once the owner supplies them.
- **D-03:** `venue.name` stays optional and separate from `venue.address`. When set it is
  the display line in the course fact table; when null the fact table falls back to the
  address. Never show both concatenated.

### Map and directions

- **D-04:** Both affordances ship, and neither replaces the other. A prominent "Get
  directions" action that hands the guest off to their own map app, and an interactive
  embedded Google map on the page. The owner asked for both explicitly.
- **D-05:** Directions links use **directions** URLs, not place URLs, so the guest lands on
  a route rather than a pin:
  - Google: `https://www.google.com/maps/dir/?api=1&destination={encodeURIComponent(address)}`
  - Apple: `https://maps.apple.com/?daddr={encodeURIComponent(address)}&dirflg=d`
  Both open the native app when it is installed, on both platforms.
- **D-06:** Google Maps is offered on every platform. Apple Maps is offered only when the
  browser looks like iOS, iPadOS, or macOS. A Danish guest on Android should not be handed
  a button that opens a web page they cannot act on. If detection is inconclusive, show
  both rather than hiding either.
- **D-07:** The embed is keyless: `https://www.google.com/maps?q={encoded}&output=embed`.
  No API key, no billing account. Locked by LOC-02 and by the project's static hosting
  constraint.
- **D-08:** The iframe is never present in the static markup. It is created in JS and
  mounted when the section approaches the viewport, via `IntersectionObserver` with a
  `rootMargin` generous enough that the map is ready before the guest arrives at it. This
  satisfies LOC-04 and keeps Google out of the critical path on mobile data. The owner
  delegated this call and asked for feedback on it after seeing it.
- **D-09:** The map slot is a fixed aspect ratio box holding a styled waiting state before
  the iframe mounts, so nothing reflows when it arrives. The iframe carries `loading="lazy"`,
  `referrerpolicy="no-referrer-when-downgrade"`, and a translated `title` for screen readers
  (`loc.maptitle` already exists in all three languages).

### Address as copyable text

- **D-10:** The address is selectable text first, with a copy button beside it. Copy uses
  the async clipboard API with a `document.execCommand('copy')` fallback for older iOS
  Safari, and confirms through the existing `toast()`. If both paths fail, the address text
  is selected instead so the guest can copy it by hand. Never a silent failure.

### Door access

- **D-11:** The access section is built complete against `door.videoSrc: null`. The moment
  the owner drops a file into `assets/` and sets one config line, the player appears with no
  code change. The video is not available now and will arrive later.
- **D-12:** Written directions are **always visible**, positioned above the video, never
  merely a fallback that appears when the video is missing. A guest standing outdoors on bad
  signal reads text faster than a video loads, and text still works when the video does not.
  This is a stronger reading of ACC-04 than "accompanies".
- **D-13:** Video element attributes: `playsinline`, `muted`, `controls`, `preload="metadata"`,
  and `poster` when configured. `muted` together with `playsinline` is what stops iOS Safari
  taking the video fullscreen. No autoplay, ever.
- **D-14:** With a poster configured, it shows before load. Without one, the player slot is a
  styled panel at the player's exact aspect ratio. Never a black rectangle, never a collapsed
  box.
- **D-15:** Section order is written directions, then the player, then a link back to the
  map. The fastest path to the answer comes first.

### Practical notes

- **D-16:** A `venue.notes` structure in `config.js`, entries as label and value pairs.
  Renders as a definition list reusing the institutional styling of the course fact table.
  Any entry left null is absent from the render. All entries null means the whole block is
  absent, not an empty shell.
- **D-17:** Seeded with the questions guests actually send messages about: which entrance,
  which floor, doorbell or buzzer, parking, nearest transit, what to bring, when to actually
  arrive. All null by default so the owner fills in only what applies.

### States and placeholders

- **D-18:** Every state reads as deliberate. Reuse the existing `.pending` component from
  phase 1 rather than inventing a second placeholder language.
- **D-19:** Every combination renders as intentional: address present or absent, map
  mounting or mounted or blocked, video present or absent, poster present or absent,
  directions present or absent, notes present or absent. No combination is allowed to render
  as broken.

### Jump path to the door

- **D-20:** ACC-02 is already served by the hero "Which door" button and the topnav entry.
  This phase makes the destination worth arriving at, and adds smooth scrolling that respects
  `prefers-reduced-motion`. No new pinned element: NDG-02 reserves the bottom bar for the
  nudge, and a second fixed element would fight it on a phone.

### Motion

- **D-21:** Restrained in this phase. MOTION_INTENSITY drops from the brief's page-wide 9 to
  3 for these two sections. Permitted: copy confirmation, map mount fade, button `:active`
  scale, focus rings. The degradation arc and the spectacle land in phase 5, as roadmapped.
- **D-22:** Every animation added here ships with its `prefers-reduced-motion` fallback in
  this phase. Not retrofitted in phase 5.

### Verification

- **D-23:** Verified on real iOS Safari and real Android Chrome before the phase closes.
  Specifically: inline video playback with no fullscreen takeover, clipboard copy, map iframe
  behaviour on mobile data, directions links opening the native app, and touch targets at or
  above 44px.

### Claude's Discretion

- Exact copy in all three languages, written natively per language rather than translated.
- Exact spacing, and the visual treatment of the map waiting state.
- Whether the practical notes block sits inside the location section or the access section.
- The precise Apple platform detection heuristic behind D-06.
- Whether the "back to map" link in D-15 is a button or an inline link.

</decisions>

<specifics>
## Specific Ideas

- The owner's words on the map: "what I want is that people have a way to press like 'Get
  directions' and then google maps open on their phone. And also they can see the actual
  interactive google maps." Both, not one.
- The venue being a kollegium changes the tone of the access section. "Which door" is not a
  joke here, it is a genuine navigation problem across 76 units, and the copy should carry
  the institutional deadpan while actually being useful.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract
- `.planning/DESIGN-BRIEF.md` — palette, type scale, degradation arc, hard constraints,
  copy rules. The dark theme lock, the single DTU red accent, and the zero em dash rule are
  all non-negotiable.
- `.claude/skills/design-taste/reference/pre-flight.md` — the matrix every UI change runs
  before it ships (DSG-08).
- `.claude/skills/design-taste/reference/interaction-states.md` — the eight states each
  interactive element owes, focus handling, touch targets.
- `.claude/skills/design-taste/reference/motion.md` — easing curves and the reduced motion
  contract for D-21 and D-22.

### Project contract
- `.planning/REQUIREMENTS.md` — LOC-01 to LOC-05, ACC-01 to ACC-05, DEL-02, DEL-03, plus
  the cross-cutting CFG-01, CFG-03, DSG-05, DSG-06, DSG-07, LNG-06, LNG-07.
- `.planning/STATE.md` — live deployment state, phase 1 conventions, and the
  `enrollmentReady()` gotcha that must not be broken.
- `.planning/ROADMAP.md` §Phase 2 — the scope fence.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `.pending` component in `styles.css` — the established placeholder language. Use it.
- `toast()` in `app.js` — copy confirmation goes through this, not a bespoke message.
- `t(key)` in `app.js` — i18n lookup with English fallback for missing keys.
- `store` in `app.js` — localStorage wrapper that survives private browsing.
- `$` and `$$` in `app.js` — the querySelector helpers every function uses.
- `.btn`, `.btn--primary`, `.btn--ghost` — the button system, already contrast checked.
- `.facts` definition list — the institutional table styling the notes block should echo.
- `.section__lede`, `.wrap`, `.section__h` — section scaffolding already in place.

### Established Patterns
- Every volatile value lives in `config.js` and nowhere else (CFG-01). New values for this
  phase go there with inline documentation written for a non programmer.
- All guest facing copy lives in `copy.js`, in all three tables at identical key sets
  (LNG-06). English is the fallback for any gap (LNG-07).
- Zero em dashes in anything a guest sees (DSG-06).
- Sections render their body from JS into a container div (`#location-body`, `#access-body`)
  that already exists in `index.html` holding a `.pending` block.
- Placeholders must read as deliberate, never as broken.

### Integration Points
- `renderSchedule()` in `app.js` already writes `#fact-location` from `CFG.venue`, falling
  back to `facts.location.tbd`. Setting `venue.address` makes the course fact table correct
  for free, with no new code.
- New `renderLocation()` and `renderAccess()` functions must join the re-render chain inside
  `applyLanguage()` alongside `renderSchedule()`, `renderCountdown()`, `renderDeadline()` and
  `renderNudge()`, so switching language re-renders them without a page reload (LNG-01).
- Copy keys already seeded in all three languages by phase 1 and ready to use: `loc.copy`,
  `loc.copied`, `loc.google`, `loc.apple`, `loc.maptitle`, `loc.heading`, `loc.pending.*`,
  `access.heading`, `access.lede`, `access.pending.*`, `nav.location`, `nav.access`,
  `facts.location`, `facts.location.tbd`.
- `enrollmentReady()` gates the nudge bar on `#enrol-form` existing. Nothing in this phase
  may touch that function or introduce an element that changes its result.

### Flagged consideration
- The site is public and the address is a private residence in a student housing complex.
  Rendering it from `config.js` through JS keeps it out of the static HTML and out of the
  repo's rendered pages, which defeats naive scraping, but anyone who opens the page sees it.
  This is accepted deliberately, because an invitation without an address is not an
  invitation. Recorded so the owner knows the tradeoff was made on purpose rather than
  overlooked.

</code_context>

<deferred>
## Deferred Ideas

- Degradation arc and spectacle motion for the location and access sections — phase 5,
  as roadmapped (DSG-04).
- Enrollment form, identity, WhatsApp handoff — phase 3.
- Photo upload and shared album — phase 4.
- Offline caching or a service worker — no requirement asks for it, and it adds a thing that
  can break in the week before the party.

</deferred>

---

*Phase: 02-practical-information*
*Context gathered: 2026-08-13*
