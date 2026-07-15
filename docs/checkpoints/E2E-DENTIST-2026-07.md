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

| F15 | tarball plugin-financial 0.1.7 | Não embarca `007b_movement_payment_method_type.sql` → `008` falha em pool fresco (coluna inexistente). Repack via npm quebra (`workspace:^` cru — oficiais usam pnpm pack) | alta | contornado (007b injetado); **regerar tarballs oficiais via pnpm pack = sessão pools** |
| F16 | shell @fayz-ai/saas × spine pools | Shell consulta `public.tenant_roles` (papéis customizados) que a spine industry-pools não provisiona → PostgREST 404. Beauty só funciona porque o seed legado a cria | alta | ✅ contornado no app (drizzle/0000_tenant_roles.sql, 879050d); fix definitivo: mover pra spine `@fayz-ai/db` |
| F17 | seed RBAC | Catálogo `permissions`/`role_permissions` vazio: owner (implícito) funciona; admin/dentista/recepção não teriam acesso a nada | média | seed-rbac.sql encomendado (T5) |
| F18 | fluxo signup dos SaaS | Cadastro exige magic link — trava testes/dev. Bypass validado: Admin API `email_confirm:true` + senha. Recomendação: modo dev com password signup habilitado (documentar em testar-e-debugar) | média | aberto (docs + template) |

| F19 | AGENTS.md — duas fontes | Contrato semântico divergente: fayz/apps/api/.../scaffold/template/AGENTS.md (rico: manifest v2 estrito, panel vs admin, papéis sdk/shop/storefront, OAuth broker, slot contracts) ≠ AGENTS.md curto do cli create.ts. Visão do founder exige single-source | alta | recomendação: embarcar o contrato canônico no @fayz-ai/sdk (node_modules/@fayz-ai/sdk/AGENTS.md); plataforma e CLI copiam da mesma fonte |
| F20 | shell topbar (UX) | Clique no botão-pai da seção só abre dropdown — não navega nem dá feedback; parece "não faz nada" (enganou founder, orquestrador e agente de teste). Deep-link #/rota funciona | média | aberto (SDK shell): parent click → navegar pro primeiro leaf ou indicar visualmente |
| F21 | storefront blocks nativos (DX) | Gaps recorrentes de landing que forçaram registerBlock no figurinhas: hero multi-CTA, FAQ accordion, passos numerados, blocos com estado de runtime (countdown). benefits/products/testimonials/footer cobriram nativo | média | candidatos a blocos nativos do @fayz-ai/storefront |
| F22 | RBAC keying (docs/DX) | Grants casam por PROFILE ID (`administrador`), não pelo nome intuitivo (`admin`) — SDK descarta silenciosamente roles desconhecidos (buildPermissionProfiles). Verbo é `edit` (não `update` como no beauty) | média | documentar em dados/rls + warning no doctor p/ role sem profile |

| F23 | Skills 1ª classe | Direção founder: skills oficiais primeiro (trilho da CLI) → comunidade skills.sh → internas. ENTREGUE: página ia/skills + `fayz skill list/add` (registry 13 skills, official-first, --json, 70/70 testes, e36db58) | — | ✅ entregue |
| F24 | Plugin-as-skill + Integrações | Ficha do plugin = contrato agent-consumable (modelo de dados parseado das migrations, aiTools completos, integrações hospedadas, callout "use como skill" via .md). Seção Integrações da seed real do fayz (connectors.seed.ts — 22 conectores, não 25). ENTREGUE em fayz-docs (348e56d, 57b821e, fe47ec1); `fayz skill add plugin-<id>` = follow-up CLI (mesma extração) | — | ✅ entregue (docs); CLI follow-up |

