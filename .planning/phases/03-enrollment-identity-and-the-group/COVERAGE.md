---
phase: 03-enrollment-identity-and-the-group
gate: workflow.api_coverage_gate
api: Supabase PostgREST (project aplaxdplwnnlezffatal)
base_url: https://aplaxdplwnnlezffatal.supabase.co
transport: plain fetch, no SDK (D-06)
generated: 2026-08-14
---

# Phase 3 — External API Coverage

**Why this file exists.** The deterministic API detector returned `detected: false`, because the
roadmap prose for this phase does not use its trigger vocabulary. That is a detector miss, not a
fact. This phase consumes an external HTTP API directly, from the browser, with a key that is
public by design, and `workflow.api_coverage_gate` was deliberately re-armed for this phase in
`ROADMAP.md` for exactly that reason.

**What it enumerates.** Every PostgREST capability the phase either uses or deliberately declines.
Several of the `OPT-OUT` rows are load-bearing architecture rather than omissions: the whole
privacy model of this project is a list of things it refuses to ask the database for. Writing them
down is the point, so that a later phase does not "add the missing SELECT policy" and quietly
republish every guest's free-text note.

Every row was settled by live probe against this project on 2026-08-14
(`03-RESEARCH.md` §THE BLOCKER, §Wire Contract, §W6), not by inference from documentation.

**Table format.** The matrix is the three-column `Capability | Disposition | Reason` shape the
`api-coverage` gate parses. Row numbers live inside the capability cell so the prose below can
keep referring to "row 7", "capability 2" and so on. Where a reason did not fit the cell, it is
trimmed here and carried verbatim under `## Long-form reasons`.

---

## Capability surface

