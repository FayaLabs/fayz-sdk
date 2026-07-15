# E2E Validation — Dev por um dia + DentalSoft (2026-07-15)

Missão: validar a jornada completa de um dev externo (docs aba a aba + CLI +
golden path) construindo um produto real — **DentalSoft**, sistema para
consultório odontológico, no pool `cluster-dentist-br-01`
(ref `mcbfebruhimlbvlvczsn`, autorizado pelo founder para esta missão).
Qualidade alvo: beauty-saas. Plano aprovado em
`~/.claude/plans/fable-we-got-a-temporal-hamming.md`.

## Guardrails
- Supabase real SOMENTE no ref `mcbfebruhimlbvlvczsn`. Refs do founder intocáveis.
- Sem npm publish / tags / merges / força-push / commits em main do fayz-sdk.
- Checkout principal do fayz-sdk (feat/industry-pools) pertence a outra sessão —
  tudo via worktrees. Porta 4455 (docs) nunca cai.

## Estado do pool na largada (sanity 2026-07-15)
- 28 tabelas em `public` (core: tenants/profiles/tenant_members/plans/permissions/
  people/appointments/transactions/… + agenda `001_public_booking`).
- `fayz_migration_ledger` ativo: spine 0000→011 aplicado 2026-07-15 01:53–02:30 UTC.
- 1 tenant (smoke da sessão pools). ⚠ `wipe-mcbf.mjs` existe no harness da sessão
  pools — seeds do DentalSoft devem ser re-executáveis por script.

## Findings (docs/CLI/SDK)

| # | Onde | Claim vs realidade | Sev | Status |
|---|------|--------------------|-----|--------|
| F0 | docs (geral) | Docs ensinam CLI 0.3.0 (`db apply`, `deploy`); npm tem 0.2.0 — PRs #11–14 abertos (CP1) | alta | conhecido, gate CP1 |
| F1 | CLI pools vs docs | Branch feat/industry-pools NÃO tem `fayz login`/`deploy` (só devcenter/p5-deploy tem); nenhum branch tem os dois conjuntos completos (`db pool`/`fan-out` + `login`/`deploy`) — a 0.3.0 publicada precisa ser a UNIÃO dos branches | alta | aberto (release, founder) |
| F2 | fayz-sdk pools `cli/src/templates/` | Templates refatorados com runtime REAL (`renderApp` de @fayz-ai/saas) existem mas são CÓDIGO MORTO — create.ts usa mapa inline próprio que emite o placeholder e instala os 31 pacotes | alta | aberto (sessão pools) |
| F3 | `fayz create` + `npm install` | QUEBRA hoje: release-channels pina `core ^0.7.2` (npm 0.7.1) e `plugin-agenda ^0.4.0` (npm 0.3.0). Dev externo trava no passo 1 do tutorial. Todos os outros 29 pins OK | **crítica** | aberto (publicar core 0.7.2 + agenda 0.4.0, founder) |
| F4 | docs data/plugin-catalog.json | Catálogo gerado defasado: 19/19 versões velhas, 10 fichas "sem canal stable" falso, migrations agenda/marketing "nenhuma", blog/payments/admin publicados mas AUSENTES | alta | fix despachado (regenerar) |
| F5 | docs troubleshooting + testar-e-debugar + tutorial/04 | Citavam saída do doctor inexistente ("platform bundle") com modelo mental oposto ao real (factory npm instalada) | alta | ✅ corrigido (4d31af2, e083e8f, e5906c1) |
| F6 | docs site shell | Rota "Ver esta página em Markdown" (`<slug>.md`) → HTTP 500 site inteiro no dev; llms-full.txt 404 em dev (só no build) | alta | fix despachado |
| F7 | docs site footer | Links suporte/comunidade `href="#"` mortos (gate CP2) | média | fix despachado (degradar p/ recursos/comunidade) |
| F8 | docs conceitos/dados/padroes | Sobre-prometiam nomenclatura-alvo inexistente: schema `core.*` (real: `public.*`), tabelas `staff`/`roles` (reais: tenant_members/role_permissions), campo `requires_core` (não existe), migrações "reversíveis" (real: fix-forward), `plg_` universal (real: só shop/courses) | alta | ✅ corrigido (4d31af2) |
| F9 | `fayz doctor` (SDK) | Não validava enums de theme/backend.provider que 3 páginas prometiam (`brand:"chartreuse"` passava) | alta | ✅ corrigido no branch e2e-dentist (e880e45, 62/62 testes) — falta merge |
| F10 | docs referencia/cli + versoes | CLI page não documentava `db pool`/`fan-out`/`login`/`deploy`; claims version-dependent (flags do create 0.2.0 vs 0.3.0) | média | ✅ corrigido (e083e8f) |
| F11 | scaffold `fayz-runtime.ts` | Stub não reexporta `registerComponent/Block/Page` que 2 páginas importavam nos snippets | média | docs ✅ (imports → @fayz-ai/core); reexport no scaffold pendente (SDK) |
| F12 | tarball @fayz-ai/db 0.1.2 (fayz-tarballs/) | Migrations desatualizadas vs branch (tinha 000b_gphx_quarantine, faltava 011_anon_write_revoke) — risco de apply divergente no pool | média | ✅ contornado: repack fresco do worktree pools instalado no dentist-saas; regenerar o tarball oficial fica p/ sessão pools |
| F13 | release-channels agenda | Canal stable pina `plugin-agenda ^0.4.0` não satisfeito pelo npm 0.3.0 (mesmo item de F3, visão canal) | — | consolidado em F3 |

### Achados que CONFIRMARAM as docs (auditoria limpa)
- Lane IA: 18 claims estruturais conferem (14/22 aiTools, tipos, BYO endpoint, conectores, WhatsApp=roadmap honesto). Só 1 baixa (rótulo de diagrama, corrigida).
- dados/rls, auth/visao-geral, plugins-proprios/incubator, deploy/estatico, deploy/fayz, headless, visao-geral, dois-caminhos: limpos.
- Sanitização: zero vazamentos internos em content/.

## Fases
- [x] T0 preparação — CLI pools 0.3.0 packada+instalada (prefix isolado), worktrees
  wt-e2e (devcenter/e2e-dentist) + wt-pools-build (detached 2690f31), sanity mcbf ok.
- [x] T1 auditoria docs (7 lanes Opus) — 13 findings consolidados acima; 4 fix agents
  despachados (2 concluídos: 4d31af2, e083e8f; 2 em voo: catálogo, shell .md/footer).
- [x] T2 golden path tutorial 01–06 — create✓ (0.2.0 gap F3 registrado; pools CLI ok),
  install✓ (via tarballs após F3), dev 5302✓ (tela-âncora conforme docs), doctor✓
  (saída real confirmada), tema teal/md/light✓, plugins dashboard+crm+tasks✓,
  db apply --dry-run✓ (19 SQLs, spine idêntico ao ledger do pool após F12),
  create plugin prontuario✓. Passo 07 (publicar) fica no T6.
- [ ] T3 DentalSoft build-out (config + prontuario)
- [ ] T4 banco real + providers
- [ ] T5 typecheck/build/doctor + Playwright
- [ ] T6 commit/GitHub/PR/report

## Log de comandos
Timeline operacional em scratchpad `e2e-command-log.md`; consolidada aqui no
fechamento do T6.
