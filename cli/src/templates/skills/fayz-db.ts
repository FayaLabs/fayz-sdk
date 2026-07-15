// Bundled SKILL.md for the `fayz-db` official skill.

export const fayzDbSkill = `---
name: fayz-db
description: Provisiona o banco Supabase de um app Fayz com segurança — sempre dry-run primeiro, revise o plano ordenado (spine → drizzle → seed → plugins), depois apply, e mantenha seeds idempotentes. Use ao conectar um app do provider "mock" para um Supabase real.
---

# Skill: fayz-db

Você provisiona o schema Supabase de um app Fayz a partir dos pacotes
\`@fayz-ai/*\` instalados. A regra de ouro: **nunca aplique sem antes ver o plano**.

## Quando usar
- Um app está em \`backend.provider: "mock"\` e precisa de dados reais.
- Você adicionou um plugin que traz migrações novas e quer aplicá-las.

## Passo a passo

### 1. Configure as credenciais (nunca commitadas)
Em \`.env.local\` (git-ignored), preencha:
- \`SUPABASE_PROJECT_REF\` (alias \`SUPABASE_REF\`) — Dashboard → Project Settings → General.
- \`SUPABASE_PAT\` (alias \`SUPABASE_ACCESS_TOKEN\`) — Dashboard → Account → Access Tokens.

### 2. Dry-run — SEMPRE primeiro (zero rede)
\`\`\`bash
fayz db apply --dry-run
\`\`\`
Isso imprime o plano ordenado: \`spine → drizzle → seed → plugin → incubator\`.
Nenhuma chamada de rede acontece.

### 3. Revise o plano
Antes de aplicar, confira:
- A ordem faz sentido (spine antes de tudo, plugins por último).
- Os arquivos SQL listados são os esperados (sem migração órfã ou faltando).
- As \`Notes\` de aviso foram entendidas.

### 4. Apply
\`\`\`bash
fayz db apply            # pede confirmação interativa
fayz db apply --yes      # em CI / shell não-interativo
\`\`\`
Flags úteis: \`--spine-only\`, \`--plugins-only\`, \`--only-plugins a,b\`.

### 5. Seeds idempotentes
Todo seed DEVE poder rodar duas vezes sem duplicar dados nem quebrar:
- use \`insert ... on conflict do nothing\` / \`do update\`;
- nunca dependa de auto-increment para identidade estável — use chaves naturais/uuid.
Rode o apply de novo e confirme que não há erro nem linha duplicada.

### 6. Flip para o backend real
Em \`app.manifest.json\`, troque \`backend.provider\` de \`"mock"\` para \`"supabase"\`
e adicione \`"projectRef": "<seu-ref>"\`. Depois:
\`\`\`bash
fayz doctor
\`\`\`

## Nunca faça
- Aplicar em produção sem dry-run revisado.
- Commitar \`.env.local\` ou o PAT.
- Escrever seeds destrutivos (\`truncate\`/\`delete\`) sem guarda explícita.
`
