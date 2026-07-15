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
| F1 | CLI pools vs docs | Branch feat/industry-pools NÃO tem `fayz login`/`deploy` (só devcenter/p5-deploy tem); nenhum branch tem os dois conjuntos completos (`db pool`/`fan-out` + `login`/`deploy`) — a 0.3.0 publicada precisa unificar | alta | aberto |

## Fases
- [x] T0 preparação — CLI pools 0.3.0 packada+instalada (prefix isolado), worktrees
  wt-e2e (devcenter/e2e-dentist) + wt-pools-build (detached 2690f31), sanity mcbf ok.
- [ ] T1 auditoria docs (6 lanes) + fixes
- [ ] T2 golden path tutorial 01–07
- [ ] T3 DentalSoft build-out (config + prontuario)
- [ ] T4 banco real + providers
- [ ] T5 typecheck/build/doctor + Playwright
- [ ] T6 commit/GitHub/PR/report

## Log de comandos
Timeline operacional em scratchpad `e2e-command-log.md`; consolidada aqui no
fechamento do T6.
