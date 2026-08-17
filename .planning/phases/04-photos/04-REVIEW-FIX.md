---
phase: 04-photos
fixed_at: 2026-08-17T18:34:41Z
review_path: .planning/phases/04-photos/04-REVIEW.md
iteration: 1
findings_in_scope: 12
fixed: 12
skipped: 0
status: all_fixed
---

# Phase 4: Code Review Fix Report

**Fixed at:** 2026-08-17T18:34:41Z
**Source review:** `.planning/phases/04-photos/04-REVIEW.md`
**Iteration:** 1

**Summary:**
- Findings in scope: 12 (3 blockers, 9 warnings; scope `critical_warning`)
- Fixed: 12
- Skipped: 0

**Where the gates ran:** the main working tree on branch `main`, not an isolated
worktree. `workflow.use_worktrees` is unset in `.planning/config.json` and the launcher
directed work at the main checkout; every `node --check` result below is reproducible
from the tree as it stands.

**Verification per fix:** re-read of the changed region plus `node --check app.js
config.js copy.js` (and a brace-balance parse of `styles.css`, which has no parser in
this project). This project has no test suite and no build step, so nothing here has
been executed in a browser. Every fix marked *requires human verification* is a
behavioural change whose correctness a parser cannot speak to.

---

## Fixed Issues

### CR-01: The photos section is never re-rendered after an identity change

**Files modified:** `app.js`
**Commit:** `5e8de67`
**Status:** fixed, requires human verification

Both halves the verifier asked for:

- `renderPhotos()` added to the end of `refreshEnrollmentState()`, the single fan-out
  every enrollment mutation runs through. The existing mid-batch skip guard makes it
  safe at any moment.
- An identity guard at the top of `runBatch()`, immediately after
  `photoIdent = identity.get()`. A batch under a blank `guest_id` or `name` is refused
  before a single file is decoded, the batch array is emptied and the ladder is asked
  again so the guest lands on the gate. No row state is written and no queue is drawn,
  because nothing was accepted: this is not a batch that failed, it is a batch that
  never began.

**Worth a human eye:** this makes an enrollment mutation trigger a photos-section
rebuild, and a rebuild ends in `renderAlbum()`. That is a *section rebuild*, the same
one `applyLanguage()` and the open/closed flip already perform, and not the post-upload
refetch D-12 governs, so I read it as inside D-12 rather than against it. If the phase
owner reads D-12 more strictly, the alternative is a narrower renderer that skips the
album on this path.

### CR-02: The batch's settle-time summary is destroyed in the same task it is written (PH-05)

**Files modified:** `app.js`, `styles.css`
**Commits:** `12cdbe9`, `972c65b` (comment correction), `1685d55` (refinement)
**Status:** fixed, requires human verification

Took the review's first option, carrying the outcome into the quota body, rather than
deferring the flip. Deferring leaves a control standing with a remaining count of zero
and an enabled pick button, which the quota panel's own design note forbids, and a
guest who picks again would defer the flip forever.

- New module-scope `photoQuotaSummary`, held beside the rest of the batch model.
- `settleBatch()` hands `{ status, alert, batch, announced }` over the swap instead of
  letting the ladder wipe it.
- `quotaPanel(summary)` renders the counted sentence, the line naming what did not land
  and the transcript beneath the punchline, in the control's own classes so it reads as
  the same three lines the guest was already looking at.
- The assertive line is created empty and filled on the next frame, which is
  `buildUploader()`'s own stated idiom, so it actually announces. Announced once per
  batch: a language tap re-renders the body without interrupting the reader again.
- The summary survives a language tap (it is stored as copy keys) and is cleared the
  moment the ladder selects any body other than `full`.
- One CSS line: `#photos-body[data-body="full"] .panel__lede + *` gets the 24px step,
  because the existing rule zeroes the lede's bottom margin for a body that ends at the
  lede.

`1685d55` narrows it: the summary is carried **only when something did not land**
(`bad > 0`). A batch where all five recorded is already answered by the quota lede in
the section's own voice, with the album below as proof; a transcript of five successes
under it would be a receipt for a receipt. PH-05 asks that no picked file be disposed
of without an answer, and that is exactly the case now covered.

**Worth a human eye:** the visual weight of a transcript under the punchline, and the
`role="alert"` announcement timing. Both are judgement calls I made from the file's own
stated rules rather than from seeing them.

### CR-03: A timed-out row insert is retryable, so one tap can write a duplicate row

**Files modified:** `app.js`
**Commit:** `627fb56`
**Status:** fixed, requires human verification

All three parts, plus one the review named and the verifier's summary did not:

- `runNextFile()` now does `var path = rec.path || storagePath()`. The key is minted
  once per **record**, not once per attempt.
