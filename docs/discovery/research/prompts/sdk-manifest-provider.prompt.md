You are researching Fayz SDK architecture before implementation.

Do not make broad code changes. Prefer reading code and writing a concise research note. Only write the requested output markdown file.

Read first:
- docs/discovery/07-vini-mission-brief.md
- docs/discovery/08-current-codebase-findings.md
- docs/discovery/10-architecture-visuals.md
- docs/discovery/11-fayz-core-structure.md
- docs/discovery/12-weekend-operating-plan.md

Task: Research the SDK manifest/provider contract for the Fayz SDK architecture.

Focus on @fayz/core. Determine the smallest safe change to support:
- canonical AppManifest as the shared app contract;
- Fayz API as a provider option alongside Supabase/mock/custom;
- stronger manifest validation;
- future separation of DataProvider vs ActionProvider vs MigrationProvider without overbuilding now.

Inspect:
- packages/core/src/manifest/index.ts
- packages/core/src/manifest/app-manifest.schema.json
- packages/core/src/data/*
- packages/core/src/types/plugins.ts
- packages/core/src/index.ts
- tests around manifest/data providers, if any

Write findings to docs/discovery/research/sdk-manifest-provider.md with:
1. Current architecture facts.
2. Files inspected.
3. Recommended minimum implementation path.
4. Risks/contradictions.
5. Test/build commands needed.
6. Open questions for Vini/Hermes.

Do not implement code changes beyond this markdown output file.
