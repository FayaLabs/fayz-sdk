# QA Matrix — Fayz Backoffices (operação de estabilização)

> Documento vivo da operação QA overnight (2026-07-20/21). Atualizado pelo orquestrador a cada ciclo de teste.
> Legenda: ✅ passou · 🔧 corrigido+passou (nota do fix) · ❌ falhando (issue aberta) · 🚫 bloqueado (sem backend/por design) · ⬜ pendente de teste

## 1. Matriz apps × superfícies (fluxos básicos: cadastro/config)

| Superfície / fluxo | beauty-saas (5301) | resto-saas (5302†) | agency-os (5303) | school-saas (5311) | dentist-saas (5302†) |
|---|---|---|---|---|---|
| Login + dashboard renderiza | ✅ | ⬜ | ✅ | ✅ | ✅ |
| Dashboard KPIs com dados reais | ⬜ | ⬜ | 🔧✅ (cards default SDK ainda vazam = B23) | ⬜ | ⬜ |
| Onboarding checklist completável | ⬜ | ⬜ | ❌ checks `()=>false` | ⬜ | ⬜ |
| CRUD cliente (criar/editar/excluir) | ❌ B11 drift schema | ⬜ | ✅ Contacts | ✅ Alunos (ghost row pós-delete = B18) | ⬜ (/clients Pacientes) |
| CRUD registry (serviço/staff) | ✅ (services) | ⬜ | 🚫 sem catálogo de serviços | ⬜ (teachers/staff) | ⬜ (procedimentos/dentistas) |
| Agenda: booking criar/editar/excluir | ✅ | 🚫 sem agenda (módulo resto) | 🔧 Save habilita ✅; persistir corrigido 0c436ee + v_appointments provisionada — re-test | ✅ criar/editar/excluir (7/7 ×2) | ⬜ |
| Agenda: working hours (ScheduleEditor) | ⬜ | 🚫 | ⬜ | ⬜ | ⬜ |
| CRM (deal/pipeline) | ⬜ | ⬜ | ⬜ | ⬜ (Matrículas) | ⬜ (Planos de Tratamento) |
| Financeiro (lançamento/recebível) | ⬜ | ⬜ | ⬜ (só invoices) | ⬜ | ⬜ |
| Marketing (planner/blog admin) | ⬜ (blog ON) | ⬜ | ⬜ (landing+blog) | ⬜ (planner) | ⬜ (blog ON) |
| Conversations (criar/enviar/persistir) | — (não instalado) | — | ✅ REAL (persiste no pool, sobrevive reload) | ✅ real, persiste (030bcec robustez) | ✅ dentist (2/2 real, sobrevive reload) |
| Courses (catálogo/members/vendas) | — | — | ⬜ (Memberships) | ⬜ | — |
| Inventory | ⬜ | ⬜ (recipes/batch) | — | — | — |
| Tasks (entry point + CRUD) | 🔧✅ drawer abre | 🔧✅ | — | — | 🔧✅ |
| Reports (com dados) | ⬜ 1/9 available | 🚫 0/7 (views rep_* ausentes) | 🚫 0/4 | ⬜ 1/5 | — (sem plugin) |
| Forms | ⬜ | — | ⬜ | — | — |
| Automations | — | — | 🚫 mock estático (by design) | — | — |
| Sites & Funnels | — | — | 🚫 mock estático | — | — |
| Reputation | — | — | 🚫 mock estático | — | — |
| Prontuário | — | — | — | — | ⬜ |
| Settings: empresa/segurança/field-rules salvam | 🔧✅ (bef1b68, e2e verde) | ❌ | ❌ | ❌ | ❌ |
| Settings: toggles de plugin persistem | 🔧✅ (e2e verde) | ❌ | ❌ | ❌ | ❌ |
| Settings: Team/convites/perfis | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Workspace switcher | 🔧✅ | ❌ | ❌ | ❌ | ❌ |
| FAB assistant | 🔧✅ estado honesto | ❌ | ❌ | ❌ | ❌ |
| Permissões: nav/rotas/botões por papel | 🔧✅ (secretaria e2e verde) | ❌ | ❌ | ❌ | ❌ |
| Notificações (sino) | 🔧 243916e | 🔧✅ (provado no resto) | 🔧✅ | 🔧✅ | 🔧✅ |