- `retryFailedFiles()` no longer nulls `rec.path`.
- `classifyPhotoInsert()` gains `if (res.code === '23505') return 'ok'`, placed
  *alongside* and *after* the `P0001` branch, never inside it, because the BEFORE INSERT
  trigger fires ahead of the unique constraint and a guest at the maximum must still be
  read as at the maximum.
- **The fourth part, without which the other three do not work:** the retry's upload
  hits the same key and Supabase Storage answers Duplicate, so the retry would have been
  stuck at the object write and never reached the insert at all. `uploadObject` now
  treats "the object is already at this exact key" as success, via a new
  `storageDuplicate(xhr)` that accepts an outer 409, `statusCode` 409, `statusCode`
  23505 and the `Duplicate` error token, because the service has spelled this three ways
  across versions. Only the short machine token is read; no Supabase sentence reaches a
  guest. Deliberately **not** an upsert: `schema.sql` section 6 grants anon insert and
  select on `storage.objects` and no update, so an upsert would be refused outright.

The argument the whole fix rests on: the key is a fresh uuid minted once per record, so
nothing else in the world can have written it. A collision is always this record's own
earlier attempt whose response was lost.

**Worth a human eye:** the exact duplicate-response shape from this Supabase project.
The detection is deliberately broad, but it has not been observed on the wire here. A
cheap probe: POST the same storage path twice with the publishable key and read the
body.

### WR-01: The row-insert classifier never reports a network failure

**Files modified:** `app.js`
**Commit:** `32a6cbb`
**Status:** fixed, requires human verification

`if (res.code === 'NETWORK') return 'photos.err.network'` added to
`classifyPhotoInsert()`, matching `classifyStorage()`'s treatment of the same
synthesised code from the same `sbRequest` shape. `photos.err.network` already exists in
all three languages. It also restores the cue that pressing retry is the right move,
which after CR-03 it genuinely is.

### WR-02: `retryFailedFiles()` has no busy guard

**Files modified:** `app.js`
**Commit:** `abaa595`
**Status:** fixed

`if (photoState === 'preparing' || photoState === 'uploading') return;` at the top. The
model is the only thing that knows, and a stylesheet is not a guarantee on the network
this section was written for.

### WR-03: `downscaleToJpeg()` has no timeout

**Files modified:** `app.js`
**Commit:** `489ff9e`
**Status:** fixed, requires human verification

A 20000ms timer that resolves through `finish(null, 'photos.err.decode')`, cleared in
`finish()`. This is `sbRequest`'s shape: a flag prevents a second settle, it does not
produce a first one. The header comment claiming the invariant was corrected to say
which half the flag was.

### WR-04: The canvas backing store is not released on two failure paths

**Files modified:** `app.js`
**Commit:** `489ff9e` (same commit as WR-03)
**Status:** fixed

A local `release()` called before every return past the allocation: the `!ctx` branch,
the `drawImage` catch, and both encoder-callback returns.

**Note on atomicity:** WR-03 and WR-04 share one commit. They are two edits to the same
twelve lines of one function and could not be staged apart without a rewrite/reapply
cycle. Both are named in the commit message.

### WR-05: Hiding broken tiles in CSS breaks the head-count invariant

**Files modified:** `app.js`
**Commit:** `c16e101`
**Status:** fixed, requires human verification

Took the first branch (make the number true), not the second (delete the comment).

- `albumHeadText(state, n)` split out of `albumHead()`, so the sentence can be rewritten
  after the node is in the document and the two readings cannot drift.
- `albumTile(row, onBroken)` calls back on image `error`.
- `renderAlbum()` holds the head node and a live `shown` counter, rewriting the head in
  place on each broken tile and falling to the "No submissions on record" sentence at
  zero.

Written as an in-place `textContent` rewrite rather than a re-append, so a newer read or
a language tap is still the only thing that replaces the node; a write that lands on a
detached head is the same harmless no-op the upload driver already relies on.

### WR-06: The five-photograph limit is hardcoded into nine copy strings

**Files modified:** `config.js`
**Commit:** `3ce5dd6`
**Status:** fixed, by the review's second option, deliberately

**I did not parameterise the copy, and this is the one finding where I took the
alternative the review itself offers.** The reason is voice. The strings are jokes and
sentences, not fields: `{max}` renders a numeral, so "Five photographs are on record in
your name" becomes "5 photographs are on record in your name", "Massimo cinque a testa"
becomes "Massimo 5 a testa", and "Grænsen er fem per person" becomes "Grænsen er 5 per
person". Nine strings across three languages would each lose the register they were
written in, to protect against an edit the owner is unlikely to make and which already
requires a second file (`schema.sql`) to be edited in step.

