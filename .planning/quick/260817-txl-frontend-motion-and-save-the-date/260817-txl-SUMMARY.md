---
id: 260817-txl
slug: frontend-motion-and-save-the-date
kind: quick
created: 2026-08-17
completed: 2026-08-17
status: complete
mode: inline
commits:
  - 09181dd chore(quick-txl) vendor gsap and version the asset urls
  - f3340d0 feat(quick-txl) make the date the hero anchor, with add to calendar
  - b0c56b2 feat(quick-txl) replace the hidden mobile nav with a full screen menu
  - 6ff3d3c feat(quick-txl) add the motion layer the design brief already claimed
files_modified:
  - index.html
  - styles.css
  - app.js
  - copy.js
  - motion.js (new)
  - assets/vendor/gsap.min.js (new, vendored)
  - assets/vendor/ScrollTrigger.min.js (new, vendored)
---

# Quick task 260817-txl: summary

**The date is now the largest thing on the page and one tap from a calendar, and the motion the
design brief has been claiming since day one actually exists.**

Executed inline rather than through planner and executor subagents. The three design skills the
owner asked to drive this (`design-taste-frontend`, `design-taste`, `high-end-visual-design`) were
loaded in the orchestrating context along with the audit of the live page, and handing a
2,460 line stylesheet and a 5,600 line ES5 file to a subagent would have dropped exactly the
context that makes the taste decisions correct. GSD structure is intact: quick task directory,
plan, four atomic commits, this summary, STATE.md row.

## What was built

### The save the date block

The page had no save the date and no calendar export anywhere in it. Confirmed before building:
zero hits for calendar, `.ics` or save the date across `.planning/`, `copy.js` and `config.js`.
The date existed only as a countdown and one row of the fact table, which tells a guest how long
they have left but never asks them to do the thing that makes them turn up.

The date now outranks the countdown by roughly four to one at every viewport. The countdown keeps
its job and loses its spectacle: a hairline separated data strip underneath, digits down from
`clamp(3rem, 12.5vw, 7.5rem)` to `clamp(1.9rem, 7vw, 3rem)`.

Everything derives from `config.startsAt` through `Intl` pinned to `Europe/Copenhagen`, the zone
`formatDate` and `calendarDaysUntil` already pin. The big number, the sentence, the `.ics` and the
Google Calendar link cannot disagree; moving the party stays a one line edit; and the weekday is
correct in all three languages without anyone maintaining a translation of it.

### Two defects found and fixed on the way

Neither was in the brief. Both were found by measuring rather than by looking.

1. **The countdown separators were pointing at nothing below 620px.** Each `.unit` is as wide as
   its widest child, and at the demoted size that child is the label, not the digits, so a colon
   between two label boxes landed nowhere near the numbers it was punctuating. The separators are
   gone below that width and the four labelled figures spread evenly instead.
2. **The top bar was already overflowing on a real phone.** Logo, badge, Building access and three
   language buttons measure about 372px of content inside the 342px a 390px phone gives after
   gutters. It never showed up in a desktop browser because the 44px minimum on the language
   buttons only applies under `pointer: coarse`. Moving the language switch into the menu panel
   brings the bar to about 280px.

### The mobile navigation

Below 900px the site had one navigation item; the other five links were set to `display: none`.
That was the largest usability defect on the page. There is now a morphing hamburger and a full
screen panel with a staggered reveal, and the stagger is a CSS transition and delay rather than
script, so it survives `motion.js` never arriving.

Two decisions worth recording:

- **Building access stays in the bar.** Phase 2's goal is that a guest outside the building finds
  the door. Filing that behind a menu button to tidy up the bar would have traded the core value
  of the project for neatness.
- **The panel goes under the top bar in the z scale, not over it.** The first build put it over,
  which produced a full screen menu with no visible way out of it. The scale gained a middle rung:
  nudge 100, menu 150, top bar 200, toast 400.

### The motion layer

`DESIGN-BRIEF.md` declares `MOTION_INTENSITY 9`. The stylesheet shipped two `@keyframes` and the
degradation arc was three static gradients. That gap is what the owner felt on the phone.

`motion.js` is a separate file specifically so it can fail to arrive without taking anything with
it. Scroll progress rule, `--chaos` scrubbed 0 to 1 deepening the unhinged and collapsed
backgrounds, sections revealing on enter, objectives arriving out of true, footer lines slumping,
a periodic twitch on the course badge once the guest is deep enough that the institution has
stopped pretending, the date counting up on arrival, and confetti in the DTU secondary palette
fired from the button when a guest saves the date.

## The line that did not move

