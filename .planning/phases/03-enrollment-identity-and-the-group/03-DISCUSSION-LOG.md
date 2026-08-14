# Phase 3: Enrollment, identity, and the group - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-14
**Phase:** 03-enrollment-identity-and-the-group
**Mode:** `--auto` — no questions were put to the owner. Claude selected the recommended
option for every area, at the owner's instruction that their involvement in this project is
"2 out of 10" and that Claude should do the research and validation itself.
**Areas discussed:** Reading a registration back, Withdrawal mechanics, Supabase client,
Social proof source, Abuse limits, WhatsApp handoff placement, Identity lifecycle on
withdrawal, Motion level, Orphaned requirements

---

## Reading a registration back (ENR-05, ID-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Query the enrollments table by guest_id | The obvious approach, and the one most codebases would reach for | |
| localStorage as sole source of truth | The site never reads registrations back; storage holds the record | ✓ |
| Add a SELECT policy scoped to guest_id | Makes the table readable, at the cost of the privacy model | |

**Choice:** localStorage as sole source of truth (D-02, D-03).
**Notes:** Not really a preference. `supabase/schema.sql` grants no SELECT policy on
`enrollments` on purpose, so guest notes stay private to the host. A blocked read returns
`[]` rather than an error, so the first option does not fail loudly, it fails silently and
forever. The third option was rejected because there is no auth, so a policy cannot scope a
read to "your own row" without exposing the whole table to anyone holding the publishable key.

---

## Withdrawal mechanics (ENR-06)

| Option | Description | Selected |
|--------|-------------|----------|
| Soft flag via UPDATE, plus a schema change | Add `withdrawn`, filter the attendees view | ✓ |
| Grant anon DELETE | Direct, and matches what "withdraw" sounds like | |
| Local-only withdrawal | Clear the flag in the browser, leave the row untouched | |

**Choice:** Soft flag via UPDATE (D-04).
**Notes:** The schema explicitly refuses DELETE, and with no auth a DELETE policy would have
to be `using (true)`, which lets anyone delete the entire guest list. Local-only withdrawal
was rejected because the host's headcount would stay wrong, which is the one thing this phase
exists to get right. The chosen option costs an owner action: `supabase/schema.sql` has to be
re-run. Flagged as one-way in CONTEXT.md for exactly that reason.

---

## Supabase client (ENR-03)

| Option | Description | Selected |
|--------|-------------|----------|
| Plain fetch against PostgREST | Three request shapes, no dependency | ✓ |
| supabase-js from a CDN | Ergonomic, well documented, one more script on the page | |

**Choice:** Plain fetch (D-06).
**Notes:** Consistent with the project's stated constraints (no build step, fewer moving
parts) and with the precedent already set by choosing a keyless map embed over the Maps
JavaScript API. Marked costly rather than reversible: undoing it means rewriting every call
site. Research is instructed to confirm the exact header and `Prefer` semantics for a
`sb_publishable_` key against a table with no SELECT policy.

---

## Social proof source (ENR-07, ENR-08, NDG-05)

| Option | Description | Selected |
|--------|-------------|----------|
| One fetch of the attendees view, serving both count and list | Single request, server-side first-name truncation | ✓ |
| A count-only aggregate request | Lighter, but needs a second request for the list | |

**Choice:** One fetch (D-19).
**Notes:** The `attendees` view already returns `first_name, extra_guests, created_at` and is
the only public read path. Splitting it into two requests buys nothing on a list this size.

---

## Abuse limits (ENR-13)

| Option | Description | Selected |
|--------|-------------|----------|
| Lean on `guest_id unique` plus UI bounds, documented honestly | Real cap per browser identity, no theatre | ✓ |
| Client-side throttle in localStorage | Looks like a limit, cleared by clearing storage | |
| Leave ENR-13 unaddressed | It is not in the roadmap's phase list | |

**Choice:** `guest_id unique` plus bounds (D-30).
**Notes:** A static site with a public insert policy cannot truly rate limit. Saying so
plainly is better than shipping a throttle that a page reload defeats. The owner's actual
recourse is the dashboard, and if abuse ever happens the fix is a Supabase policy change.

---

## WhatsApp handoff placement (WA-02, WA-04)

| Option | Description | Selected |
|--------|-------------|----------|
| Success panel in place of the form, plus a persistent section | Caught at the willing moment, still findable later | ✓ |
| Nudge bar only | Already built, but easy to dismiss and then lose | |
| Toast on success | Transient, and WA-02 asks for a large one-tap button | |

**Choice:** Success panel plus persistent `#wa` section (D-23, D-24).
**Notes:** WA-02 and WA-04 pull in different directions and both have to be satisfied. The
copy keys `wa.heading`, `wa.body` and `wa.cta` already exist in all three languages from
phase 1 and have never had markup, which suggests the section was always intended.

---

## Identity lifecycle on withdrawal (ID-05)

| Option | Description | Selected |
|--------|-------------|----------|
| Keep guest_id and name, clear only the enrolled flag | Photo attribution survives; re-enrolling amends the same row | ✓ |
| Clear identity entirely on withdrawal | Cleaner mentally, breaks the photo album | |

**Choice:** Keep identity (D-15).
**Notes:** ID-05 hands `guest_id` to phase 4 for photo attribution and the five-photo count.
Clearing it would also break the amend path, since `guest_id` is unique and a fresh UUID would
insert a duplicate row rather than resurrect the existing one.

---

## Motion level

| Option | Description | Selected |
|--------|-------------|----------|
| MOTION_INTENSITY 3, matching phase 2 | Restrained; spectacle deferred to phase 5 | ✓ |
| Follow the brief's page-wide 9 | `#enrol` sits in the `slipping` zone of the arc | |

**Choice:** 3 (D-31).
**Notes:** The enrollment form is the one place on the site where a guest is doing work with
their thumbs. Phase 2 made the same call for the same reason and it held.

---

## Orphaned requirements

| Option | Description | Selected |
|--------|-------------|----------|
| Fold ENR-11 and ENR-13 into phase 3 | They are enrollment requirements with no other home | ✓ |
| Leave them unmapped | Matches the roadmap's literal phase list | |

**Choice:** Fold in.
**Notes:** `ROADMAP.md` §Phase 3 lists ENR-01 to ENR-10 and ENR-12 but omits ENR-11 and
ENR-13, and no other phase claims them. ENR-11 is already structurally satisfied by the
schema, so folding it in costs a verification rather than a build.

## Claude's Discretion

Recorded in CONTEXT.md under `### Claude's Discretion`: copy in all three languages, the
success panel's visual treatment, field order and the extra-guests control shape, where the
social proof block and the `#wa` section sit in page order, the exact shape of the idempotent
`withdrawn` column addition, and the wording of owner-facing config comments.

## Deferred Ideas

Recorded in CONTEXT.md under `<deferred>`: photo upload (phase 4), the degradation arc and
spectacle motion (phase 5), the Kahoot easter egg (phase 5), any admin UI over the guest list
(out of scope by ENR-11), email or any contact channel beyond WhatsApp, and a waitlist or
hard registration close at the deadline.
