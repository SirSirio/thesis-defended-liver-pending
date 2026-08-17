---
id: album-split-and-redesign
created: 2026-08-17
source: owner, phase 04 device test
resolves_phase: 5
severity: medium
kind: design
---

# Split the album from the uploader, and redesign it

Three separate owner objections from the phase 04 device pass, all about the album:

1. **"I would like to see only the photos I submit myself."** Under the uploader, a guest should
   see *their own* submissions, not everyone's. That is the receipt for what they just did.
2. **"For the album, it should be somewhere else."** The shared album of everyone's photographs is
   a different thing with a different purpose and belongs in its own place on the page, not
   directly beneath the upload control.
3. **"I don't like how the photos are formatted, I would like something more modern."** The current
   grid is square tiles with a first-name caption. It is correct and it is dull.

## The hard constraint on point 1

**`public.album` cannot answer "my photographs".** The view deliberately does not carry `guest_id`,
and that is not an oversight — `schema.sql` §9 removed it because since §8 the `guest_id` is the
whole credential for amending a registration, and any read path that returns one gives the password
away. Threat T-04-01 is exactly this.

So "only my photos" must be solved **client side**: the browser already knows the `storage_path` of
everything it uploaded this session, and can remember its own paths in localStorage beside the
count. Do **not** solve it by adding `guest_id` to the view, and do not add a filtered view keyed on
`guest_id` either, because the filter value would have to travel in the query string of a public
URL.

Consequence worth accepting deliberately: a guest who clears storage or switches phone loses the
"mine" list, exactly as they lose the count today (accepted risk R-02).

## Point 3 is a Phase 5 design job

Phase 5 already owns the degradation arc, the critique pass and the DSG-08 pre-flight matrix. The
album redesign belongs in that pass rather than as a patch, and **the design-taste skill should be
driving it** rather than being consulted after the fact. See [[use-design-skills-phase-5]].

The existing `04-UI-SPEC.md` is the current contract and it will need amending, not ignoring. Note
it is already known to be self-contradictory about the quota body (finding W-A in
`04-VERIFICATION.md`): it demands refused files be named in queue rows *and* that the quota body
contain no queue. Fix that while the contract is open.
