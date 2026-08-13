# Requirements: Thesis Defended, Liver Pending

**Defined:** 2026-08-13
**Core Value:** A guest standing outside the building in the dark finds the right door in under ten seconds.

## v1 Requirements

### Config

- [ ] **CFG-01**: Every volatile value lives in one file (`config.js`): date, time, timezone, address, venue name, video path, Kahoot link, unlock time, Supabase URL and anon key
- [ ] **CFG-02**: Changing the party date requires editing exactly one line
- [ ] **CFG-03**: Every placeholder value degrades gracefully, so the site is shareable before details are final
- [ ] **CFG-04**: Config is documented inline so the owner can edit it without reading application code

### Countdown

- [ ] **CD-01**: Countdown to the configured datetime is the dominant element of the hero
- [ ] **CD-02**: Shows days, hours, minutes, seconds, using tabular figures so digits do not jitter
- [ ] **CD-03**: Automatically switches to a "happening now" state at start time, with no manual edit
- [ ] **CD-04**: Automatically switches to an "it is over, upload your photos" state afterward
- [ ] **CD-05**: Computes against a fixed timezone, so a guest travelling from another country sees the same target
- [ ] **CD-06**: Stays accurate when the tab is backgrounded and restored

### Location

- [ ] **LOC-01**: Address shown as text with a copy button and a confirmation on copy
- [ ] **LOC-02**: Google Maps embedded via keyless iframe, no API key and no billing account
- [ ] **LOC-03**: Direct links open Google Maps and Apple Maps in the guest's own app
- [ ] **LOC-04**: Map iframe lazy-loads, so it never blocks first paint on mobile data
- [ ] **LOC-05**: When the address is still a placeholder, the section says so plainly instead of showing a broken map

### Door access

- [ ] **ACC-01**: Video plays inline on iOS Safari, with `playsinline`, `muted`, and `controls`
- [ ] **ACC-02**: Section is reachable in one tap from the top of the page, since guests open the site specifically for this
- [ ] **ACC-03**: Poster frame shows before the video loads, so the section is never a black rectangle
- [ ] **ACC-04**: Written fallback directions accompany the video, for guests on bad signal
- [ ] **ACC-05**: With no video file present, the section shows a clear placeholder rather than a broken player

### Photos

- [ ] **PH-01**: Guest uploads photos from a phone camera roll, no login
- [ ] **PH-02**: Limit of 5 photos per visitor identity, with remaining count shown before upload
- [ ] **PH-03**: Uploads land in Supabase Storage and are indexed in a Supabase table
- [ ] **PH-04**: Shared album displays all uploads with the uploader's name
- [ ] **PH-05**: Upload shows progress, and success and failure states, never a silent failure
- [ ] **PH-06**: Client-side downscale before upload, so a 12MP phone photo does not stall on mobile data
- [ ] **PH-07**: File type and size validated before upload starts
- [ ] **PH-08**: With Supabase not yet configured, the section explains that uploads open later instead of erroring

### Identity

- [ ] **ID-01**: First visit asks for a first name, once, in a way that fits the parody
- [ ] **ID-02**: Name and a generated UUID persist in `localStorage`
- [ ] **ID-03**: Return visits greet the guest by name with no prompt
- [ ] **ID-04**: Guest can change or clear their name
- [ ] **ID-05**: Identity carries the photo attribution and the 5-photo count
- [ ] **ID-06**: Site works fully when `localStorage` is unavailable, for private browsing

### Language

- [ ] **LNG-01**: Italian and English toggle, switching all copy without a page reload
- [ ] **LNG-02**: Choice persists across visits
- [ ] **LNG-03**: Initial language guessed from browser locale, then overridable
- [ ] **LNG-04**: Jokes written natively per language, never machine-translated
- [ ] **LNG-05**: Danish easter egg option that translates a few strings then gives up, as a joke

### Kahoot

- [ ] **KAH-01**: Link is not visible or reachable in the normal page flow before unlock
- [ ] **KAH-02**: Time gate reveals it automatically at a configured moment
- [ ] **KAH-03**: Easter egg reveals it early, by clicking a chosen element a set number of times
- [ ] **KAH-04**: Unlock state persists, and the reveal is animated and satisfying
- [ ] **KAH-05**: No attempt at real secrecy, since page source is public by nature

### Design

- [ ] **DSG-01**: DTU CourseBase parody structure, per DESIGN-BRIEF.md
- [ ] **DSG-02**: Dark theme locked for the whole page, no section flips
- [ ] **DSG-03**: DTU red `#990000` as the single locked accent, red text using `#E83F48` verified for contrast
- [ ] **DSG-04**: Degradation arc from institutional to unhinged as the guest scrolls
- [ ] **DSG-05**: `prefers-reduced-motion` fallback on every animation
- [ ] **DSG-06**: Zero em dashes anywhere on the page
- [ ] **DSG-07**: Countdown, address, and video never gated behind an animation
- [ ] **DSG-08**: Passes the full pre-flight matrix in the design-taste skill
- [ ] **DSG-09**: No DTU logo reproduced, and a footer line stating no affiliation, in both languages

### Delivery

- [ ] **DEL-01**: Deploys to GitHub Pages from `main`, no build step
- [ ] **DEL-02**: Works on iOS Safari, Android Chrome, and desktop Chrome and Firefox
- [ ] **DEL-03**: Usable on a mid-range phone on mobile data
- [ ] **DEL-04**: Open Graph tags, so the link preview in a chat looks intentional
- [ ] **DEL-05**: Favicon and page title matching the joke
- [ ] **DEL-06**: README documents how to change the date and fill in each placeholder

## v2 Requirements

- **V2-01**: Photo moderation or delete-my-photo control
- **V2-02**: Album download as a zip after the party
- **V2-03**: RSVP with headcount
- **V2-04**: Spotify collaborative playlist embed
- **V2-05**: Guestbook messages
- **V2-06**: Photo gallery lightbox with swipe

## Out of Scope

| Feature | Reason |
|---|---|
| Real authentication | Explicitly ruled out. A party does not need accounts. |
| Server-side logic | GitHub Pages is static. A backend is another thing to break party week. |
| Hard 5-photo enforcement | Soft limit is correct for the audience. Clearing storage resets it, and that is fine. |
| True Kahoot secrecy | Page source is public. "Fun to find" is the real goal. |
| Google Maps JavaScript API | Keyless embed does the job with no API key and no billing account. |
| RSVP tracking | Not requested. Guest list lives in chat. |
| DTU logo or branding claims | Personal invitation, not a DTU communication. |
