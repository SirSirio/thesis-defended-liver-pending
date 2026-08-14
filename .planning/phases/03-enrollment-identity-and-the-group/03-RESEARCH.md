# Phase 3: Enrollment, identity, and the group - Research

**Researched:** 2026-08-14
**Domain:** PostgREST wire protocol under RLS, vanilla-JS accessible forms, browser-held identity
**Confidence:** HIGH on the database contract (settled by live probe, not by inference). HIGH on the
accessibility pattern. MEDIUM on copy and visual treatment, which are Claude's discretion anyway.

> **Read this first.** One locked decision in CONTEXT.md is technically impossible as written, and
> it is not a matter of taste. **D-04 and D-06's `PATCH /rest/v1/enrollments?guest_id=eq.{uuid}`
> silently updates zero rows and returns `204 No Content`.** Every edit and every withdrawal would
> appear to succeed and change nothing. This was proved against the live project, not deduced.
> See `## THE BLOCKER` below. Everything else in CONTEXT.md survives intact.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

Copied verbatim from `03-CONTEXT.md`. Abbreviated only by dropping the reversibility notes, which
are reproduced in full in the source file.

- **D-01:** The schema is applied and verified against project `aplaxdplwnnlezffatal`.
  `enrollments`, `photos` and the `attendees` view all exist and respond. This phase writes against
  a real database from the first commit, not against a placeholder.
- **D-02:** There is no SELECT policy on `public.enrollments`, and this phase does not add one.
  Notes stay private to the host. A blocked read returns `[]`, not an error, so any code that
  "checks whether I am enrolled" by querying the table will silently conclude "no" forever.
- **D-03:** `localStorage` is the sole source of truth for "this is your registration". On success
  the browser stores `guest_id`, `name`, `extra_guests`, `note` and the existing `enrolled` flag.
  The returning-guest view (ENR-05) renders from storage, never from a fetch.
- **D-04:** Withdrawal is a soft flag, not a DELETE. Add `withdrawn boolean not null default false`
  to `public.enrollments`, and filter it out of the `public.attendees` view. Written as
  `alter table ... add column if not exists`.
- **D-05:** The host's read path is the Supabase dashboard, and this phase leaves a correct query
  behind (ENR-11). No admin UI.
- **D-06:** Plain `fetch` against PostgREST. No `supabase-js`, no CDN script tag. Three request
  shapes: insert `POST .../enrollments` with `Prefer: return=minimal`; amend
  `PATCH .../enrollments?guest_id=eq.{uuid}` with `Prefer: return=minimal`; social proof
  `GET .../attendees?select=first_name,extra_guests`. Every call carries the publishable key in
  both `apikey` and `Authorization: Bearer`. **Research must confirm the exact header and `Prefer`
  semantics.**
- **D-07:** A 201 is not proof, and neither is a 204. Verify by inserting a row and confirming it
  through a path that is actually allowed to see it, never by reading a status code.
- **D-08:** Every network call has a timeout and a visible failure state.
- **D-09:** Three fields: name, how many extra people, an optional note. Name trimmed to 1..60,
  extra guests `0..enrollment.maxGuestsPerPerson`, note at most 500. `lang` stored on the row.
- **D-10:** Validation fires on blur, errors render below the field, wired with `aria-describedby`.
  Re-validation on input happens only for a field already showing an error.
- **D-11:** Four submit states: idle, submitting, success, failure. Reuse `toast()` for incidental
  confirmations, not for the primary success moment.
- **D-12:** The unconfigured state already exists and stays (ENR-12).
- **D-13:** `enrollmentReady()` in `app.js` is not to be touched.
- **D-14:** One `guest_id` UUID, generated in the browser, written once, kept forever.
  `crypto.randomUUID()` with a `crypto.getRandomValues` fallback. Stored under `c03102.`.
- **D-15:** Withdrawing clears the registration, not the identity. Re-enrolling reuses the same
  `guest_id`.
- **D-16:** Changing the name is the edit path, not a separate control. Plus an understated way to
  clear identity entirely.
- **D-17:** `localStorage` being unavailable degrades to a working session, never to a broken page.
  Add an in-memory fallback map behind the same interface.
- **D-18:** No separate name prompt exists anywhere on the site.
- **D-19:** One fetch of the `attendees` view serves both the count and the list. Total is
  `rows + sum(extra_guests)`.
- **D-20:** The count stays hidden below `enrollment.showCountFrom`, and so does the list. Below the
  threshold the block is absent, not a zero.
- **D-21:** The attendee list is first names only and gated by `enrollment.showAttendeeList`.
- **D-22:** Social proof failing to load is silent.
- **D-23:** The success state is the handoff. Not a toast, not a link in a paragraph, not a QR code.
- **D-24:** A persistent `#wa` section is added. Absent, not disabled, when `whatsapp.inviteUrl` is
  null.
- **D-25:** Framed as the course announcement channel.
- **D-26:** Tapping through counts as done. The new inline and section CTAs set `wa_joined` too.
- **D-27:** The nudge bar is built and correct already; this phase only makes it reachable.
- **D-28:** `renderNudge()` must re-run when enrollment state changes, not only on language switch.
  Likewise `renderDeadline()`.
- **D-29:** The bar must not cover the countdown, the address, or the door video.
- **D-30:** The real cap is `guest_id unique`, and it is honest about what it is.
- **D-31:** MOTION_INTENSITY 3 for this phase.
- **D-32:** Every animation ships with its `prefers-reduced-motion` fallback in this phase.
- **D-33:** Verified on a real iOS Safari and a real Android Chrome before the phase closes,
  recorded on `03-DEVICE-PASS.md`.
- **D-34:** The test row `ZZTEST DeleteMe` is cleaned up as part of this phase.

### Claude's Discretion

- Exact copy in all three languages, written natively per language rather than translated. New keys
  needed for the form, its errors, the success panel, the returning-guest view and the social proof
  block, added to all three tables at identical key sets.
- The visual treatment of the success panel and whether it animates in or swaps.
- Field order within the form, and whether extra guests is a select, a stepper, or a small set of
  buttons.
- Whether the social proof block lives inside the enrollment section or beside it.
- Where the `#wa` section sits in the page order relative to `#enrol`.
- The precise shape of the `withdrawn` column addition, provided it is idempotent.
- The exact wording of the owner-facing comments in `config.js` and `supabase/schema.sql`.

### Deferred Ideas (OUT OF SCOPE)

- Photo upload and the shared album, phase 4, consuming the `guest_id` and `name` this phase writes.
- Degradation arc and spectacle motion for the enrollment section, phase 5.
- Kahoot easter egg, phase 5.
- Any admin UI over the guest list. ENR-11 is the dashboard.
- Email or any contact channel beyond the WhatsApp group.
- Waitlist, capacity cap, or closing registration automatically at the deadline.

</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ENR-01 | Form collects name plus how many people they are bringing | Bounds verified from live schema, §Database Contract. Field pattern §Code Examples E1. |
| ENR-02 | Optional free text field | `note text check (char_length(note) <= 500)` verified. Honest helper-copy note, §Pitfall 8. |
| ENR-03 | Submission writes to a Supabase table, no login | `POST` shape settled and probe-verified, §Wire Contract W2. |
| ENR-04 | Enrollment doubles as identity capture | §Identity Model. No separate prompt anywhere. |
| ENR-05 | Returning guest sees their own registration | Renders from `localStorage` only. Reading back is structurally impossible, §Wire Contract W1. |
| ENR-06 | Guest can edit or withdraw | **BLOCKED as specified.** §THE BLOCKER and §The Fix. |
| ENR-07 | Confirmed count visible | `GET /rest/v1/attendees`, probe-verified working, §Wire Contract W5. |
| ENR-08 | Attendee list, first names only, config flag | View truncates server side, verified: inserting `ZZTEST DeleteMe` surfaced `ZZTEST`. |
| ENR-09 | Validation on blur, errors below field, `aria-describedby` | §Validation and Accessibility, full pattern. |
| ENR-10 | Four submit states, no silent failure | §Pattern 3, plus abort timeout §Code Examples E4. |
| ENR-11 | Host reads the guest list from the dashboard | §Owner Handoff. Query must exclude withdrawn rows. |
| ENR-12 | Unconfigured state explains rather than errors | `pendingBlock()` at `app.js:250` already does this. §Pattern 5. |
| ENR-13 | Rate limited enough | `guest_id unique` verified enforced: duplicate returns 409/23505. §Security Domain. |
| ID-01 | Identity captured by the form | Same as ENR-04. |
| ID-02 | Name and UUID persist in `localStorage` | §Identity Model, key layout under `c03102.`. |
| ID-03 | Return visits greet by name, no prompt | §Pattern 4. |
| ID-04 | Guest can change or clear their name | Edit path is the change path (D-16). `store` needs a `remove`, §Gap G3. |
| ID-05 | Identity carries photo attribution and count | Storage keys chosen so phase 4 reads them unchanged. §Identity Model. |
| ID-06 | Works fully when `localStorage` unavailable | §Pattern 6, in-memory fallback behind the same interface. |
| WA-01 | Invite link is one config value | `whatsapp.inviteUrl` exists at `config.js:157`. |
| WA-02 | Presented immediately on success as a large one-tap button | §Pattern 3, success panel is the handoff. |
| WA-03 | One tap, never a QR code or a number to save | Plain anchor to `chat.whatsapp.com`, §Code Examples E6. |
| WA-04 | Link stays reachable afterwards | `#wa` section, copy keys already seeded. |
| WA-05 | Framed as the course announcement channel | `wa.body` already carries the register. |
| WA-06 | Section absent, not broken, when unconfigured | §Pattern 5. |
| NDG-01..NDG-08 | Nudge bar | Already implemented at `app.js:1109-1203`. §Nudge Bar Audit maps each ID to the existing line. |
| CFG-01, CFG-03 | Volatile values in config, graceful placeholders | No new config keys required. §Config Impact. |
| DSG-05, DSG-06, DSG-07 | Reduced motion, zero em dashes, no animation gates | §Design Constraint Precedence. |
| LNG-06, LNG-07 | Identical key sets, English fallback | Verified at parity today: 114 keys in each of en/it/da. §Copy Impact. |

</phase_requirements>

---

## Summary

The phase is in a much better position than a greenfield one and in a much worse position on one
specific axis. Better, because the database is live and every request shape could be tested for real
rather than guessed at, and because the nudge bar, the i18n chain, the storage wrapper and the
pending-placeholder pattern all already exist and are correct. Worse, because the row level security
model that CONTEXT.md correctly identifies as structural has one more consequence than CONTEXT.md
accounted for, and that consequence lands directly on ENR-06.

The consequence is this. PostgreSQL requires SELECT policies for any `UPDATE` whose `WHERE` clause
reads a column, because it has to read the existing row to decide which rows to touch. With no
SELECT policy on `public.enrollments`, `PATCH /rest/v1/enrollments?guest_id=eq.{uuid}` matches zero
rows, changes nothing, and returns `204 No Content` with `Content-Range: */0`. It does not error. It
is the exact failure mode D-07 warns about, one layer deeper than D-07 anticipated, and it makes
edit and withdraw undeliverable as specified. The same root cause also kills `Prefer:
return=representation` on insert, which fails with `401` and a message that blames the insert
policy, and it kills upsert via `Prefer: resolution=merge-duplicates` for the same reason.

The fix is small, does not add a SELECT policy, and therefore does not touch the one-way door D-02
is protecting: a `security definer` function exposed at `POST /rest/v1/rpc/amend_enrollment`, which
runs as its owner, bypasses RLS by design, updates exactly the row matching the `guest_id` it was
handed, and returns the number of rows it affected so the client can tell "amended" from "no such
registration". Notes remain unreadable by anyone. The owner already has to re-run `supabase/
schema.sql` for D-04's `withdrawn` column, so this costs no additional owner action.

**Primary recommendation:** keep D-06's `POST` and `GET` shapes exactly as written, replace only the
`PATCH` shape with an RPC call, and treat the whole edit-and-withdraw path as degrading gracefully
to unavailable until the owner re-runs the schema file, in the same way every other placeholder on
this site degrades.

---

## THE BLOCKER

### What was tested, and how

Every claim in this section was produced by running `curl` against the live project
`aplaxdplwnnlezffatal` on 2026-08-14, using the publishable key that already ships in `config.js`.
The commands are reproducible verbatim; the executor should re-run them if anything here looks
surprising. **Confidence: HIGH.** This is stronger evidence than documentation, because it is this
project's actual database under its actual policies.

Set up:

```bash
U="https://aplaxdplwnnlezffatal.supabase.co"
K="sb_publishable_Z6Cq5vFRqyUhXueQGevrYQ__j0pNRrc"
```

### The finding

```bash
# There is exactly one row, guest_id b5254bde-..., inserted moments earlier and confirmed
# visible through the attendees view with extra_guests = 0.

