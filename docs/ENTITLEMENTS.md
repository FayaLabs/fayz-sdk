# Entitlements — papel × plano × limites (fundação)

> Um único ponto de decisão de acesso. "Pode?" é papel (RBAC). "Tem direito? Quantos?" é plano.
> A resolução é parametrizada pelo contexto da sessão (usuário, org ativa, perfil, plano) — extensível a futuros parâmetros sem tocar nos call-sites.

## Modelo

- **Feature id é UM só vocabulário**: o mesmo id serve o RBAC (`permissions.features[].id`, grants dos perfis, `permission.feature` de nav/rotas) e os entitlements de plano (`plan.entitlements.features`). Nunca crie um vocabulário paralelo.
- **`PlanEntitlements`** (`@fayz-ai/core`): `features?: Record<featureId, boolean>` (ausente = liberado) e `limits?: Record<limitKey, number>` (`-1` = ilimitado). Vive em `Plan.entitlements` — configurado por app em `src/config/billing.ts`.
- **`LimitDeclaration`** `{ key, label, table, kindFilter?, period?: 'month'|'total' }` liga uma chave de limite a uma contagem por tenant. Camadas (a de baixo perde por key):
  1. `CORE_LIMIT_DECLARATIONS` do shell (`users` → tenant_members, `locations`);
  2. **derivadas automaticamente das entidades registradas** — qualquer `EntityDef` com `limitKey` gera a declaração da sua própria tabela/kind (um cap sem binding contável é um cap morto);
  3. `declaredLimits` dos manifests de plugin;
  4. `config.billing.limitDeclarations` do app (override final).

## Runtime (packages/saas/src/access)

- `useAccess()/useAccessOptional()` → `can(feature, action)` retorna `{ allowed, reason?: 'role'|'plan' }` (papel primeiro — reusa `profileHasPermission` com owner bypass e impersonation; depois plano — **owner NÃO bypassa plano**). `entitled(feature)` é só o eixo de plano.
- `useLimit(key)` → `{ max, used, remaining, atLimit, unlimited, loading, refresh }` (contagem `count:'exact', head:true` com cache TTL fail-open — falha de contagem nunca tranca o tenant).
- `useLimitGuard(key)` → `await guard(n)` = `'ok' | 'blocked'` (bloqueou → `UpgradeModal` global abre sozinho). `invalidateLimit(key)` após criar/excluir.

## UI

| Situação | Tratamento |
|---|---|
| Papel sem grant | Item **some** da nav; rota direta → `AccessDenied` |
| Plano sem feature | Item **fica** na nav com badge 👑; rota → `UpgradePrompt` (CTA → /settings/subscription) |
| Limite no cap | Botão de criar via `LimitGate` intercepta; submit via `useLimitGuard` aborta; `UpgradeModal` com used/max |
| Estouro (soft-limit) | `SoftLimitBanner` persistente ("acima do limite — faça upgrade") |

**Política de soft-limit (Notion-style)**: fluxos do CLIENTE FINAL nunca bloqueiam (ex.: booking público cria customer mesmo acima do cap) — o tenant estoura e vê o banner. Só a criação ADMIN é bloqueada no cap.

## Checklist — novo plugin nasce compatível

1. `declaredFeatures` no manifest (id/label/group/actions) — entram na matrix de permissões automaticamente (merge no PermissionsProvider; o app pode sobrescrever).
2. `permission: { feature, action }` em toda navigation/route/settings-tab/widget/aiTool.
3. `declaredLimits` para o que for contável (`plg_<plugin>_*` ou tabela core com kindFilter; `period: 'month'` para quotas recorrentes).
4. Em CADA handler de criação (na UI, ANTES do provider — nunca dentro do provider): `if (await guard(n) === 'blocked') return` + `invalidateLimit(key)` no sucesso. Cobrir criações em lote (`n = rows.length`).
5. Entidades CRUD genéricas: só setar `EntityDef.limitKey` — botão/submit/import CSV/declaração vêm de graça.
6. Label i18n `limit.label.<key>` (en + pt-BR) no shell ou no plugin.
7. Teste: adicionar o módulo ao `TestingAppConfig` do app → `entitlementsContract` cobre feature-paywall, cap, upgrade-destrava, badge e composição papel×plano (flip real de `tenants.plan` para o plano `qa-free-test` de caps mínimos).

## Débitos conhecidos (documentados, não escondidos)

- **Enforcement é client-side** (mesmo débito do RBAC): RLS por papel/plano no banco é defesa-em-profundidade futura; hoje um client direto ignora caps.
- Planos `qa-free-test` são visíveis na SubscriptionPage (sem flag `hidden` no PlanConfig) — remover antes de billing real.
- `orders` (resto) declara limite sem guard (create é mock-only); `quickCreateProduct` do inventory é side-path não guardado; convites pendentes não contam como seat até aceitos.

## Superfície de agentes de IA (sistema operado por agentes)

O sistema será operado também por AI agents (assistente do FAB, builder do fayz, automations) — e **agente não clica botão**: os gates de UI (PermissionGate/LimitGate/UpgradeModal) não o alcançam. O contrato para a superfície de agentes é:

1. **Mesmo resolver, caminho headless.** O motor já é puro fora do React: `resolveAccess(session, feature, action)` e `isEntitledByPlan` (saas/access/resolver), `countByTenant` (core) e o registry de limites (module-level; `invalidateLimit` já funciona fora de componentes). O executor de aiTools DEVE avaliar, antes de executar qualquer tool: papel (`permission.feature/action` da tool) → plano (`entitled(feature)`) → limite (tools `mode:'persist'` com `limitKey` declarado: contar e comparar ao cap; invalidar após sucesso). Falta hoje: um `getAccessSnapshot()`/`guardLimit(key, n)` imperativos empacotados para runtimes sem React (edge/server) — gap registrado.
2. **`PluginAITool.limitKey`** (novo, tipado): toda tool persist que cria linhas contáveis declara a chave que consome (`createBooking` → `bookings_month`; `sendMessage` não consome). Checklist de plugin novo: declarar `limitKey` nas aiTools de criação junto com `permission`.
3. **Negação é resposta estruturada, não falha silenciosa.** O executor devolve ao agente `{ allowed: false, reason: 'role'|'plan'|'limit', limit?: {key,max,used}, upgradeUrl: '/settings/subscription' }` — o agente explica ao usuário e pode propor o upgrade em conversa (o paywall conversacional é o equivalente do UpgradeModal).
4. **Enforcement server-side pesa MAIS aqui.** Um agente fala com providers direto — o débito "client-side only" é amplificado. Regra: agente escreve SEMPRE via as ações guardadas (nunca `.from(table).insert` cru); RLS por papel/plano no banco continua sendo a defesa-em-profundidade pendente.
5. **Mesma política de soft-limit**: agente agindo por CLIENTE FINAL (booking público, respostas) nunca bloqueia; agente agindo como ADMIN do tenant obedece caps e oferece upgrade.
6. **Descoberta**: o catálogo de capacidades que o builder lê inclui `declaredFeatures` + `declaredLimits` + `aiTools[].permission/limitKey` — o builder não oferece ao tenant uma ação que o plano não cobre sem apresentar o caminho de upgrade.
7. **Auditoria**: execuções de tools persist registram ator (usuário em nome de quem o agente age) — `audit_logs` existe no spine dos pools.
