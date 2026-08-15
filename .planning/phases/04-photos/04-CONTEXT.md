# Phase 4: Photos - Context

**Gathered:** 2026-08-15
**Status:** Ready for planning
**Mode:** `--auto` — the owner chose "decide it all", the same instruction Phase 3 ran
under. Every decision below was selected by Claude and records the option chosen, why,
and what undoing it costs. Nothing here was confirmed in conversation.

The owner did flag three areas as the ones they care about, without wanting to answer
questions on them: **album look and order**, **upload mechanics**, and **when the album
opens**. Those three carry more decisions and more reasoning than the rest, deliberately.
If the owner disagrees with anything, those are the three places to look first, and all of
it is cheap to change before execution and expensive after.

<domain>
## Phase Boundary

Guests photograph the evening and the photographs land somewhere everyone can see. A
guest picks images from their camera roll, the browser shrinks them, they upload with
visible progress, and they appear in a shared album attributed by first name. Five per
person, counted before the upload starts, refused after that with a joke.

In this phase: the upload control and its two-step write to Supabase Storage and the
`photos` table (PH-01, PH-03, PH-05, PH-06, PH-07), the five-photo limit and its
remaining count (PH-02), the shared album read through `public.album` (PH-04), the
unconfigured state (PH-08), and the identity hand-off ID-05 promised.

Also owned here, because `supabase/schema.sql` says in writing that it is: **proving on
the wire that a sixth photo under one `guest_id` is refused with `photo_limit_reached`.**
The file states that half of section 4 is still unproven and that "Phase 4 owns that
proof, and it should carry it as an explicit task rather than assume it." See D-19.

Out of this phase: deleting a photo (V2-01), a lightbox with swipe (V2-06), moderation,
captions, download-all, and the degradation arc for `#photos` (phase 5, DSG-04). The
Kahoot easter egg is phase 5. `#photos` carries `data-zone="unhinged"` in `index.html`
already; phase 4 ships the structure the arc gets applied to, not the arc.

</domain>

<decisions>
## Implementation Decisions

### Who may upload

- **D-01:** **Upload is gated on a name and a `guest_id` in storage, not on the
  `enrolled` flag.** The `photos` table requires `guest_id uuid not null` and
  `name text not null`, and `public.album` renders the first token of that name. A guest
  with no name cannot be attributed, and D-18 of phase 3 forbids any separate name prompt
  anywhere on the site, so there is no honest way to accept an upload from someone the
  site has never met. Gating on `name` rather than on `enrolled` is not an accident: D-15
  of phase 3 deliberately kept `guest_id` and `name` in storage through a withdrawal,
  writing that "ID-05 hands both to the photo album in phase 4 and a guest who cannot come
  may still have photos from an earlier evening". This is that promise being collected.

- **D-02:** **A guest who has not registered sees the enrollment call to action in the
  photos section, never a name field.** One line in the institutional register plus a
  jump link to `#enrol`. Framed as a course regulation — submissions are accepted from
  registered students — which is the parody doing useful work rather than an apology for a
  missing feature. It also puts a second enrollment prompt on the page at the moment a
  guest most wants something, which is free headcount.

### When the album opens