curl -sS -D - -o /dev/null \
  -X PATCH "$U/rest/v1/enrollments?guest_id=eq.b5254bde-af74-4683-b728-038452016e1e" \
  -H "apikey: $K" -H "Content-Type: application/json" \
  -H "Prefer: return=minimal,count=exact" \
  -d '{"extra_guests":2}'

# HTTP/1.1 204 No Content
# Content-Range: */0            <-- zero rows updated
```

Reading the `attendees` view immediately afterwards still returned
`[{"first_name":"ZZTEST","extra_guests":0}]`. The value did not change. A filter on `name` instead of
`guest_id` behaved identically: `204`, `Content-Range: */0`, no change.

`Content-Range: */0` is only visible because `count=exact` was requested. D-06 as written sends
`Prefer: return=minimal` alone, which returns `Content-Range: */*` and gives the client **no signal
whatsoever** that nothing happened. A phase built on D-06 verbatim would ship an edit button and a
withdraw button that both report success and do nothing, on every device, forever.

### Why it happens

Not a Supabase quirk. Standard PostgreSQL row level security semantics.

> "Typically an `UPDATE` command also needs to read data from columns in the relation being updated
> (e.g., in a `WHERE` clause or a `RETURNING` clause, or in an expression on the right hand side of
> the `SET` clause). In this case, `SELECT` rights are also required on the relation being updated,
> and the appropriate `SELECT` or `ALL` policies will be applied in addition to the `UPDATE`
> policies. Thus the user must have access to the row(s) being updated through a `SELECT` or `ALL`
> policy in addition to being granted permission to update the row(s) via an `UPDATE` or `ALL`
> policy."

[CITED: postgresql.org/docs/current/sql-createpolicy.html, "Policies Applied by Command Type"]

The same page's Table 300 footnote for the UPDATE row reads: *"If read access is required to either
the existing or new row (for example, a `WHERE` or `RETURNING` clause that refers to columns from
the relation)."* [CITED: same page]

The live schema grants UPDATE and nothing else:

> ```sql
> drop policy if exists "anon can amend own enrollment" on public.enrollments;
> create policy "anon can amend own enrollment"
>   on public.enrollments for update
>   to anon using (true) with check (true);
>
> -- Deliberately no SELECT policy on the raw table. Notes are for the host only,
> -- readable in the Supabase dashboard.
> ```
> [VERIFIED: supabase/schema.sql:104-111, quoted verbatim]

`using (true)` says "you may update any row you can see". The guest can see none.

### The blast radius

Three separate paths die from the same cause. All three were probe-verified.

| Path | Result | Probe |
|---|---|---|
| `PATCH ?guest_id=eq.{uuid}` | `204`, zero rows, silent | above |
| `POST` with `Prefer: return=representation` | `401`, `42501`, **row not inserted** | below |
| `POST ?on_conflict=guest_id` with `Prefer: resolution=merge-duplicates` | `401`, `42501`, no change | below |

```bash
curl -sS -X POST "$U/rest/v1/enrollments" -H "apikey: $K" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"guest_id":"...","name":"ZZTEST DeleteMe","extra_guests":0,"lang":"en"}'

# HTTP 401
# {"code":"42501","details":null,"hint":null,
#  "message":"new row violates row-level security policy for table \"enrollments\""}
```

That message is actively misleading. It says the **new row** violates policy, which reads as "your
INSERT policy is wrong". The INSERT policy is fine. What failed is the read-back that
`return=representation` implies. An executor who trusts the message will spend an afternoon
rewriting a correct insert policy. `Prefer: return=headers-only` fails identically, which the
PostgREST docs do at least warn about: *"Make sure that the table is not write-only, otherwise
constructing the `Location` header will cause a permissions error."*
[CITED: docs.postgrest.org/en/stable/references/api/preferences.html]

**This fully vindicates D-06's instinct to specify `return=minimal`.** That part of the decision was
right and must not be relaxed. `return=minimal` is also the PostgREST default: *"With `Prefer:
return=minimal`, no response body will be returned. This is the default mode for all write
requests."* [CITED: same page] Sending it explicitly is still worth doing, because it documents the
intent at the call site and because `preference-applied: return=minimal` comes back in the response
headers as confirmation.

### The Fix

Three options were considered. Only one is recommended.

| | Option | Honours D-02? | Verdict |
|---|---|---|---|
| A | Add a permissive SELECT policy | **No.** Republishes every note. | Rejected. This is precisely the one-way door D-02 exists to hold shut. |
| B | Add a SELECT policy scoped to a request header, plus column grants | Letter no, spirit yes | Rejected. Two mechanisms to misconfigure, and a `grant all` anywhere later silently re-opens notes. |
| C | **`security definer` function called via `POST /rest/v1/rpc/...`** | **Yes, fully** | **Recommended.** |

Option C adds no SELECT policy of any kind. The raw table stays unreadable by the publishable key
exactly as it is today. The function runs as its owner, so RLS does not apply inside it, and its
body is the entire attack surface: it can only touch the single row whose `guest_id` was passed in,
it never returns row contents, and it returns an integer row count so the client can distinguish a
real amendment from a no-op. That row count is what makes ENR-06 verifiable under D-07's rule that a
status code is not proof.

The threat model does not change. `supabase/schema.sql:83-85` already states it:

> ```sql
> -- Anyone who knows a guest_id can edit that row, but guest ids are unguessable
> -- uuids that never appear on the page. For a party guest list this is the right
> -- trade off. It would not be for anything that matters.
> ```
> [VERIFIED: supabase/schema.sql:83-86, quoted verbatim]

The RPC grants exactly that same power and nothing more.

Supabase's own guidance on `security definer` is to pin the search path: *"If you use an empty
search path (`search_path = ''`), you must explicitly state the schema for every relation in the
function body."* [CITED: supabase.com/docs/guides/database/functions]. The SQL below does that.

**Not-yet-migrated behaviour, probe-verified.** Before the owner re-runs the schema file, calling the
function returns a clean, distinguishable 404:

```
HTTP 404
{"code":"PGRST202", "message":"Could not find the function public.amend_enrollment(p_guest_id) in the schema cache", ...}
```

So the edit and withdraw controls can be rendered optimistically and degrade to an honest message on
`PGRST202`, in exactly the register the rest of this site uses for pending things. Enrollment itself
keeps working throughout, because `POST` has no dependency on the migration.

---

## Database Contract

### Live values, quoted verbatim from the applied schema

> ```sql
> create table if not exists public.enrollments (
>   id           uuid primary key default gen_random_uuid(),
>
>   -- Random id generated in the browser and kept in localStorage. This is the
>   -- whole identity system. No login, no email, no password.
>   guest_id     uuid not null unique,
>
>   name         text not null check (char_length(trim(name)) between 1 and 60),
>   extra_guests smallint not null default 0 check (extra_guests between 0 and 10),
>   note         text check (char_length(note) <= 500),
>   lang         text check (lang in ('en', 'it', 'da')),
>
>   created_at   timestamptz not null default now(),
>   updated_at   timestamptz not null default now()
> );
> ```
> [VERIFIED: supabase/schema.sql:28-42, quoted verbatim]

> ```sql
> create or replace view public.attendees as
>   select
>     split_part(trim(name), ' ', 1) as first_name,
>     extra_guests,
>     created_at
>   from public.enrollments;
>
> grant select on public.attendees to anon;
> ```
> [VERIFIED: supabase/schema.sql:162-169, quoted verbatim]

The client-side bounds in D-09 must mirror these exactly. `lang` is constrained to the three-value
set `('en', 'it', 'da')`, which matches `SUPPORTED` in `app.js`:

> `var SUPPORTED = ['it', 'en', 'da'];`
> [VERIFIED: app.js:36, quoted verbatim]

Order differs, membership is identical. Sending any other value is a `23514` check violation, so the
submit path must send the resolved `lang` variable and never a raw locale string from the browser.

### Why the `attendees` view works, and what that depends on

Probe-verified: `GET /rest/v1/attendees` returns rows to the publishable key even though the
underlying table returns `[]`. The reason is that PostgreSQL views default to running with the
privileges of the view **owner**, not the caller.

> "This option causes the underlying base relations to be checked against the privileges of the user
> of the view rather than the view owner."
> [CITED: postgresql.org/docs/current/sql-createview.html, on `security_invoker`]

with `security_invoker` defaulting to false. The view is therefore the deliberate, and only, hole in
the wall, which is exactly what `schema.sql:156-159` says it is.

**Consequence the planner must protect:** if anyone ever adds `with (security_invoker = true)` to
this view, social proof goes permanently and silently empty, because the underlying table has no
SELECT policy. Worth one comment line in the schema file. Note also that Supabase's database linter
flags owner-privileged views as `security_definer_view`; that warning is expected here and is not a
defect. [ASSUMED: the specific linter rule name. The behaviour is verified; the rule name is from
training knowledge and was not confirmed this session.]

### `create or replace view` and the `withdrawn` filter

D-04 needs the view to exclude withdrawn rows. Confirmed safe:

> "The new query must generate the same columns that were generated by the existing view query (that
> is, the same column names in the same order and with the same data types), but it may add
> additional columns to the end of the list."
> [CITED: postgresql.org/docs/current/sql-createview.html]

Adding a `where` clause changes no column, so `create or replace view` succeeds. Columns may be
**appended**, never dropped, renamed, reordered or retyped. The current list is
`first_name, extra_guests, created_at`; keep those three, in that order, with those types, and add
new ones only at the end. If a future phase ever needs to remove or reorder a column it must
`drop view public.attendees;` first, and that drops the `grant select ... to anon` with it, because
*"Other view properties, including ownership, permissions, and non-SELECT rules, remain unchanged"*
applies only to the replace form. [CITED: same page] The `grant` line must therefore stay in the file
directly after the view, where it already is.

### Recommended schema addition

Idempotent, safe to run repeatedly, preserves the file's stated promise at `schema.sql:7`
(`-- It is safe to run more than once.`).

```sql
-- ============================================================================
-- 7. WITHDRAWAL
-- ----------------------------------------------------------------------------
-- A guest who can no longer come marks themselves withdrawn. There is no
-- delete policy and there deliberately never will be, so this is a flag.
-- Withdrawn rows stop counting toward the headcount on the site. They stay in
-- the table, because knowing who dropped out is more useful than not knowing.
-- ============================================================================

alter table public.enrollments
  add column if not exists withdrawn boolean not null default false;

-- Same three columns, same order, same types. Only the filter is new, which is
-- the one kind of change create or replace view accepts.
create or replace view public.attendees as
  select
    split_part(trim(name), ' ', 1) as first_name,
    extra_guests,
    created_at
  from public.enrollments
  where withdrawn = false;

grant select on public.attendees to anon;


-- ============================================================================
-- 8. AMENDING A REGISTRATION
-- ----------------------------------------------------------------------------
-- Why this is a function and not just an UPDATE from the browser.
--
-- Postgres will not let anyone update a row they cannot read, because working
-- out WHICH rows to update means reading them first. Nobody can read this
-- table, on purpose, so a plain update from the site matches zero rows and
-- reports success. This function runs as its owner instead, so it can find the
-- one row it was asked for. It still cannot hand anything back, so the notes
-- stay exactly as private as they were.
--
-- Anyone who knows a guest_id can amend that registration, which is the same
-- trade already described in section 3.
-- ============================================================================

create or replace function public.amend_enrollment(
  p_guest_id     uuid,
  p_name         text     default null,
  p_extra_guests smallint default null,
  p_note         text     default null,
  p_lang         text     default null,
  p_withdrawn    boolean  default null
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  affected integer;
begin
  update public.enrollments
     set name         = coalesce(p_name, name),
         extra_guests = coalesce(p_extra_guests, extra_guests),
         note         = case when p_note is null then note else nullif(p_note, '') end,
         lang         = coalesce(p_lang, lang),
         withdrawn    = coalesce(p_withdrawn, withdrawn)
   where guest_id = p_guest_id;

  get diagnostics affected = row_count;
  return affected;   -- 1 if the registration was found, 0 if it was not
end $$;

revoke all on function public.amend_enrollment(uuid, text, smallint, text, text, boolean) from public;
grant execute on function public.amend_enrollment(uuid, text, smallint, text, text, boolean) to anon;
```

Three details that matter and are easy to get wrong:

1. `set search_path = ''` forces every relation to be schema-qualified. `public.enrollments` is,
   inside the body. This is Supabase's stated requirement for `security definer`.
   [CITED: supabase.com/docs/guides/database/functions]
2. `revoke all ... from public` before the grant. Postgres grants `execute` on new functions to
   `PUBLIC` by default, and a `security definer` function left at that default is a genuine hole.
   [ASSUMED: the default-grant-to-PUBLIC behaviour is from training knowledge and was not verified
   this session. The `revoke` is harmless either way, so include it regardless.]
3. The signature must be repeated verbatim in the `revoke` and `grant`, because the function is
   identified by its argument types.

`updated_at` is handled for free by the existing trigger:

> ```sql
> create trigger enrollments_touch
>   before update on public.enrollments
>   for each row execute function public.touch_updated_at();
> ```
> [VERIFIED: supabase/schema.sql:56-58, quoted verbatim]

### Owner handoff (ENR-11, D-05)

The file's closing query at `schema.sql:194-198` currently counts withdrawn rows. Replace with:

```sql
-- To read your guest list: Dashboard > Table Editor > enrollments.
-- The `note` column is where dietary requirements and messages land. Nothing on
-- the website can read it. This table is the only place it exists.
--
-- Total head count including plus ones, ignoring anyone who withdrew:
--
--   select count(*) + coalesce(sum(extra_guests), 0) as total
--     from public.enrollments
--    where withdrawn = false;
--
-- Who dropped out:
--
--   select name, extra_guests, updated_at
--     from public.enrollments
--    where withdrawn = true
--    order by updated_at desc;
```

---

## Wire Contract

Copy-pasteable request shapes. Every one was executed against the live project on 2026-08-14.
**Confidence: HIGH throughout this section.**

### W1. Authentication headers

| Attempt | Result |
|---|---|
| `apikey: <key>` only | **`200`** |
| `Authorization: Bearer <key>` only | `401` `{"message":"No API key found in request","hint":"No 'apikey' request header or url param was found."}` |
| Both, same value | **`200`** |
| Neither | `401`, same body as above |

[VERIFIED: live probe against aplaxdplwnnlezffatal, 2026-08-14]

D-06 specifies both headers. That works, and it is the one case the docs explicitly carve out:

> "You cannot send a publishable or secret key in the `Authorization: Bearer ...` header, except if
> the value exactly equals the `apikey` header. In this case, your request will be forwarded down to
> your project's database, but will be rejected as the value is not a JWT."
> [CITED: supabase.com/docs/guides/api/api-keys, "Known limitations and compatibility differences"]

The doc's final clause ("will be rejected") did **not** reproduce: the request returned `200` with
data. The gateway tolerates the duplicate. But this is a documented-fragile path riding on an
exception clause, and the sentence reads like it is describing a future behaviour change.

**Recommendation, which is a refinement of D-06 rather than a contradiction of it: send `apikey`
only.** It is verified working, it is the shape the docs tell you to use, it is one fewer header on
every request from a phone on mobile data, and it is the only shape that is correct for both key
formats, which matters because `config.js:184-186` promises the owner that either format works:

> ```
> The key below is the client side one. Newer projects call it the
> "publishable" key and it starts sb_publishable_. Older projects call it
> the "anon public" key and it is a long JWT. Either works here.
> ```
> [VERIFIED: config.js:183-186, quoted verbatim]

If the planner prefers to keep D-06 literal, both headers also work today. Do not send
`Authorization` alone; that is the one shape that hard-fails.

### W2. Insert (ENR-03)

```
POST {supabaseUrl}/rest/v1/enrollments
apikey: {supabaseKey}
Content-Type: application/json
Prefer: return=minimal

{"guest_id":"<uuid>","name":"Ada","extra_guests":1,"note":null,"lang":"en"}
```

Success: `201 Created`, empty body, `Content-Range: */*`, `preference-applied: return=minimal`.

Do **not** add `return=representation` or `return=headers-only`. Both fail `401` and the row is not
written. See §THE BLOCKER.

### W3. Amend and withdraw (ENR-06), replacing D-06's PATCH

```
POST {supabaseUrl}/rest/v1/rpc/amend_enrollment
apikey: {supabaseKey}
Content-Type: application/json

