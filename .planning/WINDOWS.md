---
schema_version: 1
open_count: 9
waived_count: 0
fixed_count: 4
total_count: 13
last_updated: 2026-08-17T17:56:36.264Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | unrun-verify | .planning/phases/02-practical-information/02-DEVICE-PASS.md |  | The D-23 real device pass and the blocked network check for the 02-05 map fallback are owed on real hardware; ACC-01, DEL-02 and DEL-03 stay unchecked until that sheet is filled | open |  | 2026-08-14T08:50:26.039Z |  |
| 2 | 03 | unrun-verify | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | The 03-01 rendered half is unproven: the device pass (enrol end to end on iOS Safari and Android Chrome, no viewport zoom on focus, nudge bar clearance, VoiceOver and TalkBack announcement of a field error versus a submit failure, reduced motion sweep parked at full width) has not been run on real hardware | open |  | 2026-08-14T18:43:04.952Z |  |
| 3 | 03 | stub | app.js |  | buildSuccessPanel renders nothing at the group CTA position when whatsapp.inviteUrl is truthy; the dim enrol.success.group.pending line covers the null case, which is the shipping state, and plan 04 owns whatsappButton() for the configured case | fixed |  | 2026-08-14T18:43:16.602Z | 2026-08-14T19:25:50.981Z |
| 4 | 03 | unrun-verify | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | 03-04 Table C is unrun: the linkless success panel reading as deliberate rather than broken, both group CTAs opening WhatsApp on the first tap with a temporary local link, the bar going quiet after either one, and the social proof block at the threshold boundary, with the attendee list flag false, in Danish collation and with the Supabase host blocked, are all owed on real hardware | open |  | 2026-08-14T19:21:51.717Z |  |
| 5 | 03 | unrun-verify | supabase/schema.sql |  | 03-04 ran its live attendees view contract check against the pre-migration view; the owner has not yet re-run supabase/schema.sql, so public.attendees is still unfiltered. Re-run the select=* projection probe after the migration to confirm the re-created view still projects only first_name, extra_guests and created_at | fixed |  | 2026-08-14T19:22:02.932Z | 2026-08-15T01:37:21.453Z |
| 6 | 03 | deviation | .planning/phases/03-enrollment-identity-and-the-group/03-06-PLAN.md |  | Three of four executed plans found a verification gate that was itself broken rather than code that was wrong: 03-02 enrollmentReady assertion searched from index 0 and matched unrelated phase-1 code (vacuous), 03-03 for-select count could never be 0 because two pre-existing photo policies match, 03-04 live attendees view contract check cannot fail because PostgREST guarantees the asserted property. Each was narrowed to its stated intent and recorded. 03-06 re-runs every phase gate as one sweep, so a clean 03-06 result is only as strong as the corrected gates underneath it — 03-06 must verify gate anchoring, not just gate exit codes | fixed |  | 2026-08-14T19:26:10.363Z | 2026-08-15T02:35:34.448Z |
| 7 | 03 | deviation | .planning/phases/03-enrollment-identity-and-the-group/03-05-PLAN.md |  | Fourth instance of the pattern entry 6 records: 03-05 task 2's 'withdraw branches present' gate cannot fail. Its condition is body.indexOf(k)<0 AND s.indexOf(k)<0, and PGRST202 was already present file-wide from plan 01's amendEnrollment, so the file-wide fallback satisfies it regardless of what withdrawEnrollment contains. Re-anchored and re-run scoped to the function body itself, which passes genuinely. 03-06 must check gate anchoring, not exit codes | fixed |  | 2026-08-15T02:09:21.234Z | 2026-08-15T02:35:43.363Z |
| 8 | 03 | unrun-verify | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | 03-05 human checks are unrun on real hardware: that an amendment and a withdrawal actually reached the database (only confirmable by reload and by the dashboard, because the site can never read the row back), that focus lands on the confirm control and Escape reverts it, that the Danish withdraw confirmation question renders on at most two lines at 320px without pushing the confirm control below the fold, that the amend-pending line reads as deliberate rather than as an error, and that the nudge bar stays down for the rest of the session after withdrawing | open |  | 2026-08-15T02:09:36.219Z |  |
| 9 | 03 | deviation | .planning/phases/03-enrollment-identity-and-the-group/03-06-PLAN.md |  | Fifth and sixth instances of the pattern entries 6 and 7 record, both found by 03-06's own sweep. (a) The plan inherited 03-03's uncorrected 'for select' literal count, which can never return 0 because two pre-existing album policies match and the phase forbids touching them: vacuous. (b) The plan's own Table G parse slices from '## Table G' to end of file, so it also demands the device pass Outcome table, which is the phone's record and cannot be filled at a desk: over broad, never satisfiable by the task that owns it. Both re-anchored to their stated intent and re-run green; no source was bent. All 43 gate cases in the closing sweep were then mutation tested and 43 of 43 go red when the thing they protect is broken, so this phase's headline number is 43 passed AND capable of failing rather than 43 passed | open |  | 2026-08-15T02:35:54.234Z |  |
| 10 | 03 | unmet-truth | styles.css |  | Three touch targets are declared 4px under the UI contract: .field__input, .field__select (line 1287) and .seg > span (line 1384) all carry min-height 48px with no coarse-pointer override, while 03-UI-SPEC.md Touch Target Geometry asks 52px at a coarse pointer for the text input, the guest-count segment and the select overflow branch. 48px clears the 44px floor so it is a shortfall against the phase's own stricter target rather than an accessibility failure, and it has been the shipped state since 03-01 rather than being introduced by a later plan. Deliberately not fixed at phase close with the device pass unrun; recorded in the phase's deferred-items.md and in the Declared column of Table D on 03-DEVICE-PASS.md, and the right moment to fix it is the same moment Table D is answered | open |  | 2026-08-15T02:36:04.731Z |  |
| 11 | 03 | unrun-verify | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | Phase 03 closes human_needed rather than passed. Table G is complete, filled at the desk by moving config and driving the shipped renderNudge; Tables A to F are entirely unrun because 03-06 had no browser of any kind, and each now carries a desk note saying what the desk could and could not establish. The requirement IDs that stay unchecked on that account are NDG-01 and NDG-02 (the bar pinned to a real screen at all, and its clearance over the countdown, the address and the video: the phase's highest risk item, never rendered on any device), ENR-09 and ENR-10 (a field error described on focus, a submit failure announced immediately, and the airplane-mode failure state, all of which need a real assistive stack and a real phone), DEL-02 and DEL-03 (both platforms, mid-range phone, mobile data), DSG-05's observed half, and WA-02, WA-03, WA-04 and WA-06 (the whole group handoff, which additionally waits on the owner supplying whatsapp.inviteUrl). Entries 2, 4 and 8 name the per-plan rows; this entry names the per-ID consequence. Corrected at the 03-06 task 2 close: the first form of this entry omitted NDG-01, WA-04 and WA-06, and the 03-06 summary had ENR-10 in its satisfied list while this entry had it pending, which is the kind of disagreement that lets an ID get ticked twice over | open |  | 2026-08-15T02:36:16.101Z |  |
| 12 | 03 | deviation | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | Seventh instance of the pattern entries 6, 7 and 9 record, plus three more found in the gap-closure plans themselves. (a) The seventh, found by 03-VERIFICATION.md rather than by any sweep: Table G's 'exactly 0' row was exercised with a deadline of -1h and recorded Pass, so its expectation was derived from the implementation it was meant to test. daysUntil returned -0 for every deadline inside 24h past, and -0 === 0, so the row asserted the bug. 03-09 re-anchored it to a positive offset and recorded that the old expectation was unreachable. This is the instance the 43-case mutation sweep could not catch, because mutation testing proves a gate CAN fail, not that it asserts the right thing. (b) 03-08-PLAN.md task 3's P1 harness omits sbConfigured from the evaluated slice's free variables, so it throws ReferenceError before asserting anything, against any version of the code. Fixed in the harness only, so the PLAN file still carries the broken command. (c) 03-09-PLAN.md task 2's gate builds a fake nudge bar with no getAttribute, so it throws before printing a result. Same shape, also fixed in the harness only. (d) 03-09-PLAN.md's D3 gate is hour-dependent: it pins the deadline at now+8h, which is only 'today' in Europe/Copenhagen when run before about 16:00. It ran at 13:06 and passed verbatim, but a re-run later in the day goes red against correct code. That is the bug this very plan exists to close, in mirror image. Any verifier re-running the plan's gate after 16:00 should expect a false red on the +8h and +30h rows; a calendar-anchored supplement was added beside it. Standing lesson across all seven: a re-runnable gate must be checked for whether it CAN pass and CAN fail for its stated reason, not merely executed | open |  | 2026-08-15T11:22:53.828Z |  |
| 13 | 04 | unrun-verify | .planning/phases/04-photos/04-DEVICE-PASS.md |  | Phase 04's device pass is authored and entirely unwalked. 04-DEVICE-PASS.md carries ten tables and every row reads Pending, including the phase's blocking row A1, whether a portrait iPhone photograph lands the right way up in the album, which is the one claim in the whole design contract that no probe and no emulator can settle and which research THE ORIENTATION REFINEMENT deliberately routed to a phone. The sheet also carries all 31 human-check observations deferred by plans 04-01 to 04-04 under human_verify_mode end-of-phase, plus research assumptions A1 (one-step 2.5x downscale sharpness at four columns) and A2 (five sequential 12MP decodes inside mobile Safari's memory budget). Requirements PH-01, PH-02, PH-03, PH-05, PH-06, PH-07, DEL-02, DEL-03, DSG-05 and DSG-08 stay unchecked on that account. Phase 04 closes human_needed rather than passed, following the phase 02 and 03 precedent. | open |  | 2026-08-17T17:56:36.264Z |  |

````json
[
  {
    "id": 1,
    "kind": "unrun-verify",
    "phase": "02",
    "file": ".planning/phases/02-practical-information/02-DEVICE-PASS.md",
    "line": null,
    "description": "The D-23 real device pass and the blocked network check for the 02-05 map fallback are owed on real hardware; ACC-01, DEL-02 and DEL-03 stay unchecked until that sheet is filled",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-14T08:50:26.039Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "unrun-verify",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md",
    "line": null,
    "description": "The 03-01 rendered half is unproven: the device pass (enrol end to end on iOS Safari and Android Chrome, no viewport zoom on focus, nudge bar clearance, VoiceOver and TalkBack announcement of a field error versus a submit failure, reduced motion sweep parked at full width) has not been run on real hardware",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-14T18:43:04.952Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "stub",
    "phase": "03",
    "file": "app.js",
    "line": null,
    "description": "buildSuccessPanel renders nothing at the group CTA position when whatsapp.inviteUrl is truthy; the dim enrol.success.group.pending line covers the null case, which is the shipping state, and plan 04 owns whatsappButton() for the configured case",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-14T18:43:16.602Z",
    "resolved_at": "2026-08-14T19:25:50.981Z"
  },
  {
    "id": 4,
    "kind": "unrun-verify",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md",
    "line": null,
    "description": "03-04 Table C is unrun: the linkless success panel reading as deliberate rather than broken, both group CTAs opening WhatsApp on the first tap with a temporary local link, the bar going quiet after either one, and the social proof block at the threshold boundary, with the attendee list flag false, in Danish collation and with the Supabase host blocked, are all owed on real hardware",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-14T19:21:51.717Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "unrun-verify",
    "phase": "03",
    "file": "supabase/schema.sql",
    "line": null,
    "description": "03-04 ran its live attendees view contract check against the pre-migration view; the owner has not yet re-run supabase/schema.sql, so public.attendees is still unfiltered. Re-run the select=* projection probe after the migration to confirm the re-created view still projects only first_name, extra_guests and created_at",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-14T19:22:02.932Z",
    "resolved_at": "2026-08-15T01:37:21.453Z"
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-06-PLAN.md",
    "line": null,
    "description": "Three of four executed plans found a verification gate that was itself broken rather than code that was wrong: 03-02 enrollmentReady assertion searched from index 0 and matched unrelated phase-1 code (vacuous), 03-03 for-select count could never be 0 because two pre-existing photo policies match, 03-04 live attendees view contract check cannot fail because PostgREST guarantees the asserted property. Each was narrowed to its stated intent and recorded. 03-06 re-runs every phase gate as one sweep, so a clean 03-06 result is only as strong as the corrected gates underneath it — 03-06 must verify gate anchoring, not just gate exit codes",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-14T19:26:10.363Z",
    "resolved_at": "2026-08-15T02:35:34.448Z"
  },
  {
    "id": 7,
    "kind": "deviation",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-05-PLAN.md",
    "line": null,
    "description": "Fourth instance of the pattern entry 6 records: 03-05 task 2's 'withdraw branches present' gate cannot fail. Its condition is body.indexOf(k)<0 AND s.indexOf(k)<0, and PGRST202 was already present file-wide from plan 01's amendEnrollment, so the file-wide fallback satisfies it regardless of what withdrawEnrollment contains. Re-anchored and re-run scoped to the function body itself, which passes genuinely. 03-06 must check gate anchoring, not exit codes",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-08-15T02:09:21.234Z",
    "resolved_at": "2026-08-15T02:35:43.363Z"
  },
  {
    "id": 8,
    "kind": "unrun-verify",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md",
    "line": null,
    "description": "03-05 human checks are unrun on real hardware: that an amendment and a withdrawal actually reached the database (only confirmable by reload and by the dashboard, because the site can never read the row back), that focus lands on the confirm control and Escape reverts it, that the Danish withdraw confirmation question renders on at most two lines at 320px without pushing the confirm control below the fold, that the amend-pending line reads as deliberate rather than as an error, and that the nudge bar stays down for the rest of the session after withdrawing",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-15T02:09:36.219Z",
    "resolved_at": null
  },
  {
    "id": 9,
    "kind": "deviation",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-06-PLAN.md",
    "line": null,
    "description": "Fifth and sixth instances of the pattern entries 6 and 7 record, both found by 03-06's own sweep. (a) The plan inherited 03-03's uncorrected 'for select' literal count, which can never return 0 because two pre-existing album policies match and the phase forbids touching them: vacuous. (b) The plan's own Table G parse slices from '## Table G' to end of file, so it also demands the device pass Outcome table, which is the phone's record and cannot be filled at a desk: over broad, never satisfiable by the task that owns it. Both re-anchored to their stated intent and re-run green; no source was bent. All 43 gate cases in the closing sweep were then mutation tested and 43 of 43 go red when the thing they protect is broken, so this phase's headline number is 43 passed AND capable of failing rather than 43 passed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-15T02:35:54.234Z",
    "resolved_at": null
  },
  {
    "id": 10,
    "kind": "unmet-truth",
    "phase": "03",
    "file": "styles.css",
    "line": null,
    "description": "Three touch targets are declared 4px under the UI contract: .field__input, .field__select (line 1287) and .seg > span (line 1384) all carry min-height 48px with no coarse-pointer override, while 03-UI-SPEC.md Touch Target Geometry asks 52px at a coarse pointer for the text input, the guest-count segment and the select overflow branch. 48px clears the 44px floor so it is a shortfall against the phase's own stricter target rather than an accessibility failure, and it has been the shipped state since 03-01 rather than being introduced by a later plan. Deliberately not fixed at phase close with the device pass unrun; recorded in the phase's deferred-items.md and in the Declared column of Table D on 03-DEVICE-PASS.md, and the right moment to fix it is the same moment Table D is answered",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-15T02:36:04.731Z",
    "resolved_at": null
  },
  {
    "id": 11,
    "kind": "unrun-verify",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md",
    "line": null,
    "description": "Phase 03 closes human_needed rather than passed. Table G is complete, filled at the desk by moving config and driving the shipped renderNudge; Tables A to F are entirely unrun because 03-06 had no browser of any kind, and each now carries a desk note saying what the desk could and could not establish. The requirement IDs that stay unchecked on that account are NDG-01 and NDG-02 (the bar pinned to a real screen at all, and its clearance over the countdown, the address and the video: the phase's highest risk item, never rendered on any device), ENR-09 and ENR-10 (a field error described on focus, a submit failure announced immediately, and the airplane-mode failure state, all of which need a real assistive stack and a real phone), DEL-02 and DEL-03 (both platforms, mid-range phone, mobile data), DSG-05's observed half, and WA-02, WA-03, WA-04 and WA-06 (the whole group handoff, which additionally waits on the owner supplying whatsapp.inviteUrl). Entries 2, 4 and 8 name the per-plan rows; this entry names the per-ID consequence. Corrected at the 03-06 task 2 close: the first form of this entry omitted NDG-01, WA-04 and WA-06, and the 03-06 summary had ENR-10 in its satisfied list while this entry had it pending, which is the kind of disagreement that lets an ID get ticked twice over",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-15T02:36:16.101Z",
    "resolved_at": null
  },
  {
    "id": 12,
    "kind": "deviation",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md",
    "line": null,
    "description": "Seventh instance of the pattern entries 6, 7 and 9 record, plus three more found in the gap-closure plans themselves. (a) The seventh, found by 03-VERIFICATION.md rather than by any sweep: Table G's 'exactly 0' row was exercised with a deadline of -1h and recorded Pass, so its expectation was derived from the implementation it was meant to test. daysUntil returned -0 for every deadline inside 24h past, and -0 === 0, so the row asserted the bug. 03-09 re-anchored it to a positive offset and recorded that the old expectation was unreachable. This is the instance the 43-case mutation sweep could not catch, because mutation testing proves a gate CAN fail, not that it asserts the right thing. (b) 03-08-PLAN.md task 3's P1 harness omits sbConfigured from the evaluated slice's free variables, so it throws ReferenceError before asserting anything, against any version of the code. Fixed in the harness only, so the PLAN file still carries the broken command. (c) 03-09-PLAN.md task 2's gate builds a fake nudge bar with no getAttribute, so it throws before printing a result. Same shape, also fixed in the harness only. (d) 03-09-PLAN.md's D3 gate is hour-dependent: it pins the deadline at now+8h, which is only 'today' in Europe/Copenhagen when run before about 16:00. It ran at 13:06 and passed verbatim, but a re-run later in the day goes red against correct code. That is the bug this very plan exists to close, in mirror image. Any verifier re-running the plan's gate after 16:00 should expect a false red on the +8h and +30h rows; a calendar-anchored supplement was added beside it. Standing lesson across all seven: a re-runnable gate must be checked for whether it CAN pass and CAN fail for its stated reason, not merely executed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-15T11:22:53.828Z",
    "resolved_at": null
  },
  {
    "id": 13,
    "kind": "unrun-verify",
    "phase": "04",
    "file": ".planning/phases/04-photos/04-DEVICE-PASS.md",
    "line": null,
    "description": "Phase 04's device pass is authored and entirely unwalked. 04-DEVICE-PASS.md carries ten tables and every row reads Pending, including the phase's blocking row A1, whether a portrait iPhone photograph lands the right way up in the album, which is the one claim in the whole design contract that no probe and no emulator can settle and which research THE ORIENTATION REFINEMENT deliberately routed to a phone. The sheet also carries all 31 human-check observations deferred by plans 04-01 to 04-04 under human_verify_mode end-of-phase, plus research assumptions A1 (one-step 2.5x downscale sharpness at four columns) and A2 (five sequential 12MP decodes inside mobile Safari's memory budget). Requirements PH-01, PH-02, PH-03, PH-05, PH-06, PH-07, DEL-02, DEL-03, DSG-05 and DSG-08 stay unchecked on that account. Phase 04 closes human_needed rather than passed, following the phase 02 and 03 precedent.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-17T17:56:36.264Z",
    "resolved_at": null
  }
]
````








