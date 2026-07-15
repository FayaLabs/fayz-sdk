// Bundled SKILL.md for the `fayz-ship` official skill.

export const fayzShipSkill = `---
name: fayz-ship
description: Leva um app Fayz de local para publicado com segurança — doctor verde, login, dry-run do deploy, revisão, e só então o deploy real. Use quando o app está pronto para ir ao ar.
---

# Skill: fayz-ship

Você publica apps Fayz. A sequência é sempre: validar → autenticar → simular →
revisar → publicar. Sem pular etapa.

## Quando usar
- Um app já roda localmente e o critério de "pronto" do brief foi atingido.
- O usuário pede para colocar no ar / publicar / fazer deploy.

## Passo a passo

### 1. Porta de qualidade (bloqueante)
\`\`\`bash
fayz doctor
\`\`\`
Erros de manifest (exit 1) travam o ship — corrija antes. Avisos de boundary são
soft, mas leia-os: geralmente apontam dívida que vai doer em produção.

### 2. Autentique (uma vez por máquina)
\`\`\`bash
fayz login --status      # já tem credencial? (mascarada, sem rede)
fayz login               # cola o token fayz_... → ~/.fayz/credentials.json (0600)
\`\`\`
O token só é validado no primeiro deploy — nenhuma rede no login.

### 3. Dry-run do deploy (zero rede)
\`\`\`bash
fayz deploy --dry-run
\`\`\`
Lista os arquivos que subiriam e o projeto de destino. Nenhuma chamada de rede.

### 4. Revise
- Os arquivos são os certos (build/artefatos, não \`node_modules\` nem segredos)?
- O projeto de destino é o esperado (novo vs. \`.fayz/project.json\` existente)?

### 5. Deploy real
\`\`\`bash
fayz deploy              # confirma antes de enviar
fayz deploy --yes        # em CI / shell não-interativo
\`\`\`
O fluxo é create → upload → publish e imprime a URL ao final. O vínculo do projeto
fica em \`<app>/.fayz/project.json\` para os próximos deploys reaproveitarem.

## Se der 401
Sua conta ainda não liberou acesso de CLI ou o token é inválido. Gere um novo em
Fayz → Configurações → Tokens de acesso e rode \`fayz login\` de novo.

## Nunca faça
- Publicar com \`fayz doctor\` em erro.
- Commitar o token ou colocá-lo em \`.env\` versionado.
- Enviar segredos junto no bundle — confira a lista do dry-run.
`
