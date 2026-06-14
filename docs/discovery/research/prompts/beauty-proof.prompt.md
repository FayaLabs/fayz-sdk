You are researching Fayz SDK architecture before implementation.

Do not make broad code changes. Prefer reading code and writing a concise research note. Only write the requested output markdown file.

Context docs live in /Users/fayalabs/dev/fayz-sdk/docs/discovery. Read first:
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/07-vini-mission-brief.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/08-current-codebase-findings.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/10-architecture-visuals.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/11-fayz-core-structure.md
- /Users/fayalabs/dev/fayz-sdk/docs/discovery/12-weekend-operating-plan.md

Task: Research Beauty SaaS as the first proof app for Fayz SDK manifest architecture.

Inspect in /Users/fayalabs/dev/fayz-app/beauty-saas:
- src/App.tsx
- agenda plugin usage
- entity/type definitions
- Supabase/provider config
- build/test scripts

Write findings to /Users/fayalabs/dev/fayz-sdk/docs/discovery/research/beauty-proof.md.

Cover:
1. Current architecture facts.
2. Files inspected.
3. Which app config can become pure manifest JSON.
4. Which components/functions require registry IDs.
5. Minimum agenda/booking demo path.
6. Data provider requirements.
7. Risks in converting too much too early.
8. Exact success criteria for Monday demo.
9. Test/build commands needed.
10. Open questions for Vini/Hermes.

Do not implement code changes beyond this markdown output file.
