---
id: 260818-rmv
slug: delete-own-photo-and-standalone-album
kind: quick
created: 2026-08-18
completed: 2026-08-18
status: complete
mode: inline
commits:
  - 58981db feat(photos) a guest can take their own photograph back out of the album
  - 27d7e3b chore(mcp) project scoped Supabase server
  - ca8b97b feat(album) the album becomes a page of its own, and an upload lands at once
  - 2b3d064 feat(hero) a pump that reads as a pump, a named party, and an index in the page
  - 7834786 feat(hero) the course gets a name and a face
files_modified:
  - app.js
  - copy.js
  - styles.css
  - motion.js
  - index.html
  - config.js
  - album.html (new)
  - album.css (new)
  - album.js (new)
  - .mcp.json (new)
---

# Quick task 260818-rmv: removal, a standalone album, and an instrument that reads

Five owner instructions in one session, in the order they arrived.

## 1. A guest can delete their own photograph

`supabase/10-delete-own-photo.sql` was committed but never applied. **It is applied now**,
through the Supabase MCP server, and verified on the wire from the untrusted position rather
than from the dashboard, which runs as owner and would have proved nothing.

| Check, publishable key over HTTP | Result |
|---|---|
| Wrong guest_id plus a real path | 0, and the row survived |
| Correct guest_id plus that path | 1, gone from public.album |
| The same call replayed | 0, no error, no information leaked |
| Anon SELECT on public.photos | 42501 permission denied |
| Anon DELETE straight at the table | 401 |

A synthetic row was planted for the negative test and destroyed by the positive one, so none
of the owner's fifteen photographs were touched at any point.

**One and zero are one answer on purpose.** One means it was theirs and it is deleted, zero
means it was not theirs or somebody removed it already, and the caller must not be able to
tell those apart or the RPC becomes a way to ask whether a path belongs to an id.

The control lives in the strip under the uploader and nowhere else. `#gallery` is the shared
album and those photographs are not this guest's to remove. The frame and the removal are
separate targets: a 52px hit area in the corner of a 104px frame is a quarter of the frame,
so "open this" and "destroy this" would have landed on each other.

Confirmation reuses `buildWithdrawConfirm()`'s component verbatim, so the page keeps one
vocabulary for "are you sure" across the two controls that destroy something.

`photos.permanent` promised the opposite of this in three languages and was rewritten. A
promise quietly withdrawn is worse than one never made.

## 2. The upload that only appeared after a reload

`refreshPhotosState()` was calling `renderAlbum($('#photos-album'))`. That element stopped
existing when 260817-ulc split the album out of the section, `renderAlbum` null-guards its
host, and so **every recorded photograph fanned out to precisely nothing**. The count moved
and neither the strip nor the album did.

It had been dead since that split. It now calls `renderMine()`, per recorded file rather than
once at settle, so a photograph appears under the control while the next one is still
uploading. `renderMine()` also gained the branch that creates its host, without which the fix
would still have done nothing on the upload that matters most: the first.

Proved with a real upload and no reload anywhere: strip 2 to 3 tiles, remaining 3 to 2, head
"Your 3 submissions", and the test photograph then removed with the real button, leaving the
database back at exactly fifteen rows.

## 3. The album became a page of its own

Two intentions were sharing one screen. Submitting is a task: a control, a limit, a
transcript, five frames of your own. Looking at everybody's photographs is not a task at all,
it is what people do on the night and the week after, and it wants the whole screen.

`album.html` plus `album.css` plus `album.js`. What is left on the invitation is a **door**,
not a gallery, and it fetches nothing to draw itself, so it stands at full strength whether
the album is empty, unreachable or hundreds of photographs long.

**Its own script, deliberately.** app.js is seven thousand lines building a countdown, a form,
a map, an upload driver and a five second morph, none of it needed to show photographs, all of
it parsed before the first frame. The duplication that costs is bounded and named in
`album.js`'s header: the request helper, the path validator, the URL builder, the language
resolver. If any of those contracts changes in app.js it has to change here in the same commit.
`config.js` and `copy.js` are shared outright.

The dead album machinery (`renderAlbum`, `renderGallery`, `albumTile`, `albumHead`,
`albumHeadText`, `albumSeq`) is **deleted** from app.js rather than left null-guarding an
element that no longer exists, because that is exactly the defect in section 2.