- **D-03:** **Uploads open at a configured moment, `photos.opensAt`, and once open they
  never close.** `photos.pending.title` and `photos.pending.body` already promise this in
  all three languages ("Submission portal opens later" / "Uploads open closer to the
  date"), CD-04 already promises a countdown state that points at it, and an album opened
  in August collects nothing but jokes before the evening it exists to document. Default
  the value to the party start minus three hours, so guests arriving early can photograph
  the setup.
  — **Reversibility:** reversible — it is one config line, and `null` means open now.

- **D-04:** **The gate is evaluated against the same fixed-offset Europe/Copenhagen
  arithmetic the countdown already uses, never against the browser's local timezone.** A
  guest whose phone is set to a different timezone must not be locked out, and the
  countdown already solved this exact problem in phase 1. Reuse that code path rather than
  writing a second one that can disagree with it.

- **D-05:** **The closed panel states the opening moment as text, and the gate is one
  config line the owner can blank from their phone.** A phone with a wrong *date* is a
  real case that no amount of timezone arithmetic fixes, and it would show up exactly
  once, on the night, when nobody is at a laptop. The recovery has to be visible and
  trivial: the panel says when it opens, and `photos.opensAt: null` opens it immediately.
  This is the honest price of the gate, and it is written in the config comment rather
  than discovered.

- **D-06:** **Closed means the pending panel only, with no album below it.** There is
  nothing to show before the party, and half a section is worse than a whole placeholder.
  Phase 1 and 2 both established that a placeholder reads as deliberate; a working album
  showing zero items does not.

### The album

- **D-07:** **A grid of square thumbnails, with the institutional register in the chrome
  around it rather than in each row.** The alternative considered and rejected was an
  evidence register echoing the `.facts` definition list — a numbered log of submissions.
  It is funnier on paper and worse in the hand: it makes every photo small and turns
  looking at the evening into reading a table. The joke is already carried by the heading
  ("Documentation"), by the existing lede, and by a caption line above the grid. The
  photos get to be photos.

- **D-08:** **Each tile carries the uploader's first name as an overlay caption in the
  institutional micro-type (PH-04).** First name only, and that is structural rather than
  a choice: `public.album` applies `split_part(trim(name), ' ', 1)` server side, so a
  surname is not there to render. Same guarantee `attendees` gives the guest list.

- **D-09:** **Newest first.** `GET /rest/v1/album?select=first_name,storage_path,created_at&order=created_at.desc`.
  During the evening the interesting photo is the one just taken, and a guest who has just
  uploaded wants to see their own submission confirm at the top rather than hunt for it.

- **D-10:** **Every tile is a plain `<a>` to the public storage URL, opening in a new
  tab.** This is the deliberate non-lightbox. V2-06 defers "photo gallery lightbox with
  swipe", and the browser's own image viewer already gives pinch zoom, save, and share for
  zero code and zero bytes. A half-built lightbox would be worse than the native one.

- **D-11:** **Fixed aspect-ratio tiles with `loading="lazy"`, no pagination.** The index
  rows are tiny, the images are what cost, and `loading="lazy"` plus a reserved box is the
  whole solution: nothing below moves as images arrive, and nothing off screen is paid
  for. This is the same no-reflow guarantee D-09 of phase 2 made for the map slot.

- **D-12:** **The album refetches after a successful upload, and on nothing else.** No
  polling. A guest who wants to see what other people posted reloads the page. Polling a
  view on congested party mobile data is a cost with no matching benefit, and the one
  refresh that actually matters is seeing your own photo land.

- **D-13:** **An empty album shows the upload control and one deadpan line, not a hidden
  section.** This deliberately departs from D-20 of phase 3, which hid the headcount below
  a threshold because an empty course is less persuasive than no number. The photo case is
  the opposite: an empty album during the party wants a first uploader, and the
  institutional register has an honest way to say so ("No submissions on record") that
  does not read as an empty room.

- **D-14:** **The album failing to load is silent, and the upload control still works.**
  Same rule as D-22 of phase 3. The two are independent: a guest can submit evidence
  without being able to read the register.

### Upload mechanics

- **D-15:** **`<input type="file" accept="image/*" multiple>` — a guest with five photos
  picks five once.** If three remain and they pick five, the first three are accepted and
  the extra two are named in the refusal message. Silently dropping files a guest chose is
  the failure PH-05 exists to forbid, in a quieter form.

- **D-16:** **Every file is re-encoded to JPEG at longest edge 1600px, quality 0.82
  (PH-06).** Configurable as `photos.maxEdgePx` and `photos.jpegQuality`. 1600px is more
  than any phone screen shows and prints acceptably at postcard size, and it lands a
  typical photo around 300 to 500KB, which uploads in seconds on a party's congested
  connection. 2048 at 0.9 is prettier and roughly double the bytes, for an album that is
  looked at on phones. Re-encoding everything is also what makes HEIC and PNG screenshots
  land as something every browser can display, and it is what makes the single-MIME bucket
  policy in D-22 correct rather than restrictive.

- **D-17:** **EXIF orientation is handled explicitly, with
  `createImageBitmap(blob, { imageOrientation: 'from-image' })` where available.** This is
  the single most visible way this phase can fail: get it wrong and every portrait iPhone
  photo lands sideways in the album, on the one night it matters. It gets its own line in
  the device pass (D-24) rather than being assumed to work.

- **D-18:** **Files upload one at a time, sequentially, with determinate per-file
  progress (PH-05).** Sequential keeps a mobile connection from fighting itself, makes
  progress honest, and means a failure at file four leaves files one to three genuinely
  uploaded rather than in an ambiguous partial state. The control reads "Uploading 2 of 3"
  above a bar for the current file.
  Determinate progress requires `XMLHttpRequest.upload.onprogress`; `fetch` has no upload
  progress event and never will. So **the storage PUT specifically uses XHR, and
  everything else stays on `sbRequest`.** This is a deliberate exception to D-06 of phase
  3, not a drift from it: an indeterminate spinner on a ten-second upload over party wifi
  is exactly the "is this broken?" moment PH-05 was written against.
  — **Reversibility:** reversible — it is one function, and dropping back to `fetch` costs
  only the progress bar.

- **D-19:** **The write is storage PUT first, then the `photos` row insert, and the
  sixth photo is refused client side before either.** Order matters and the two failure
  modes are not symmetric: a row inserted before a failed PUT points at a file that does
  not exist and renders a broken tile in everyone's album forever, while a PUT before a
  failed insert leaves an orphaned object that nobody can see. There is no delete policy
  for anyone, on either, so neither can be cleaned up from the browser — the orphan is the
  cheaper of the two and is accepted, documented, and clearable by the owner from the
  dashboard.
  The database trigger stays as the floor and the client must never reach it on the happy
  path. When it *is* reached — a local count that drifted below the truth — the insert
  fails with `photo_limit_reached`, and the client answers by setting its local count to
  five and showing the refusal. Self-healing rather than a dead end.

- **D-20:** **Storage paths are `{yyyy-mm-dd}/{fresh-uuid}.jpg`, with the UUID unrelated
  to `guest_id`.** `supabase/schema.sql` §9 says this in writing: "the storage bucket in
  section 6 is public, so a storage_path is every bit as readable as a column. Put a
  guest_id inside a file name and you have published, straight through this view, the
  exact credential this section stopped publishing. Name the uploads something that says
  nothing." The date prefix costs nothing and makes the dashboard navigable. `storage_path`
  is `unique` on the table, so a collision is refused rather than silently overwriting.
  — **Reversibility:** one-way — a `guest_id` that reaches a filename is published through
  `public.album` to anyone holding the publishable key, and renaming the object afterwards
  does not un-publish it. Phase 3's D-35 built an amend function on the premise that this
  id stays unread; breaking that premise re-opens every registration to rewriting.

- **D-21:** **Validation before the decode, not just before the wire (PH-07).** Refuse
  anything whose type is not `image/*`, anything over `photos.maxFileSizeMb` (12), and
  anything zero-byte, all *before* the canvas work — a 60MB file will exhaust memory on a
  mid-range phone during the decode, long before any of it reaches the network. A file the
  decoder cannot read is refused with a readable message rather than uploaded as bytes
  nothing can display.
  Note that `photos.maxFileSizeMb` and the bucket's own size limit in D-22 are two
  different numbers doing two different jobs — one protects the phone's memory before the
  downscale, the other protects the bucket after it. Say so in the config comment so that
  nobody later "reconciles" them into one.

### The five-photo limit

- **D-22:** **The remaining count comes from `localStorage`, and that is structural
  rather than lazy (PH-02).** The site cannot read the `photos` table at all, and
  `public.album` deliberately has no `guest_id` column to filter on. So the count lives
  under the existing `c03102.` prefix as an integer, and clearing storage resets it. The
  project already accepted exactly this in `REQUIREMENTS.md`: "Hard 5-photo enforcement |
  Soft limit is correct for the audience. Clearing storage resets it, and that is fine."
  The database trigger is the real floor and it is per `guest_id`, which clearing storage
  also resets. Documented as a deliberate limit, the same way D-30 of phase 3 documented
  the enrollment one, rather than papered over.

- **D-23:** **The sixth photo is refused as a course regulation, never as an error and
  never as an apology.** The roadmap's done-when sentence ends "and the sixth is refused
  with a joke rather than an error", so the register is locked even though the words are
  not: it reads like the course rejecting further evidence for everyone's protection. The
  existing lede already sets this up ("Maximum five per person, which is a limit chosen to
  protect everyone") and the refusal should land as its punchline.

### Security, with the gate armed

- **D-24:** **The bucket gets a server-side MIME allow-list and size limit, and this is
  the one real control available.** Honest statement of the model first: the publishable
  key is in public JS by design, the storage insert policy is `with check (bucket_id =
  'party-photos')`, and every client-side check in D-21 protects a guest from their own
  mistakes and an attacker from nothing at all. What *does* hold against a direct API call
  is the bucket record itself. Since D-16 re-encodes everything to JPEG, set
  `allowed_mime_types = '{image/jpeg}'` and `file_size_limit` to roughly 3MB on
  `party-photos`, which turns "anyone with the key can upload any bytes" into "anyone with
  the key can upload a JPEG under 3MB". That is a genuine reduction, it is enforced by
  Supabase rather than by us, and it costs one line.
  The existing `insert into storage.buckets ... on conflict (id) do nothing` will not
  apply this to a bucket that already exists, so it becomes `on conflict (id) do update
  set ...`, in the same idempotent shape D-04 of phase 3 used for the `withdrawn` column.
  — **Reversibility:** one-way in the same sense phase 3's schema changes were — the owner
  must re-run `supabase/schema.sql` in the SQL editor. Until they do, the bucket keeps
  accepting anything, and the site still works, so this must be surfaced as an owner
  action and not buried.

- **D-25:** **Nothing this phase adds may hand out a `guest_id` or a full name.** The
  standing invariant from `supabase/schema.sql` §3 and §9, restated here because this is
  the phase most likely to break it: the album read is the view and never the table, the
  filename says nothing (D-20), and no `guest_id` is rendered into the page, into a URL,
  or into a link a guest could share. Phase 3's D-35 amend function is only safe while
  this holds.

### Proving what the schema says is unproven

- **D-26:** **The sixth-photo refusal is proved on the wire, as an explicit task, and the
  test rows are cleaned up by the owner afterwards.** `supabase/schema.sql` states that
  "one half of section 4 is still unproven on the wire: that a sixth photo under one
  guest_id is refused with photo_limit_reached", that proving it means writing five real
  rows, and that nothing in that file can delete them again. So the proof writes five
  obviously-marked test images under a throwaway `guest_id`, confirms the sixth is refused
  with `photo_limit_reached` rather than with 42501, and then the owner removes the five
  rows and five storage objects from the dashboard — with the removal proved through
  `public.album`, never through the blocked table. This is exactly the shape the `ZZTEST
  DeleteMe` cleanup took in phase 3 (D-34), and it worked.

- **D-27:** **A 201 is not proof, and neither is a 200 (carried forward from phase 3's
  D-07).** Every claim this phase makes about the wire is proved by posting and then
  reading back through a path allowed to see it, never by a status code. Phase 3's
  research and the schema's own header both record cases where a request was answered
  cleanly and did nothing — the `PATCH` that returned 204 changing zero rows, and the
  photo insert that was refused with 42501 for a day while every read probe in the phase
  passed "because no probe ever posted a photo".

### Motion and verification

- **D-28:** **MOTION_INTENSITY 3, the same restraint phases 2 and 3 held.** `#photos`
  sits in the `unhinged` zone and phase 5 owns the arc (DSG-04). What is permitted here:
  tile reveal on load, the progress bar, state transitions between idle, uploading,
  success and refusal, button `:active` scale, focus rings. `transform` and `opacity`
  only, per DESIGN-BRIEF.

- **D-29:** **Every animation ships with its `prefers-reduced-motion` fallback in this
  phase, not retrofitted in phase 5.** The rule phase 2 set as its D-22 and phase 3 kept
  as its D-32. It has held twice.

- **D-30:** **`04-DEVICE-PASS.md`, in the shape phases 2 and 3 used, and it must cover the
  things only a real phone can answer:** a portrait iPhone photo landing right way up
  (D-17), selecting HEIC from the iOS camera roll, multi-select on iOS Safari and Android
  Chrome, progress remaining visible and honest on a throttled connection, the sixth-photo
  refusal, 44px touch targets on the upload control, and the album grid at 320px width.

### Claude's Discretion

- Exact copy in all three languages, written natively per language rather than translated.
  New keys for the upload control, its errors, the progress states, the refusal, the
  remaining count, the not-registered state and the closed state, added to all three
  tables at identical key sets.
- Tile size, gutter, and column count at each breakpoint, and whether the grid is square-
  cropped or aspect-preserving within a fixed box.
- Whether the upload control sits above or below the album.
- The visual treatment of the caption overlay, and whether it is always visible or on
  hover and focus only.
- Whether the remaining count is a sentence, a chip, or part of the button label.
- The precise wording of the owner-facing comments in `config.js` and
  `supabase/schema.sql`.
- The exact default for `photos.opensAt` beyond "party start minus three hours" if the
  arithmetic reads badly in the config file.

### Folded requirements

None. PH-01 to PH-08 and ID-05 are all named in this phase's scope, and no orphaned
requirement matches this domain.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Database and security contract
- `supabase/schema.sql` — the live, applied schema. Read the header comment in full: it
  records what is applied, what is verified on the wire, and what is deliberately still
  unproven. §2 is the `photos` table shape, §3 is the honest threat model, §4 is the
  five-photo trigger and why it carries `security definer`, §6 is the storage bucket and
  its policies, §9 is the `public.album` view and the naming warning behind D-20. This
  phase modifies §6 (D-24) and the owner must re-run the file.
- `.planning/STATE.md` — live deployment state, verified Supabase RLS behaviour, the
  `enrollmentReady()` gotcha, and the accumulated decision log.

### Project contract
- `.planning/REQUIREMENTS.md` — PH-01 to PH-08, ID-05, CD-04, plus cross-cutting CFG-01,
  CFG-03, DSG-05, DSG-06, DSG-07, LNG-06, LNG-07. Also the out-of-scope table entry
  "Hard 5-photo enforcement", which D-22 depends on, and V2-01 / V2-06 which fence the
  deferred list.
- `.planning/ROADMAP.md` §Phase 4 — the scope fence and the gate re-arm note, already
  applied: `code_review`, `security_enforcement` and `api_coverage_gate` are all `true` in
  `.planning/config.json`.
- `.planning/PROJECT.md` — static hosting and no-build-step constraints, and the
  out-of-scope list that rules out moderation and hard limits.
- `.planning/phases/03-enrollment-identity-and-the-group/03-CONTEXT.md` — D-06 (the wire
  helper this phase reuses), D-07 (a status code is not proof), D-15 (identity survives
  withdrawal, for the album), D-18 (no separate name prompt), D-30 (how a soft limit is
  documented honestly), D-35 (why `guest_id` must stay unread).
- `.planning/phases/02-practical-information/02-CONTEXT.md` — the placeholder discipline
  and the no-reflow guarantee D-11 continues.

### Design contract
- `.planning/DESIGN-BRIEF.md` — palette, type scale, the degradation arc and its zone
  table (`#photos` is `unhinged`), hard constraints. Dark theme lock, single DTU red
  accent, zero em dashes, 44px touch targets, `transform`/`opacity` only.
- `.claude/skills/design-taste-frontend/SKILL.md` — routed into the researcher,
  ui-researcher and planner via `agent_skills` in `.planning/config.json`.
- `.claude/skills/high-end-visual-design/SKILL.md` — routed the same way.
- `.claude/skills/design-taste/reference/pre-flight.md` — the matrix every UI change runs
  before it ships (DSG-08).
- `.claude/skills/design-taste/reference/interaction-states.md` — the eight states each
  interactive element owes. The upload control has more states than anything else on this
  site: idle, empty, selecting, validating, uploading, partial, success, refused, failed.
- `.claude/skills/design-taste/reference/motion.md` — easing curves and the reduced-motion
  contract for D-28 and D-29.

### External API surface
- Supabase Storage REST: `POST {url}/storage/v1/object/{bucket}/{path}` to write,
  `{url}/storage/v1/object/public/{bucket}/{path}` to read from a public bucket. The
  researcher should confirm the exact upload verb, the `x-upsert` header semantics, and
  whether the publishable key travels in `apikey` alone here as it does on PostgREST
  (phase 3 `03-RESEARCH.md` §Wire Contract W1 proved `Authorization: Bearer` fails on
  PostgREST for this key format; Storage is a different service and must be re-proved,
  not assumed).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `sbRequest(method, path, body, prefer, timeoutMs)` at `app.js:1289` — the whole wire
  helper. Resolves to `{ ok, status, code, body }` and never rejects, races the fetch
  against a timeout that resolves so no call site can be left locked, sends the key in
  `apikey` only, and reads the body as text before parsing so an empty 201 does not throw.
  D-06 of phase 3 promised phase 4 would reuse it and it should. The storage PUT is the
  one documented exception (D-18).
- `sbConfigured()` at `app.js:1248` and `sbUrl()` / `sbKey()` at `app.js:1238-1242` — the
  configured check PH-08 needs, already written to accept either key name.
- `pendingBlock(titleKey, bodyKey)` at `app.js:320` — builds the `.pending` placeholder
  used in phases 1 and 2. The unconfigured and the not-yet-open states both use it.
- `identity` at `app.js:1189` — `get` / `save` / `clear` over the `c03102.` prefix. D-01
  reads `guest_id` and `name` from `identity.get()`. The photo count is a new key under
  the same prefix and should be added to `identity`'s documented layout comment rather
  than written to storage from somewhere else.
- `store` at `app.js:21` — the `localStorage` wrapper with the in-memory fallback map, so
  a private-browsing guest still gets a working session.
- `t(key)` at `app.js:55` — i18n lookup with English fallback.
- `$` / `$$` at `app.js:12` — querySelector helpers.
- `toast()` at `app.js:3621` — transient confirmations. Not for the primary success
  moment, which is a state change in the section body (the rule D-11 of phase 3 set).
- `formatDate()` / `daysUntil()` at `app.js:1074` — localised to `en-GB` / `it-IT` /
  `da-DK` on `Europe/Copenhagen`. D-05's closed panel needs the opening time formatted.
- The countdown's fixed-offset time arithmetic (`startMs` and `formatSchedule()` around
  `app.js:262`) — D-04 requires the `opensAt` gate reuse this, not re-derive it.
- `.btn`, `.btn--primary`, `.btn--ghost` in `styles.css` — the contrast-checked button
  system.
- `.section__h`, `.section__lede`, `.wrap`, `.pending`, `.pending__t`, `.pending__b` —
  section scaffolding already in place.
- The map slot's `IntersectionObserver` pattern at `app.js:607-670` — created once per
  slot, never on the update path, and guarded so a missing capability degrades to an eager
  mount rather than to absent. If the album ever needs lazy mounting, copy that shape.

### Established Patterns
- Every volatile value lives in `config.js` and nowhere else (CFG-01), with inline
  comments written for a non-programmer. `photos.bucket`, `photos.table`,
  `photos.maxPerGuest` (5) and `photos.maxFileSizeMb` (12) already exist and are already
  documented. New keys: `opensAt`, `maxEdgePx`, `jpegQuality`.
- All guest-facing copy lives in `copy.js`, in all three tables at identical key sets
  (LNG-06), English as the fallback (LNG-07).
- Zero em dashes in anything a guest sees (DSG-06).
- Sections render their body from JS into a container that already exists in `index.html`
  holding a `.pending` block. `#photos-body` is exactly that container, already in place.
- Render functions join the chain inside `applyLanguage()` so a language switch re-renders
  without a reload (LNG-01). `renderPhotos()` joins the eight existing calls at
  `app.js:124-142`.
- Placeholders read as deliberate, never as broken.
- Phases 2 and 3 both closed with a device pass file that caught real problems.

### Integration Points
- `#photos` section and `#photos-body` container exist at `index.html:296-305`, holding
  the phase 1 pending block with `photos.pending.title` and `photos.pending.body`. The
  upload control and album mount here. **There is no `renderPhotos()` and no reference to
  `#photos-body` anywhere in `app.js` today** — this section is untouched ground, unlike
  `#enrol` which phase 1 had partly wired.
- `nav.photos` at `index.html:65` links to `#photos` and already reads "Documentation".
- `obj.5` at `index.html:203` — the learning objective "Document the evening
  photographically, within the stated upload limit" is already on the page and is the
  five-photo limit's first appearance.
- Copy keys already seeded in all three languages and in use: `photos.heading`,
  `photos.lede`, `photos.pending.title`, `photos.pending.body`.
- `config.js:211-217` — the `photos` block, with the comment explaining why the shared
  Supabase credentials live under `photos` rather than under enrollment. Extending this
  block is the natural home for D-03, D-16 and D-21's new keys.
- CD-04's "it is over, upload your photos" countdown state and D-03's `opensAt` gate are
  describing the same moment from two sides. Whichever plan touches one should check the
  other agrees rather than letting the countdown invite guests to a closed portal.

### Flagged consideration
- The album is public, permanent, and undeletable by anyone including the owner from the
  browser. There is no delete policy on `photos` and none on `storage.objects`, by
  design. A guest who uploads something they regret has no recourse on the site, and the
  owner's only recourse is the Supabase dashboard. V2-01 ("photo moderation or
  delete-my-photo control") is the acknowledgement that this is known and deferred, not
  overlooked. It is worth one honest line near the upload control, in the same register
  the note field got in phase 3.

</code_context>

<specifics>
## Specific Ideas

- The done-when sentence is the whole phase: "a phone can upload five photos and see them
  in the album, and the sixth is refused with a joke rather than an error." Every decision
  above was weighed against it. Note what it does not say — it does not ask for a
  lightbox, a delete button, captions, or moderation.
- The parody register carries through the upload. Photographs are evidence, submissions
  are made to the course, the limit is a regulation, and the refusal is the punchline the
  existing lede has been setting up since phase 1.
- The three areas the owner flagged as caring about are album look and order (D-07 to
  D-14), upload mechanics (D-15 to D-21), and when the album opens (D-03 to D-06). If
  anything gets reviewed before execution, review those.
- Two owner actions come out of this phase and they should be presented as one: re-run
  `supabase/schema.sql` for the bucket policy in D-24, and confirm or change
  `photos.opensAt`. Neither blocks shipping — the site works un-migrated with an open
  bucket, exactly as phase 3 shipped correct in its un-migrated state (D-36).

</specifics>

<deferred>
## Deferred Ideas

- Deleting or moderating a photo — V2-01, and structurally impossible from the browser
  today since no delete policy exists on either the table or the bucket.
- Lightbox with swipe — V2-06. D-10 ships the native browser viewer instead.
- Captions, tagging, or reactions on a photo — no requirement asks for them.
- Download-the-whole-album — the bucket is public, so the owner already has it from the
  dashboard, and no guest has asked for it.
- The degradation arc and spectacle motion for `#photos` — phase 5 (DSG-04). This is the
  `unhinged` zone and it will get the loudest treatment on the page; phase 4 ships the
  structure that treatment is applied to.
- Kahoot easter egg — phase 5.
- Server-side image processing, thumbnails, or a CDN transform — needs a service, and D-16
  makes the originals small enough that it would buy nothing.
- Any per-guest view of "my photos" — `public.album` deliberately carries no `guest_id`,
  and adding one back would republish the credential D-25 exists to protect.

</deferred>

---

*Phase: 04-photos*
*Context gathered: 2026-08-15*
