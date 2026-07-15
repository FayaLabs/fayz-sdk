// Bundled SKILL.md for the `fayz-plugin` official skill.

export const fayzPluginSkill = `---
name: fayz-plugin
description: Cria e evolui um plugin app-local (incubadora) que espelha o contrato de plugin do SDK, com o objetivo de graduar para o marketplace. Use quando um app precisa de uma capacidade que ainda não existe como plugin publicado.
---

# Skill: fayz-plugin

Você constrói plugins Fayz. Comece na incubadora (dentro do app, dono do próprio
DB, injetando na UI do SDK) e projete desde o dia 1 para graduar ao marketplace.

## Quando usar
- O app precisa de uma capacidade (ex.: cardápio, ficha clínica) sem plugin publicado.
- Você quer validar uma ideia de plugin dentro de um app real antes de extrair.

## Passo a passo

### 1. Scaffold do plugin incubadora
\`\`\`bash
fayz create plugin <nome-kebab>
\`\`\`
Isso cria a estrutura em \`src/plugins/<nome>/\` espelhando o contrato de plugin do SDK
(manifest do plugin + Provider + superfícies).

### 2. Respeite o contrato de capacidade
- Exponha \`{ manifest, Provider }\` — não vaze detalhes internos para o app.
- Dados: o plugin é dono do próprio schema; leia via as views \`public.v_*\` quando
  precisar cruzar com o core (PostgREST não faz join cross-schema).
- UI: contribua blocos/páginas/widgets pelos slots do SDK, não editando o shell.

### 3. Ligue no app
Referencie o plugin no \`app.manifest.json\` e registre o factory em
\`src/plugins.generated.ts\` (ou o mapeamento incubadora equivalente).

### 4. Valide as fronteiras
\`\`\`bash
fayz doctor
\`\`\`
Trate os avisos de boundary (provider-access, supported-surface) — eles apontam
onde o plugin está furando o contrato antes da graduação.

### 5. Caminho de graduação
Quando estável: extraia \`src/plugins/<nome>/\` para um pacote \`@fayz-ai/plugin-<nome>\`,
mantendo a MESMA superfície pública. Se nada no app precisou mudar além do import,
o contrato estava certo.

## Princípios
- Own-DB, inject-into-UI (padrão Híbrido da incubadora).
- Nada de acesso direto a tabelas do core — só as views \`v_*\`.
- Superfície pública mínima e estável — é o que vai ao marketplace.
`
