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

### Enrollment

The host needs to know who is coming. Framed as course registration, which is
what the parody was already pretending to be.

- [ ] **ENR-01**: Enrollment form collects name, plus how many people they are bringing
- [ ] **ENR-02**: Optional free text field, for dietary notes or a message
- [ ] **ENR-03**: Submission writes to a Supabase table, no login required
- [ ] **ENR-04**: Enrollment doubles as identity capture, so no separate name prompt exists anywhere on the site
- [ ] **ENR-05**: Returning enrolled guest sees their own registration, not an empty form
- [ ] **ENR-06**: Guest can edit or withdraw their enrollment
- [ ] **ENR-07**: Confirmed count is visible on the page, since a filling course is more persuasive than an empty one
- [ ] **ENR-08**: Optional attendee list, showing first names only, controlled by a config flag
- [ ] **ENR-09**: Validation on blur, errors below the field, wired with `aria-describedby`
- [ ] **ENR-10**: Submitting states: idle, submitting, success, failure, with no silent failure
- [ ] **ENR-11**: Host can read the guest list straight from the Supabase table dashboard, with no admin UI to build
- [ ] **ENR-12**: With Supabase not configured, the form explains that enrollment opens shortly rather than erroring
- [ ] **ENR-13**: Rate limited well enough that a bored guest cannot enroll four hundred people

### WhatsApp group

Minimum effort for the guest, and one config value for the host.

- [ ] **WA-01**: Group invite link lives in `config.js` as a single value
- [ ] **WA-02**: Presented immediately on successful enrollment, as a large one tap button, at the moment the guest is most willing
- [ ] **WA-03**: Joining is one tap, never a QR code, an instruction, or a number to save
- [ ] **WA-04**: Link stays reachable afterwards for anyone who tapped past it
- [ ] **WA-05**: Framed in the parody as the course announcement channel
- [ ] **WA-06**: Section is absent, not broken, when no link is configured

### Enrollment nudge

The site should push an attending guest to actually enroll, without becoming
irritating enough that they close the tab.

- [ ] **NDG-01**: Persistent bar, pinned bottom on mobile, with two states: "not enrolled" shows enroll, "enrolled" shows join the group
- [ ] **NDG-02**: Bar never covers the countdown, the address, or the door video
- [ ] **NDG-03**: Enroll is one of the two hero actions, not buried down the page
- [ ] **NDG-04**: Registration deadline shown, and the parody makes the urgency feel institutional rather than pushy
- [ ] **NDG-05**: Confirmed count acts as social proof, and only appears once the number is not embarrassing
- [ ] **NDG-06**: Once enrolled, every nudge stops permanently. Nagging an enrolled guest is the fastest way to lose them.
- [ ] **NDG-07**: Nudge escalates as the date approaches, and it is the copy that escalates, not the frequency
- [ ] **NDG-08**: Bar is dismissible for the session, and it respects that choice

### Identity

- [ ] **ID-01**: Identity is captured by the enrollment form, not by a separate prompt
- [ ] **ID-02**: Name and a generated UUID persist in `localStorage`
- [ ] **ID-03**: Return visits greet the guest by name with no prompt
- [ ] **ID-04**: Guest can change or clear their name
- [ ] **ID-05**: Identity carries the photo attribution and the 5-photo count
- [ ] **ID-06**: Site works fully when `localStorage` is unavailable, for private browsing

### Language

- [ ] **LNG-01**: English, Italian and Danish toggle, switching all copy without a page reload
- [ ] **LNG-02**: Choice persists across visits
- [ ] **LNG-03**: English is the default landing language, with `auto` browser detection available as a one line config change
- [ ] **LNG-04**: Jokes written natively per language, never machine-translated
- [ ] **LNG-05**: Danish is a complete translation, not a token one. DTU classmates are the audience the parody targets most directly, and CourseBase vocabulary is what they recognise.
- [ ] **LNG-06**: All three languages hold identical key sets, verified rather than assumed
- [ ] **LNG-07**: Any key missing from a translation falls back to English, so a gap degrades to readable rather than to blank
- [ ] **LNG-08**: Dates format per locale, using each language's own conventions

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
- **V2-03**: Export the guest list as a printable sheet for the door
- **V2-04**: Spotify collaborative playlist embed
- **V2-05**: Guestbook messages
- **V2-06**: Photo gallery lightbox with swipe

## Out of Scope

| Feature | Reason |
|---|---|
| Real authentication | Explicitly ruled out. A party does not need accounts. |
| Admin UI for the guest list | The Supabase table dashboard already is one. Building a second is wasted work. |
| Email or SMS reminders | The WhatsApp group is the reminder channel. |
| Server-side logic | GitHub Pages is static. A backend is another thing to break party week. |
| Hard 5-photo enforcement | Soft limit is correct for the audience. Clearing storage resets it, and that is fine. |
| True Kahoot secrecy | Page source is public. "Fun to find" is the real goal. |
| Google Maps JavaScript API | Keyless embed does the job with no API key and no billing account. |
| DTU logo or branding claims | Personal invitation, not a DTU communication. |
