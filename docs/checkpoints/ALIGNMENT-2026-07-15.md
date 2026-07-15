# Compilado de alinhamento — sessão E2E/DevCenter · 2026-07-15

Para a(s) outra(s) dev session(s) ativas (industry-pools e afins): tudo que esta
sessão mudou hoje + os conceitos novos que o founder cravou. Fonte de detalhe:
`docs/checkpoints/E2E-DENTIST-2026-07.md` (findings F0–F22, mesmo branch).

## 1. Conceitos novos (decisões do founder — alinhar qualquer trabalho a eles)

1. **Bootstrap agêntico (`fayz new`)** — a criação de projetos vira: prompt →
   descoberta → **PRODUCT-BRIEF.json (IR compartilhada web/CLI)** → `fayz create`
   determinístico → configuração pelo agente (local via AGENTS.md/skills; na
   plataforma, agente em container) → verificação (`doctor --json`, build,
   dry-run). A CLI é o **harness que qualquer agente pilota**, não IA embutida.
   Provado manualmente 2× hoje (DentalSoft admin real + figurinhas-express
   storefront mock recriado de um site de referência).
2. **Skills-first** — skills são a camada de PROCEDIMENTOS do ecossistema
   (AGENTS.md = contrato · llms.txt = conhecimento · CLI = execução · skills =
   procedimentos). Tiers ORDENADOS: oficiais fayz primeiro (fayz-descoberta,
   fayz-create, fayz-db, fayz-plugin, fayz-ship), depois comunidade curada via
   skills.sh (`npx skills add <owner>/<repo>` — multi-agente), depois internas
   em desenvolvimento (conceito-financeiro, integrations gcal/stripe,
   module-building). Reaproveitar > reescrever.
3. **AGENTS.md single-source (F19)** — hoje há DUAS fontes divergentes: o
   template rico da plataforma (`fayz/apps/api/src/modules/projects/scaffold/
   template/AGENTS.md`) e o AGENTS.md curto do `cli create.ts`. Direção: contrato
   canônico EMBARCADO no `@fayz-ai/sdk` (viaja no node_modules — sobrevive a
   export→GitHub→clone→IA de terceiro); plataforma e CLI copiam da mesma fonte;
   `fayz doctor` é o enforcement.
4. **`fayz create bare`** — quarto kind: projeto cru só com a stack (sdk +
   default packages) + guidelines, sem opinião de vertical.
5. **Deploy fayz = oficial** ("acesso em rollout"), não experimental.

## 2. Mudanças por repositório

### fayz-docs → agora em **github.com/FayaLabs/fayz-docs** (main, privado)
| Commit | O quê |
|---|---|
| 4d31af2 | Modelo de dados alinhado ao branch pools: `public.*` (não `core.*`), sem `requires_core`, fix-forward, `plg_` = convenção shop/courses (8 páginas) |
| e083e8f | referencia/cli completa (db pool/fan-out + login/deploy), claims version-aware, doctor citado corretamente, imports `@fayz-ai/core` nos snippets |
| e5906c1 | tutorial/04 com a saída REAL do doctor |
| 0af3d21 | plugin-catalog.json regenerado: 22 plugins (blog/payments/admin incluídos), versões npm reais, migrations corretas |
| fa0fbb2 | Rota `.md` 500 corrigida (export só em prod + route handler), footer sem links mortos |
| 9a1be42 | Header "fayz sdk" |
| c72d600 | **Página nova `ia/skills`** (tiers official-first + comunidade verificada) + nav + ponteiros |

### fayz-sdk → branch **devcenter/e2e-dentist** (PR pendente → devcenter/p5-deploy)
| Commit | O quê |
|---|---|
| e880e45 | `fayz doctor` valida enums theme.brand/radius/mode + backend.provider (62/62 testes) |
| e36db58 | **`fayz skill list/add`** — registry curado official-first (13 skills, 3 tiers), templates SKILL.md embutidos das 5 oficiais, `--json`, AGENTS.md do scaffold ganha seção Skills (70/70 testes) |
| d02e759…8783672 | Tracker E2E-DENTIST-2026-07.md (F0–F22) |

