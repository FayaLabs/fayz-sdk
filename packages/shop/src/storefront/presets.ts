import type { StorefrontTheme } from './theme'
import type { HomeConfig } from './sections'

// ---------------------------------------------------------------------------
// Template presets — recreations of the four Nuvemshop patterns selected in
// docs/storefront-templates-research.md. Each is { theme, home() } so an app
// (or the Fayz agent) starts from a complete professional store and overrides
// copy, colors, hero images and sections — the saas-core theming workflow.
// ---------------------------------------------------------------------------

/** Real imagery for a template home — resolved at build time (e.g. via
 *  scripts/fetch-unsplash.mjs); falls back to gradient placeholders when omitted. */
export interface TemplateImages {
  hero?: Array<string | undefined>
  banners?: Array<string | undefined>
}

export interface StorefrontTemplate {
  id: string
  /** The Nuvemshop pattern this recreates */
  inspiration: string
  theme: StorefrontTheme
  /** Default home blueprint — pass the store name for copy interpolation */
  home: (storeName: string, images?: TemplateImages) => HomeConfig
  announcement?: string
}

/** maré — elegant fashion (Rio): airy warm paper, olive ink, sand CTA, centered logo. */
export const mareTemplate: StorefrontTemplate = {
  id: 'mare',
  inspiration: 'Nuvemshop Rio',
  announcement: 'FRETE GRÁTIS EM COMPRAS ACIMA DE R$ 300',
  theme: {
    name: 'mare',
    colors: {
      background: '40 14% 93%',
      foreground: '90 8% 38%',
      primary: '42 32% 61%',
      primaryForeground: '40 30% 12%',
      card: '40 20% 97%',
      cardForeground: '90 10% 25%',
      muted: '40 12% 88%',
      mutedForeground: '90 6% 50%',
      border: '40 10% 82%',
      announcementBackground: '90 10% 30%',
      announcementForeground: '40 20% 95%',
    },
    font: { heading: 'Plus Jakarta Sans', body: 'Plus Jakarta Sans' },
    radius: 'soft',
    header: { variant: 'centered' },
    productCard: { style: 'editorial', imageAspect: 'portrait' },
  },
  home: (storeName, images) => ({
    sections: [
      {
        type: 'hero',
        variant: 'banner',
        height: 'tall',
        slides: [
          { title: 'Feito para durar', subtitle: `A nova coleção ${storeName} chegou — peças atemporais em materiais honestos.`, cta: 'Ver coleção', hue: 75, image: images?.hero?.[0] },
        ],
      },
      { type: 'categories', style: 'bubbles' },
      { type: 'products', title: 'Destaques', filter: 'all', limit: 4 },
      { type: 'banner', title: 'Até 30% off', eyebrow: 'por tempo limitado', subtitle: 'Peças selecionadas da estação', cta: 'Aproveitar', hue: 40, image: images?.banners?.[0] },
      { type: 'products', title: 'Promoções', filter: 'sale', limit: 4 },
      { type: 'products', title: 'Lançamentos', filter: 'new', limit: 4 },
      { type: 'newsletter', title: 'Assine nossa newsletter', subtitle: 'Novidades e ofertas exclusivas, sem spam.' },
    ],
  }),
}

/** sertão — editorial organic (Uyuni): cream paper, coffee serif ink, boxed hero, manifesto. */
export const sertaoTemplate: StorefrontTemplate = {
  id: 'sertao',
  inspiration: 'Nuvemshop Uyuni',
  theme: {
    name: 'sertao',
    colors: {
      background: '30 100% 98%',
      foreground: '28 42% 32%',
      primary: '28 42% 32%',
      primaryForeground: '30 100% 97%',
      card: '32 60% 96%',
      cardForeground: '28 40% 26%',
      muted: '32 40% 92%',
      mutedForeground: '28 22% 48%',
      border: '28 30% 80%',
    },
    font: { heading: 'Marcellus', body: 'Marcellus', fallback: 'serif' },
    radius: 'none',
    header: { variant: 'minimal', uppercaseNav: true },
    productCard: { style: 'editorial', imageAspect: 'portrait' },
    uppercaseButtons: true,
  },
  home: (storeName, images) => ({
    sections: [
      {
        type: 'hero',
        variant: 'banner',
        height: 'tall',
        slides: [
          { title: 'Essenciais naturais', subtitle: 'Conheça nossa coleção', cta: 'Ver mais', hue: 28, boxed: true, image: images?.hero?.[0] },
        ],
      },
      {
        type: 'manifesto',
        text: `Num mundo de pressa e excesso, ${storeName} escolhe o caminho lento: ingredientes honestos, produção pequena e cuidado em cada detalhe.`,
      },
      { type: 'categories', style: 'tiles' },
      { type: 'products', title: 'ESSENCIAIS', filter: 'all', limit: 4 },
      {
        type: 'testimonials',
        title: 'Nossos clientes',
        items: [
          { quote: 'Qualidade impecável e um cheiro que abraça.', author: 'Helena M.' },
          { quote: 'Compro há dois anos e nunca me decepcionou.', author: 'Rafael T.' },
          { quote: 'Entrega rápida e embalagem linda, dá gosto de presentear.', author: 'Cláudia P.' },
        ],
      },
      { type: 'products', title: 'NOVIDADES', filter: 'new', limit: 4 },
      {
        type: 'benefits',
        items: [
          { icon: 'Truck', title: 'Frete para todo o Brasil', text: 'Envio em até 48h' },
          { icon: 'Leaf', title: '100% vegano', text: 'Sem testes em animais' },
          { icon: 'RotateCcw', title: 'Troca fácil', text: '30 dias para trocar' },
        ],
      },
      { type: 'newsletter', title: 'NEWSLETTER', subtitle: 'Histórias, lançamentos e cuidado — direto no seu e-mail.' },
    ],
  }),
}

