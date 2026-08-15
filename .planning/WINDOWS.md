---
schema_version: 1
open_count: 6
waived_count: 0
fixed_count: 2
total_count: 8
last_updated: 2026-08-15T02:09:36.219Z
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
| 6 | 03 | deviation | .planning/phases/03-enrollment-identity-and-the-group/03-06-PLAN.md |  | Three of four executed plans found a verification gate that was itself broken rather than code that was wrong: 03-02 enrollmentReady assertion searched from index 0 and matched unrelated phase-1 code (vacuous), 03-03 for-select count could never be 0 because two pre-existing photo policies match, 03-04 live attendees view contract check cannot fail because PostgREST guarantees the asserted property. Each was narrowed to its stated intent and recorded. 03-06 re-runs every phase gate as one sweep, so a clean 03-06 result is only as strong as the corrected gates underneath it — 03-06 must verify gate anchoring, not just gate exit codes | open |  | 2026-08-14T19:26:10.363Z |  |
| 7 | 03 | deviation | .planning/phases/03-enrollment-identity-and-the-group/03-05-PLAN.md |  | Fourth instance of the pattern entry 6 records: 03-05 task 2's 'withdraw branches present' gate cannot fail. Its condition is body.indexOf(k)<0 AND s.indexOf(k)<0, and PGRST202 was already present file-wide from plan 01's amendEnrollment, so the file-wide fallback satisfies it regardless of what withdrawEnrollment contains. Re-anchored and re-run scoped to the function body itself, which passes genuinely. 03-06 must check gate anchoring, not exit codes | open |  | 2026-08-15T02:09:21.234Z |  |
| 8 | 03 | unrun-verify | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | 03-05 human checks are unrun on real hardware: that an amendment and a withdrawal actually reached the database (only confirmable by reload and by the dashboard, because the site can never read the row back), that focus lands on the confirm control and Escape reverts it, that the Danish withdraw confirmation question renders on at most two lines at 320px without pushing the confirm control below the fold, that the amend-pending line reads as deliberate rather than as an error, and that the nudge bar stays down for the rest of the session after withdrawing | open |  | 2026-08-15T02:09:36.219Z |  |

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
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-14T19:26:10.363Z",
    "resolved_at": null
  },
  {
    "id": 7,
    "kind": "deviation",
    "phase": "03",
    "file": ".planning/phases/03-enrollment-identity-and-the-group/03-05-PLAN.md",
    "line": null,
    "description": "Fourth instance of the pattern entry 6 records: 03-05 task 2's 'withdraw branches present' gate cannot fail. Its condition is body.indexOf(k)<0 AND s.indexOf(k)<0, and PGRST202 was already present file-wide from plan 01's amendEnrollment, so the file-wide fallback satisfies it regardless of what withdrawEnrollment contains. Re-anchored and re-run scoped to the function body itself, which passes genuinely. 03-06 must check gate anchoring, not exit codes",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-15T02:09:21.234Z",
    "resolved_at": null
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
  }
]
````