{"p_guest_id":"<uuid>","p_name":"Ada Lovelace","p_extra_guests":2,"p_note":"","p_lang":"en"}
```

Withdraw is the same call with `{"p_guest_id":"<uuid>","p_withdrawn":true}`.
Re-enrol after withdrawing is `{"p_guest_id":"<uuid>","p_withdrawn":false, ...}`.

Response body is a bare integer. `1` means the registration was found and changed. `0` means no row
carries that `guest_id`, which on this site means the guest's storage and the database have
diverged, and the correct recovery is to fall back to the insert path.

`404` with `code: "PGRST202"` means the owner has not re-run `supabase/schema.sql` yet. Handle it as
a pending state, not as an error.

*(Arguments are passed as JSON keys in the POST body: "Every function in the exposed schema and
accessible by the active database role is executable under the `/rpc` prefix" and "Each key/value of
the object will become an argument."* [CITED: docs.postgrest.org/en/stable/references/api/functions.html]*)*

### W4. Deletion

Not available and not wanted. Probe-verified: `DELETE /rest/v1/enrollments?guest_id=eq.{uuid}`
returns `204 No Content` and deletes nothing, because there is no DELETE policy. This is the
`204`-looks-like-success trap STATE.md already flags. Nothing in this phase may call DELETE.

### W5. Social proof (ENR-07, ENR-08)

```
GET {supabaseUrl}/rest/v1/attendees?select=first_name,extra_guests&order=created_at.desc
apikey: {supabaseKey}
```

Returns `200` with `[{"first_name":"ZZTEST","extra_guests":0}]`. Verified working.

Total is `rows.length + sum(extra_guests)` per D-19. Note the view exposes `created_at`, so ordering
is available without adding it to `select`. Requesting `Prefer: count=exact` on a `HEAD` returns
`Content-Range: 0-0/1` if a count is ever wanted without a body, but the phase needs the rows anyway
for the list, so one `GET` covers both as D-19 says.

### W6. Error taxonomy

All probe-verified. The response body shape is always the same four fields:

```json
{ "code": "...", "message": "...", "details": "...", "hint": "..." }
```
[CITED: docs.postgrest.org/en/stable/references/errors.html]

| Condition | HTTP | `code` | `message` (abridged) | UI treatment |
|---|---|---|---|---|
| Already enrolled, duplicate `guest_id` | `409` | `23505` | `duplicate key value violates unique constraint "enrollments_guest_id_key"` | **Not an error.** Switch to the amend path (W3). |
| `extra_guests` out of range | `400` | `23514` | `... violates check constraint "enrollments_extra_guests_check"` | Should be unreachable. Field-level error. |
| Name blank or over 60 | `400` | `23514` | `... "enrollments_name_check"` | Should be unreachable. Field-level error. |
| `lang` not in the three | `400` | `23514` | `... "enrollments_lang_check"` | Programmer error. Generic failure state. |
| Malformed uuid | `400` | `22P02` | `invalid input syntax for type uuid: "..."` | Programmer error. Regenerate identity. |
| Read-back attempted, no SELECT policy | `401` | `42501` | `new row violates row-level security policy for table "enrollments"` | Programmer error. Remove `return=representation`. |
| Column not in schema cache | `400` | `PGRST204` | `Could not find the 'withdrawn' column of 'enrollments' in the schema cache` | Migration not run. Pending state. |
| Function not in schema cache | `404` | `PGRST202` | `Could not find the function public.amend_enrollment(...) in the schema cache` | Migration not run. Pending state. |
| Table/view not found | `404` | `PGRST205` | `Could not find the table 'public.nope' in the schema cache` | Programmer error. |
| Column not found in a filter | `400` | `42703` | `column attendees.withdrawn does not exist` | Migration not run. |
| No api key | `401` | *(absent)* | `No API key found in request` | Unconfigured state (ENR-12). |
| `UPDATE` with no filter at all | `400` | `21000` | `UPDATE requires a WHERE clause` | Programmer error. |

Note the 42501 mapping: PostgREST documents `42501` as *"if authenticated 403, else 401"*
[CITED: docs.postgrest.org/en/stable/references/errors.html]. The publishable key is unauthenticated,
so this site always sees `401`, never `403`. Any error handling keyed on `403` is dead code here.

**The only two the UI needs to distinguish (per the brief's question):** `23505` means "you are
already enrolled" and is a normal, expected branch, not a failure. Everything else is "something
broke" and lands in D-11's `failure` state. Branch on the `code` field, never on the `message`
string, which is not stable and is not localised.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Identity generation and persistence | Browser | Database (as a written value) | No auth exists. `crypto` + `localStorage` is the whole system. |
| "Am I enrolled?" | Browser (`localStorage`) | none | The database physically cannot answer, W1/D-02. |
| Form validation, bounds | Browser | Database (`check` constraints) | Browser for the message, database for the truth. Both, never one. |
| Writing a registration | Database (PostgREST) | Browser | Direct `POST`, no server. |
| Amending a registration | Database (`security definer` function) | Browser | RLS makes this impossible from the browser alone. §THE BLOCKER. |
| Privacy of the free-text note | Database (absence of a SELECT policy) | none | Structural, not enforced in JS. |
| Headcount and attendee names | Database (owner-privileged view) | Browser (sums, threshold) | The view does the truncation server side so full names cannot reach the page. |
| Social proof threshold | Browser (`config.js`) | none | Presentation choice, not a security boundary. |
| WhatsApp handoff | Browser | none | A plain link. No service involved. |
| Nudge state | Browser (`sessionStorage` semantics in a module var, plus `localStorage`) | none | Already built, `app.js:1109-1203`. |
| Abuse limiting | Database (`unique`, `check`) | Browser (disabled button) | Honestly scoped in D-30. |
| Owner's read of the guest list | Supabase dashboard | none | ENR-11. No admin UI. |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---|---|---|---|
| *(none)* | n/a | n/a | Hard project constraint: static GitHub Pages, no build step, no bundler. |

**No packages are installed by this phase.** The `## Package Legitimacy Audit` section is therefore
not applicable and is deliberately omitted: there is no `package.json`, no `npm install`, and no
`<script src>` pointing anywhere off this origin. The only third-party runtime dependency is
Supabase's REST endpoint, already wired at `config.js:198-199`.

This is the correct answer for this phase, and D-06 already locked it. For the record, the
alternative was weighed:

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Plain `fetch` | `@supabase/supabase-js` via CDN | About 40KB gzipped of JS blocking a page whose stated design target is "a mid-range phone, on mobile data, at night, possibly outdoors". It would buy `.from().update()` sugar over the same PostgREST endpoint and would **not** have fixed the blocker, because the blocker is in Postgres, not in the client. Rejected, and rightly. |
| Hand-rolled UUID | `uuid` npm package | Requires a bundler. `crypto.randomUUID()` is a browser built-in. |

### Browser APIs used

| API | Purpose | Support | Fallback |
|---|---|---|---|
| `crypto.randomUUID()` | `guest_id` (ID-02) | *"Baseline Widely available ... available across browsers since March 2022"*, **secure contexts only** [CITED: developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID] | `crypto.getRandomValues` (D-14). See §Pitfall 2. |
| `AbortController` + `AbortSignal` | Fetch timeout (D-08) | Universal in the target browsers | none needed |
| `fetch` | All network | Universal | none needed |
| `localStorage` | Identity (ID-02) | Universal, **throws in some private modes** | In-memory map (D-17, ID-06) |

---

## Architecture Patterns

### System Architecture Diagram