### fayz-app (novos apps, repos git locais — push p/ GitHub pendente de permissão)
- **dentist-saas** (porta 5302): DentalSoft — admin odonto REAL na arquitetura
  beauty-saas, plugin incubator `prontuario` (odontograma FDI 32 dentes),
  suíte Playwright 5/5 committada, seed-rbac.sql, `drizzle/0000_tenant_roles.sql`.
- **figurinhas-express** (porta 5305): réplica mock de figurinhasexpress.com.br,
  9 seções (5 blocos custom via registerBlock), checkout WhatsApp.

### cluster-dentist-br-01 (mcbfebruhimlbvlvczsn) — estado do banco
Aplicado via `fayz db pool apply` (ledger): migrações crm(5)/financial(10+007b)/
tasks(2)/prontuario(1) + `tenant_roles` (app-level). Seeds: tenant Clínica
Sorriso (8 pacientes, 12 procedimentos, 9 consultas, 3 prontuários) + RBAC
(76 permissions / 102 grants, keyed por profile id `administrador|dentista|
recepcao`). Auth user `teste@teste.com` (senha, email_confirm) = owner.

## 3. Findings que exigem ação da SESSÃO POOLS (detalhe no tracker)
- **F3 (crítico)**: canal stable pina `core ^0.7.2` e `plugin-agenda ^0.4.0`
  não publicados → `npm install` de scaffold QUEBRA. Publicar a wave resolve.
- **F2**: `cli/src/templates/` (runtime REAL via @fayz-ai/saas) é código morto —
  `create.ts` usa mapa inline com placeholder. Ligar o template real.
- **F12/F15**: tarballs de `fayz-tarballs/industry-pools/` desatualizados
  (@fayz-ai/db sem 011; plugin-financial sem 007b → apply falha em pool fresco).
  Regerar via **pnpm pack** (npm pack deixa `workspace:^` cru e quebra install).
- **F16**: shell consulta `public.tenant_roles` que a spine não cria — mover a
  tabela para as migrações do `@fayz-ai/db` (workaround app-level já no dentist).
- **F1**: a CLI 0.3.0 publicada precisa ser a UNIÃO dos branches (pools tem
  db pool/fan-out; p5-deploy tem login/deploy; e2e-dentist tem skill + doctor fix).

## 3b. Adendo (mesmo dia, pós-digest)
- fayz-docs agora vive em **github.com/FayaLabs/fayz-docs** (main).
- **Plugin-as-skill + Integrações** (commits 348e56d/57b821e/fe47ec1): fichas de
  plugin viraram contratos agent-consumable — data/plugin-details.json (tabelas
  plg_ parseadas das migrations do SDK, aiTools completos, conectores hospedados)
  + data/integrations.json (seed real: fayz/packages/db/prisma/seeds/
  connectors.seed.ts, 22 conectores) + página plugins/integracoes + costura de
  cross-links. WIP do founder no PluginDetail preservado em commit isolado
  (348e56d). Follow-up de CLI: `fayz skill add plugin-<id>` gerado da mesma
  extração.

## 3c. Adendo 2 — cold-start "barbearia" (validação do conceito skills)
Agente fresco sem contexto construiu uma barbearia completa via skill→docs→
dogfood→.d.ts (app referência: fayz-app/navalha-de-ouro, porta 5306). Findings
F25–F31 no tracker; corrigidos no dia: skill fayz-create honesta + fayz create
--help (branch e2e-dentist, 76/76 testes), página apps/mock-e-dados-de-exemplo
+ troubleshooting tela-branca/overrides (fayz-docs 43675b0). ⚠ PARA A WAVE:
F28 — publicar o CONJUNTO coerente (saas/auth/core/plugin-auth/ui na mesma
linha), não só core 0.7.2 + agenda 0.4.0; senão apps em pacotes publicados
quebram com 2ª cópia do contexto de auth (tela branca).

## 4. O que esta sessão NÃO tocou
Checkout principal do fayz-sdk (feat/industry-pools — tudo via worktrees),
beauty-saas, refs Supabase do founder, npm publish/tags, main do fayz-sdk.
