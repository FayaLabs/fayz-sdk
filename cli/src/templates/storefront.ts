import {
  type AppTemplate,
  titleCase,
  viteConfig,
  tsconfig,
  postcssConfig,
  tailwindConfig,
  stylesCss,
  indexHtml,
  gitignore,
  mainTsx,
  registryTsx,
  readme,
  claudeMd,
  SHARED_EXTERNAL_DEPS,
} from './shared.js'

// Storefront app — pulse-store is the shape reference: createStorefront({ config })
// over a defineStorefrontConfig source of truth, mock catalog seeded via
// buildMockCatalog, visual identity from a template preset.

const CHECKLIST = `1. **Identity**: pick the template preset closest to the brand (\`mareTemplate\`
   coastal/soft, \`sertaoTemplate\` earthy/artisanal, \`voltTemplate\` dark/street,
   \`atelierTemplate\` minimal/editorial — all from \`@fayz-ai/storefront\`) or
   hand-tune \`theme\` (HSL colors, font, radius, header/productCard personality).
2. **Catalog** (\`src/config/catalog.ts\`): replace the seed with the real segment —
   3+ categories, 10+ products with honest descriptions, BRL prices,
   \`compareAtPrice\` on sale items, \`inventory\`, \`sku\`, \`metadata\` (sizes/variants),
   1-2 discount codes.
3. **Home & chrome** (\`src/config/app.ts\`): announcement bar, home sections
   (hero/categories/products/benefits/newsletter), nav, footer, shipping
   (\`flatRate\`/\`freeAbove\`).
4. **Images** (optional, big impact): write \`src/images.manifest.mjs\` with
   segment queries and run \`UNSPLASH_ACCESS_KEY=xxx node <fayz-sdk>/scripts/fetch-unsplash.mjs .\`
   → \`src/images.generated.ts\`; wire \`IMAGES\` into products, categories and
   hero/banner sections (pulse-store is the reference).
5. **Manifest**: mirror name/template choice into \`app.manifest.json\`.`

function appTs(name: string): string {
  const title = titleCase(name)
  return `import { defineStorefrontConfig, mareTemplate } from '@fayz-ai/storefront'
import { catalog } from './catalog'

const storeName = '${title}'

// Source of truth for this app (the manifest is derived from it). Swap
// mareTemplate for sertaoTemplate / voltTemplate / atelierTemplate, or replace
// theme/home wholesale for a fully custom identity.
export const appConfig = defineStorefrontConfig({
  name: storeName,
  currency: 'BRL',
  locale: 'pt-BR',
  announcement: mareTemplate.announcement,
  theme: mareTemplate.theme,
  home: mareTemplate.home(storeName),
  catalog,
  shipping: { flatRate: 19.9, freeAbove: 300 },
})
`
}

function catalogTs(): string {
  return `import { buildMockCatalog } from '@fayz-ai/storefront/catalog'

// Starter catalog — replace with the real segment's categories and products.
// Fields worth filling per product: description, compareAtPrice (sale),
// inventory, sku, weight, metadata (sizes/variants), image.
export const catalog = buildMockCatalog({
  discounts: [{ code: 'BEMVINDO10', percent: 10, title: 'Boas-vindas 10%' }],
  categories: [
    { name: 'Destaques', description: 'Os mais vendidos da loja' },
    { name: 'Novidades', description: 'Últimos lançamentos' },
  ],
  products: [
    { name: 'Produto Destaque', description: 'Descrição honesta do produto.', price: 99.9, compareAtPrice: 129.9, inventory: 20, sku: 'DST-001', category: 'Destaques' },
    { name: 'Produto Clássico', description: 'O queridinho de sempre.', price: 79.9, inventory: 35, sku: 'DST-002', category: 'Destaques' },
    { name: 'Lançamento A', description: 'Acabou de chegar.', price: 149.9, inventory: 12, sku: 'NOV-001', category: 'Novidades' },
    { name: 'Lançamento B', description: 'Edição limitada.', price: 199.9, inventory: 8, sku: 'NOV-002', category: 'Novidades' },
  ],
})
`
}

function appTsx(): string {
  return `import { createStorefront } from '@fayz-ai/storefront'
import { appConfig } from './config/app'

export const App = createStorefront({ config: appConfig })
`
}

function pluginsGenerated(): string {
  return `// AI-BUILDER contract file: plugin/scaffold/provider wiring lives here.
// The storefront scaffold self-registers via createStorefront and runs on the
// mock provider seeded from src/config/catalog.ts — nothing to wire yet.
export {}
`
}

function manifest(name: string): string {
  return (
    JSON.stringify(
      {
        manifestVersion: 2,
        id: name,
        name: titleCase(name),
        backend: { provider: 'mock' },
        locale: { default: 'pt-BR', supported: ['pt-BR'], currency: 'BRL' },
        surfaces: {
          storefront: { scaffold: 'storefront', options: { template: 'mare' } },
        },
      },
      null,
      2,
    ) + '\n'
  )
}

export const storefrontTemplate: AppTemplate = {
  kind: 'storefront',
  port: 5185,
  fayzDependencies: ['@fayz-ai/sdk', '@fayz-ai/storefront', '@fayz-ai/ui'],
  externalDependencies: {
    ...SHARED_EXTERNAL_DEPS,
    clsx: '^2.1.0',
    'tailwind-merge': '^2.4.0',
  },
  checklist: CHECKLIST,
  files: (name) => ({
    'app.manifest.json': manifest(name),
    'index.html': indexHtml(titleCase(name)),
    '.gitignore': gitignore(),
    'vite.config.ts': viteConfig(5185),
    'tsconfig.json': tsconfig(),
    'postcss.config.js': postcssConfig(),
    'tailwind.config.ts': tailwindConfig(),
    'README.md': readme(name, 'storefront'),
    'CLAUDE.md': claudeMd(name, 'storefront', CHECKLIST),
    'src/styles.css': stylesCss(),
    'src/main.tsx': mainTsx(),
    'src/App.tsx': appTsx(),
    'src/config/app.ts': appTs(name),
    'src/config/catalog.ts': catalogTs(),
    'src/plugins.generated.ts': pluginsGenerated(),
    'src/registry.tsx': registryTsx(),
  }),
}