```
                       ┌──────────────────────────────────────┐
   guest opens page ──▶│ applyLanguage()          app.js:62   │
                       │  renderSchedule / renderCountdown /  │
                       │  renderDeadline / renderNudge /      │
                       │  renderLocation / renderAccess       │
                       │  + renderEnrollment  + renderWhatsApp│ ◀── NEW, joins the chain
                       └───────────────┬──────────────────────┘
                                       │
                                       ▼
                       ┌──────────────────────────────────────┐
                       │ identity.get()                       │
                       │  reads localStorage 'c03102.*'       │
                       │  (in-memory map if storage throws)   │
                       └───────┬──────────────────┬───────────┘
                               │                  │
              enrolled = '0'   │                  │  enrolled = '1'
              or absent        │                  │
                               ▼                  ▼
              ┌────────────────────────┐  ┌──────────────────────────┐
              │  credentials present?  │  │  RETURNING VIEW  ENR-05  │
              └───┬────────────────┬───┘  │  greets by stored name   │
                no│             yes│      │  shows stored guest count│
                  ▼                ▼      │  [edit]   [withdraw]     │
      ┌──────────────────┐  ┌───────────┐ └───────┬──────────────────┘
      │ PENDING PANEL    │  │ #enrol-   │         │
      │ ENR-12, D-12     │  │ form      │         │ tap edit
      │ pendingBlock()   │  │ 3 fields  │◀────────┘  (prefilled from storage)
      └──────────────────┘  └─────┬─────┘
                                  │ blur ──▶ validateField() ──▶ error node + aria-describedby
                                  │
                                  │ submit
                                  ▼
                       ┌──────────────────────┐
                       │ state = 'submitting' │  button locked, inputs disabled
                       └──────────┬───────────┘
                                  │
                     first enrol  │  amend / withdraw
                      ┌───────────┴───────────┐
                      ▼                       ▼
          ┌───────────────────────┐  ┌────────────────────────────┐
          │ POST /rest/v1/        │  │ POST /rest/v1/rpc/         │
          │   enrollments         │  │   amend_enrollment         │
          │ Prefer: return=minimal│  │ returns 0 or 1             │
          └───────┬───────┬───────┘  └──────┬───────────┬─────────┘
                  │       │                 │           │
              201 │       │ 409/23505       │ body=1    │ 404/PGRST202
                  │       └────────────────▶│           ▼
                  │         (already there, │      ┌─────────────────┐
                  │          switch to      │      │ pending: schema │
                  │          amend)         │      │ not re-run yet  │
                  ▼                         ▼      └─────────────────┘
          ┌──────────────────────────────────────┐
          │ identity.save() ──▶ localStorage     │  D-03: storage is the truth
          │ enrolled = '1'                       │
          └──────────────────┬───────────────────┘
                             │
              ┌──────────────┴──────────────┬───────────────────────┐
              ▼                             ▼                       ▼
   ┌────────────────────────┐   ┌────────────────────┐  ┌────────────────────────┐
   │ SUCCESS PANEL   WA-02  │   │ renderNudge()      │  │ renderDeadline()       │
   │ replaces form in place │   │ flips to 'group'   │  │ hides hero deadline    │
   │ ▶ big WhatsApp button  │   │ or hides   NDG-06  │  │                 D-28   │
   │   sets wa_joined  D-26 │   └────────────────────┘  └────────────────────────┘
   └────────────────────────┘

   ── independent, non-blocking, failure is silent (D-22) ────────────────────────
   ┌──────────────────────────────────────────────────────────────────────────────┐
   │ GET /rest/v1/attendees?select=first_name,extra_guests                        │
   │   total = rows + sum(extra_guests)                                           │
   │   total < enrollment.showCountFrom  ──▶ render nothing at all       D-20     │
   │   total >= threshold                ──▶ count, and list if showAttendeeList  │
   └──────────────────────────────────────────────────────────────────────────────┘
```

### File impact

No new files. Everything lands in the five existing root files.

```
index.html    #enrol-body stays as-is (the mount point already exists, :215-224)
              + new #wa section, position at Claude's discretion (D-24)
app.js        + identity module (get/save/clear, in-memory fallback)
              + api module (request builder, abort timeout, error classifier)
              + renderEnrollment(), renderWhatsApp(), renderSocialProof()
              + both new renders joined to applyLanguage()'s chain
styles.css    + the site's FIRST form component system. See §Gap G1.
copy.js       + ~30 keys x 3 languages, at identical key sets (LNG-06)
supabase/     + section 7 (withdrawn + view) and section 8 (amend function)
  schema.sql  + updated closing owner query (D-05)
config.js     no new keys required. Comment corrections only. See §Config Impact.
```

### Pattern 1: One request helper, three call sites

Every network call in this phase, and every one in phase 4, shares the same headers, the same
timeout, and the same error classification. Build it once.

```js
/* Every call carries the key in the apikey header. The Authorization header is
   deliberately absent: a publishable key is not a JWT, and sending it there is
   a documented special case rather than a supported one. */
var SB = {
  url: (CFG.photos || {}).supabaseUrl || '',
  key: (CFG.photos || {}).supabaseKey || (CFG.photos || {}).supabaseAnonKey || ''
};

function sbConfigured() { return Boolean(SB.url && SB.key); }

/* Resolves to { ok, status, code, body }. Never throws, never rejects, so no
   call site needs a catch and none can leave the button spinning (D-08). */
function sbRequest(method, path, body, prefer, timeoutMs) {
  var ctl = ('AbortController' in window) ? new AbortController() : null;
  var timer = setTimeout(function () { if (ctl) ctl.abort(); }, timeoutMs || 12000);

  var headers = { 'apikey': SB.key };
  if (body)   headers['Content-Type'] = 'application/json';
  if (prefer) headers['Prefer'] = prefer;

  var opts = { method: method, headers: headers };
  if (body) opts.body = JSON.stringify(body);
  if (ctl)  opts.signal = ctl.signal;

  return fetch(SB.url + path, opts).then(function (res) {
    clearTimeout(timer);
    /* 204 and a 201 under return=minimal both have empty bodies, and calling
       .json() on either throws. Read as text, parse only if there is something
       to parse. */
    return res.text().then(function (txt) {
      var parsed = null;
      if (txt) { try { parsed = JSON.parse(txt); } catch (e) { parsed = null; } }
      return {
        ok: res.ok,
        status: res.status,
        code: (parsed && parsed.code) || null,
        body: parsed
      };
    });
  }).catch(function () {
    clearTimeout(timer);
    // Abort, DNS failure, offline, CORS. To a guest these are one event.
    return { ok: false, status: 0, code: 'NETWORK', body: null };
  });
}
```

**Why `res.text()` and not `res.json()`:** `Prefer: return=minimal` returns `201` with an empty body,
and the RPC returns a bare integer. `res.json()` on an empty body throws a `SyntaxError` that would
be caught by the outer `.catch` and misreported as a network failure, turning every successful
enrollment into a failure state. This is the single most likely way to break the happy path.

### Pattern 2: Identity, with the in-memory fallback (D-17, ID-06)

`store` at `app.js:21-30` currently swallows the throw and returns `null`, which keeps the page
alive but makes a private-browsing guest's success state evaporate mid-session. D-17 asks for a
session-scoped fallback behind the same interface. It also needs a `remove`, which does not exist
today (§Gap G3).

```js
var store = {
  mem: {},                      // survives the session, not the reload. Honest.
  ok: (function () {
    try {
      window.localStorage.setItem('c03102.probe', '1');
      window.localStorage.removeItem('c03102.probe');
      return true;
    } catch (e) { return false; }
  })(),
  get: function (k) {
    if (this.ok) {
      try { return window.localStorage.getItem('c03102.' + k); } catch (e) { /* fall through */ }
    }
    return Object.prototype.hasOwnProperty.call(this.mem, k) ? this.mem[k] : null;
  },
  set: function (k, v) {
    this.mem[k] = String(v);                       // always, so the session works either way
    if (this.ok) {
      try { window.localStorage.setItem('c03102.' + k, String(v)); return true; }
      catch (e) { this.ok = false; }               // quota exceeded mid-session
    }
    return false;
  },
  remove: function (k) {
    delete this.mem[k];
    if (this.ok) { try { window.localStorage.removeItem('c03102.' + k); } catch (e) { } }
  }
};
```

Two things to preserve from the current implementation: the `c03102.` prefix is applied inside the
wrapper and callers pass bare keys, and `set` returns a boolean nobody currently checks. Keep both,
because `lang`, `enrolled` and `wa_joined` already flow through this and phase 4 will too.

**Writing to `mem` unconditionally** is what makes the private-browsing path work. If `mem` were
only a fallback for a failed write, the first successful `localStorage` write would leave `mem`
stale and a later read after a mid-session quota failure would return the wrong value.

Storage key layout (D-14, ID-05; the first three already exist and must not be renamed):

| Key | Written by | Read by |
|---|---|---|
| `c03102.lang` | phase 1 | phase 1 |
| `c03102.enrolled` | **this phase** | `isEnrolled()` `app.js:1087`, `renderDeadline()`, `renderNudge()` |
| `c03102.wa_joined` | phase 1 `wireNudge()`, **and this phase's new CTAs** | `renderNudge()` `app.js:1144` |
| `c03102.guest_id` | this phase | this phase, **phase 4 (ID-05)** |
| `c03102.name` | this phase | this phase, **phase 4 (ID-05)** |
| `c03102.extra_guests` | this phase | this phase |
| `c03102.note` | this phase | this phase |

`isEnrolled()` compares against the string `'1'`:

> `function isEnrolled() { return store.get('enrolled') === '1'; }`
> [VERIFIED: app.js:1087, quoted verbatim]

so `enrolled` must be written as the string `'1'` and cleared to `'0'` on withdrawal (D-15 keeps
`guest_id` and `name`). Writing `true`, `1` or removing the key are all subtly different and only
one of them is right.

### Pattern 3: The four submit states (ENR-10, D-11)

One attribute on the form drives everything; CSS reads it, JS sets it. No class juggling.

| `data-state` | Button | Inputs | Body | Announced |
|---|---|---|---|---|
| `idle` | enabled, `enrol.submit` | editable | the form | no |
| `submitting` | `disabled`, label swaps to `enrol.submitting` | `disabled` | the form | no |
| `success` | gone | gone | **success panel with the WhatsApp CTA (WA-02)** | yes, see below |
| `failure` | enabled, `enrol.retry` | **editable, values retained** | form + error banner | yes, `role="alert"` |

Two rules that are easy to violate:

- **`failure` must not clear the fields.** D-08 and ENR-10 both say so. Because the form is rebuilt
  by `renderEnrollment()` on every language switch, the values have to be read out of the DOM and
  written back after any rebuild, or the rebuild has to be skipped while `data-state` is
  `submitting` or `failure`. Skipping is simpler and is the recommendation.
- **`submitting` must always terminate.** `sbRequest` above cannot hang, because the abort timer is
  unconditional and the `catch` resolves rather than rejects. Do not add a code path that returns
  early without setting `data-state`.

### Pattern 4: The returning guest (ENR-05, ID-03)

Renders entirely from storage. Never fetches. D-02 makes this the only possible design, and D-03
makes it the intended one. The greeting uses the stored `name`, which means the site knows the
guest's name on a page it has never asked anything (ID-03, D-18).

The subtlety: this view and the success panel are near-identical in content and different in
purpose. The success panel is a moment, has the WhatsApp button as its whole point, and appears once.
The returning view is a status, leads with the registration details, and offers edit and withdraw.
Building them as one component with a flag will produce a success panel that shows a withdraw button
at the instant of celebration. Build two.

### Pattern 5: Absent, not broken (ENR-12, WA-06, CFG-03)

The site's established discipline, and it now has three separate triggers in this phase:

| Condition | Result |
|---|---|
| `supabaseUrl` or `supabaseKey` blank | `#enrol-body` gets `pendingBlock('enrol.pending.title', 'enrol.pending.body')`. **No `#enrol-form` in the page, so `enrollmentReady()` returns false and the nudge bar stays down** (D-13). |
| `whatsapp.inviteUrl` null | The entire `#wa` section is absent from the DOM, and the success panel omits its primary CTA rather than rendering a dead one. |
| Schema not re-run (`PGRST202` / `PGRST204`) | Enrollment works. Edit and withdraw show a short pending line. |

`pendingBlock` is already the right tool:

> ```js
> function pendingBlock(titleKey, bodyKey) {
>   var box = document.createElement('div');
>   box.className = 'pending';
> ```
> [VERIFIED: app.js:250-252, quoted verbatim]

and its comment at `app.js:246-249` states the rule this phase must keep following:

> ```
> createElement plus textContent, never a markup string: config values flow
> through these nodes and that discipline is what keeps config.js from
> becoming an injection vector.
> ```
> [VERIFIED: app.js:246-249, quoted verbatim]

**That rule now matters more than it ever has**, because this is the first phase where *guest*
input, not just owner config, gets rendered back to the page. See §Security Domain.

### Pattern 6: Joining the render chain (LNG-01, D-28)

> ```js
>     renderSchedule();
>     renderCountdown();
>     renderDeadline();
>     renderNudge();
>     renderLocation();
>     renderAccess();
> ```
> [VERIFIED: app.js:80-85, quoted verbatim, inside `applyLanguage()` at app.js:62]

`renderEnrollment()` and `renderWhatsApp()` join this list. D-28 additionally requires that enrolling,
editing and withdrawing re-run `renderNudge()` and `renderDeadline()`. Recommendation: extract those
two plus `renderEnrollment` into a single `refreshEnrollmentState()` and call that from each mutation
path, rather than calling three functions from four places.