† resto-saas e dentist-saas compartilham a porta 5302 (strictPort) — nunca simultâneos.

## 2. Bugs conhecidos (causa-raiz auditada) e status de correção

| # | Bug | Causa-raiz | Status |
|---|---|---|---|
| B1 | Workspace dropdown sem função | `AdminShell.tsx:118` setCurrentOrg parcial em vez de switchOrg (re-hidratação); OrgSwitcher correto órfão | 🔧 corrigido no branch qa/stabilization (bef1b68) — prova e2e pendente |
| B2 | Settings Company/Security/FieldRules não salvam | import de OrgAdapterContext do shell nunca montado (de-bridge pela metade) | 🔧 corrigido (bef1b68) — prova e2e pendente |
| B3 | Toggles de plugin nunca persistiram | ~43 ToggleRows hardcoded + zero persistência por tenant | 🔧 corrigido (bef1b68): useTenantPluginSettings persiste em tenants.settings.plugins — prova e2e pendente |
| B4 | Tasks sem entry point (2 layouts) | plugin só registra widget em `shell.topbar.end`; shell nunca renderiza zonas de chrome | 🔧 corrigido (bef1b68): zonas shell.topbar.* renderizadas — prova e2e pendente |
| B5 | FAB assistant morto | sem apiEndpoint → mock fixo; sem loop de execução de aiTools | 🔧 corrigido (bef1b68): estado honesto sem endpoint; aiTools são declarativas (sem handler) — loop LLM+tools = follow-up com endpoint/chave |
| B6 | agency-os New Appointment insalvável | requiresServices:true sem serviceLookup e sem fallback | 🔧 planejado (onda 2) |
| B7 | Conversations: sem criar, sem persistir, EN-only, botões mortos | sem createConversation (interface/store/UI); mock em memória; sem migrations/tabelas (provider real existe) | 🔧 planejado (onda 2 — unmock completo) |
| B8 | Permissões nunca enforçadas | nav/rotas sem `can()`; catálogo vazio quebra owner; `is_tenant_admin` não reconhece 'administrador' | 🔧 corrigido (bef1b68): nav/rotas/abas gated + owner bypass; is_tenant_admin patchado nos 5 pools; RBAC seedado nos QA tenants — prova e2e pendente |
| B9 | Notificações mortas; Billing oculto; /perfil hardcodeado | AdminShell não passa slots/props | 🔧 corrigido no branch qa/stabilization (bef1b68) — prova e2e pendente |
| B10 | agency dashboard fake / onboarding infinito | KPIs literais; checks sempre false | 🔧 corrigido (agency dbbf4e5) — prova e2e em andamento |
| B11 | beauty: criar cliente 400 SEMPRE (pool salon) | drift: colunas anamnesis_notes/status_alert/has_anamnesis_alert no drizzle mas nunca aplicadas ao pool; lista Clientes vazia (extensão clients sem rows do seed) | ❌ **PENDENTE APROVAÇÃO DO USUÁRIO** — classificador bloqueou ALTER no pool dataCritical; SQL pronto na seção 7 |
| B12 | sino ausente no layout topbar (beauty/resto) | TopbarLayout não recebia notificationSlot | 🔧 corrigido (243916e) |
| B13 | beauty /agenda/cancellations 404 | view rep_cancellations NUNCA foi definida em lugar algum (nem legacy) — página e report referenciam view inexistente | ❌ precisa definição de produto (criar a view) |
| B14 | beauty /agenda/execution-checklist 400 | query do app incompatível com o shape de v_appointments do pool | ❌ investigar (drift de view) |
| B15 | beauty /marketing/blog 404 plg_blog_posts | migration do plugin-blog não estava no pool salon | 🔧 aplicada (2026-07-21) — re-test |

## 3. Riscos conhecidos documentados (fora do escopo desta operação)

- **RBAC no banco**: RLS isola apenas por tenant — nenhuma policy checa papel. Usuário restrito consegue tudo via chamada Supabase direta. Correção real = policies por role/permissão (defesa em profundidade). Registrado como débito de segurança.
- **Automations/Sites/Reputation**: mocks estáticos "ships in a later milestone" — não construídos nesta operação.
- **Loop LLM do assistant**: requer endpoint/chave de API (decisão do produto).

