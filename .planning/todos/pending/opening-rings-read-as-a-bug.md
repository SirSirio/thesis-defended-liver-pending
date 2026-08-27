---
id: opening-rings-read-as-a-bug
created: 2026-08-18
source: owner, twice, during quick task 260818-rmv
resolves_phase: 5
severity: medium
kind: design
---

# Something white moves up the sides during the opening and reads as broken

The owner reported this twice in one session, the second time after being told what the falling
droplets were, and was explicit that it was **not** the droplets and **not** the splash:

> "There is something else moving in the website, some white stuff moving up on the side during
> the animation... not the droplets not the splash after the droplet... Not sure what it is looks
> buggy though"

## What it is

`tinyRing()` inside `dispensing()`, in `motion.js`.

Every one of the six falling droplets calls it when it reaches the end of its fall. It creates a
`.ripple.ripple--small` div, sets it to `scale: 0, opacity: 0.42`, and tweens it to `scale: 1,
opacity: 0` over 1.25s. At full scale that ring is **287px across**.

So what a guest actually sees is a large, faint, thin circle expanding out of a point near the
edge of the screen and fading. Because it grows from a point, the upper arc of the circle travels
upward, which is exactly the reported "white stuff moving up on the side". The ring is drawn in
the droplet's own colour, but at 0.42 opacity fading to 0, against a near black page, several of
those colours read as white.

Six of them fire per sweep, and the sweep re-arms itself forever
(`gsap.delayedCall(N * STEP + REST, sweep)`), so this is not an opening effect. It runs for the
whole life of the page.

## Why it is still there

The owner was asked directly what to do with the droplet system and chose **"Keep exactly as they
are"**. That answer was given about the falling droplets, before the rings had been identified as
the thing that was bothering them. This is therefore unresolved **by choice made on incomplete
information**, not by oversight, and it should be put to them again as its own question.

## The fix, when it is wanted

One line. In `dispensing()`, the last step of each droplet timeline is:

```js
.call(function () { tinyRing(x, fall, colour); });
```

Removing that call leaves the six falling droplets exactly as they are and takes away only the
expanding rings. Three other options, in increasing order of how much they change:

1. Shrink the ring. `.ripple--small` at 287px is not small. At 60 to 80px it reads as an impact
   rather than as a sweep across the screen.
2. Keep the rings but stop the sweep re-arming after two or three passes, so the whole effect is
   part of the opening rather than permanent motion. This also removes a forever-running animation
   cost on phones.
3. Remove `tinyRing` entirely.

The splash on the main drop landing on the date is a **different** function (`splash()`, twelve
satellites plus one ring) and is the payoff of the dispense. It should survive all four options.

## Worth checking at the same time

Whether the permanently re-arming sweep is wanted at all. It was built in 260817-ulc as the six
channel dispenser from the thesis, and the design brief does permit the DTU secondary palette in
transient motion. But "transient" and "for the entire visit" are not the same claim, and the
owner has now twice noticed this layer as something wrong rather than as something intended.