The page opens already awake. The five second DTU mask is the invitation's joke, paid for by
its hero, and re-running it here would hold a guest's own photographs behind an animation they
have already seen.

Mosaic rather than contact sheet: every seventh frame on a phone and every ninth on a desktop
takes two columns at twice the aspect, which packs exactly against its neighbours, so there is
no masonry and nothing measures anything. Verified 351/172x6/351 at 390px and five columns at
1440px.

**A blurred or desaturated reveal was declined on purpose.** Filter animation on forty tiles
repaints the whole grid every frame on the phone this page exists for. Transform and opacity
only.

## 4. The instrument

Three builds had been rejected for the same reason and the reason was right: a ring with three
dots on spokes, under blur, with no indication of what it was moving or where that came from,
is a logo. Three things fixed it and none of them was a blur setting.

- **A reservoir.** The liquid has somewhere to come FROM: a capped bottle, part full, feeding
  the head through tubing routed round the outside of the casing. The level falls while the
  head runs, because a bottle that never empties is scenery.
- **A rotor that reads as turning.** Three rollers on a plate rather than on hairlines, sitting
  exactly on the race radius so each is drawn ON the tube and reads as occluding it. 1.15s per
  revolution rather than 1.9s: a roller passes every 380ms instead of every 630ms.
- **It is no longer blurred out of legibility.** Depth of field cost more than it bought.

The needle was a bare line, which is a scratch rather than an instrument. It is now a knurled
collar, a tapered luer hub and a short length of steel, and the hub is what makes the steel
read as short.

**A defect this file had produced twice is fixed.** A pump on the right feeding a needle over
the centre of the date has to cross the headline to get there, and it laid a lit red line
through the two words the page was named after. Tubing hangs, it does not traverse: the needle
now hangs in the same column as the head and the drop falls straight down onto the right hand
end of the date.

## 5. A name, a face, and an index in the page

The tab said "Course 03102", which means nothing to anybody. The headline is now
**Introduction to Applied Celebration** and the tab names whose party it is, in all three
languages.

A **course responsible card** sits under the headline: portrait, name, role. `config.course.photo`
is null, so it currently renders a monogram, which is deliberate rather than broken. Setting one
config line turns it into a photograph and nothing moves.

Four fact rows above the fold became **six navigation tiles**. The rows are not deleted, they
moved into the fold, which now carries the whole course description in one place. Every id
travelled with its row, so the schedule, the address and the deadline still arrive from config.

## Verified in a browser

| Claim | Result |
|---|---|
| Delete, wrong id | 0, row survives, on the wire with the public key |
| Delete, right id | 1, gone from the view |
| RPC absent path | focused honest line, nothing written, nothing faked |
| Upload appears with no reload | 2 to 3 tiles, count 3 to 2, storage agrees |
| At five, delete, upload again | body full to upload, uploader back and enabled |
| Last photograph removed | #photos-mine removed entirely, count back to 5 |
| Lightbox after a removal | reopened 1 of 3, stepped 1 to 2 to 3 and wrapped |
| Album live | 15 tiles, mosaic rhythm exact, shuffle opened 9 of 15 |
| Copy | 246 keys in en, it and da, zero missing, zero em dashes |
| Console | no page errors on either page |

## An important limit on what was verified

**None of this has been seen at real frame rates.** The headless browser runs GSAP's ticker at
roughly 1.5 frames per second, so every still produced in this session is a forced frame. The
geometry, the event timing and the DOM are verified; how the rotor's 1.15s revolution actually
feels, and whether the album holds frame rate with forty tiles on an older Android, are not.

The owner also reported something white moving up the sides during the opening that reads as
buggy. It was diagnosed as the `tinyRing` expanding rings in `dispensing()` (motion.js), which
are 287px circles left behind by each falling droplet. The owner chose to keep the droplet
system as it is, so **the rings are still there and still unaddressed**. Removing only the
rings while keeping the drops is a one line change.

## Also still open

`opensAt` is still `null`, so uploads remain open to anyone with the URL, and the fifteen test
photographs are still in the bucket. The album page is `noindex` but publicly readable by URL,
which matches how the invitation already works and is worth one deliberate yes before the link
is shared.
