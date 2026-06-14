You are researching Fayz SDK architecture before implementation.

Do not make broad code changes. Prefer reading code and writing a concise research note. Only write the requested output markdown file.

Context docs live in /Users/fayalabs/dev/fayz-sdk/docs/discovery. Read first:
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/07-vini-mission-brief.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/08-current-codebase-findings.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/10-architecture-visuals.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/11-fayz-core-structure.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/12-weekend-operating-plan.md

Task: Research Fayz API and web editor integration for tenant-specific AppManifest rendering.

Goal: identify where to add manifest storage/resolver and where Panel should render a manifest surface.

Inspect in /Users/fayalabs/dev/fayz:
- apps/api/src/modules/projects/**
- project Prisma schema/migrations
- apps/web/src/** editor/Panel components
- existing project/settings/cloud features routes
- current API patterns for project-scoped data

Write findings to /Users/fayalabs/dev/fayz-sdk/docs/discovery/research/fayz-panel-api.md.

Cover:
1. Current architecture facts.
2. Files inspected.
3. Candidate DB table/model name and relations.
4. API endpoint shape.
5. Tenant/customer/environment identity options.
6. Current Panel component/files and invariant host-owned sections like Cloud Features.
7. Smallest implementation slice.
8. Risks/contradictions.
9. Test/build commands needed.
10. Open questions for Vini/Hermes.

Do not implement code changes beyond this markdown output file.
