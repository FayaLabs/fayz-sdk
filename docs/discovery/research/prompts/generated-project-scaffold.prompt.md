You are researching Fayz SDK architecture before implementation.

Do not make broad code changes. Prefer reading code and writing a concise research note. Only write the requested output markdown file.

Context docs live in /Users/fayalabs/dev/fayz-sdk/docs/discovery. Read first:
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/07-vini-mission-brief.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/08-current-codebase-findings.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/10-architecture-visuals.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/11-fayz-core-structure.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/12-weekend-operating-plan.md

Task: Research how generated Fayz projects are scaffolded and where Fayz SDK should be included.

Inspect in /Users/fayalabs/dev/fayz:
- apps/api/src/modules/projects/scaffold/index.ts
- apps/api/src/modules/projects/scaffold-libraries.ts
- scaffold template directory
- AI/codegen prompt files only for discovery; Boris owns structural prompt edits
- generated app package.json shape

Write findings to /Users/fayalabs/dev/fayz-sdk/docs/discovery/research/generated-project-scaffold.md.

Cover:
1. Current architecture facts.
2. Files inspected.
3. Dependency insertion point.
4. Starter manifest file location.
5. Runtime imports needed.
6. Agent guide location inside generated projects.
7. Migration command expectations.
8. Risks with existing generated apps.
9. Recommended minimum implementation path.
10. Test/build commands needed.
11. Open questions for Vini/Hermes.

Do not implement code changes beyond this markdown output file.
