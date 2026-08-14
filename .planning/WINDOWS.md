---
schema_version: 1
open_count: 1
waived_count: 0
fixed_count: 0
total_count: 1
last_updated: 2026-08-14T08:50:26.039Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 02 | unrun-verify | .planning/phases/02-practical-information/02-DEVICE-PASS.md |  | The D-23 real device pass and the blocked network check for the 02-05 map fallback are owed on real hardware; ACC-01, DEL-02 and DEL-03 stay unchecked until that sheet is filled | open |  | 2026-08-14T08:50:26.039Z |  |

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
  }
]
````