Ordering caution: `renderEnrollment()` creates `#enrol-form`, and `renderNudge()` calls
`enrollmentReady()` which looks for `#enrol-form`. In `applyLanguage()`, `renderNudge()` currently
runs at line 83, before any enrollment render would naturally sit. **Put `renderEnrollment()` before
`renderNudge()` in the chain**, or the bar will be one render behind on first paint.

### Anti-Patterns to Avoid

- **Checking enrollment by querying the table.** Returns `[]` forever. D-02 spells this out and it
  remains the most inviting mistake in the phase.
- **Trusting `res.ok` or `201`/`204` as proof.** D-07. Three separate operations in this phase
  return a 2xx while doing nothing.
- **`res.json()` on a `return=minimal` response.** Throws on the empty body. §Pattern 1.
- **Rebuilding the form on language switch while it is submitting or failed.** Destroys the guest's
  typed values, which ENR-10 forbids.
- **`innerHTML` anywhere near `name` or `note`.** §Security Domain.
- **A "be the first to register" empty state.** D-20 explicitly rejects it. Below the threshold the
  block is absent.
- **Touching `enrollmentReady()`.** D-13, and STATE.md records why.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Unique id per guest | A `Date.now()` + `Math.random()` string | `crypto.randomUUID()`, `getRandomValues` fallback | The column is `uuid not null unique`. A non-uuid string is a `22P02` error, verified. |
| Fetch timeout | A `setTimeout` racing a promise | `AbortController` + `signal` | The race leaves the socket open and the button locked. Abort actually cancels. |
| Uniqueness enforcement | A client-side "have I submitted?" flag | `guest_id unique` in the schema | Already there, already verified returning `409`/`23505`. D-30. |
| Bounds enforcement | Client validation only | Client **and** the existing `check` constraints | Verified: all three constraints fire. A limit that only exists in JS is a suggestion, which is exactly what `schema.sql:129-130` says about the photo limit. |
| First-name extraction | `name.split(' ')[0]` in JS | The `attendees` view's `split_part(trim(name), ' ', 1)` | Server-side truncation means a full name is **structurally incapable** of reaching the page (D-21). Doing it in JS would mean shipping full names to the browser and trusting the render. |
| Escaping guest input | A `sanitize()` function | `document.createElement` + `textContent` | Already the house rule (`app.js:246-249`). No escaping function is needed if no string is ever parsed as markup. |
| Localised dates | Hand-built month names | `formatDate()` at `app.js:1078` | Already handles `en-GB`/`it-IT`/`da-DK` on `Europe/Copenhagen`. |
| A transient confirmation | A new notification component | `toast()` at `app.js:1212` | Already styled, timed, and wired to `#toast` which is `role="status" aria-live="polite"`. D-11 says use it for incidental confirmations only. |
| The nudge bar | Anything | `renderNudge()` at `app.js:1109` | D-27. It is finished. |

**Key insight:** almost every "hard" part of this phase was already solved, either by the schema
(bounds, uniqueness, name truncation, privacy) or by phase 1 (storage, i18n, toast, nudge, pending
panels). The genuinely new work is a form component system in CSS, an identity module, a request
helper, and the RPC that unblocks ENR-06. Everything else is wiring.

---

## Runtime State Inventory

This phase changes a live database schema and consumes state written by earlier phases, so the
inventory applies.

| Category | Items Found | Action Required |
|---|---|---|
| **Stored data** | `public.enrollments` holds **exactly one row** as of 2026-08-14: `name = 'ZZTEST DeleteMe'`, `extra_guests = 0`, `guest_id = b5254bde-af74-4683-b728-038452016e1e`, `created_at = 2026-08-14T09:27:50Z`. Verified via `GET /rest/v1/attendees` returning `Content-Range: 0-0/1`. **This row was inserted by this research session** as the probe that proved the `attendees` view actually exposes rows (before it, the view returned `[]` and the table was empty, so "the view is broken" and "the table is empty" were indistinguishable). It is named to match the cleanup command STATE.md already documents. | Data cleanup. Run `delete from public.enrollments where name = 'ZZTEST DeleteMe';` in the SQL editor. This is D-34, unchanged, and it now has exactly one row to remove. Must happen **before** the site can show a truthful count, though the count is invisible below 8 so it is not urgent. |
| **Live service config** | Supabase project `aplaxdplwnnlezffatal`: RLS policies, the `attendees` view, the `touch_updated_at` trigger, the `party-photos` bucket and its storage policies all live **in the database**, not in git. `supabase/schema.sql` is a script that produces them, not a mirror of them. Nothing verifies the two are in sync. | Code edit **and** an owner action. The schema file gains sections 7 and 8; the owner must re-run it. **Surface this as an explicit owner input**, alongside the five already tracked in STATE.md. Until it is run, edit and withdraw return `PGRST202`. |
| **OS-registered state** | None. No scheduled tasks, no daemons, no CI beyond GitHub Pages' built-in deploy from `main`. Verified: repo root contains no workflow directory and STATE.md records Pages deploying from `main` at repo root. | None. |
| **Secrets and env vars** | `photos.supabaseKey` is a publishable key committed to `config.js:199` **by design**, and the row level rules are the only protection. No `.env`, no SOPS, no CI secrets. STATE.md records that a previously exposed `service_role` key was disabled by the owner. | None for this phase. Note for the planner: because the key is public, the `security definer` function in section 8 is callable by anyone who reads the page source. Its scope is deliberately narrow for exactly that reason. |
| **Build artifacts / installed packages** | None. No `package.json`, no `node_modules`, no build step, no compiled output. `tools/preview.js` is a dev-only static file server. | None. |
| **Browser-held state (extra category, and the one that bites)** | `localStorage` keys under `c03102.`: `lang`, `enrolled`, `wa_joined` are already written on real guests' devices by the live phase-1 site. | **Do not rename or repurpose them.** In particular, any guest who has already tapped the nudge bar's group CTA has `wa_joined = '1'`. Since the bar has never been reachable (`enrollmentReady()` is false today), this set is almost certainly empty, but the keys must still be treated as owned by phase 1. New keys only. |

---

## Common Pitfalls

### Pitfall 1: The silent PATCH
**What goes wrong:** Edit and withdraw report success and change nothing.
**Why it happens:** No SELECT policy, so the `WHERE` clause matches no rows. §THE BLOCKER.
**How to avoid:** Use the RPC (W3). Never `PATCH` this table.
**Warning signs:** `Content-Range: */0` on a `PATCH`. Add `count=exact` to any `PATCH` you are
debugging, or the response tells you nothing at all.

### Pitfall 2: `crypto.randomUUID` is undefined
**What goes wrong:** `TypeError` at the exact moment a guest presses submit for the first time.
**Why it happens:** Two causes. It is *"available only in secure contexts (HTTPS)"*
[CITED: developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID], and it did not ship until
Safari 15.4, so a guest on an older iPhone that has not been updated hits it.
**How to avoid:** D-14 already mandates the fallback. Build it as a v4-shaped string from
`crypto.getRandomValues(new Uint8Array(16))` with the version and variant bits set, not as a random
hex string, because the column is typed `uuid` and a malformed one is a `22P02` error (verified).
Feature-detect `typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'`, not
`'randomUUID' in crypto`, because `crypto` itself is absent on `http://` origins other than
localhost.
**Warning signs:** Works on the deployed HTTPS site, fails when someone opens `index.html` as a
`file://` URL. Note `tools/preview.js` serves `127.0.0.1`, which **is** a secure context, so local
preview will not catch this. [ASSUMED: that 127.0.0.1 counts as a secure context. MDN's randomUUID
page did not state it explicitly; it is standard per the Secure Contexts spec but was not confirmed
against that spec this session. Cheapest check: the executor opens the local preview and evaluates
`window.isSecureContext` in the console.]

### Pitfall 3: `res.json()` on an empty body
**What goes wrong:** Every successful enrollment lands in the failure state.
**Why it happens:** `return=minimal` returns `201` with no body; `res.json()` throws.
**How to avoid:** §Pattern 1, read as text and parse conditionally.
**Warning signs:** Rows appear in the Supabase dashboard while the guest sees "something went wrong".
This is the failure mode most likely to survive a desk test and appear only on the real device pass.

### Pitfall 4: Branching on `message` instead of `code`
**What goes wrong:** Error handling breaks on a Supabase platform update, or on a constraint rename.
**Why it happens:** The messages are English, unstable, and embed constraint names.
**How to avoid:** Switch on the `code` field. §W6.

### Pitfall 5: The 409 treated as a failure
**What goes wrong:** A guest whose storage says "not enrolled" but whose `guest_id` is already in the
table gets a hard error and no way forward.
**Why it happens:** `23505` is the correct, expected response when re-submitting a known `guest_id`,
and D-15's "re-enrolling reuses the same `guest_id`" makes it reachable by design.
**How to avoid:** On `409`/`23505`, transparently retry through the amend path. The guest sees one
success.

### Pitfall 6: The nudge bar covering the countdown (NDG-02, D-29)
**What goes wrong:** The bar activates for the first time ever in this phase, on a page where nothing
has ever had to make room for it.
**Why it happens:** `showNudge()` sets `document.body.setAttribute('data-nudge', '1')`
[VERIFIED: app.js:1173] as the compensation hook, but whether `body[data-nudge]` actually reserves
enough bottom padding on a real phone has never been observable, because the bar has never shown.
**How to avoid:** This is a device-pass item, not a desk item. D-29 already says so. Check it
against the countdown, the address block, and the footer, on both platforms, and specifically with
iOS Safari's collapsing toolbar, where `100vh` and the safe-area inset interact badly.
**Warning signs:** Nobody notices in a desktop browser. Everybody notices on a phone.

### Pitfall 7: Language switch mid-form
**What goes wrong:** A guest half-way through typing switches language and loses their input, or the
form rebuilds under a focused field and focus jumps to the top of the document.
**Why it happens:** `applyLanguage()` re-runs the whole render chain, and the established house
pattern is that render functions clear their container and rebuild.
**How to avoid:** `renderEnrollment()` must not rebuild while `data-state` is `submitting` or
`failure`, and when it does rebuild it should re-apply values and restore focus to the previously
focused field's id. Phase 2 hit the same class of problem and solved it by making the map slot a
persistent sibling rather than a rebuilt child (STATE.md, phase 2 decision). The same instinct
applies: the form element is persistent, its labels are what get re-translated.

### Pitfall 8: The note field's honesty gap
**What goes wrong:** A guest types a serious dietary requirement into the note and has no way to
confirm it arrived, ever. Nothing on the site can read it back (D-02), and there is no email.
**Why it happens:** It is the direct consequence of the privacy model, and CONTEXT.md flags it under
`## Flagged consideration`.
**How to avoid:** One line of helper copy under the field saying plainly that this goes to the host
and only the host, and that the guest can change it later. It is Claude's discretion how to word it;
it is not discretionary whether to say it. Ideally the success panel echoes the note back from
storage, which costs nothing and closes most of the gap.

### Pitfall 9: `note` sent as `""` rather than `null`
**What goes wrong:** Every registration without a note stores an empty string, and the owner's
dashboard shows a column of blank cells instead of nulls.
**Why it happens:** `input.value` is `""`, not `null`, and `char_length('') <= 500` passes.
**How to avoid:** Coerce empty and whitespace-only to `null` before the request. The `amend` function
above does the same server side with `nullif(p_note, '')`.

### Pitfall 10: Extra guests sent as a string
**What goes wrong:** `"2"` where a `smallint` is expected.
**Why it happens:** `select.value` and `input.value` are always strings.
**How to avoid:** `parseInt(v, 10)`, and clamp to `0..CFG.enrollment.maxGuestsPerPerson` before
sending. Note the database independently caps at 10 while config caps at 2, so config is the tighter
bound and the one the UI must enforce (D-09).

---

## Validation and Accessibility

The concrete pattern for ENR-09 and ENR-10. No library.

### Per-field, on blur (D-10)

Each field owns three nodes: the `<label>`, the control, and a persistent error node that is empty
when valid. The error node exists from first render so `aria-describedby` never has to be added and
removed, which is where most hand-rolled implementations break screen readers.

```html
<div class="field" data-invalid="false">
  <label class="field__label" for="enrol-name">Full name</label>
  <input class="field__input" id="enrol-name" name="name" type="text"
         maxlength="60" required
         autocomplete="name" enterkeyhint="next"
         aria-describedby="enrol-name-hint enrol-name-err">
  <p class="field__hint"  id="enrol-name-hint">As you would like it on the list.</p>
  <p class="field__err"   id="enrol-name-err"></p>
</div>
```

