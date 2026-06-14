You are researching Fayz SDK architecture before implementation.

Do not make broad code changes. Prefer reading code and writing a concise research note. Only write the requested output markdown file.

Read first:
- docs/discovery/07-vini-mission-brief.md
- docs/discovery/08-current-codebase-findings.md
- docs/discovery/10-architecture-visuals.md
- docs/discovery/11-fayz-core-structure.md
- docs/discovery/12-weekend-operating-plan.md

Task: Research existing package/design-system stability before we lock Fayz SDK into Fayz and generated projects.

Inspect:
- packages/ui/**
- packages/saas/**
- current uncommitted work
- package dependency graph
- theme/token APIs
- build/typecheck scripts

Write findings to docs/discovery/research/package-design-system.md.

Cover:
1. Current architecture facts.
2. Files inspected.
3. Package boundaries.
4. Design token/theme variation strategy.
5. Current uncommitted work risk.
6. Build/typecheck status or commands needed.
7. What must be fixed before SDK standardization.
8. What can wait.
9. Recommended minimum implementation path.
10. Open questions for Vini/Hermes.

Do not implement code changes beyond this markdown output file.