So the trap is closed by warning instead. `config.js`'s `maxPerGuest` now carries a note
naming this a three-file change and both other files by name: `schema.sql` section 4's
trigger, and `copy.js`'s `photos.lede`, `photos.refuse.extra` and `photos.full.body` in
all three languages, with the specific consequence spelled out ("lower this to three and
the site refuses the fourth photograph while telling the guest, in English, Italian and
Danish, that the limit is five"), and the reason the words were left as words.

If the phase owner would rather have the substitution than the voice, this is the one
finding to send back.

### WR-07: `public.photos` accepts an unbounded, unshaped `name` and `storage_path`

**Files modified:** `supabase/schema.sql`
**Commit:** `2b96660`
**Status:** fixed in the file, **NOT applied to the database, pending owner action**

**Read this one carefully.** The change ships in the repository and does nothing to the
live project until the owner runs the file. The live database still accepts a `photos`
row with a name of any length and a storage path of any shape from any holder of the
publishable key, exactly as it did before this commit.

- New **section 11**, written in section 10's idempotent
  `drop constraint if exists ... , add constraint ...` shape, with both constraints named
  in both halves.
  - `photos_name_check`: `char_length(trim(name)) between 1 and 60`, character for
    character the enrollments bound, because it is the same name copied from the same
    registration.
  - `photos_storage_path_check`: the `STORAGE_PATH_RE` shape from `app.js` written
    forwards, `[0-9]{4}-[0-9]{2}-[0-9]{2}/` plus the full dashed uuid plus `\.jpg`. Not
    the review's looser `[0-9a-f-]{36}` sketch; it mirrors the regex exactly, and the
    section says in as many words that this is now a third half of a contract that moves
    in one commit.
- A **`NOT YET APPLIED`** paragraph in the STATUS block at the top of the file, in the
  house style of the paragraphs around it. It states plainly that everything above it is
  applied and verified and that section 11 is not, gives the owner the one line to apply
  it (paste the whole file, Run), and flags the two things to expect: the alter validates
  existing rows and will error on any that break the bound, and the path shape is coupled
  to `app.js`.

The photos table was emptied in the cleanup already recorded in that STATUS block, so
the validating alter should have nothing to trip over on this project.

### WR-08: A browser that cannot measure upload progress is shown "Recording"

**Files modified:** `app.js`
**Commit:** `a5e7932`
**Status:** fixed

`setRowProgress()` now tracks `known` separately: the cap still holds the bar for an
unmeasurable upload, but only a measured completion advances the state word. Such a row
never shows Recording at all and says Sending until the response lands, which is the
step it is on. Both comments that described the old behaviour (here and in
`uploadObject`'s progress handler) were corrected.

### WR-09: `'full'` is a declared uploader state that nothing can ever write

**Files modified:** `app.js`, `styles.css`
**Commit:** `534528b`
**Status:** fixed

`'full'` dropped from `UPLOADER_STATES`, leaving seven. The comment now says the quota is
a body of the ladder rather than a state of the control, and that the earlier list was
wrong rather than forward-looking. Three stale counts corrected with it: the section
header's "One control, eight states", and `styles.css`'s "two of the eight control
states" / "Absent in the other six".

---

## Skipped Issues

None. All twelve in-scope findings were applied.

---

## Notes for the verifier

**The three blockers are the ones to re-walk.** CR-01, CR-02 and CR-03 are behavioural
changes to the upload path with no automated coverage in this project. The scenarios
that would settle them:

1. **CR-01** — register, scroll to the photos section without reloading (gate should be
   gone); then "forget this device" and confirm the section falls back to the gate with
   no upload control standing.
2. **CR-02** — at 3 of 5, pick 5 photographs. Expect the quota body with "2 recorded, 3
   not.", the overflow line, and a five-row transcript naming all five. Then tap a
   language and confirm the transcript survives in the new language.
3. **CR-03** — the hard one. It needs a lost insert response, which means throttling or
   dropping the connection after the object write. What can be checked cheaply instead:
   fail an upload, tap retry, and confirm the album gains **one** tile and the remaining
   count drops by **one**.

**Two judgement calls I would flag rather than defend to the death:**

- CR-01 makes an enrollment mutation rebuild the photos section, which refetches the
  album. I read that as a section rebuild in the same class as the language chain rather
  than as a D-12 refetch trigger. Reasonable people could read D-12 more strictly.
- WR-06 was closed by documentation, not by parameterisation, to protect the copy's
  voice. The review explicitly sanctions this branch; the phase owner may not.

**One thing that is not done and cannot be done from here:** WR-07's constraints exist
in `supabase/schema.sql` and not in the database. Until the owner pastes the file into
the SQL editor and runs it, that finding is mitigated on paper only.

---

_Fixed: 2026-08-17T18:34:41Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