- `aria-describedby` lists **both** the hint and the error node, space separated, and is set once in
  markup. An empty error node contributes nothing to the accessible description, so this is correct
  in the valid state too.
- On failure: set `aria-invalid="true"` on the control and write the message into the error node.
  On repair: set `aria-invalid="false"` and blank the error node. The W3C tutorial's guidance is that
  the message *"can be associated with the corresponding error message using `aria-describedby`"*
  [CITED: w3.org/WAI/tutorials/forms/notifications/].
- `data-invalid` on the wrapper is what CSS styles. Do not style off `:invalid`, which fires before
  the guest has typed anything.

**Timing.** MDN is explicit:

> "Do not set `aria-invalid="true"` on empty required elements until after the user attempts to
> submit the form. They may still be working on filling it out."
> [CITED: developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid]

This aligns exactly with D-10. A blank name field must **not** go red on blur if the guest never
typed in it, only if they typed and cleared it, or on submit. D-10's "re-validation on input happens
only for a field already showing an error" is the standard and correct refinement.

MDN also recommends `aria-errormessage` for the message pointer. **Do not use it here.**
`aria-errormessage` support is materially weaker than `aria-describedby` across screen readers, and
this site's audience is on phones with VoiceOver and TalkBack. `aria-describedby` is the safe choice
and is what ENR-09 names.

### On submit failure

Two distinct announcements, and conflating them is the usual mistake.

| Failure | Mechanism | Focus |
|---|---|---|
| Fields invalid | Existing per-field error nodes populate. Plus a `role="alert"` summary if more than one. | Move focus to the **first invalid control** |
| Network or server error (D-11 `failure`) | A `role="alert"` banner above the submit button | Move focus to the banner, or leave it and rely on the alert |

> ```html
> <div role="alert">
>   <h4>There are 2 errors in this form</h4>
>   <ul>...</ul>
> </div>
> ```
> [CITED: w3.org/WAI/tutorials/forms/notifications/]

and *"If the submitted data contains errors, it is convenient to set the focus to the first `<input>`
element that contains an error."* [CITED: same page]

`role="alert"` carries an implicit `aria-live="assertive"`, so it interrupts. That is right for a
failed submit and wrong for a field error, which is why field errors are described rather than
announced. **The alert container must exist in the DOM before the message is written into it**, or
many screen readers will not announce the change. Render it empty and `hidden`, then unhide and fill.

Note the site already has one live region:

> `<div class="toast" id="toast" role="status" aria-live="polite" hidden></div>`
> [VERIFIED: index.html:298, quoted verbatim]

`role="status"` is polite and is right for the incidental confirmations D-11 assigns to `toast()`. It
is **not** the right channel for the submit failure, which needs assertive. Add a separate
`role="alert"` node inside the form.

### Announcing success when the form is replaced (WA-02, ENR-10)

The hardest case, and the one the phase's whole "done when" depends on. The form is removed from the
DOM and a success panel takes its place. A screen reader user whose focus was on the submit button
now has focus on `document.body` and has been told nothing.

Recommended sequence:

1. Build the success panel and insert it where the form was.
2. Give its heading `tabindex="-1"` and call `.focus()` on it. Focus moves into the new content, and
   the screen reader reads the heading, which is the success message.
3. Do **not** also wrap the panel in `role="alert"`. Focusing it already announces it; doing both
   causes a double announcement, which reads as a stutter.
4. `scrollIntoView()` is not needed; focusing scrolls. If added, respect `prefers-reduced-motion` by
   omitting `behavior: 'smooth'` (DSG-05, D-32).

Precedent exists in this codebase: phase 2 made two sections focusable with `tabindex="-1"` for the
same reason, and left an explicit comment at `index.html:227-234` warning that exactly two
occurrences of the attribute may exist in that file. **The success panel's heading is created in JS,
not in `index.html`, so it does not violate that gate.** The planner should note this explicitly,
because a naive reading of that comment would block the correct solution.

### Mobile input attributes

Small, and they are most of the difference between a 10-second enrollment and a 30-second one.

| Field | Attributes |
|---|---|
| Name | `type="text" autocomplete="name" autocapitalize="words" enterkeyhint="next" maxlength="60"` |
| Extra guests | A `<select>` with `0..maxGuestsPerPerson` options. Avoid `type="number"`: it brings up a full keypad for a choice of three values, and its spinners are below 44px. |
| Note | `<textarea maxlength="500" rows="3" enterkeyhint="done">` |

`maxlength` mirrors the database `check` bounds, so the guest is stopped at the input rather than by a
`23514` after a round trip. It does not replace validation, because `maxlength` does not stop a paste
in every browser and does nothing about the `trim()` in `char_length(trim(name)) between 1 and 60`.

**iOS zoom:** any input with a computed `font-size` below 16px causes iOS Safari to zoom the viewport
on focus, and it does not zoom back out. Every control in this form must be at least 16px. This is a
device-pass item (D-33) and a CSS constraint, not a nice-to-have.

---

## Gaps in the Existing Code

Things the planner must schedule that are not obvious from CONTEXT.md.

### G1. There is no form component system in `styles.css`

Verified by search: `styles.css` contains **zero** rules matching `input`, `textarea`, `select`,
`label`, `fieldset`, `.field` or `.form`. The only interactive components are `.btn`, `.btn--primary`
and `.btn--ghost` at `styles.css:402-427`, and the `.facts__row--egg` affordance.

This is the site's first form. The planner must budget for a complete component: label, input,
textarea, select, hint, error, focus ring, disabled state, and the eight interaction states the
routed skill's `interaction-states.md` requires, all against the locked dark palette where
`#990000` on `#0B0B0C` fails text contrast and red text must use `--accent-lit` (`#E83F48`)
[VERIFIED: .planning/DESIGN-BRIEF.md:72-74]. Error text is red text, so error text is `--accent-lit`,
not `--accent`. This single detail is the most likely contrast failure in the phase.

Existing hooks to reuse: `--rule` `#2A2A2E` for input borders, `--surface` `#141416` for input fills,
2px and 8px radii only, and `.btn:active { transform: scale(0.97); }` at `styles.css:418` as the
established press feedback.

### G2. `styles.css` has only 6 `focus-visible` rules and 2 reduced-motion blocks

Both counts are about to rise. Every new control needs a `:focus-visible` ring at 3:1 against
adjacent colours per the routed skill, and D-32 requires each new animation to ship its
`prefers-reduced-motion` fallback in the same commit. The two existing blocks are at
`styles.css:792` and `styles.css:1122`; new rules should join them rather than starting a third.

### G3. `store` has no `remove`

> ```js
>   var store = {
>     get: function (k) { ... },
>     set: function (k, v) { ... }
>   };
> ```
> [VERIFIED: app.js:21-30, get and set are the only two members]

ID-04 and D-16 require clearing identity entirely. §Pattern 2 adds `remove`.

### G4. `config.js` comments are now wrong in three places

Not blocking, but CFG-04 says config is documented for a non-programmer, and these mislead:

