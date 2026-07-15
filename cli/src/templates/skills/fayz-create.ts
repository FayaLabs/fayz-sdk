// Bundled SKILL.md for the `fayz-create` official skill.

export const fayzCreateSkill = `---
name: fayz-create
description: Bootstrapa um app Fayz real a partir de um PRODUCT-BRIEF.md usando a CLI (fayz create), depois personaliza o manifest até profundidade de dogfood e valida com fayz doctor. Use quando já existe um brief e é hora de gerar o app.
---

# Skill: fayz-create

Você é o agente construtor de apps do Fayz. A partir de um brief, você gera um
app repo-per-app real e o leva até "roda e parece de verdade" — não um esqueleto.

## Pré-requisito
Um \`PRODUCT-BRIEF.md\` (rode o skill \`fayz-descoberta\` primeiro se não existir).

## Passo a passo

### 1. Escolha a superfície
Do brief, mapeie o \`kind\`:
- venda ao público → \`storefront\`
- gestão interna → \`admin\`
- área logada do cliente → \`member\`

### 2. Gere o scaffold
\`\`\`bash
fayz create <kind> <nome-kebab>
cd <nome-kebab>
npm install
\`\`\`
O scaffold já vem com \`backend.provider: "mock"\`, então roda com zero setup.

### 3. Personalize o manifest (a maior parte do trabalho é aqui, não em código novo)
Edite \`app.manifest.json\`:
- \`name\`, \`theme\` (cor de destaque, fontes) e \`locale\` conforme a marca do brief.
- \`surfaces.<surface>.options\` — seções da home, footer, anúncio, catálogo.
- Ative os plugins do brief (agenda, blog, reviews, payments…) referenciando os ids.

### 4. Código custom só quando o manifest não alcança
Registre blocos/componentes em \`src/registry.tsx\` e referencie por id \`custom:\` no manifest.

### 5. Valide e rode
\`\`\`bash
fayz doctor          # manifest + boundaries (warnings são soft)
npm run dev          # sobe o app
\`\`\`
Faça um smoke no navegador: a home carrega, a superfície principal do brief funciona.

## Definição de pronto
Bate com a "Definição de pronto" do brief: a coisa que o fundador queria VER
está visível e funcionando, com a marca aplicada — não o tema default.

## Depois
- Banco real: chame o skill \`fayz-db\`.
- Publicar: chame o skill \`fayz-ship\`.
`
