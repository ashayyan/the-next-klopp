---
schema_version: 1
open_count: 1
waived_count: 1
fixed_count: 1
total_count: 3
last_updated: 2026-11-28T07:19:28.917Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 4 | stub | src/routes/dev-directions.tsx |  | Data screen route shows 'not built yet' until 04-09 | open |  | 2026-11-28T06:55:50.585Z |  |
| 2 | 4 | stub | src/routes/dev-directions/TacticsScreen.tsx |  | Step rail column and programme step strip slot empty until 04-08 | fixed |  | 2026-11-28T06:55:51.273Z | 2026-11-28T07:19:28.917Z |
| 3 | 4 | stub | src/routes/dev-directions.tsx |  | x | waived | Recorded by mistake while checking the ledger output; duplicate of entry 1 | 2026-11-28T06:55:56.796Z | 2026-11-28T06:56:07.648Z |

````json
[
  {
    "id": 1,
    "kind": "stub",
    "phase": "4",
    "file": "src/routes/dev-directions.tsx",
    "line": null,
    "description": "Data screen route shows 'not built yet' until 04-09",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-11-28T06:55:50.585Z",
    "resolved_at": null,
    "milestone": null
  },
  {
    "id": 2,
    "kind": "stub",
    "phase": "4",
    "file": "src/routes/dev-directions/TacticsScreen.tsx",
    "line": null,
    "description": "Step rail column and programme step strip slot empty until 04-08",
    "status": "fixed",
    "reason": "",
    "recorded_at": "2026-11-28T06:55:51.273Z",
    "resolved_at": "2026-11-28T07:19:28.917Z",
    "milestone": null
  },
  {
    "id": 3,
    "kind": "stub",
    "phase": "4",
    "file": "src/routes/dev-directions.tsx",
    "line": null,
    "description": "x",
    "status": "waived",
    "reason": "Recorded by mistake while checking the ledger output; duplicate of entry 1",
    "recorded_at": "2026-11-28T06:55:56.796Z",
    "resolved_at": "2026-11-28T06:56:07.648Z",
    "milestone": null
  }
]
````
