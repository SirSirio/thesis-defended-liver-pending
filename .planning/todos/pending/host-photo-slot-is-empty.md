---
id: host-photo-slot-is-empty
created: 2026-08-18
source: owner request during quick task 260818-rmv
resolves_phase: 4
severity: low
kind: chore
---

# The host card is showing a monogram, waiting for a photograph

The owner asked for their name to be visible on the page, "with maybe a picture". A course
responsible card now sits under the hero headline: portrait, name, role, in the same shape a real
DTU course page uses.

`config.js` carries the slot:

```js
course: {
  number: '03102',
  ects: 5,
  host: 'Sirio',
  photo: null,        // e.g. 'assets/host.jpg'
}
```

With `photo: null` the card renders a monogram, the first letter of `course.host` in a disc. That
is a deliberate placeholder in the sense the project requires: it reads as a designed state, not
as a broken image, and nothing about the layout changes when a real photograph arrives.

## To finish it

1. Put a **square** image in `assets/`. Anything roughly 400x400 or larger. It is displayed at
   56px on a phone and 64px above 720px, and `object-fit: cover` handles a non square file, but a
   square original avoids a crop nobody chose.
2. Keep it small. This sits in the hero, above the fold, on a page whose whole point is loading
   fast on bad mobile data outdoors. Under about 60 KB.
3. Set the config line: `photo: 'assets/host.jpg'`.
4. Bump `?v=N` on every asset in `index.html` and `album.html`, or phones serve the previous
   version for up to ten minutes.

`renderSchedule()` in `app.js` writes the card. It builds an `img` when `course.photo` is a
non empty string and the monogram otherwise, and the accessible name comes from
`hero.host.alt` with `{name}` substituted, so it is correct in all three languages without
anything further being written.

## Note

`course.host` is currently the string `'Sirio'` in config. The page title, the hero card and the
fold row all read from it, so changing that one value changes the name everywhere it appears
except `meta.title`, which is a static string in `copy.js` in all three languages and would have
to be edited by hand.
