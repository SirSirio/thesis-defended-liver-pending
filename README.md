# Course 03102: Thesis Defended, Liver Pending

Party site for a master's graduation, presented as an official university course
page because that is funnier than an invitation.

Live at **https://sirsirio.github.io/thesis-defended-liver-pending/**

Plain HTML, CSS and JavaScript. No framework, no build step, no dependencies.
Edit a file, push, and the site is updated.

---

## Changing things

Everything you are likely to change lives in [`config.js`](config.js). You should
never need to open any other file.

Anything left as `null` shows a written placeholder on the site instead of
breaking, so the link is safe to share before the details are settled.

### The date

```js
startsAt: '2026-10-03T16:00:00+02:00',
```

One line. Keep the `+02:00` on the end: that is the timezone offset, and it is
what makes the countdown show the same target to someone in Rome, someone in
Copenhagen, and someone on a plane between them.

Also update `endsAt`, which is when the countdown stops saying the party is
happening and starts asking for photos. A rough guess is fine.

### The address

```js
venue: {
  name: 'Building 101',
  address: 'Anker Engelunds Vej 1, 2800 Kgs. Lyngby, Denmark',
  note: 'Second floor, follow the noise',
},
```

Write the address the way you would type it into Google Maps. The embedded map,
the "open in Google Maps" link and the "open in Apple Maps" link are all built
from that one string. No API key and no billing account involved.

### The door video

Put the file in `assets/`, then:

```js
door: {
  videoSrc: 'assets/door.mp4',
  posterSrc: 'assets/door-poster.jpg',
  directions: 'Blue door to the left of the main gate',
},
```

Keep it under about 10 MB. People will load it outdoors on mobile data. MP4
(H.264) plays everywhere. The poster frame is optional and stops the player
being a black rectangle while it loads. `directions` is the written backup for
anyone whose connection gives up.

### Enrollment and the WhatsApp group

```js
enrollment: {
  deadline: '2026-09-26T23:59:00+02:00',
  maxGuestsPerPerson: 2,
  showCountFrom: 8,
  showAttendeeList: true,
},

whatsapp: {
  inviteUrl: 'https://chat.whatsapp.com/XXXXXXXXXXXX',
},
```

The deadline is what creates the pressure to sign up. Set it a few days before
the party so you can count heads and shop accordingly. The site shows it, and
the nudge wording sharpens as it approaches.

`showCountFrom` hides the running total until it reaches that number, because
"2 people are coming" persuades nobody.

For the group link: open the group in WhatsApp, **Group info**, **Invite via
link**. It is offered the instant someone registers, which is the moment they
are most willing to tap one more thing. Anyone already registered is never
nudged again.

You read the guest list in the Supabase table dashboard. There is no admin page
to build or log into.

### The quiz

```js
quiz: {
  url: 'https://kahoot.it/...',
  unlockAt: '2026-10-03T20:00:00+02:00',
  eggClicks: 7,
},
```

Hidden until the clock reaches `unlockAt`, or until someone clicks the course
number badge `eggClicks` times. This is a party quiz, not a state secret:
anyone who opens the page source can find the link, and that is fine.

### Photos

Needs a free [Supabase](https://supabase.com) account, which takes a few
minutes. Create a project, then copy two values from **Project Settings > API**:

```js
photos: {
  supabaseUrl: 'https://yourproject.supabase.co',
  supabaseAnonKey: 'eyJhbGci...',
  maxPerGuest: 5,
},
```

Both values are safe to publish. The anon key is designed to live in public
JavaScript, and access is controlled by row level rules rather than by keeping
the key hidden.

---

## Running it locally

Opening `index.html` directly mostly works, but a real server avoids surprises.

```bash
python -m http.server 4173
# then open http://127.0.0.1:4173
```

---

## Deploying

Push to `main`. GitHub Pages serves it.

First time only: **Settings > Pages > Source**, set to `main`, folder `/ (root)`.

`.nojekyll` is in the repo so GitHub serves the files as they are rather than
running them through Jekyll.

---

## Link previews

`assets/og-image.png` is what appears when the link is pasted into a chat. To
regenerate it after changing the date, open `assets/og.html` in a browser window
sized exactly 1200 by 630 and save a screenshot over the existing PNG.

---

## Layout

| File | What it holds |
|---|---|
| `config.js` | Everything you edit. Start here. |
| `copy.js` | All site text, in Italian and English, plus the Danish easter egg. |
| `index.html` | Page structure. |
| `styles.css` | Design tokens and all styling. |
| `app.js` | Countdown, language switching, interaction. |
| `assets/` | Favicon, link preview image, and the door video once it exists. |
| `.planning/` | Project and design documents. Not part of the site. |

## Two hidden things

Clicking the **language of instruction** row in the course table three times
reveals a Danish option. It translates four strings and then gives up, which is
also what happened to the host.

The course number, **03102**, is the date.

---

A personal invitation, in the visual style of a university the host actually
attended. Not affiliated with, endorsed by, or in any way the responsibility of
that university.
