# Idea: Master's Graduation Party Site — "Thesis Defended, Liver Pending"

## What this is

A single-page invitation and hub website for Sirio's master's graduation party.
Guests land on it from a shared link, learn when and where the party is, figure out
which door to actually walk through, and — during and after the party — upload photos
to a shared album.

It should feel like a party, not like a form. Dark, loud, funny, heavily animated.
The humour and the motion are the point; the information still has to land.

## Audience

Friends, family, and classmates. Mixed technical ability, mixed ages, mostly on phones,
opening a link from WhatsApp. Some will be standing outside a building, in the dark,
slightly late, trying to find the entrance. Design for that person.

## Constraints

- **Hosting: GitHub Pages** — static files only. No server, no backend process, no
  secrets that stay secret. Any dynamic behaviour must run in the browser or against
  a third-party service that accepts direct browser calls.
- Repo: `SirSirio/thesis-defended-liver-pending`, published at
  `sirsirio.github.io/thesis-defended-liver-pending`.
- Mobile-first. Most traffic will be a phone on mobile data.
- The owner does not want to review work in detail. Decisions should be made and
  defaults chosen without asking. Iterate rather than pre-approve.

## Features

### 1. Countdown timer — the hero
A huge, unmissable countdown as the primary visual element of the page.
Target: **3 October 2026, 16:00 local time.** The date is *provisional and will likely
change*, so it must live in a single config value, not be scattered through the code.

Behaviour after the target passes matters: it should roll into a "the party is
happening right now" state, and later a "it's over, upload your photos" state.
These transitions must be automatic, since nobody will be editing the site mid-party.

### 2. Location + Google Maps
The address, displayed as text (copyable — people will paste it into their own maps app)
and as an embedded interactive map.

Use the **keyless Google Maps embed** (`google.com/maps?q=<address>&output=embed`) rather
than the JavaScript Maps API. No API key, no billing account, no key sitting in public
JS. Add direct "open in Google Maps" and "open in Apple Maps" links, since a guest on a
phone wants their own app, not an iframe.

**Address is not yet known** — build against a placeholder in config.

### 3. Door video
A short video showing which door actually gets you into the party. This is the most
practically useful thing on the site and should be treated as a first-class feature,
not a footnote — guests will open the site *specifically* for this, while standing
outside.

The video file will be provided later. Build the player and its section now, against a
placeholder, so dropping the file in is the only remaining step. Must work on iOS
Safari (inline playback, no forced fullscreen).

### 4. Kahoot quiz — hidden until unlocked
A Kahoot quiz runs at the party. The link must **not** be discoverable before then.
Two unlock paths, both automatic:
- A time gate — it appears on its own at a configured moment.
- An easter egg — clicking some element N times reveals it early, for people who poke
  at things.

Exact mechanism is still open (owner marked it TBD). Pick something playful and
implement it; it is easy to change later. Note that "secret" here means "fun to find",
not "cryptographically hidden" — anyone reading the page source can find it, and that
is an acceptable trade-off for a party quiz. Do not build real secrecy machinery.

### 5. Photo upload — shared album
Guests upload photos that collect into a shared album.
- **Limit: 5 photos per person.**
- No account, no login, no email.
- Photos should be attributable to whoever uploaded them, by name.

### 6. Remember the user without login
The site should recognise returning visitors and greet them by name, with no
authentication of any kind.

Approach: on first visit, ask for a first name and generate a persistent random ID.
Store both in `localStorage`. Every later visit reads that back. This also carries the
uploader identity for photos and enforces the 5-photo limit.

Accepted limitations, deliberately: clearing browser data or switching devices creates
a new identity, and the 5-photo cap is therefore soft. For a party, this is fine —
state it plainly, do not engineer around it.

## Look and feel

- **Dark theme.** Not "dark grey corporate" — genuinely night-time, party-lit.
- **Crazy, magical animation.** Motion is a headline feature, not decoration.
  Ambitious and playful. This is the one place to be excessive.
- **Funny.** Copy should be jokes. The site's name sets the register:
  *Thesis Defended, Liver Pending.* Academic-formality-parodying humour fits —
  RSVPs as "peer review", the schedule as an "agenda", a bibliography of bad decisions.
- Delegate the actual design decisions to the `design-taste` skill. Direction over specification.

**Non-negotiable underneath the spectacle:** the date, the address, and the door video
must be findable in seconds by someone standing outside in the dark. Animation must
never delay or obscure those three things. Respect `prefers-reduced-motion`.

## Technical direction

- Static site, deployable to GitHub Pages with no build step if reasonably possible.
  Fewer moving parts means fewer things broken the week of the party.
- **Supabase free tier** for photo storage and the album index — it accepts direct
  browser uploads, has a generous free tier, and needs only a project URL and an anon
  key pasted into config. The anon key is public by design, protected by row-level
  rules; acceptable for this use case.
- All volatile values — date, address, Kahoot link, video path, Supabase credentials,
  unlock timing — belong in **one config file** that the owner can edit without
  touching application code.
- The site must degrade gracefully when config values are still placeholders, so it is
  presentable and shareable before every detail is finalised.

## Open items (do not block on these)

- Exact address
- Door video file
- Kahoot game link
- Final confirmation of date and start time
- Supabase project credentials (requires the owner to create a free account)

Every one of these should be a placeholder that the site handles gracefully, so
progress never waits on them.