**`#location` and `#access` are skipped by name.** Both carry `data-zone="unhinged"` and both are
excluded from every transform in the file. The address and the clip showing which door opens are
the two things this site exists to deliver to someone standing outside in the dark, and tilting
them to make a scroll effect look good would trade the core value of the project for a flourish.
Verified: both report `transform: none` at full scroll while `#photos` beside them is tilted.

## Verified in a browser, not asserted

| Claim | Result |
|---|---|
| `.ics` conforms to RFC 5545 | CRLF only, longest line exactly 75 octets, fold counted in octets so the `å` in Trongårdsvej is handled, commas escaped, `DTSTART` 20261003T140000Z equals 16:00 +02:00, stable UID, `VALARM -P1D` |
| Save the date fits a phone | 390x844, no overflow in any of en, it or da |
| Weekday correct per language | Saturday, sabato, lørdag, all from `Intl` |
| Copy tables in parity | 201 keys in each of en, it, da. Zero missing. Zero em dashes |
| `tabindex="-1"` gate | still exactly 2 occurrences in `index.html` |
| Menu keyboard contract | focus enters on open, traps both directions, Escape closes and returns focus, scroll lock applied and cleared, Danish switch from inside relabels the close button |
| Desktop unchanged | six links on one line, 65px bar, no toggle, no overflow |
| GSAP never arrives | nothing at reduced opacity, `--chaos` 0, zone backgrounds fall back to static values, page identical |
| `prefers-reduced-motion: reduce` | GSAP loads, zero ScrollTriggers created, no transforms anywhere |
| Address and door never move | `transform: none` at full scroll |
| No raw scroll listeners | none in `motion.js` or `app.js` |
| Confetti | 42 pieces, `pointer-events: none`, removed after 3s, toast readable through it |
| **NDG-02, phase 3's highest risk item** | footer's last line clears the nudge bar by 58 to 60px at 320x568, 375x667, 390x844 and 430x932, with the slump applied. Countdown clears it at all four |

## One thing investigated and correctly left alone

The tilt on `#photos` rotates a full bleed element, and a rotated box is wider than the box it
started as: `documentElement.scrollWidth` reports about 5px of overflow each side at 375px. The
obvious fix, `overflow-x: clip` on `html`, was written, tested, and **reverted, because it broke
the sticky top bar** (bar top measured -1802 instead of 0 at scroll 3000).

The overflow turned out not to be real. `body` carries `overflow-x: hidden` and `html` is
`visible`, so the body value propagates to the viewport and the viewport already clips. Confirmed
by trying to scroll: `window.scrollTo(400, y)` leaves `scrollX` at 0 and `scrollLeft` at 0 at full
scroll. `scrollWidth` was reporting a measurement artifact, not a defect. No change shipped.

## Deliberate deviations

- **`high-end-visual-design` was overruled on surface treatment.** It asks for `rounded-[2rem]`
  squircles, glass pills and a floating detached nav. `DESIGN-BRIEF.md` locks radii at 2px and 8px
  because DTU is a squared off brand, and the owner asked to stay similar to a DTU site. The
  skill's depth, spatial rhythm, staggered reveals and motion choreography were taken; its surface
  was not.
- **Confetti fires in the sober zone.** The arc reserves spectacle for further down the page. It
  is allowed here because it is feedback for a deliberate action rather than ambient decoration,
  it impedes no reading, and the DTU secondary palette in transient motion is the exact use the
  brief reserves those five colours for.
- **The digit count up is neither transform nor opacity.** It is free: the number is set in
  tabular figures, so every intermediate value occupies the width of the final one and nothing
  reflows.

## Also closed

`?v=1` on every code asset in `index.html`. Pages serves them with `Cache-Control: max-age=600`
and no query, so the documented "change one line on the night" escape hatch did not reach a phone
for up to ten minutes. This is half of `restore-opensat-before-invitations`; the `opensAt` restore
and the test photo cleanup are still open.

## Still open, untouched

`album-split-and-redesign`, `collapsible-sections-on-mobile`, `photo-rejections-unexplained`,
`accept-one-short-video`, and the `opensAt` restore in
`restore-opensat-before-invitations`.

## Not verified here

Everything above is a desktop browser at phone viewports. **This has not been on a real phone.**
The things that browser emulation cannot answer are the ones that already bit this project once:
`pointer: coarse` touch targets, iOS Safari's collapsing toolbar against the nudge bar, whether
the `.ics` blob download actually opens the iOS calendar import sheet, and real GSAP frame rates
on an older Android. That is a device pass, and it should happen before invitations go out.
