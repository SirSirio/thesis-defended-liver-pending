---
schema_version: 1
open_count: 5
waived_count: 0
fixed_count: 0
total_count: 5
last_updated: 2026-08-14T19:22:02.932Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | unrun-verify | .planning/phases/02-practical-information/02-DEVICE-PASS.md |  | The D-23 real device pass and the blocked network check for the 02-05 map fallback are owed on real hardware; ACC-01, DEL-02 and DEL-03 stay unchecked until that sheet is filled | open |  | 2026-08-14T08:50:26.039Z |  |
| 2 | 03 | unrun-verify | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | The 03-01 rendered half is unproven: the device pass (enrol end to end on iOS Safari and Android Chrome, no viewport zoom on focus, nudge bar clearance, VoiceOver and TalkBack announcement of a field error versus a submit failure, reduced motion sweep parked at full width) has not been run on real hardware | open |  | 2026-08-14T18:43:04.952Z |  |
| 3 | 03 | stub | app.js |  | buildSuccessPanel renders nothing at the group CTA position when whatsapp.inviteUrl is truthy; the dim enrol.success.group.pending line covers the null case, which is the shipping state, and plan 04 owns whatsappButton() for the configured case | open |  | 2026-08-14T18:43:16.602Z |  |
| 4 | 03 | unrun-verify | .planning/phases/03-enrollment-identity-and-the-group/03-DEVICE-PASS.md |  | 03-04 Table C is unrun: the linkless success panel reading as deliberate rather than broken, both group CTAs opening WhatsApp on the first tap with a temporary local link, the bar going quiet after either one, and the social proof block at the threshold boundary, with the attendee list flag false, in Danish collation and with the Supabase host blocked, are all owed on real hardware | open |  | 2026-08-14T19:21:51.717Z |  |
| 5 | 03 | unrun-verify | supabase/schema.sql |  | 03-04 ran its live attendees view contract check against the pre-migration view; the owner has not yet re-run supabase/schema.sql, so public.attendees is still unfiltered. Re-run the select=* projection probe after the migration to confirm the re-created view still projects only first_name, extra_guests and created_at | open |  | 2026-08-14T19:22:02.932Z |  |

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
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-14T18:43:16.602Z",
    "resolved_at": null
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
    "status": "open",
    "reason": "",
    "recorded_at": "2026-08-14T19:22:02.932Z",
    "resolved_at": null
  }
]
````