| Capability | Disposition | Reason |
|---|---|---|
| 1. `POST /rest/v1/enrollments` with `Prefer: return=minimal` | **INTEGRATE** | ENR-03. The whole write path. Probe-verified `201 Created`, empty body, `preference-applied: return=minimal`. |
| 2. `POST /rest/v1/rpc/amend_enrollment` | **INTEGRATE** | ENR-06. Edit and withdraw. Returns a bare integer row count, which is what makes an amendment provable under D-07. Added to `supabase/schema.sql` by plan 03-03. |
| 3. `GET /rest/v1/attendees?select=first_name,extra_guests` | **INTEGRATE** | ENR-07, ENR-08. One request serves both the count and the list (D-19). Probe-verified returning rows to the publishable key. |
| 4. `apikey` request header | **INTEGRATE** | The only authentication this project has. Probe-verified: `apikey` alone returns `200`. |
| 5. `AbortController` / `AbortSignal` on every request | **INTEGRATE** | D-08. A submit that hangs forever is the failure ENR-10 exists to forbid. 12s on writes, 8s on social proof. |
| 6. PostgREST error body `code` field | **INTEGRATE** | §W6. Branch on `code`, never on `message`. `23505` is a normal branch, `PGRST202` is a pending state, everything else is the failure state. |
| 7. `GET /rest/v1/enrollments` (select on the raw table) | **OPT-OUT** | D-02: no SELECT policy, by design. A blocked read returns `[]`, not an error, so code that checks enrollment by query concludes "not enrolled" forever. See note 7. |
| 8. `PATCH /rest/v1/enrollments?guest_id=eq.{uuid}` | **OPT-OUT** | Probe-proven to update zero rows, returning `204` with `Content-Range: */0`. Superseded by capability 2. Nothing in this phase may PATCH this table. See note 8. |
| 9. `DELETE /rest/v1/enrollments` | **OPT-OUT** | No DELETE policy and deliberately never will be. Probe-verified `204 No Content` deleting nothing. Withdrawal is a soft flag (D-04). Nothing in this phase may call DELETE. |
| 10. `Prefer: return=representation` | **OPT-OUT** | Probe-verified `401` / `42501` and **the row is not inserted**. The implied read-back has no SELECT policy to satisfy. The error message blames the insert policy and is actively misleading. |
| 11. `Prefer: return=headers-only` | **OPT-OUT** | Fails identically to capability 10. PostgREST's own docs warn that constructing the `Location` header on a write-only table causes a permissions error. |
| 12. Upsert `POST ?on_conflict=guest_id` (`resolution=merge-duplicates`) | **OPT-OUT** | Probe-verified `401` / `42501`, same root cause. The 409 duplicate is handled client side by switching to capability 2 instead. |
| 13. `Prefer: count=exact` | **OPT-OUT** | One `GET` already carries the count with the rows the phase needs (D-19); a second counted request is a redundant round trip on mobile data. See note 13. |
| 14. `Authorization: Bearer <key>` | **OPT-OUT** | A publishable key is not a JWT; `Bearer` alone hard-fails `401`. `apikey` only (§W1). See note 14. |
| 15. `Range` / `Content-Range` pagination | **OPT-OUT** | The guest list is bounded by a flat. Paging a party headcount is machinery with no payload. |
| 16. Wire-side `order=` on `attendees` | **OPT-OUT** | The wire offers `created_at.desc`, and recent-first is precisely the social-feed reading D-21 rejects. Sorting is client side with `localeCompare(lang)` so `æ ø å` order after `z` in Danish. |
| 17. Filters on `attendees` (e.g. `?withdrawn=eq.false`) | **OPT-OUT** | The filter lives inside the view definition (schema §7), server side, where a client cannot forget it. A filter on an unprojected column returns `400` / `42703`. See note 17. |
| 18. Embedded resources (`select=table(col,...)`) | **OPT-OUT** | One flat view, three columns. There is no relationship to embed and embedding would reach through to the raw table. |
| 19. `GET`-form RPC calls | **OPT-OUT** | Arguments are passed as JSON keys in a `POST` body, which is the documented calling convention and keeps a `guest_id` out of URLs, browser history and any proxy log. |
| 20. Supabase Storage (`/storage/v1/object/...`) | **OPT-OUT** | Phase 4. The bucket and its policies already exist in the applied schema; this phase writes the `guest_id` and `name` that phase 4 will attribute uploads to, and touches storage not at all. |
| 21. `POST /rest/v1/photos` | **OPT-OUT** | Phase 4, same reason. |
| 22. Supabase Auth (`/auth/v1/*`) | **OPT-OUT** | Real authentication is explicitly out of scope for the whole project. `guest_id` is a capability token, not a credential, and `supabase/schema.sql` says so in a comment. |
| 23. Realtime / websocket subscriptions | **OPT-OUT** | A live headcount would hold a socket open on a phone for a number that is hidden below 8 anyway. The block is fetched once per render and its failure is silent (D-22). |
| 24. `@supabase/supabase-js` from a CDN | **OPT-OUT** | About 40KB gzipped on a page targeting a mid-range phone outdoors at night, in exchange for sugar over the same endpoint. It would not have fixed the blocker either. See note 24. |
| 25. `GET /rest/v1/photos` (select on the raw table) | **OPT-OUT** | Added by plan 03-07. The select grant is revoked from `anon`; the album is read through `public.album` instead. Nothing in phase 3 or 4 may read this table. See note 25. |
| 26. `GET /rest/v1/album?select=first_name,storage_path,created_at` | **OPT-OUT** | Added by plan 03-07 and published, not consumed. Phase 4 is its only consumer, so there is no call site here. The projection is the boundary. See note 26. |

**Totals:** 26 capabilities enumerated, 6 `INTEGRATE`, 20 `OPT-OUT`.

---

## Long-form reasons

The eight rows whose reasoning did not fit a table cell, verbatim.

**Note 7 — `GET /rest/v1/enrollments`.** D-02: there is deliberately no SELECT policy. A blocked
read returns `[]`, not an error, so any code that checks enrollment by querying the table
concludes "not enrolled" forever. `localStorage` is the sole source of truth (D-03).

**Note 8 — `PATCH /rest/v1/enrollments`.** Probe-proven to update **zero rows** and return `204`
with `Content-Range: */0`. Postgres requires SELECT rights for an UPDATE whose WHERE clause reads
a column, and there are none. Superseded by capability 2. Nothing in this phase may issue a PATCH
against this table.

