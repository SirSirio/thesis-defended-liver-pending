---
schema_version: 1
open_count: 7
waived_count: 0
fixed_count: 4
total_count: 11
last_updated: 2026-08-15T02:36:16.101Z
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
| 11 | 03 | unrun-verify | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | Phase 03 closes human_needed rather than passed. Table G is complete, filled at the desk by moving config and driving the shipped renderNudge; Tables A to F are entirely unrun because 03-06 had no browser of any kind, and each now carries a desk note saying what the desk could and could not establish. The requirement IDs that stay unchecked on that account are NDG-02 (the bar's clearance, the phase's highest risk item, never rendered on any device), WA-02 and WA-03 (one tap into the app, and also blocked on the owner supplying whatsapp.inviteUrl), ENR-09 and ENR-10 (the two announcement channels in a real assistive stack), DEL-02 and DEL-03 (both platforms, mid-range phone, mobile data) and DSG-05's observed half. Entries 2, 4 and 8 name the per-plan rows; this entry names the per-ID consequence | open |  | 2026-08-15T02:36:16.101Z |  |

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
    "description": "Phase 03 closes human_needed rather than passed. Table G is complete, filled at the desk by moving config and driving the shipped renderNudge; Tables A to F are entirely unrun because 03-06 had no browser of any kind, and each now carries a desk note saying what the desk could and could not establish. The requirement IDs that stay unchecked on that account are NDG-02 (the bar's clearance, the phase's highest risk item, never rendered on any device), WA-02 and WA-03 (one tap into the app, and also blocked on the owner supplying whatsapp.inviteUrl), ENR-09 and ENR-10 (the two announcement channels in a real assistive stack), DEL-02 and DEL-03 (both platforms, mid-range phone, mobile data) and DSG-05's observed half. Entries 2, 4 and 8 name the per-plan rows; this entry names the per-ID consequence",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-15T02:36:16.101Z",
    "resolved_at": null
  }
]
````