## 4. Cross-flows site ↔ admin

| Fluxo | Status |
|---|---|
| great-djs `/agendar` → SchoolSoft | ✅ re-validado no run final 22/22 (2026-07-21) |
| hempdent `/agendar` → DentalSoft (booking + cliente kind correto) | ✅ 7/7 crossflow (2026-07-21): paridade slots + booking na agenda |
| hempdent `/blog` ← DentalSoft marketing>blog | ✅ blog REAL: 3 posts seedados no site; publicado aparece / draft não (contrato admin→view anon); automação da UI de autoria = follow-up |
| seusorriso `/agendar` → DentalSoft | ⬜ (pool já tem RPC canônica 004) |

## 5. Exploratory log (achados das sessões de click-through)

_(preenchido durante a onda 3 — cada achado: app, tela, sintoma, severidade, issue/fix)_

## 6. QA Tenants

| Pool | App | Tenant slug | Admin | Restrito | Status |
|---|---|---|---|---|---|
| salon `gphxclpkbtbucoqclbco` | beauty | qa-fayz | qa+beauty@… | qa-restrito+beauty@… (secretaria) | ✅ 2026-07-20 |
| restaurant `mgctsbkyykomwaopkbjm` | resto | qa-fayz | qa+resto@… | qa-restrito+resto@… (waiter) | ✅ |
| agency `bcxumqjrduekrsasduwe` | agency | qa-fayz | qa+agency@… | qa-restrito+agency@… (agent) | ✅ |
| school `pjugfwxomeohuaxyjtyu` | school | qa-fayz | qa+school@… | qa-restrito+school@… (secretaria) | ✅ login validado |
| dentist `mcbfebruhimlbvlvczsn` | dentist | qa-fayz | qa+dentist@… | qa-restrito+dentist@… (recepcao) | ✅ |

Nota: todos os 5 pools são core-v1 `public` (inclusive salon — detecção saas_core não foi necessária). RBAC catalog + role_permissions seedados por app (qa-tenant.sql corrige lacunas do seed-rbac.sql do dentist: conversations/marketing incluídos).

Senhas: geradas na aplicação do seed, vivem apenas nos `.env` gitignorados de cada app (`E2E_ADMIN_PASSWORD`/`E2E_RESTRICTED_PASSWORD`).

## 7. Pendências que exigem aprovação do usuário

**B11 — fix do drift de `clients` no pool salon** (classificador bloqueou ALTER em pool dataCritical; é aditivo e idempotente — rodar via Management API ou SQL editor):
```sql
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS anamnesis_notes text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS status_alert text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS has_anamnesis_alert boolean NOT NULL DEFAULT false;
INSERT INTO public.clients (person_id, tenant_id)
SELECT p.id, p.tenant_id FROM public.people p
JOIN public.tenants t ON t.id = p.tenant_id AND t.slug = 'qa-fayz'
WHERE p.kind = 'customer'
  AND NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.person_id = p.id);
```
Depois: re-rodar `npx playwright test e2e/qa-crud.spec.ts` no beauty-saas (o spec pina o bug e deve ficar verde).

### Bugs adicionais do QA e2e (school, 2026-07-21)
| # | Bug | Causa | Status |
|---|---|---|---|
| B16 | AppointmentModal: "Atualizar" nunca habilita (edição impossível) | dirty-tracking no modo edição | 🔧 corrigido 1d5a21c — re-test |
| B17 | "Excluir" no-op no school | ERA GAP DE SPEC (2 passos com mesmo label "Excluir"); provider correto; 1d5a21c ainda vale p/ pools sem tabela financeira | ✅ resolvido |
| B18 | CRUD list ghost row após excluir (cache não invalida) | withCache sem invalidation na mutação | 🔧 corrigido 1d5a21c — re-test |
| B19 | Delete dialog mostra literal {{displayValue}} | interpolação i18n | 🔧 corrigido 1d5a21c — re-test |
| B20 | Conversations resolvia mock para sempre (eager na construção do plugin) | createSafeProvider eager | 🔧 corrigido 8d3ec62 |