/** volt — bold tech (Brasília): white canvas, near-black ink, vivid CTA, dark search-first header, split hero. */
export const voltTemplate: StorefrontTemplate = {
  id: 'volt',
  inspiration: 'Nuvemshop Brasília',
  announcement: 'CUPOM BEMVINDO10 — 10% DE DESCONTO NA PRIMEIRA COMPRA',
  theme: {
    name: 'volt',
    colors: {
      background: '0 0% 100%',
      foreground: '0 0% 7%',
      primary: '341 100% 45%',
      primaryForeground: '0 0% 100%',
      card: '0 0% 98%',
      cardForeground: '0 0% 10%',
      muted: '0 0% 94%',
      mutedForeground: '0 0% 40%',
      border: '0 0% 88%',
      headerBackground: '0 0% 6%',
      headerForeground: '0 0% 98%',
      announcementBackground: '341 100% 45%',
      announcementForeground: '0 0% 100%',
    },
    font: { heading: 'Chakra Petch', body: 'Rubik' },
    radius: 'soft',
    header: { variant: 'search', uppercaseNav: true },
    productCard: { style: 'card', imageAspect: 'square' },
  },
  home: (storeName, images) => ({
    sections: [
      {
        type: 'hero',
        variant: 'split',
        slides: [
          { title: 'Tecnologia', subtitle: 'O melhor do hardware e dos acessórios', hue: 250, image: images?.hero?.[0] },
          { title: 'Ofertas', subtitle: `Descontos semanais ${storeName}`, hue: 341, href: '/catalog', image: images?.hero?.[1] },
        ],
      },
      {
        type: 'benefits',
        items: [
          { icon: 'CreditCard', title: '3x sem juros', text: 'Em todo o site' },
          { icon: 'Truck', title: 'Envio em 24h', text: 'Para todo o Brasil' },
          { icon: 'ShieldCheck', title: 'Compra segura', text: 'Seus dados protegidos' },
        ],
      },
      { type: 'products', title: 'NOVIDADES', filter: 'new', limit: 4 },
      { type: 'banner', title: 'DESCONTOS SEMANAIS', eyebrow: 'toda sexta', subtitle: 'Ofertas novas, estoque limitado', cta: 'Conferir', hue: 341, image: images?.banners?.[0] },
      { type: 'products', title: 'PROMOÇÕES', filter: 'sale', limit: 4 },
      { type: 'newsletter', title: 'Entre para o clube', subtitle: 'Cupons e lançamentos antes de todo mundo.' },
    ],
  }),
}

/** atelier — classic premium retail (Flex): white, near-black, gold accent, slider hero, trust badges. */
export const atelierTemplate: StorefrontTemplate = {
  id: 'atelier',
  inspiration: 'Nuvemshop Flex',
  theme: {
    name: 'atelier',
    colors: {
      background: '0 0% 100%',
      foreground: '0 0% 9%',
      primary: '40 45% 48%',
      primaryForeground: '0 0% 100%',
      card: '0 0% 99%',
      cardForeground: '0 0% 9%',
      muted: '40 10% 95%',
      mutedForeground: '0 0% 42%',
      border: '0 0% 88%',
      announcementBackground: '0 0% 9%',
      announcementForeground: '0 0% 98%',
    },
    font: { heading: 'Outfit', body: 'Outfit' },
    radius: 'none',
    header: { variant: 'centered', uppercaseNav: true },
    productCard: { style: 'card', imageAspect: 'square' },
    uppercaseButtons: true,
  },
  announcement: 'PARCELE EM ATÉ 10X · 5% OFF NO PIX',
  home: (storeName, images) => ({
    sections: [
      {
        type: 'hero',
        variant: 'slider',
        height: 'medium',
        slides: [
          { title: 'Feito para quem valoriza detalhes', subtitle: `Coleção exclusiva ${storeName}`, cta: 'APROVEITE', hue: 40, image: images?.hero?.[0] },
          { title: 'Clássicos que não saem de moda', subtitle: 'Peças autorais, produção limitada', cta: 'VER COLEÇÃO', hue: 210, image: images?.hero?.[1] },
        ],
      },
      {
        type: 'benefits',
        items: [
          { icon: 'CreditCard', title: 'Parcele em até 10x', text: 'Ou 5% off no PIX' },
          { icon: 'Lock', title: 'Site 100% seguro', text: 'Seus dados protegidos' },
          { icon: 'Award', title: 'Peças exclusivas', text: 'Produtos 100% autorais' },
        ],
      },
      { type: 'categories', style: 'tiles' },
      { type: 'products', title: 'Novidades', filter: 'new', limit: 4 },
      { type: 'banner', title: 'Promoções', eyebrow: 'seleção especial', subtitle: 'Selecionados com até 25% off', cta: 'Ver ofertas', hue: 40, image: images?.banners?.[0] },
      { type: 'products', title: 'Promoções', filter: 'sale', limit: 4 },
      {
        type: 'testimonials',
        title: 'O que dizem sobre nós',
        items: [
          { quote: 'Acabamento perfeito, superou a expectativa.', author: 'Mariana C.' },
          { quote: 'Atendimento impecável do pedido à entrega.', author: 'Jorge L.' },
          { quote: 'Virou minha loja favorita para presentes.', author: 'Paula R.' },
        ],
      },
      { type: 'newsletter' },
    ],
  }),
}

export const storefrontTemplates = {
  mare: mareTemplate,
  sertao: sertaoTemplate,
  volt: voltTemplate,
  atelier: atelierTemplate,
} as const

export type StorefrontTemplateId = keyof typeof storefrontTemplates
