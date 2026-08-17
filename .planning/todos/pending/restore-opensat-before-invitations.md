---
id: restore-opensat-before-invitations
created: 2026-08-17
source: temporary change made during the phase 04 device pass
resolves_phase: 4
severity: high
kind: chore
---

# LIVE STATE: uploads are open early, put the date back

`config.js` currently reads `opensAt: null` and **this is deployed**. It was changed on 2026-08-17
so the owner could run the device pass from a real phone before 3 October, and it was pushed to
GitHub Pages (commit `355159c`).

While it stays null, anyone who has the URL can upload into the live `party-photos` bucket. The URL
is unlisted and the bucket carries a 3 MiB per object ceiling and a JPEG only type list, so the
exposure is small. It is not zero.

**Restore before the invitations go out:**

```js
opensAt: '2026-10-03T13:00:00+02:00',
```

The real value is sitting in a comment directly above the null, and the comment says it is
temporary, so the line cannot be mistaken for a real setting.

Also delete any test photographs from the Supabase dashboard first, project `aplaxdplwnnlezffatal`:
rows from `public.photos`, then the matching objects from Storage. Nothing on the site can delete,
by design.

Related and worth fixing at the same time: **`index.html` loads `config.js`, `copy.js`, `app.js`
and `styles.css` with no version query, and GitHub Pages serves them `Cache-Control: max-age=600`.**
So changing `opensAt` on the night does not take effect on a phone that already loaded the page for
up to ten minutes. That defeats the escape hatch the config comment promises, at exactly the moment
it is needed. Adding `?v=N` to those four tags is the fix.
