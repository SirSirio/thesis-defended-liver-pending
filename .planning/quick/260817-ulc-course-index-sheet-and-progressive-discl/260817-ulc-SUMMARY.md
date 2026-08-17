---
id: 260817-ulc
slug: course-index-sheet-and-progressive-discl
kind: quick
created: 2026-08-17
completed: 2026-08-17
status: complete
mode: inline
commits:
  - e3446fa feat(quick-ulc) the page is a DTU course page for three seconds, then it is not
  - 7273281 feat(quick-ulc) split the album in two and make the shared one a gallery
  - 65cab3f feat(quick-ulc) fold the joke, keep the four rows that answer a question
files_modified:
  - index.html
  - styles.css
  - app.js
  - copy.js
  - motion.js
  - .planning/DESIGN-BRIEF.md
---

# Quick task 260817-ulc: the drastic frontend change

Three owner instructions, in the order they arrived and in decreasing order of how much was
already built when they landed.

1. The navigation is too long and the page makes you scroll through lists and tables to reach
   anything useful. Make it modern, glassy, premium, with an animated background.
2. **Do something like this: squared like DTU for the first three seconds, then morph into
   something dynamic.**
3. **Pay most of the attention on the album. It is what people will use the most.**

## The reframe that made the rest possible

`IDEA.md` asked for *"crazy, magical animation"* and called motion a headline feature, *"the one
place to be excessive."* What shipped across four phases was restrained and institutional. The
degradation arc was the compromise between the parody and the spectacle, and it landed too far
toward the university.

The owner's three-second morph resolves it without anyone losing an argument. `DESIGN-BRIEF.md`
had a Shape Consistency Lock at 2px and 8px, justified by DTU being a squared-off brand, and the
request for rounded glass was a direct conflict with it. Turning the squared geometry into the
**opening act** rather than the permanent state keeps the lock's reasoning intact and gets the
premium surface as well. `DESIGN-BRIEF.md` is updated rather than violated.

## What was built

### The awakening

The page is a DTU course page for three seconds, then it is not. Corners round, the top bar
dissolves into a floating glass pill, two red masses come up behind the content.

One attribute on `<html>`, set by `app.js`. Five shape and surface tokens registered with
`@property`, which is what makes a custom property interpolatable, so every radius and every glass
panel on the site animates off one declaration instead of forty rules. Without `@property` the
values jump instead of sliding and the morph still happens, in one frame.

**No layout property takes part.** The bar measures 64px before and after, because
`.topbar__inner` already sits in its 6px gutter at 52px tall from the first frame: the pill's box
exists while it is still invisible. Nothing can move text under a reading guest's thumb.

It lives in `app.js` and not `motion.js` on purpose. The morph is the site's identity, it is CSS
end to end, and it has to work on a phone that never finished downloading GSAP.

### The background that responds

Two red masses drift out of phase; a third walks toward wherever the guest last touched, damped so
it leans toward the finger rather than sitting under it, which reads as light rather than as a
cursor.

Pointer events rather than the gyroscope, deliberately: iOS has required an explicit permission
prompt for device orientation since 13, and a party invitation that opens with a permission dialog
has already lost. Touch is handled separately from `pointermove`, because a phone only emits
`pointermove` while a finger is down and the commonest gesture on this page is a tap.

Two reds and no third hue, because ambient lighting is not transient motion and the secondary
palette is reserved for transient motion. Three radial gradients moved by transform; no canvas and
no blur filter, since a gradient is already blurred by definition and `blur()` over a
viewport-sized element repaints every frame on a phone.

### The album, split in two

**Under the uploader: only your own photographs.** That block used to be the entire shared album,
which was the wrong thing in the wrong place. A guest who has just submitted three photographs
wants to see those three, not everybody's with their own somewhere inside.

