# Phase 4: Photos - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-15
**Phase:** 04-photos
**Areas discussed:** Mode selection, then every area auto-decided by Claude

---

## Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Auto — decide it all | Claude picks every option, records each with rationale and reversibility, writes CONTEXT.md. Same as Phase 3. | ✓ |
| Let me pick areas | Owner answers questions on selected areas. | |

**User's choice:** Auto — decide it all
**Notes:** Consistent with the standing instruction from Phase 3 ("my effort and
involvement in this is 2 out of 10, do the research and validation yourself") and with the
recorded preference for terse replies and high autonomy.

---

## Areas flagged as interesting (asked, but answered under Auto)

The owner was offered four gray areas and selected three, then chose Auto for the mode.
The selection was treated as a signal about where to spend reasoning, not as a request for
questions. The three selected areas carry the longest decision blocks in CONTEXT.md.

| Option | Description | Selected |
|--------|-------------|----------|
| Who may upload | The album needs a name and D-18 forbids a separate name prompt, so gating on enrollment is the only path that respects it. | |
| Album look and order | Institutional evidence register or photo grid? Newest first or chronological? Lightbox is V2-06. | ✓ |
| Upload mechanics | Five at once or one at a time. How hard to downscale. What progress looks like. | ✓ |
| When the album opens | Live on ship, or time-gated to party day? CD-04 and `photos.pending.*` both already point at a later opening. | ✓ |

**User's choice:** Album look and order, Upload mechanics, When the album opens
**Notes:** "Who may upload" was left unselected. It was still decided (D-01, D-02) because
the schema's `name text not null` leaves no alternative, but it was given the least
reasoning of the four on the assumption the owner is content with the obvious answer.

---

## Alternatives considered and rejected

Recorded here rather than in CONTEXT.md, because CONTEXT.md carries the decisions and this
carries what was passed over.

### Album presentation
- **Evidence register echoing the `.facts` definition list** — a numbered log of
  submissions, each row a small thumbnail plus name plus timestamp. Funnier on paper.
  Rejected in D-07: it makes every photo small and turns looking at the evening into
  reading a table. The joke moved into the chrome instead.
- **A built lightbox** — rejected in D-10 as V2-06 scope. The native browser image viewer
  reached by a plain link gives pinch zoom, save and share for zero code.
- **Pagination or a "show more" cap** — rejected in D-11. `loading="lazy"` plus reserved
  aspect boxes already solves the cost, and paging adds state for no benefit at party
  scale.
- **Polling the album view** — rejected in D-12. The only refresh that matters is seeing
  your own upload land, which a post-upload refetch covers.
- **Hiding an empty album** — considered because phase 3's D-20 hid the headcount below a
  threshold for exactly that reason. Rejected in D-13: the photo case inverts it, since an
  empty album during the party wants a first uploader.

### Upload mechanics
- **`fetch` for the storage PUT, with an indeterminate spinner** — would have kept D-06 of
  phase 3 unbroken. Rejected in D-18: `fetch` has no upload progress event, and a
  ten-second upload on party wifi behind a spinner is the exact "is this broken?" moment
  PH-05 was written against. XHR is confined to that one call.
- **Parallel uploads** — rejected in D-18. Sequential keeps a mobile connection from
  fighting itself and leaves an unambiguous partial state on failure.
- **2048px at quality 0.9** — prettier, roughly double the bytes. Rejected in D-16 for an
  album that is looked at on phones.
- **Keeping the original format** — rejected in D-16. Re-encoding everything to JPEG is
  what makes HEIC displayable everywhere and what makes the single-MIME bucket policy in
  D-24 correct rather than restrictive.
- **Insert the row first, then PUT** — rejected in D-19. A row pointing at a missing file
  renders a broken tile in everyone's album forever; an orphaned object is invisible.
  Neither can be deleted from the browser, so the invisible one wins.
- **Silently truncating an over-limit multi-select** — rejected in D-15. Files a guest
  chose get named in the refusal.

### The opening gate
- **Ship the album open immediately** — the safest option, since a time gate adds a
  failure mode that shows up once, on the night, when nobody is at a laptop. Rejected in
  D-03 because `photos.pending.*` already promises a later opening in all three languages
  and CD-04 already promises a countdown state pointing at it. The risk is answered by
  D-04 (timezone-proof arithmetic) and D-05 (the opening time printed on the panel, and a
  one-line config escape).
- **Unlocking the album early via a tap sequence on the heading** — rejected as scope
  creep. That mechanic belongs to the Kahoot easter egg in phase 5.

### Security
- **Accepting that client-side validation is all there is** — rejected in D-24. The bucket
  record's own `allowed_mime_types` and `file_size_limit` are enforced by Supabase against
  a direct API call, cost one line, and turn "any bytes" into "a JPEG under 3MB".
- **Adding a `guest_id` back to `public.album` so a guest could see their own photos** —
  rejected outright in D-25 and listed as deferred. It republishes the credential phase
  3's D-35 depends on staying unread.

---

## Claude's Discretion

Recorded in full in CONTEXT.md under `### Claude's Discretion`. Summary: all copy in three
languages, grid geometry and breakpoints, control placement relative to the album, the
caption overlay treatment, how the remaining count is presented, owner-facing config
comments, and the exact `opensAt` default arithmetic.

## Deferred Ideas

Recorded in full in CONTEXT.md under `<deferred>`. Summary: delete and moderation (V2-01),
lightbox with swipe (V2-06), captions and reactions, download-all, the `#photos`
degradation arc (phase 5), the Kahoot easter egg (phase 5), server-side image processing,
and any per-guest "my photos" view.