## Cold-start test — "barbearia do zero" (2026-07-15, tarde)
Agente 100% fresco (zero contexto da sessão), voz de cliente não-dev, só CLI +
docs. RESULTADO: produto entregue (Navalha de Ouro, porta 5306, tema
escuro/dourado, agenda 3 barbeiros, caixa crível, doctor+build verdes) e a
trilha skill→help→docs→dogfood→.d.ts conectou sem travar ("a skill foi a fonte
mais útil de todas"). CUSTO: o que fez o projeto andar veio de .d.ts e código
dogfood, não das docs — gaps abaixo, corrigidos no mesmo dia.

| # | Onde | Achado do cold-start | Sev | Status |
|---|------|----------------------|-----|--------|
| F25 | skill fayz-create | Mandava editar src/config/app.tsx que o scaffold não gera (dessincronia skill↔CLI) | alta | ✅ reescrita honesta 2 caminhos (28ccff6) |
| F26 | fayz create --help | Não existia (erro de kind) | média | ✅ implementado + 6 testes (d2e1afa) |
| F27 | promessa "mock com dados de exemplo" | Providers mock nascem VAZIOS; seams de seed (createMockAgendaProvider({seed}) etc.) só em .d.ts | alta | ✅ página apps/mock-e-dados-de-exemplo (43675b0) |
| F28 | pacotes publicados 0.6.x | Conjunto INCONSISTENTE: saas 0.6.0→plugin-auth 0.1.3→auth/core ^0.7.1 → 2ª cópia do contexto React → TELA BRANCA; fix = overrides | **crítica** | ✅ troubleshooting c/ snippet (43675b0); wave deve publicar CONJUNTO coerente (founder) |
| F29 | doctor × code-config | Valida manifesto estrito mesmo com manifesto vestigial (tema HSL válido reprova) | média | workaround documentado; fix path-aware pendente (SDK) |
| F30 | plugin-dashboard em mock | Lê Supabase direto → zeros | média | documentado (widgets compute); fix SDK pendente |
| F31 | FAYZ_SDK_SOURCE | Default aliassa monorepo local se existir; não documentado | média | ✅ documentado |
| — | redundâncias | Shape do manifesto 3× (AGENTS.md/tut02/tut04), passos Supabase 2×, bloco status agenda copy-paste entre dogfoods (→ preset SDK) | baixa | backlog de consolidação |

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
- [x] T3 DentalSoft build-out — 4 commits (boot real 49ed437, config f55380e,
  prontuario 15e77bf, seed cdaf4d8); shell REAL na 5302; typecheck/build/doctor ✓.
- [x] T4 banco real — pool apply ledger-gated no mcbf (F15 capturado e contornado;
  retomada pós-falha ✓), seed Clínica Sorriso (8 pacientes/12 procedimentos/9
  consultas/3 prontuários), user teste@teste.com c/ senha (bypass magic link),
  login real ✓, F16 tenant_roles corrigido (879050d), odontograma verificado
  com dados reais, screenshots em dentist-saas/docs/screenshots/.
- [x] T5 gates + Playwright — suíte committada (82d5bbd): 5/5 verdes (login por
  senha, KPIs, dropdown→#/clients, prontuário anamnese+odontograma 32 dentes,
  financeiro); typecheck/build limpos; seed-rbac.sql (c5f5bc9) aplicado no pool
  (76 permissions, 102 grants — keyed por profile id: administrador/dentista/recepcao).
- [x] T6 fechamento — tutorial/07 exercitado (`fayz deploy . --dry-run` com CLI
  p5: lista arquivos ✓, credencial ausente reportada ✓ — publish real gate P5.2);
  `gh repo create` BLOQUEADO pelo classificador de permissões da sessão →
  founder roda manualmente (comando no report). PR deste branch aberto.
- [x] T7 (redefinido pelo founder: figurinhas, não petshop) —
  fayz-app/figurinhas-express: recriação de figurinhasexpress.com.br 100% mock,
  porta 5305, 9 seções (4 nativas benefits/products/testimonials/footer + 5
  custom via registerBlock: fx-hero/fx-steps/fx-countdown/fx-faq/fx-wholesale),
  checkout WhatsApp wa.me com pedido pré-preenchido, theme seams azul, zero
  Supabase; build verde. Mapeamento nativo-vs-custom = F21. Serviu de prova
  manual do pipeline `fayz new` (F14).

## F14 — Recomendação: create agêntico (skill sobre primitivas)
Founder (2026-07-15): devs vão rodar com agents; o create deve ser agêntico.
Desenho: primitivas agent-grade na CLI (`fayz add plugin <id>`, `doctor --json`,
`db apply --dry-run --json`) + skill oficial /fayz-create v2 (descoberta →
PRODUCT-BRIEF → create → configurar → verificar). Validação empírica = T7
(petshop). Caveat: F3/F2 travariam o agente igual — ordem: release wave →
ligar template real no create → skill.

## Log de comandos
Timeline operacional em scratchpad `e2e-command-log.md`; consolidada aqui no
fechamento do T6.