**Note 13 — `Prefer: count=exact`.** The phase needs the rows themselves for the attendee list, so
one `GET` already carries the count (D-19). A second counted request would be a redundant round
trip on mobile data. Kept in the file as the documented debugging aid for anyone who ever needs to
see a row count on a write.

**Note 14 — `Authorization: Bearer <key>`.** A publishable key is not a JWT. `Bearer` alone
hard-fails `401`. Sending it alongside `apikey` works today only under a documented exception
clause, and it is one more header on every request from a phone on mobile data. `apikey` only
(§W1).

**Note 17 — filters on `attendees`.** The view does not project `withdrawn` and must not start to:
the filter lives inside the view definition (schema §7), server side, where a client cannot forget
it. A filter on a column the view does not expose returns `400` / `42703`.

**Note 24 — `@supabase/supabase-js` from a CDN.** About 40KB gzipped on a page whose stated design
target is a mid-range phone outdoors at night, in exchange for sugar over the same endpoint. It
would not have fixed the blocker either, because the blocker is in Postgres, not in the client.

**Note 25 — `GET /rest/v1/photos`.** Added by plan 03-07. The select grant is revoked from `anon`
and the album is read through `public.album` instead. The table carries a `guest_id`, which
section 8 turned into a bearer write credential, next to a full unsplit `name`. Probe-verified
open at HTTP 200 on 2026-08-15 before the change; the acceptance is that it stops answering 200.
Nothing in this phase or phase 4 may read this table directly.

**Note 26 — `GET /rest/v1/album`.** Added by plan 03-07 and **published, not consumed**. This
phase creates the surface; phase 4 is its only consumer, so there is no call site here to
integrate. The projection is the boundary: asking for `guest_id` returns `400` / `42703`, which is
the only assertion about the column set that survives an empty table.

---

## The three opt-outs that are architecture, not omission

1. **No SELECT policy on `enrollments` (rows 7, 8, 10, 11, 12).** Five separate capabilities are
   unavailable for one reason. That reason is the product decision that a guest's free-text note
   is readable by the host and by nobody else, including the guest's own browser. Adding the
   policy would restore all five capabilities at once, which is exactly why it is a one-way door.

2. **No DELETE (row 9).** A guest who cannot come is data the host wants. Withdrawal is a flag,
   the row stays, and the `attendees` view filters it out server side.

3. **No wire-side ordering or filtering on the public view (rows 16, 17).** Everything the view
   exposes, it exposes to anyone holding the publishable key. The narrower the view's contract,
   the less there is to get wrong later.

## The two capabilities this phase adds to the API

### `public.amend_enrollment`

`public.amend_enrollment(uuid, text, smallint, text, text, boolean) returns integer`, a
`security definer` function with `set search_path = ''`, `revoke all ... from public` and
`grant execute ... to anon`. It is a deliberate, narrowly scoped privilege escalation primitive:
it touches only the row whose `guest_id` was passed in, it never returns row contents, and its
return type is the boundary. Any change to its signature or return type is a security-relevant
change. A definer function that returned `setof enrollments` would hand every note to anyone who
can guess a uuid, which leaks strictly more than the SELECT policy D-02 rejected.

### `public.album`

`public.album`, a view over `public.photos` projecting `first_name`, `storage_path` and
`created_at`, with `grant select ... to anon` and `revoke select on public.photos from anon`
beside it. Added by plan 03-07 to close gap 1 of `03-VERIFICATION.md`.

Its **projection is the boundary in exactly the way the function's return type is**. The
function cannot hand back a note because its return type is `integer`; the view cannot hand back
a `guest_id` or a surname because neither column is in its select list. In both cases the limit
is structural rather than a predicate somebody can widen later, and in both cases changing that
one line is a security change and has to be reviewed as one. A view that grew a `guest_id`
column would publish a bearer write credential for every uploader, which is the same failure a
definer function returning `setof enrollments` would be.

The table underneath keeps its insert grant, and only its insert grant. Phase 4 writes to
`public.photos` and reads from `public.album`, never the reverse.
