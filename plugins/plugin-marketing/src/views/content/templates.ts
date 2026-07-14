import type { PostFormat } from '../../data/contentTypes'

// ---------------------------------------------------------------------------
// Default markdown scaffolds inserted when a post's page is still empty.
// The section headers follow the script format clinics/creators actually use
// (hook-first reels, on-screen text + spoken line per take). Body text is user
// content, so it ships in pt-BR — the product's first content-planner users.
// ---------------------------------------------------------------------------

const reel = (title: string) => `# ${title}

**TEMA:** ${title.toUpperCase()}
**Formato:** Reel · **Duração:** 45 a 60 segundos

---

## TAKE 1 – GANCHO (0s a 5s)

*Direção de cena: olhando para a câmera, energia alta.*

**Texto na tela:** …

**Fala:** "…"

---

## TAKE 2 – DESENVOLVIMENTO (5s a 40s)

*Direção de cena: …*

**Texto na tela:** …

**Fala:** "…"

---

## TAKE 3 – CTA (40s a 60s)

**Fala:** "…"

**CTA:** …
`

const staticPost = (title: string) => `# ${title}

**TEMA:** ${title.toUpperCase()}
**Formato:** Estático

## Texto da arte

…

## Legenda

…

**CTA:** …
`

const carousel = (title: string) => `# ${title}

**TEMA:** ${title.toUpperCase()}
**Formato:** Carrossel

## Slide 1 — Capa (gancho)

…

## Slide 2

…

## Slide 3

…

## Último slide — CTA

…
`

const story = (title: string) => `# ${title}

**TEMA:** ${title.toUpperCase()}
**Formato:** Story

## Frame 1

…

## Frame 2

…

## Frame final — CTA

*Sticker de link / caixa de pergunta / enquete.*

…
`

const video = (title: string) => `# ${title}

**TEMA:** ${title.toUpperCase()}
**Formato:** Vídeo longo (YouTube) · **Duração:** 8 a 12 minutos

## Gancho (0s a 30s)

…

## Roteiro por blocos

### Bloco 1 — Contexto

…

### Bloco 2 — Desenvolvimento

…

### Bloco 3 — Fechamento

…

**CTA:** inscreva-se / comente / link na descrição
`

const live = (title: string) => `# ${title}

**TEMA:** ${title.toUpperCase()}
**Formato:** Live

## Pauta

1. Abertura e aquecimento (5 min)
2. …
3. Perguntas e respostas (15 min)

## Avisos / CTAs durante a live

…
`

const article = (title: string) => `# ${title}

**TEMA:** ${title.toUpperCase()}
**Formato:** Artigo / Newsletter

## Título de trabalho

…

## Estrutura

- Abertura (dor / promessa)
- Desenvolvimento em 3 pontos
- Conclusão + CTA

## Rascunho

…
`

export const POST_TEMPLATES: Record<PostFormat, (title: string) => string> = {
  reel,
  static: staticPost,
  carousel,
  story,
  video,
  live,
  article,
}
