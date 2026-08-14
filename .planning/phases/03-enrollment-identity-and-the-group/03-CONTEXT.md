# Phase 3: Enrollment, identity, and the group - Context

**Gathered:** 2026-08-14
**Status:** Ready for planning
**Mode:** `--auto` — every decision below was auto-selected by Claude at the owner's
explicit instruction ("my effort and involvement in this is 2 out of 10, do the research
and validation yourself"). Each decision records the option chosen and why. Nothing here
was confirmed by the owner in conversation. Anything the owner disagrees with is cheap to
change before execution and expensive after.

<domain>
## Phase Boundary

Deliver the headcount. A guest opens the site, registers in one short form, and is handed
the WhatsApp group in the same breath. The registration is also the whole identity system,
so no part of the site ever asks a guest their name again.

In this phase: the enrollment form and its Supabase write (ENR-01 to ENR-03, ENR-09,
ENR-10, ENR-12), identity capture and persistence (ENR-04, ID-01 to ID-06), the returning
guest view with edit and withdraw (ENR-05, ENR-06), social proof (ENR-07, ENR-08), the
WhatsApp handoff (WA-01 to WA-06), and switching on the nudge bar that phase 1 built but
deliberately left dormant (NDG-01 to NDG-08).

Also folded in, because they are enrollment requirements with no other home in the roadmap:
the host's dashboard read path (ENR-11) and enrollment abuse limits (ENR-13). See
`## Folded requirements` under decisions.

Out of this phase: photo upload and the album (phase 4, which consumes the identity this
phase creates), the degradation arc and spectacle motion (phase 5), the Kahoot easter egg
(phase 5).

</domain>

<decisions>
## Implementation Decisions

### The database is already live, and its shape constrains everything

- **D-01:** **The schema is applied and verified against project `aplaxdplwnnlezffatal`.**
  `enrollments`, `photos` and the `attendees` view all exist and respond. This phase writes
  against a real database from the first commit, not against a placeholder. Verified
  behaviours from `.planning/STATE.md` that the plan must treat as fact: a guest can insert
  (201), the raw `enrollments` table reads back `[]` for the publishable key even when it
  holds rows, the `attendees` view exposes first name and guest count only, and anonymous
  delete is refused.

- **D-02:** **There is no SELECT policy on `public.enrollments`, and this phase does not add
  one.** Notes stay private to the host. The consequence is structural and drives D-03 and
  D-04: the site can never read a guest's own registration back out of the database. A
  blocked read returns `[]`, not an error, so any code that "checks whether I am enrolled"
  by querying the table will silently conclude "no" forever.
  — **Reversibility:** one-way — adding a SELECT policy later republishes every guest's
  free-text note to anyone holding the publishable key, which is the one thing the schema
  comment says the model exists to prevent. Undoing it does not un-publish the notes.

- **D-03:** **`localStorage` is the sole source of truth for "this is your registration".**
  On success the browser stores `guest_id`, `name`, `extra_guests`, `note` and the existing
  `enrolled` flag. The returning-guest view (ENR-05) renders from storage, never from a
  fetch. This is the only design the RLS model permits.

- **D-04:** **Withdrawal is a soft flag, not a DELETE.** The schema deliberately grants no
  DELETE policy on `enrollments`. ENR-06 is satisfied by an UPDATE that marks the row
  withdrawn. This requires a schema change: add `withdrawn boolean not null default false`
  to `public.enrollments`, and filter it out of the `public.attendees` view so a withdrawn
  guest stops counting toward social proof. Written as `alter table ... add column if not
  exists`, because `create table if not exists` will not add a column to the live table and
  the file's "safe to run more than once" promise must survive.
  — **Reversibility:** one-way — the owner must re-run `supabase/schema.sql` in the SQL
  editor for withdrawal to work at all. Until they do, the amend call fails against a column
  that does not exist. This is an owner action and must be surfaced as one, not buried. The
  same re-run also installs the D-35 RPC, so it is one action, not two.

- **D-05:** **The host's read path is the Supabase dashboard, and this phase leaves a
  correct query behind (ENR-11).** No admin UI. `supabase/schema.sql` already ends with a
  headcount query; update it so it excludes withdrawn rows, and say plainly in the comment
  that Table Editor > enrollments is where the guest list lives.

### Talking to Supabase

- **D-06:** **Plain `fetch` against PostgREST. No `supabase-js`, no CDN script tag.**
  The project's stated constraints are no build step and fewer moving parts, and it already
  chose a keyless map embed over the Maps JavaScript API for exactly this reason. Three
  request shapes cover the whole phase, and phase 4 reuses the same helper for storage:
  - insert: `POST {url}/rest/v1/enrollments`, `Prefer: return=minimal`
  - ~~amend: `PATCH {url}/rest/v1/enrollments?guest_id=eq.{uuid}`~~ — **superseded by D-35.
    Probe-proven impossible.** See below.
  - social proof: `GET {url}/rest/v1/attendees?select=first_name,extra_guests`
  **Amended by research (2026-08-14, `03-RESEARCH.md` §Wire Contract W1):** the key goes in
  `apikey` only, not in `Authorization: Bearer`. A `Bearer`-only request returns 401 against
  this project; both headers together work today but ride a documented exception clause, and
  `apikey` alone is the only shape correct for both the publishable and legacy anon key
  formats that `config.js` promises the owner.
  The `return=minimal` half of this decision was **vindicated**: `return=representation` and
  `return=headers-only` both fail with a 401 and the row is not inserted, because the implied
  read-back has no SELECT policy to satisfy. Do not relax it.
  — **Reversibility:** costly — swapping to `supabase-js` later means rewriting every call
  site in `app.js` and adding a third-party script to a page whose whole point is loading
  fast on bad mobile data outdoors.

- **D-07:** **A 201 is not proof, and neither is a 204.** `.planning/STATE.md` records this
  as a live gotcha: blocked reads return `[]` and blocked deletes return `204`, so both look
  like success. Any verification of this phase's write path proves itself by inserting a row
  and then confirming it through a path that is actually allowed to see it (the `attendees`
  view, or the owner's dashboard), never by reading a status code.

- **D-08:** **Every network call has a timeout and a visible failure state.** A guest
  outdoors on mobile data is the design target. A submit that hangs forever is the failure
  ENR-10 exists to forbid, so the fetch is wrapped with an abort timeout and the form lands
  in its `failure` state with the guest's typed values still in the fields.

### The form

- **D-09:** **Three fields: name, how many extra people, an optional note.** Bounds come
  from the live schema and from `config.js`, not from invention: name trimmed to 1..60
  characters, extra guests `0..enrollment.maxGuestsPerPerson` (currently 2, and the database
  independently caps at 10), note at most 500 characters. The current UI language is stored
  in `lang` on the row, which the schema already accepts as `'en' | 'it' | 'da'`.

- **D-10:** **Validation fires on blur, errors render below the field, wired with
  `aria-describedby` (ENR-09).** Nothing is validated while the guest is still typing the
  first character of their name. Re-validation on input happens only for a field already
  showing an error, so an error clears as soon as it is fixed.

- **D-11:** **Four submit states, and the guest is never left guessing (ENR-10):** idle,
  submitting (button disabled, its label swapped, form inputs locked), success, failure
  (message, retained input, retry available). The button is never left spinning with no
  outcome. Reuse the existing `toast()` for the incidental confirmations, not for the
  primary success moment, which is a full state change in the section body.

- **D-12:** **The unconfigured state already exists and stays (ENR-12).** `#enrol-body`
  currently holds a `.pending` block with `enrol.pending.title` and `enrol.pending.body`
  in all three languages. That block is the not-configured branch. Credentials are set today,
  so this path is a safety net rather than the shipping state, and it must keep working if
  the owner ever blanks the key.

- **D-13:** **`enrollmentReady()` in `app.js` is not to be touched.** It gates the nudge bar
  on `#enrol-form` existing in the page rather than on credentials, because credentials alone
  once made the live site nudge guests toward a placeholder. This phase renders `#enrol-form`
  and the bar switches itself on. No flag to remember to flip, no config toggle to add.
  `.planning/STATE.md` records this as a gotcha; treat it as a hard constraint.

### Identity

- **D-14:** **One `guest_id` UUID, generated in the browser, written once, kept forever
  (ID-01, ID-02).** Generated with `crypto.randomUUID()` where available and a
  `crypto.getRandomValues` fallback for older Safari. It never appears in the page, never in
  a URL, and never in a link the guest could share. It is stored under the existing
  `c03102.` key prefix alongside `lang`, `enrolled` and `wa_joined`.

- **D-15:** **Withdrawing clears the registration, not the identity.** `enrolled` goes to
  `0` and the row is flagged withdrawn, but `guest_id` and `name` stay in storage, because
  ID-05 hands both to the photo album in phase 4 and a guest who cannot come may still have
  photos from an earlier evening. Re-enrolling reuses the same `guest_id`, which means the
  amend path (PATCH on `guest_id`) resurrects the existing row rather than creating a second
  one. The `unique` constraint on `guest_id` makes this the only correct behaviour.

- **D-16:** **Changing the name is the edit path, not a separate control (ID-04).** ENR-06
  edit and ID-04 change-your-name are one screen. There is additionally a plain way to clear
  identity entirely, deliberately understated, for the guest who hands their phone to someone
  else.

- **D-17:** **`localStorage` being unavailable degrades to a working session, never to a
  broken page (ID-06).** The existing `store` wrapper swallows the throw and returns
  `null`/`false`. Add an in-memory fallback map behind the same interface so a private
  browsing guest can still enroll, still sees their success state, and still gets the
  WhatsApp handoff within that session. Nothing persists across a reload, and that is the
  correct and honest outcome. The site must not tell them anything is wrong.

- **D-18:** **No separate name prompt exists anywhere on the site (ENR-04, ID-01, ID-03).**
  A returning enrolled guest is greeted by name from storage. Any future feature that needs
  a name reads it from identity or does without.

### Social proof

- **D-19:** **One fetch of the `attendees` view serves both the count and the list.**
  `GET /rest/v1/attendees?select=first_name,extra_guests` returns everything needed for
  ENR-07 and ENR-08. Total is `rows + sum(extra_guests)`.

- **D-20:** **The count stays hidden below `enrollment.showCountFrom` (currently 8), and so
  does the list (ENR-07, NDG-05).** An empty course is less persuasive than no number at all.
  Below the threshold the block is absent, not a zero, and not a "be the first" line, which
  reads as an empty room.

- **D-21:** **The attendee list is first names only and gated by `enrollment.showAttendeeList`
  (currently `true`) (ENR-08).** The `attendees` view already truncates to the first
  whitespace-delimited token server side, so full names are structurally incapable of
  reaching the page. Rendered as data in the institutional register, echoing the `.facts`
  table rather than as a social feed.

- **D-22:** **Social proof failing to load is silent.** If the view fetch fails, the count
  and list are simply absent. Nobody standing outside a building needs an error message about
  a headcount widget.

### The WhatsApp handoff

- **D-23:** **The success state is the handoff (WA-02).** The moment the insert succeeds,
  the form is replaced in place by a success panel whose primary action is a large
  one-tap WhatsApp button. Not a toast, not a link in a paragraph, not a QR code, and never a
  number to save (WA-03). This is the moment the guest is most willing to tap one more thing.

- **D-24:** **A persistent `#wa` section is added to the page so the link stays reachable
  afterwards (WA-04).** The copy keys `wa.heading`, `wa.body` and `wa.cta` already exist in
  all three languages from phase 1 and are unused; this phase gives them their markup. The
  whole section is absent, not disabled and not broken, when `whatsapp.inviteUrl` is null
  (WA-06, and `config.js` already promises exactly this).

- **D-25:** **Framed as the course announcement channel (WA-05).** The existing copy already
  does this deadpan: practical updates go out in the group chat, address changes, delays, and
  the occasional photograph. Keep that register.

- **D-26:** **Tapping through counts as done.** `wireNudge()` already sets `wa_joined` when
  the bar's CTA is tapped in `group` state. The new inline and section CTAs set the same flag,
  so a guest who joins from the success panel is never nudged toward the group again.

### The nudge bar

- **D-27:** **The bar is built and correct already; this phase only makes it reachable.**
  `renderNudge()` in `app.js` implements both states, the four escalating deadline copies,
  the enrolled cutoff, session dismissal and the `wa_joined` cutoff. NDG-01 through NDG-08
  are largely satisfied by existing code, and the phase's job is to render `#enrol-form` so
  `enrollmentReady()` returns true, then verify each NDG requirement against real behaviour
  rather than re-implementing it.

- **D-28:** **`renderNudge()` must re-run when enrollment state changes, not only on language
  switch.** Today it is called from `applyLanguage()`. Enrolling, editing and withdrawing all
  change what the bar should say, so each of those paths calls the render chain. Likewise
  `renderDeadline()`, which hides the hero deadline line once a guest is enrolled.

- **D-29:** **The bar must not cover the countdown, the address, or the door video (NDG-02).**
  `body[data-nudge]` already exists as the hook for the bottom padding compensation. Verify on
  a real phone, in the same pass as D-33, rather than assuming.

### Abuse limits (ENR-13)

- **D-30:** **The real cap is `guest_id unique`, and it is honest about what it is.** One
  browser identity holds exactly one registration row; a second submit from the same browser
  amends rather than inserts. On top of that: the submit button locks for the duration of the
  request, `extra_guests` is bounded in the UI and again in the database `check`, and name and
  note lengths are bounded in both places. A determined person clearing storage in a loop can
  still create rows, and no amount of client-side code changes that on a static site with a
  public insert policy. Documented as a deliberate limit, not papered over. The owner's
  recourse is the dashboard.
  — **Reversibility:** reversible — if it is ever actually abused, the fix is a policy change
  in Supabase, not a code change here.

### Amendment after research (2026-08-14)

- **D-35:** **Amending a registration goes through a `security definer` RPC, not a PATCH.**
  This supersedes the amend half of D-06 and is the single most important finding of this
  phase's research. `PATCH /rest/v1/enrollments?guest_id=eq.{uuid}` was executed against the
  live project and returned **`204 No Content` with `Content-Range: */0`** — zero rows
  updated, value unchanged when read back through the `attendees` view. This is not a Supabase
  quirk, it is standard PostgreSQL: an UPDATE whose WHERE clause reads a column also requires
  SELECT rights on that relation, and D-02 deliberately grants none. Built as D-06 originally
  specified, the edit and withdraw buttons would have reported success and done nothing, on
  every device, forever, with no client-side signal that anything was wrong.

  The fix is `POST {url}/rest/v1/rpc/amend_enrollment`, a function that runs as its owner with
  `set search_path = ''`, touches only the row whose `guest_id` was passed in, never returns
  row contents, and returns an integer row count so the client can tell a real amendment from
  a no-op. **It adds no SELECT policy of any kind**, so D-02's one-way door stays shut and
  notes remain structurally unreadable by the publishable key. The threat model is unchanged:
  `supabase/schema.sql:83-86` already states that anyone holding a `guest_id` can amend that
  registration, and the RPC grants exactly that power and nothing more.

  Two alternatives were considered and rejected in `03-RESEARCH.md` §THE BLOCKER: a permissive
  SELECT policy (republishes every guest's note, which is the exact thing D-02 exists to
  prevent) and a header-scoped SELECT policy plus column grants (two mechanisms to
  misconfigure, and any later `grant all` silently re-opens the notes).
  — **Reversibility:** one-way — the function ships in `supabase/schema.sql` and the owner must
  re-run the file. It rides along with the `withdrawn` column D-04 already requires, so it
  costs no *additional* owner action, but until the re-run happens the RPC returns a clean
  `404 PGRST202` and edit/withdraw cannot work.

- **D-36:** **Enrollment itself has no dependency on the migration, and the phase must ship
  correct in the un-migrated state.** `POST /rest/v1/enrollments` works today, unchanged. Only
  edit and withdraw need the schema re-run. So the edit and withdraw controls render
  optimistically and degrade to an honest pending message on `PGRST202`, in the same register
  the rest of the site uses for things the owner has not set up yet. A guest can always enroll.

- **D-37:** **The success panel must have a defined, non-broken appearance with no WhatsApp
  button.** `whatsapp.inviteUrl` is still `null` and will be on the day this phase lands. The
  phase's headline "done when" sentence ends with "lands in the WhatsApp group with one more
  tap", so it is tempting to treat the linkless state as an edge case. It is the *shipping*
  state. Design it first, not last.

### Motion and visual register

- **D-31:** **MOTION_INTENSITY 3 for this phase, same restraint as phase 2.** `#enrol` sits
  in the `slipping` zone of the degradation arc, but the enrollment form is a form: it is the
  one place on the site where a guest is doing work with their thumbs, and spectacle there
  costs conversions. Permitted: state transitions between form and success panel, error
  reveal, button `:active` scale, focus rings, the nudge bar's existing slide. The arc lands
  in phase 5 as roadmapped.

- **D-32:** **Every animation added ships with its `prefers-reduced-motion` fallback in this
  phase, not retrofitted in phase 5.** Same rule phase 2 set as D-22, and it held.

### Verification

- **D-33:** **Verified on a real iOS Safari and a real Android Chrome before the phase
  closes.** Specifically: enrolling end to end in under 10 seconds on mobile data, the
  WhatsApp button actually opening the app, the nudge bar not covering the countdown or the
  address, 44px touch targets on every control, and validation errors being announced. Phase 2
  established this pattern with `02-DEVICE-PASS.md` and it caught real problems; phase 3
  carries a `03-DEVICE-PASS.md` in the same shape.

- **D-34:** **The test row `ZZTEST DeleteMe` is cleaned up as part of this phase.**
  `.planning/STATE.md` flags it as possibly still sitting in `enrollments`, where it would
  quietly inflate the confirmed count that D-19 puts on the page.

### Claude's Discretion

- Exact copy in all three languages, written natively per language rather than translated.
  New keys needed for the form, its errors, the success panel, the returning-guest view and
  the social proof block, added to all three tables at identical key sets.
- The visual treatment of the success panel and whether it animates in or swaps.
- Field order within the form, and whether extra guests is a select, a stepper, or a small
  set of buttons.
- Whether the social proof block lives inside the enrollment section or beside it.
- Where the `#wa` section sits in the page order relative to `#enrol`.
- The precise shape of the `withdrawn` column addition, provided it is idempotent.
- The exact wording of the owner-facing comments in `config.js` and `supabase/schema.sql`.

### Folded requirements

Two enrollment requirements appear in `REQUIREMENTS.md` but in no phase's scope list in
`ROADMAP.md`. Both are folded here rather than left orphaned:

- **ENR-11** — host reads the guest list from the Supabase dashboard, no admin UI. Already
  structurally true; this phase verifies it and leaves a correct query behind (D-05).
- **ENR-13** — rate limited well enough that a bored guest cannot enroll four hundred people.
  Addressed by D-30, honestly scoped.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design contract
- `.planning/DESIGN-BRIEF.md` — palette, type scale, degradation arc, hard constraints, copy
  rules. Dark theme lock, single DTU red accent, zero em dashes, 44px touch targets, and
  `transform`/`opacity` only are all non-negotiable.
- `.claude/skills/design-taste-frontend/SKILL.md` — routed into the researcher, ui-researcher
  and planner via `agent_skills` in `.planning/config.json` at the owner's request for this
  phase.
- `.claude/skills/high-end-visual-design/SKILL.md` — routed the same way, same request.
- `.claude/skills/design-taste/reference/pre-flight.md` — the matrix every UI change runs
  before it ships (DSG-08).
- `.claude/skills/design-taste/reference/interaction-states.md` — the eight states each
  interactive element owes. A form is the densest concentration of interactive states on this
  site, so this one carries real weight in this phase.
- `.claude/skills/design-taste/reference/motion.md` — easing curves and the reduced motion
  contract for D-31 and D-32.

### Project contract
- `.planning/REQUIREMENTS.md` — ENR-01 to ENR-13, ID-01 to ID-06, WA-01 to WA-06, NDG-01 to
  NDG-08, plus cross-cutting CFG-01, CFG-03, DSG-05, DSG-06, DSG-07, LNG-06, LNG-07.
- `.planning/ROADMAP.md` §Phase 3 — the scope fence, and the gate re-arm note that has now
  been applied to `.planning/config.json`.
- `.planning/STATE.md` — live deployment state, the verified Supabase RLS behaviour, the
  `enrollmentReady()` gotcha, and the `ZZTEST DeleteMe` cleanup.
- `.planning/PROJECT.md` — static hosting and no-build-step constraints behind D-06.
- `.planning/phases/02-practical-information/02-CONTEXT.md` — the decision format and the
  placeholder discipline this phase continues.

### Database contract
- `supabase/schema.sql` — the live, applied schema. Table shapes, `check` bounds, the RLS
  policies, the deliberate absence of SELECT and DELETE on `enrollments`, and the `attendees`
  view. This phase modifies it (D-04, D-05) and the owner must re-run it.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `store` in `app.js:21` — the `localStorage` wrapper that already survives private browsing
  by swallowing the throw. Identity extends it (D-17), does not replace it.
- `t(key)` in `app.js:55` — i18n lookup with English fallback for any missing key.
- `$` / `$$` in `app.js:12` — the querySelector helpers every function uses.
- `toast()` in `app.js:1212` — the transient confirmation channel, already styled and timed.
- `pendingBlock()` in `app.js:250` — builds the `.pending` placeholder used across phases 1
  and 2. The unconfigured enrollment state uses it (D-12).
- `.btn`, `.btn--primary`, `.btn--ghost` in `styles.css` — the contrast-checked button system.
- `.facts` definition list — the institutional data styling the attendee list should echo.
- `.section__h`, `.section__lede`, `.wrap` — section scaffolding already in place.
- `formatDate()` / `daysUntil()` in `app.js:1074` — deadline formatting, already localised to
  `en-GB` / `it-IT` / `da-DK` on `Europe/Copenhagen`.

### Established Patterns
- Every volatile value lives in `config.js` and nowhere else (CFG-01), with inline comments
  written for a non-programmer. `enrollment.*` and `whatsapp.inviteUrl` are already there and
  already documented.
- All guest-facing copy lives in `copy.js`, in all three tables at identical key sets (LNG-06),
  English as the fallback (LNG-07).
- Zero em dashes in anything a guest sees (DSG-06).
- Sections render their body from JS into a container that already exists in `index.html`
  holding a `.pending` block. `#enrol-body` is exactly that container, already in place.
- Placeholders read as deliberate, never as broken.
- Render functions join the chain inside `applyLanguage()` so a language switch re-renders
  without a reload (LNG-01).

### Integration Points
- `#enrol` section and `#enrol-body` container already exist in `index.html:215-224`, holding
  the phase 1 pending block. The form mounts here.
- `renderNudge()` at `app.js:1109` and `enrollmentReady()` at `app.js:1165` are the seam. The
  bar activates itself the moment `#enrol-form` exists. Do not touch the gate (D-13).
- `isEnrolled()` at `app.js:1087` reads `store.get('enrolled') === '1'`. The enrollment flow
  writes that flag; `renderDeadline()` and `renderNudge()` already consume it.
- `applyLanguage()` at `app.js:62` calls the render chain. New `renderEnrollment()` and
  `renderWhatsApp()` join it alongside the five existing calls.
- Copy keys already seeded in all three languages and currently unused: `wa.heading`,
  `wa.body`, `wa.cta`. Present and in use: `enrol.heading`, `enrol.lede`, `enrol.pending.*`,
  `nudge.enrol.*`, `nudge.group.*`, `hero.cta.enrol`, `nav.enrol`, `hero.deadline`.
- `#nudge` markup at `index.html:290-295` is complete: text, CTA and close button all present.
- `config.js` `enrollment` block already carries `deadline`, `maxGuestsPerPerson`,
  `showCountFrom` and `showAttendeeList`, all documented. No new config keys are required for
  the happy path.

### Flagged consideration
- The enrollment note field is free text written by guests and stored in a table the site
  cannot read back. It is only ever visible to the owner in the dashboard. That is the point,
  but it also means nothing on the page can validate, moderate or display it after the fact,
  and a guest who writes something important there has no way to check it arrived beyond the
  success state. Worth one honest line in the form's helper copy.

</code_context>

<specifics>
## Specific Ideas

- The success moment is the whole phase. "Done when" in the roadmap reads: a guest on a phone
  enrolls in under 10 seconds, lands in the WhatsApp group with one more tap, and is never
  nudged again. Every decision above was weighed against that sentence.
- The parody register carries through the form. Registration is framed as course
  registration, errors read as institutional rather than apologetic, and the success state
  should feel like being enrolled in a course rather than like a newsletter signup.
- Phase 1 replaced a joke ("Registration: not required") with a real form at the owner's
  request. The joke's replacement has to be at least as good as the joke was.

</specifics>

<deferred>
## Deferred Ideas

- Photo upload and the shared album — phase 4, consuming the `guest_id` and `name` this phase
  writes (ID-05).
- Degradation arc and spectacle motion for the enrollment section — phase 5 (DSG-04).
- Kahoot easter egg — phase 5.
- Any admin UI over the guest list — explicitly out of scope; ENR-11 is the dashboard.
- Email or any contact channel beyond the WhatsApp group — no requirement asks for it, and it
  would need a service that sends mail from a static site.
- Waitlist, capacity cap, or closing registration automatically at the deadline. The deadline
  currently only changes copy and stops the nudge. Nothing in v1 asks for a hard close.

</deferred>

---

*Phase: 03-enrollment-identity-and-the-group*
*Context gathered: 2026-08-14*