- `config.js:127` says enrollment is *"Built in phase 3"*, which is true.
- `config.js:180` says photos is *"Built in phase 3"*. Photos is phase 4.
- `config.js:166` says the quiz is *"Built in phase 4"*. The quiz is phase 5.
- The enrollment credentials live under `photos.supabaseUrl` / `photos.supabaseKey`, which is
  confusing now that enrollment uses them too. `config.js:193-194` does say *"Until both are filled
  in, enrollment and photos show a waiting message instead of failing"*, so the coupling is
  acknowledged. **Do not move or rename the keys** (that breaks `enrollmentReady()` at `app.js:1166`
  and phase 4's expectations). Fix the comments only, which is explicitly within Claude's discretion
  per CONTEXT.md's "exact wording of the owner-facing comments in `config.js`".

### G5. `wireNudge()` sets `wa_joined` only from the bar

> ```js
>     if (cta) cta.addEventListener('click', function () {
>       if (bar.getAttribute('data-state') === 'group') {
>         store.set('wa_joined', '1');
> ```
> [VERIFIED: app.js:1197-1199, quoted verbatim]

D-26 requires the success-panel CTA and the `#wa` section CTA to set the same flag. Three call sites
will write `wa_joined`; extract a `markGroupJoined()` so the string `'1'` appears once.

---

## Nudge Bar Audit (NDG-01 to NDG-08)

D-27 says the bar is done and this phase verifies rather than rebuilds. Mapping each requirement to
the line that satisfies it, so the verifier has something concrete to check rather than a vibe:

| ID | Requirement | Where | Status |
|---|---|---|---|
| NDG-01 | Two states, pinned bottom | `app.js:1120-1155` sets `data-state` to `enrol` or `group`; `.nudge` in `styles.css` | Code present. **Visual pinning unverified**, bar has never rendered. |
| NDG-02 | Never covers countdown, address, video | `document.body.setAttribute('data-nudge','1')` at `app.js:1173` | **Device pass required (D-29).** Highest-risk NDG item. |
| NDG-03 | Enroll is a hero action | `hero.cta.enrol` at `copy.js:31`, already in `index.html` | Satisfied. |
| NDG-04 | Deadline shown, institutional urgency | `renderDeadline()` `app.js:1089-1105`, `hero.deadline` | Satisfied. |
| NDG-05 | Count as social proof, only when not embarrassing | **Not built.** This phase, D-19/D-20. | New work. |
| NDG-06 | Once enrolled, nudges stop permanently | `if (!isEnrolled())` at `app.js:1120`, and `renderDeadline` hides at `app.js:1100` | Code present. Needs the `enrolled` flag actually being written, which is this phase. |
| NDG-07 | Copy escalates, not frequency | Four-branch ladder at `app.js:1128-1132`, keys `nudge.enrol.text/soon/last/today` | Satisfied. Verify all four branches by moving `enrollment.deadline` locally. |
| NDG-08 | Dismissible for the session, respected | `sessionDismissed` at `app.js:1183`, checked at `app.js:1118` | Satisfied. Note it is a module variable, so it resets on reload, which is the correct reading of "for the session". |

**Verification tip for NDG-07:** the four branches key off `daysUntil(deadlineMs)` returning `>7`,
`>1`, `===1`, `===0`, and a negative value hides the bar. Testing all five outcomes means editing
`enrollment.deadline` in `config.js` locally five times. Cheaper and equally valid: temporarily
expose `daysUntil` or set the deadline via the console. Either way, this is a real check, because
the `days > 1` branch is only reachable for a six-day window in the whole life of the site.

---

## Code Examples

### E1. The complete write path

```js
/* Three outcomes only, so the caller has three branches and not thirteen:
     'ok'       the registration is now in the database
     'pending'  the owner has not re-run supabase/schema.sql yet
     'failed'   anything else, and the guest sees the failure state
   D-07: none of these is inferred from a status code alone on the amend path,
   because the function hands back the number of rows it touched. */
function submitEnrollment(fields, identity) {
  var row = {
    guest_id: identity.guest_id,
    name: fields.name,
    extra_guests: fields.extra_guests,
    note: fields.note,          // already null, never ''
    lang: lang                  // the resolved module variable, never navigator.language
  };

  return sbRequest('POST', '/rest/v1/enrollments', row, 'return=minimal')
    .then(function (res) {
      if (res.status === 201) return { result: 'ok' };

      // Already registered from this browser. Expected under D-15, not a failure.
      if (res.status === 409 && res.code === '23505') return amendEnrollment(fields, identity);

      return { result: 'failed', code: res.code };
    });
}

function amendEnrollment(fields, identity) {
  var args = {
    p_guest_id: identity.guest_id,
    p_name: fields.name,
    p_extra_guests: fields.extra_guests,
    p_note: fields.note === null ? '' : fields.note,   // '' means "clear it"
    p_lang: lang,
    p_withdrawn: false
  };

  return sbRequest('POST', '/rest/v1/rpc/amend_enrollment', args, null)
    .then(function (res) {
      // The function does not exist yet: the owner has not re-run the schema file.
      if (res.status === 404 && res.code === 'PGRST202') return { result: 'pending' };

      // The body is a bare integer: rows touched. 0 means storage and database
      // disagree about this guest_id, so start over as a fresh registration.
      if (res.ok && res.body === 1) return { result: 'ok' };
      if (res.ok && res.body === 0) return { result: 'failed', code: 'NOT_FOUND' };

      return { result: 'failed', code: res.code };
    });
}

function withdrawEnrollment(identity) {
  return sbRequest('POST', '/rest/v1/rpc/amend_enrollment',
    { p_guest_id: identity.guest_id, p_withdrawn: true }, null);
}
```

### E2. UUID with the older-Safari fallback (D-14)

```js
function newGuestId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  /* Safari before 15.4, and any non secure context. Build a real v4 rather than
     a random hex string, because the column is typed uuid and a malformed one
     comes back 400 / 22P02. */
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;      // version 4
    b[8] = (b[8] & 0x3f) | 0x80;      // variant 10xx
    var h = [];
    for (var i = 0; i < 16; i++) h.push((b[i] + 0x100).toString(16).slice(1));
    return h[0]+h[1]+h[2]+h[3] + '-' + h[4]+h[5] + '-' + h[6]+h[7] + '-' +
           h[8]+h[9] + '-' + h[10]+h[11]+h[12]+h[13]+h[14]+h[15];
  }

  return null;   // no crypto at all. Caller falls back to the pending state.
}
```

Returning `null` rather than `Math.random()` is deliberate: a non-unique id would collide on the
`unique` constraint and produce a confusing `409` for a guest who has never registered. A `null`
lands cleanly in the unconfigured branch, which is the site's established answer to "this cannot
work here".

### E3. Field validation (ENR-09, D-10)

```js
/* Returns a copy key, or null when the field is fine. Copy keys, never strings:
   the message has to survive a language switch. */
function validateName(v) {
  var t = (v || '').trim();
  if (!t)            return 'enrol.err.nameRequired';
  if (t.length > 60) return 'enrol.err.nameLong';
  return null;
}

function validateNote(v) {
  return (v || '').length > 500 ? 'enrol.err.noteLong' : null;
}

function validateGuests(v) {
  var max = (CFG.enrollment || {}).maxGuestsPerPerson;
  var n = parseInt(v, 10);
  if (isNaN(n) || n < 0 || n > max) return 'enrol.err.guestsRange';
  return null;
}

/* One function owns the aria wiring, so no call site can set half of it. */
function showFieldError(input, errKey) {
  var wrap = input.closest('.field');
  var err  = document.getElementById(input.id + '-err');

  if (errKey) {
    input.setAttribute('aria-invalid', 'true');
    wrap.setAttribute('data-invalid', 'true');
    err.textContent = t(errKey);
    input.setAttribute('data-errkey', errKey);   // so a language switch can re-render it
  } else {
    input.setAttribute('aria-invalid', 'false');
    wrap.setAttribute('data-invalid', 'false');
    err.textContent = '';
    input.removeAttribute('data-errkey');
  }
}

function wireField(input, validate) {
  input.addEventListener('blur', function () {
    // Untouched and empty: say nothing. MDN, and D-10.
    if (!input.value && !input.getAttribute('data-touched')) return;
    showFieldError(input, validate(input.value));
  });

  input.addEventListener('input', function () {
    input.setAttribute('data-touched', '1');
    // Re-validate on input ONLY while an error is showing, so it clears the
    // moment it is fixed and never appears mid-word. D-10.
    if (input.getAttribute('aria-invalid') === 'true') {
      showFieldError(input, validate(input.value));
    }
  });
}
```

Storing `data-errkey` on the input is what lets a language switch re-render a *currently visible*
error without re-running validation, which matters because §Pitfall 7 forbids rebuilding the form
while it is in the failure state.

### E4. Submit state machine (ENR-10, D-11)

```js
function setFormState(form, state) {
  form.setAttribute('data-state', state);

  var busy = (state === 'submitting');
  $$('input, select, textarea, button', form).forEach(function (el) { el.disabled = busy; });

  var btn = $('#enrol-submit', form);
  if (btn) {
    btn.textContent = busy ? t('enrol.submitting')
                   : (state === 'failure' ? t('enrol.retry') : t('enrol.submit'));
    // aria-busy tells a screen reader the region is working, which a disabled
    // button on its own does not.
    btn.setAttribute('aria-busy', busy ? 'true' : 'false');
  }
}
```

### E5. Social proof (ENR-07, ENR-08, D-19 to D-22)

```js
function renderSocialProof() {
  var host = $('#enrol-proof');
  if (!host || !sbConfigured()) return;

  sbRequest('GET', '/rest/v1/attendees?select=first_name,extra_guests&order=created_at.desc',
            null, null, 8000)
    .then(function (res) {
      host.textContent = '';

      // D-22: a headcount widget is not worth an error message. Absent is fine.
      if (!res.ok || !Array.isArray(res.body)) return;

      var rows = res.body;
      var total = rows.length;
      for (var i = 0; i < rows.length; i++) total += (rows[i].extra_guests || 0);

      // D-20: below the threshold the block is absent. Not a zero, and not an
      // invitation to be first, which reads as an empty room.
      if (total < ((CFG.enrollment || {}).showCountFrom || 0)) return;

      // ... count line, then the first-name list if showAttendeeList
    });
}
```

### E6. The WhatsApp CTA (WA-02, WA-03, WA-06, D-26)

```js
function whatsappButton(labelKey, className) {
  var url = (CFG.whatsapp || {}).inviteUrl;
  if (!url) return null;                    // WA-06: absent, never a dead button

  var a = document.createElement('a');
  a.className = className;
  a.setAttribute('href', url);
  a.setAttribute('target', '_blank');
  a.setAttribute('rel', 'noopener');        // matches the nudge bar, app.js:1150
  a.textContent = t(labelKey);
  a.addEventListener('click', markGroupJoined);   // D-26, three call sites, one writer
  return a;
}

function markGroupJoined() {
  store.set('wa_joined', '1');
  renderNudge();                            // D-28
}
```

`https://chat.whatsapp.com/...` is a universal link: tapping it on a phone with WhatsApp installed
opens the app, and on a device without it opens a web page offering the install. One tap either way,
which is what WA-03 asks for. No `intent://` scheme, no `wa.me`, no QR code.
[ASSUMED: the universal-link behaviour is from training knowledge and was not verified against
WhatsApp's documentation this session. It is also unverifiable until `whatsapp.inviteUrl` is set,
which it is not (`config.js:157`). This is a D-33 device-pass item and CONTEXT.md already lists
"the WhatsApp button actually opening the app" as one.]

---

## Config Impact

**No new config keys are required.** Confirmed against the live file:

> ```js
>   enrollment: {
>     deadline: '2026-09-26T23:59:00+02:00',
>     maxGuestsPerPerson: 2,   // how many extra people one guest may bring
>     showCountFrom: 8,        // hide the running total until it looks healthy
>     showAttendeeList: true,  // first names only, never full names
>   },
> ```
> [VERIFIED: config.js:137-142, quoted verbatim]

> ```js
>   whatsapp: {
>     inviteUrl: null,
>   },
> ```
> [VERIFIED: config.js:156-158, quoted verbatim]

All four enrollment keys are consumed by this phase. `whatsapp.inviteUrl` is **still null**, so the
`#wa` section and the success panel's primary CTA will be absent on the live site until the owner
supplies it. STATE.md already tracks this as one of the six owner inputs. The phase must ship and be
verifiable in that state, which means the success panel needs a defined appearance with no WhatsApp
button, and that appearance must not look broken. This is a real design case, not an edge case, and
it is the state the site will actually be in on the day the phase lands.

## Copy Impact

Verified at parity right now: **114 keys in each of `en`, `it`, `da`, with zero missing and zero
extra** in `it` and `da` relative to `en`. [VERIFIED: parsed `copy.js` and diffed the key sets,
2026-08-14]

Already seeded and currently unused, so no new keys needed for the group section:
`wa.heading`, `wa.body`, `wa.cta` at `copy.js:93-95` and their `it`/`da` twins.

New keys needed, roughly 30 per language: form labels and hints (3 fields), field errors (4 or 5),
the four submit-state button labels, the submit failure banner, the success panel heading and body,
the returning-guest heading and body, edit / withdraw / cancel / clear-identity labels, the withdraw
confirmation, the schema-pending line, the count line with a `{n}` placeholder, and the attendee-list
heading.

Placeholder convention is established: `{date}` in `hero.deadline` and `{n}` in `nudge.enrol.soon`,
substituted with `.replace()` at `app.js:1102` and `app.js:1129`. Follow it.

LNG-04 and DESIGN-BRIEF's copy rules apply: written natively per language, not translated, deadpan
institutional register, and **zero em dashes** (DSG-06). Danish is a complete translation, not a gag
(LNG-05). The parity check should be re-run after the phase, since it is cheap and LNG-06 says
"verified rather than assumed".

---

## Design Constraint Precedence

Two general-purpose design skills are routed into this agent and into the planner via
`.planning/config.json`. **They conflict with `DESIGN-BRIEF.md` in several concrete places, and the
brief wins every time.** Recording this so the planner does not have to rediscover it.

| Routed skill says | DESIGN-BRIEF.md / CONTEXT.md says | Winner |
|---|---|---|
| `rounded-full` pills, `rounded-[2rem]` outer shells | *"One corner-radius system ... radii stay small: 2px and 8px"* [VERIFIED: DESIGN-BRIEF.md:112] | **Brief.** |
| Glassmorphism, `backdrop-blur-2xl`, radial mesh gradients | Flat institutional dark, `--surface` `#141416` on `--bg` `#0B0B0C` | **Brief.** |
| Entry animations resolving `blur-md` to `blur-0` | *"Animate `transform` and `opacity` only"* [VERIFIED: DESIGN-BRIEF.md:110] | **Brief.** `blur` is neither. |
| MOTION baseline 6 to 8 | D-31: MOTION_INTENSITY **3** for this phase | **CONTEXT.md.** |
| Tailwind utility classes throughout | Plain CSS, no build step, no bundler | **Project constraint.** |
| Banned fonts list (Inter, Roboto, ...) | Saira / IBM Plex Sans / IBM Plex Mono | No conflict; Plex is not on the banned list. |
| "Never generate the same layout twice" | An established site with five shipped sections | **Consistency wins.** The form must look like it belongs to the page that already exists. |

What the routed skills *do* contribute usefully, and should be honoured:
`interaction-states.md`'s eight states per interactive element, which is exactly right for a form and
is the densest concentration of interactive states on this site; `:focus-visible` rather than
`outline: none`; validate on blur not on keystroke; placeholders are not labels; errors below fields
wired with `aria-describedby`; touch targets at 44px minimum. All of these agree with the brief and
with ENR-09.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|---|---|---|---|---|
| Supabase project `aplaxdplwnnlezffatal` | ENR-03, ENR-07 | ✓ | live, responding | none needed |
| `enrollments` table + INSERT policy | ENR-03 | ✓ | verified `201` | none |
| `attendees` view + `grant select` | ENR-07, ENR-08 | ✓ | verified returning rows | D-22 silence |
| `withdrawn` column | ENR-06, D-04 | ✗ | not present, `PGRST204` | Pending state until owner re-runs the schema |
| `amend_enrollment` function | ENR-06 | ✗ | not present, `PGRST202` | Pending state, same trigger |
| `whatsapp.inviteUrl` | WA-01 to WA-05 | ✗ | `null` at `config.js:157` | WA-06, section absent |
| GitHub Pages deploy from `main` | DEL-01 | ✓ | active | none |
| `tools/preview.js` local server | Local verification | ✓ | serves `127.0.0.1:4173` | none |
| Real iOS Safari + Android Chrome | D-33, NDG-02, ACC-01 | **owner-dependent** | n/a | none. This is a human gate. |
| Node / npm / any build tool | nothing | n/a | deliberately unused | n/a |

**Missing dependencies with no fallback:** none that block shipping.

**Missing dependencies with fallback:**
- `withdrawn` column and `amend_enrollment` function: the phase ships with enrollment fully working
  and edit/withdraw showing a pending line. **This must be a tracked owner input**, added to
  STATE.md's table alongside the existing five. It is the only new owner action this phase creates.
- `whatsapp.inviteUrl`: the phase ships with the group handoff absent, which WA-06 already specifies.
  Worth stating plainly in the plan that the phase's headline "done when" sentence ("lands in the
  WhatsApp group with one more tap") **cannot be demonstrated** until the owner supplies the link.
  The code path can be verified by setting a temporary value locally.

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1` in `.planning/config.json`.
[VERIFIED: .planning/config.json, `"security_enforcement": true` and `"security_asvs_level": 1`]

### Applicable ASVS categories

| ASVS Category | Applies | Standard Control |
|---|---|---|
| V2 Authentication | **no** | No auth exists by explicit project decision. `guest_id` is a capability token, not a credential, and the schema comment says so. |
| V3 Session Management | **no** | No sessions. |
| V4 Access Control | **yes** | Postgres RLS is the entire control. Verified this session: insert allowed, select denied, delete denied, update denied-in-effect. The `security definer` function is the one deliberate, narrowly scoped exception. |
| V5 Input Validation | **yes** | Client bounds mirroring `check` constraints, plus `createElement` + `textContent` for all output. See below. |
| V6 Cryptography | **yes** | `crypto.randomUUID()` / `crypto.getRandomValues`. **Never `Math.random()`** for `guest_id`: a guessable id is the only thing standing between a stranger and someone else's registration. |
| V7 Error Handling | **yes** | Branch on `code`, never surface a raw PostgREST `message` to a guest. Those messages leak constraint and table names. |
| V13 API | **yes** | The publishable key is public by design; the wire contract is the boundary. |

### Threat patterns for this stack

| Pattern | STRIDE | Mitigation |
|---|---|---|
| **XSS via the `name` field** | Tampering | This is the phase's real new attack surface. A guest types `name`, it is stored, and it comes back to *every other guest's browser* through the `attendees` list (ENR-08). Note the view does **not** sanitise, it only truncates to the first token. Mitigation: build every list item with `document.createElement` + `textContent`, never `innerHTML`, never a template string. This is already the house rule at `app.js:246-249`; this is the first phase where breaking it would be exploitable rather than merely untidy. |
| **Self-XSS via the returning-guest greeting** | Tampering | The stored `name` is rendered back to the same guest. Lower severity, same mitigation, no exception. |
| **`note` disclosure** | Information disclosure | Structurally prevented: no SELECT policy, and the view does not project `note`. **The single rule that preserves this: never add `note` to the `attendees` view, and never add a SELECT policy.** Both would be one-line changes with irreversible consequences. |
| **Enrollment flooding** | Denial of service | Honestly scoped in D-30. `guest_id unique` caps one browser at one row; clearing storage defeats it. Accepted, documented, owner's recourse is the dashboard. Not a code problem on a static site with a public insert policy. |
| **Guessing another guest's `guest_id`** | Spoofing, Tampering | 122 bits of entropy from a CSPRNG. Infeasible. Depends entirely on V6 above being done right. |
| **Over-broad `security definer` function** | Elevation of privilege | The function must return `integer`, never `setof enrollments` or `record`. A definer function that returns rows would hand every note to anyone who can guess a uuid, which is a worse leak than the SELECT policy D-02 rejected. `revoke all ... from public` before granting to `anon`. |
| **Reflected error text** | Information disclosure | Never render `res.body.message` into the page. Map `code` to a localised copy key. |
| **`target="_blank"` reverse tabnabbing** | Tampering | `rel="noopener"` on every external anchor, matching `app.js:1150`. |

### One non-obvious call

The `security definer` function is a genuine privilege escalation primitive, deliberately introduced.
It is the right call here because the alternative (a SELECT policy) leaks strictly more, and because
its blast radius is bounded by its return type and its `where guest_id = p_guest_id` clause. The
planner should treat any change to that function's signature or return type as a security-relevant
change requiring review, and should say so in a comment above it in `schema.sql`.

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| Supabase `anon` JWT key in `Authorization: Bearer` | `sb_publishable_...` key in `apikey` | New key format, current | **Directly relevant.** Bearer-only now hard-fails `401`. §W1. |
| `Prefer: return=representation` as the default habit | `return=minimal` on write-only tables | PostgREST, longstanding | Directly relevant. §THE BLOCKER. |
| Custom UUID helpers | `crypto.randomUUID()` | Baseline since March 2022 [CITED: MDN] | D-14 already right. Fallback still needed for older iOS. |
| `setTimeout` racing a fetch promise | `AbortController` + `signal` | Longstanding | D-08. |
| `aria-describedby` for error messages | `aria-errormessage` is the newer attribute | ARIA 1.2 | **Do not adopt.** Screen reader support is materially weaker. Stay on `aria-describedby`, which is what ENR-09 names. |
| `outline: none` plus a custom ring | `:focus-visible` | Widely supported | Already used 6 times in `styles.css`. |

**Deprecated / outdated in this context:**
- Sending a publishable key as a bearer token. Was correct for the legacy anon JWT, is wrong now.
- `alert()`-style validation, and `:invalid` styling that fires before the guest has typed.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | Postgres grants `EXECUTE` on new functions to `PUBLIC` by default, hence the `revoke all` | The Fix | Low. The `revoke` is harmless either way and is included regardless. |
| A2 | Supabase's linter rule for owner-privileged views is named `security_definer_view` | Database Contract | None. Cosmetic. The behaviour is verified; only the rule's name is assumed. |
| A3 | `127.0.0.1` counts as a secure context, so `crypto.randomUUID` works in local preview | Pitfall 2 | Low, but it changes *where* the fallback gets exercised. Cheapest probe: evaluate `window.isSecureContext` in the local preview console. |
| A4 | `https://chat.whatsapp.com/...` opens the installed app via universal link on both platforms | Code Examples E6 | Medium **for the phase's headline promise**, low for the code. Unverifiable until the owner supplies a link. Already a D-33 device-pass item. |
| A5 | `aria-errormessage` has materially weaker screen reader support than `aria-describedby` | Validation and Accessibility | Low. The recommendation (`aria-describedby`) is what ENR-09 mandates anyway, so the assumption only justifies a decision already locked. |
| A6 | The `it`/`da` copy that this phase adds will be written natively rather than translated | Copy Impact | Not a technical risk. LNG-04 requirement, flagged so the planner assigns it real effort. |
| A7 | `sessionDismissed` resetting on reload is the intended reading of NDG-08's "for the session" | Nudge Bar Audit | Low. It is the existing behaviour and D-27 says the bar is correct as built. |

---

## Open Questions

1. **Does the owner accept the RPC as the answer to ENR-06, or would they rather drop edit/withdraw?**
   - What we know: `PATCH` cannot work without a SELECT policy. Proven, not suspected.
   - What is unclear: whether the owner would rather add one small `security definer` function, or
     ship without edit/withdraw and let guests message the host. ENR-06 is a stated requirement, and
     dropping it means unchecking a requirement rather than satisfying it.
   - Recommendation: **take the RPC.** It is about 20 lines of SQL, it is bundled into a schema
     re-run the owner already has to do for `withdrawn`, and it preserves D-02 exactly. But this is a
     genuine deviation from a locked decision and it should be surfaced to the owner in one sentence
     rather than absorbed silently by the planner.

2. **Does `body[data-nudge]` actually reserve enough space on a real phone? (NDG-02, D-29)**
   - What we know: the hook exists at `app.js:1173` and the CSS exists.
   - What is unclear: everything else. The bar has never rendered on any device, because
     `enrollmentReady()` has always returned false.
   - Recommendation: first item on `03-DEVICE-PASS.md`, checked against the countdown, the address
     block, and the footer, on both platforms, with iOS Safari's collapsing toolbar in play.

3. **Should the success panel echo the note back?**
   - What we know: the note is unreadable from the database forever (D-02), and CONTEXT.md flags
     this as an honesty gap.
   - What is unclear: whether echoing it from `localStorage` reads as reassuring or as redundant.
   - Recommendation: echo it. It costs nothing, it is already in storage per D-03, and it converts
     "I hope that arrived" into "I can see that it did". Claude's discretion covers the visual
     treatment of the success panel, so this fits inside the existing grant.

4. **`config.js` credentials live under `photos.*` but now serve enrollment too.**
   - What we know: `enrollmentReady()` at `app.js:1166` reads `CFG.photos`, and the config comment at
     `config.js:193-194` already acknowledges both features share them.
   - What is unclear: nothing technically. It is purely a naming smell.
   - Recommendation: **do not move the keys.** Fix the surrounding comments only. Moving them breaks
     `enrollmentReady()` (D-13 forbids touching it) and pre-breaks phase 4.

5. **Is `ZZTEST DeleteMe` cleaned up before or after the phase?**
   - What we know: exactly one such row exists, inserted by this research session, and the exact
     delete statement is already in STATE.md.
   - Recommendation: after, not before. The row is the only data in the table, which makes it a
     genuinely useful fixture for verifying the `attendees` fetch, the sum arithmetic, and the
     below-threshold hiding path. Delete it in the phase's closing sweep, as D-34 says.

---

## Sources

### Primary (verified this session by direct probe, HIGH confidence)
- Live PostgREST endpoint `https://aplaxdplwnnlezffatal.supabase.co/rest/v1/`, 2026-08-14. Header
  auth matrix, `Prefer: return=*` semantics on a write-only table, `PATCH` zero-row behaviour, upsert
  behaviour, `DELETE` behaviour, the `attendees` view, and the full error taxonomy in §W6.
- `supabase/schema.sql` (read in full), `config.js` (read in full), `app.js:1-130` and
  `app.js:240-360` and `app.js:1050-1250`, `index.html:195-302`, `styles.css` (searched), `copy.js`
  (parsed and key sets diffed).
- `.planning/config.json`, `.planning/STATE.md`, `.planning/REQUIREMENTS.md`,
  `.planning/DESIGN-BRIEF.md`, `03-CONTEXT.md`.

### Primary documentation (CITED, MEDIUM to HIGH)
- postgresql.org/docs/current/sql-createpolicy.html — "Policies Applied by Command Type", the UPDATE
  and DELETE SELECT-policy requirement. **The authoritative explanation of the blocker.**
- postgresql.org/docs/current/sql-createview.html — `create or replace view` column rules,
  `security_invoker`.
- docs.postgrest.org/en/stable/references/api/preferences.html — `Prefer: return` semantics, the
  write-only-table warning.
- docs.postgrest.org/en/stable/references/errors.html — error body shape, `42501` status mapping.
- docs.postgrest.org/en/stable/references/api/functions.html — `/rpc` calling convention.
- supabase.com/docs/guides/api/api-keys — publishable key, the `Authorization: Bearer` limitation.
- supabase.com/docs/guides/database/functions — `security definer`, `search_path`, `grant execute`.
- developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID — secure context, baseline availability.
- developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-invalid — timing guidance.
- w3.org/WAI/tutorials/forms/notifications/ — `aria-describedby`, `role="alert"`, focus management.

### Secondary (MEDIUM, cross-checked against a primary source before use)
- supabase.com/docs/guides/getting-started/migrating-to-new-api-keys — "Send publishable and secret
  keys on the `apikey` header only."
- github.com/supabase/supabase issue 28559, "UPDATE RLS policy requires SELECT RLS policy too" —
  corroborates the blocker as a widely hit problem. Note that the common community explanation
  ("the update succeeds but the response fails") is **wrong** for this configuration: the probe
  proves the update does not happen at all. The PostgreSQL doc is the correct explanation.

### Not consulted
- Context7 MCP was unavailable in this session, so `research-plan` routed items to `webfetch` /
  `websearch`. Direct probing of the live endpoint substituted for it and is stronger evidence for
  the questions that mattered.

---

## Metadata

**Confidence breakdown:**
- Database wire contract: **HIGH.** Every shape executed against this project's live database, with
  reproducible commands, and the one surprising result independently explained by the PostgreSQL
  documentation.
- The blocker and its fix: **HIGH** on the diagnosis, **MEDIUM-HIGH** on the fix. The fix's mechanism
  is documented and standard, but the specific function was not executed, because doing so needs SQL
  editor access this session did not have.
- Accessibility pattern: **HIGH.** MDN and W3C WAI, with the one contested point
  (`aria-errormessage`) called out and resolved conservatively.
- Existing code integration points: **HIGH.** All line references read this session and quoted.
- Copy and visual treatment: **MEDIUM**, and deliberately so. Claude's discretion per CONTEXT.md.
- WhatsApp handoff behaviour: **LOW**, unverifiable until the owner supplies a link. A4.

**Cheapest probe the executor should run first**, before writing any code, to confirm nothing has
shifted:

```bash
U="https://aplaxdplwnnlezffatal.supabase.co"
K="sb_publishable_Z6Cq5vFRqyUhXueQGevrYQ__j0pNRrc"
# expect [{"first_name":"ZZTEST","extra_guests":0}] or [] if D-34 was done early
curl -sS "$U/rest/v1/attendees?select=first_name,extra_guests" -H "apikey: $K"
# expect 404 PGRST202 until the owner re-runs supabase/schema.sql
curl -sS -X POST "$U/rest/v1/rpc/amend_enrollment" -H "apikey: $K" \
  -H "Content-Type: application/json" -d '{"p_guest_id":"00000000-0000-4000-8000-000000000000"}'
```

**Research date:** 2026-08-14
**Valid until:** 2026-09-14. The PostgreSQL and PostgREST semantics are stable. The one item worth
re-checking sooner is the Supabase gateway's tolerance of a duplicated key in `Authorization:
Bearer`, since the docs describe it as a limitation rather than a feature. Following §W1's
recommendation to send `apikey` only removes that exposure entirely.