*"Which ones are mine"* is answered on the device and nowhere else. `public.album` deliberately
carries no `guest_id` and must never be asked for one (T-04-01, schema §9): that id is the
credential for amending a registration, so putting it in a public view or a query string would
hand one guest the ability to edit another guest's entry. Paths are recorded in `localStorage` on
the same branch that increments the photo count, so the tally and the strip cannot disagree, and
only on that branch, because D-19's orphan case creates an object that appears in no view.

Every path is re-validated against `STORAGE_PATH_RE` **on read**, not just on write, because
`localStorage` is guest-writable and these strings become image URLs.

**The shared album became a gallery** in its own section. Every fifth frame takes two columns, so
it stops reading as a contact sheet; names moved off their own row and onto the photograph over a
scrim. Same query, same view, same broken-tile rule.

**A lightbox, overturning D-10.** That decision chose the browser's own image viewer for pinch,
save and share at zero cost, and the reasoning was good. It is overturned on the owner's explicit
priority, because opening a new tab per photograph is not a gallery and on a phone it walks the
guest off the site. D-10's actual benefit is kept rather than discarded: tiles are still real
anchors to the full-size object, so long-press to save, middle-click and modified clicks all work
through the browser, and the overlay carries an explicit link to the original.

### Progressive disclosure

Twelve fact rows became four and a fold. The four are the ones that answer a question a guest
actually has: when, where, do I have to do anything, by when. The other eight are the joke, folded
rather than cut, which is what a real course page does with the half nobody reads.

The objectives fold on a phone and stay open on a desktop. The list ships **open** and `app.js`
closes it below 901px, so a browser where the script never ran shows the list. A disclosure that
fails open loses nothing; one that fails closed hides content behind a control that may also be
broken.

Native `<details>` throughout: already in the tab order, already announced, already opened by the
browser's own find-in-page.

## Verified in a browser

| Claim | Result |
|---|---|
| Morph changes no layout | bar 64px before and after; `--r-sm` 2→10px, `--r-lg` 10→28px, `--glass` 0→1 |
| Path validator holds | injected 3 real paths plus a traversal attempt, a malformed path and a duplicate; 3 tiles rendered |
| Album is off the uploader | `#photos-body .album__tile` count 0; strip shows "Your 3 submissions" |
| Gallery renders live | 10 tiles from `public.album`, 2 wide, head reads "10 submissions on record." |
| Lightbox | opens, caption "Submitted by Cazzo", "1 of 10"; ArrowRight → 2 of 10; ArrowLeft twice wraps to 10 of 10; Escape closes, clears the scroll lock and the img src; focus returns to the tile |
| Folds | phone shows 4 rows, both folds shut, 68px summary; opening restores all 8 rows and `fact-number` / `fact-host` still populated |
| Desktop objectives | open, 6 items |
| Page length at 390x844 | 1253px shorter to Building access, 1252px to Registration |
| Copy | 217 keys in each of en, it, da. Zero missing, zero em dashes, accents correct |
| Console | no page errors across every run |

## Not done, and it was asked for

**The Course Index bottom sheet was not built.** The plan was to replace the full-screen menu with
a bottom sheet of rounded tiles carrying a spotlight box that moves to the section you are in.
What exists is still the full-screen menu from task 260817-txl, now with a seventh item for the
album. The navigation is therefore *shorter to get through the page* but is not the interactive
index that was described. It is the single largest outstanding piece.

## Still not on a real phone

Everything above is a desktop browser at phone viewports. Unanswered: `pointer: coarse` targets,
whether the aura's three composited layers hold frame rate on an older Android, whether the
lightbox swipe competes with iOS Safari's back-swipe gesture at the screen edge, and whether three
seconds is the right number on a real device. That last one is a taste call that can only be made
by holding it.

## Also still open

`opensAt` is still `null` in `config.js`, so uploads remain open to anyone with the URL, and the
test photographs are still in the bucket. `photo-rejections-unexplained` and
`accept-one-short-video` are untouched.
