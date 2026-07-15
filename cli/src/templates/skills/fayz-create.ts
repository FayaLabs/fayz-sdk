// Bundled SKILL.md for the `fayz-create` official skill.

export const fayzCreateSkill = `---
name: fayz-create
description: Bootstrapa um app Fayz real a partir de um PRODUCT-BRIEF.md usando a CLI (fayz create) e o leva até "roda e parece de verdade". Guia os DOIS caminhos honestamente — o manifesto que o scaffold realmente gera (validado por doctor) e o code-config quando o objetivo é rodar telas completas localmente. Use quando já existe um brief e é hora de gerar o app.
---

# Skill: fayz-create

Você é o agente construtor de apps do Fayz. A partir de um brief, você gera um
app repo-per-app real e o leva até "roda e parece de verdade" — não um esqueleto.

## Pré-requisito
Um \`PRODUCT-BRIEF.md\` (rode o skill \`fayz-descoberta\` primeiro se não existir).

## O que \`fayz create\` REALMENTE gera (leia antes de editar nada)

\`fayz create <kind> <nome>\` gera o **caminho manifesto**, não o code-config:

- \`app.manifest.json\` — a config real. É isto que o runtime da plataforma consome.
- \`src/main.tsx\` → chama \`renderApp(manifest, { surface })\` de \`./lib/fayz-runtime\`.
- \`src/lib/fayz-runtime.ts\` — um **stub local** (tela-âncora): renderiza um
  \`<h1>\` com o nome + o surface, e uma nota de que o app-runtime é bundlado pela
  plataforma. **Ele NÃO monta telas de verdade localmente.** É proposital: o app
  standalone valida o *manifesto*; a plataforma injeta o runtime real no deploy.
- \`src/plugins.generated.ts\`, \`src/registry.tsx\` — pontos de extensão (vazios).

Consequência prática: se você \`npm run dev\` num app recém-criado, vê a tela-âncora,
**não** o dashboard/loja completo. Isso é esperado. NÃO existe \`src/config/app.tsx\`
no scaffold — não perca tempo procurando por ele.

---

## Caminho A — Manifesto (o default; a maior parte dos apps)

Use quando o objetivo é personalizar e **validar a config** que a plataforma vai
rodar. Aqui você quase nunca escreve código novo.

### A1. Gere o scaffold
\`\`\`bash
fayz create <kind> <nome-kebab>   # kind: storefront | admin | member
cd <nome-kebab>
npm install
\`\`\`
Mapeie o \`kind\` do brief: venda ao público → \`storefront\`; gestão interna →
\`admin\`; área logada do cliente → \`member\`. Já vem com
\`backend.provider: "mock"\`, então roda com zero setup.

### A2. Personalize o manifesto (é aqui que mora o trabalho)
Edite \`app.manifest.json\` — **estas edições são config real, consumida pelo
runtime da plataforma**, não decoração:
- \`name\`, \`theme\` (cor/marca, fontes) e \`locale\` conforme o brief.
- \`surfaces.<surface>.options\` — home sections, footer, anúncio, catálogo.
- Ative os plugins do brief (agenda, blog, reviews, payments…) pelos ids.

### A3. Código custom só quando o manifesto não alcança
Registre blocos/componentes em \`src/registry.tsx\` e referencie por id \`custom:\`
no manifesto.

### A4. Valide
\`\`\`bash
fayz doctor          # manifesto + boundaries (warnings são soft)
\`\`\`
O \`doctor\` é a prova do caminho A. \`npm run dev\` só mostra a tela-âncora — é o
manifesto validado que conta.

---

## Caminho B — Code-config (quando você QUER rodar telas completas localmente)

Use quando a "Definição de pronto" do brief exige **ver as telas reais rodando no
navegador local** (não só validar o manifesto). Aqui você troca o stub por um boot
no padrão dos apps dogfood.

> ⚠️ Antes de usar QUALQUER seam abaixo, **confirme a assinatura no .d.ts
> instalado** (\`node_modules/@fayz-ai/<pkg>/dist/index.d.ts\`). Vários desses
> seams de dados de exemplo só existem como declaração de tipo em algumas
> versões — não confie de memória. Se um seam não estiver no .d.ts da versão
> instalada, não o use; caia para \`createMockProvider\` (que é estável) ou
> ajuste a versão.

### B1. Reconstrua o boot no padrão dogfood
Substitua o stub \`src/lib/fayz-runtime.ts\` + \`src/main.tsx\` por um boot que usa
o runtime público real de \`@fayz-ai/saas\`:

\`\`\`tsx
// src/main.tsx
import { createRoot } from 'react-dom/client'
import { renderApp, defineSaas } from '@fayz-ai/saas'
import { config } from './config/app'   // config master (caminho B cria este arquivo)
import './styles.css'

createRoot(document.getElementById('root')!).render(renderApp(defineSaas(config)))
\`\`\`

\`config/app.ts(x)\` é a **config master**: nome, tema, auth, e as **factories de
plugin** (ex.: \`agenda\`, \`financial\`, \`crm\`) que montam as telas de verdade.
Confirme o tipo \`FayzAppConfig\` no \`.d.ts\` de \`@fayz-ai/saas\` e siga a forma de
um app dogfood como referência.

### B2. Ligue dados de exemplo (mock seeds) — confirme cada um no .d.ts primeiro
- \`createMockAgendaProvider({ seed })\` — provider de agenda com dados semeados.
- \`createMockFinancialProvider({ seed })\` — provider financeiro semeado.
- \`createMockProvider(entityDef, initialData)\` — genérico (de \`@fayz-ai/core\`;
  o mais estável — use como fallback quando os específicos não existirem).
- \`createCrudPage(entity, { mockData })\` — página CRUD com dados de exemplo
  inline (de \`@fayz-ai/saas\`).

Para cada um: abra o \`.d.ts\` instalado, confirme que o export existe e que a
assinatura bate, e só então use.

### B3. Os 2 tropeços conhecidos do caminho B
1. **\`FAYZ_SDK_SOURCE=published\`** — num app standalone (fora do monorepo), o
   runtime precisa resolver os pacotes publicados, não fontes do workspace.
   Garanta \`FAYZ_SDK_SOURCE=published\` no ambiente (ex.: \`.env.local\` /
   \`vite.config\` \`define\`) senão o boot tenta caminhos de monorepo inexistentes.
2. **Conflito de versões de auth** nos pacotes publicados — \`@fayz-ai/plugin-auth\`,
   \`@fayz-ai/auth\`, \`@fayz-ai/core\` e \`@fayz-ai/ui\` podem resolver em linhas
   divergentes e quebrar o boot com erros de auth duplicada. Resolva com
   \`overrides\` no \`package.json\`, **travando os quatro na mesma linha do
   \`@fayz-ai/saas\` instalado**:
   \`\`\`jsonc
   // package.json — case as versões com a que o @fayz-ai/saas instalado espera
   "overrides": {
     "@fayz-ai/core": "<versão-do-saas>",
     "@fayz-ai/ui": "<versão-do-saas>",
     "@fayz-ai/auth": "<versão-do-saas>",
     "@fayz-ai/plugin-auth": "<versão-do-saas>"
   }
   \`\`\`
   Descubra a linha correta olhando as \`peerDependencies\`/\`dependencies\` do
   \`@fayz-ai/saas\` instalado; rode \`npm install\` de novo depois.

### B4. Rode e faça smoke
\`\`\`bash
fayz doctor
npm run dev
\`\`\`
Agora \`npm run dev\` monta as telas reais. Smoke no navegador: a home carrega e a
superfície principal do brief funciona com dados de exemplo.

---

## Como escolher A vs B
- Brief pede "config personalizada / pronto para deploy na plataforma" → **A**.
- Brief pede "quero VER o app completo rodando localmente" (demo/dogfood) → **B**.
- Na dúvida, comece por **A** (mais barato) e suba para **B** só se a Definição de
  pronto exigir telas reais locais.

## Definição de pronto
Bate com a "Definição de pronto" do brief: a coisa que o fundador queria VER
está visível e funcionando, com a marca aplicada — não o tema default. No caminho
A isso é o manifesto validado pelo \`doctor\`; no caminho B é a tela real no
navegador.

## Depois
- Banco real: chame o skill \`fayz-db\`.
- Publicar: chame o skill \`fayz-ship\`.
`