### Bugs adicionais do QA e2e (agency, 2026-07-21)
| # | Bug | Causa | Status |
|---|---|---|---|
| B21 | Booking sem profissional 400 22P02 (assignee_id "") | AppointmentModal professionalId default '' enviado cru | 🔧 corrigido 0c436ee — re-test |
| B22 | v_appointments + tenant_roles ausentes no pool agency (grade vazia, 404 em toda página) | migrations agenda/app nunca aplicadas nesse pool | 🔧 provisionado (000b→004 + tenant_roles) — tenant_roles tb aplicado no pool resto |
| B23 | Cards mock default do SDK vazam no dashboard/marketing ("Won deals 786") | defaults do plugin-dashboard/marketing somam-se aos metrics do app | ❌ SDK — corrigir (remover defaults quando app fornece metrics) |
| B24 | Forms configurado no agency mas sem nav/rota (/forms Not Found) | investigar registro do createCustomFormsPlugin | ❌ investigar |
| B25 | Dialog Radix sem DialogTitle (a11y) no modal Nova conversa | componente novo | ❌ menor |

### QA dentist (2026-07-21, 22/22 verde, zero regressão do SDK) — bugs adicionais
| # | Bug | Status |
|---|---|---|
| B26 | Settings deep-link (#/settings/<tab>) duplica painel (2× #company-name) | ❌ SDK SettingsPage — corrigir |
| B27 | Páginas CRM/Conversas/Financeiro/Marketing sem <h1> (a11y/consistência) | ❌ menor |
| B28 | SearchCombobox perde seleção durante debounce (flaky UX) | ❌ menor |

### QA resto-saas (2026-07-21, 22/22 ×3 — primeiro QA do app)
| # | Bug | Status |
|---|---|---|
| B29 | Menu: criar item persiste (201) mas NUNCA aparece no board (v_menu_items não retorna; categoria null; select de categoria inutilizável; sem delete de item/categoria) — create-only dead-end | ❌ ALTO — app-local src/plugins/menu |
| B30 | i18n misto EN/PT no shell do resto; drawerTitle 'Tarefas' ignorado | ❌ médio |
| B31 | Registry staff lê staff_members (vazia) enquanto seed povoou people kind staff | ❌ baixo (mesma família do B2 do beauty) |
| B32 | Inventory onboarding gate só em localStorage (reaparece toda sessão) | ❌ baixo |
| — | Órfãos QA (3 categorias/pratos) no tenant QA do pool resto — limpeza manual pendente (colunas ≠ name) | nota |

## 8. Entitlements — QA de personas (Onda 5, 2026-07-21)
| App | Veredito 4 personas | Ressalvas |
|---|---|---|
| school-saas | ✅ SIM (matriz completa; contrato 7/7) | i18n: copy do paywall/banner em EN no app pt-BR (B33, baixo) |
| agency-os | ✅ SIM (incl. caso composto Reputation grant+gated) | B24 confirmado: Forms registra só settings, nav main é no-op (médio); fetch abortado no /marketing free = ruído benigno (B34, baixo) |
| dentist-saas | ✅ contrato 9/9 ×2 (workspace multi-org pinado; fix org 9e83aab) | personas via contrato+qa-permissions (page-by-page dedicado não rodado) |
| beauty-saas | ✅ SIM c/ ressalvas | B35 reconciliação sem gate → 🔧 corrigido (3aef49a); B38 '+ Adicionar Serviço' p/ secretaria → 🔧 corrigido (features nos pages, ecbeb35); i18n paywall → 🔧 corrigido; console /api/api 404 (env, B40) |
| norman-ai | ✅ SIM c/ ressalvas | B37 member criava transação → 🔧 corrigido per-action (0511be2, prova viva); B36 cap connected_banks não trip (provider MOCK grava memória, count lê tabela real — resolve com unmock do financial, follow-up) |
| resto-saas | ✅ SIM c/ ressalvas | B-RESTO-1 waiter criava menu item (persistia!) → 🔧 mitigado client-side pelo per-action do sweep (menu sem feature declarada no app = anotado); pill 'Pro' fixa → 🔧 corrigido (4f8c07f); i18n matrix → 🔧 corrigido |

Bugs novos: B33 i18n paywall pt-BR (tabela legada shell/lib/i18n vs core) · B34 fetch abort noise · (B24 causa-raiz: plugin-forms sem navigation/routes)
