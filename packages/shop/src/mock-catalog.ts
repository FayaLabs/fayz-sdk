import type { Product, ProductImage, Category, Discount } from './types'

// ---------------------------------------------------------------------------
// Deterministic, offline product catalog for the mock provider.
// Product names sourced from the Fayz client repo references
// (apps/web ShopSection mockups + original shop seeds), expanded to a
// 16-product / 4-category Shopify-style catalog.
// ---------------------------------------------------------------------------

const T0 = '2026-01-01T12:00:00.000Z'

/** 600x600 gradient SVG with product initials — no network, e2e-stable. */
export function svgPlaceholder(label: string, hueA: number, hueB: number): string {
  const initials = label
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hueA},45%,82%)"/>` +
    `<stop offset="1" stop-color="hsl(${hueB},50%,62%)"/>` +
    `</linearGradient></defs>` +
    `<rect width="600" height="600" fill="url(#g)"/>` +
    `<text x="300" y="330" font-family="sans-serif" font-size="120" font-weight="700" ` +
    `fill="rgba(255,255,255,0.85)" text-anchor="middle">${initials}</text>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

function image(productId: string, name: string, hueA: number, hueB: number, idx = 0): ProductImage {
  return {
    id: `img-${productId}-${idx}`,
    productId,
    url: svgPlaceholder(name, hueA, hueB),
    altText: name,
    sortOrder: idx,
    isPrimary: idx === 0,
    createdAt: T0,
  }
}

export const MOCK_CATEGORIES: Category[] = [
  { id: 'cat-apparel', tenantId: 'mock', name: 'Apparel', slug: 'apparel', description: 'Clothing and wearables', parentId: null, sortOrder: 0, createdAt: T0 },
  { id: 'cat-bags', tenantId: 'mock', name: 'Bags & Accessories', slug: 'bags-accessories', description: 'Bags, wallets and carry gear', parentId: null, sortOrder: 1, createdAt: T0 },
  { id: 'cat-home', tenantId: 'mock', name: 'Home & Kitchen', slug: 'home-kitchen', description: 'Everyday home goods', parentId: null, sortOrder: 2, createdAt: T0 },
  { id: 'cat-tech', tenantId: 'mock', name: 'Stationery & Tech', slug: 'stationery-tech', description: 'Desk, audio and paper goods', parentId: null, sortOrder: 3, createdAt: T0 },
]

interface SeedProduct {
  id: string
  name: string
  slug: string
  description: string
  price: number
  compareAtPrice?: number
  inventoryCount: number
  sku: string
  categoryId: string
  hues: [number, number]
  weight: number
}

const SEEDS: SeedProduct[] = [
  // --- Apparel ---
  { id: 'p-01', name: 'Classic T-Shirt', slug: 'classic-t-shirt', description: 'A timeless crew-neck tee in heavyweight combed cotton. Pre-shrunk, breathable, and built to outlast trends.', price: 59.9, compareAtPrice: 79.9, inventoryCount: 50, sku: 'TSH-001', categoryId: 'cat-apparel', hues: [210, 240], weight: 0.2 },
  { id: 'p-02', name: 'Linen Shirt', slug: 'linen-shirt', description: 'A relaxed-fit shirt in 100% European linen. Naturally breathable and softer with every wash.', price: 189.9, inventoryCount: 24, sku: 'LNS-002', categoryId: 'cat-apparel', hues: [35, 20], weight: 0.3 },
  { id: 'p-03', name: 'Denim Jacket', slug: 'denim-jacket', description: 'A structured trucker jacket in 12oz raw denim. Ages beautifully with hidden interior pockets.', price: 299.9, inventoryCount: 12, sku: 'DNJ-003', categoryId: 'cat-apparel', hues: [215, 200], weight: 0.8 },
  { id: 'p-04', name: 'Wool Beanie', slug: 'wool-beanie', description: 'A double-layer merino wool beanie. Warm without itch, with a low-profile cuffed fit.', price: 79.9, inventoryCount: 0, sku: 'WBN-004', categoryId: 'cat-apparel', hues: [0, 350], weight: 0.1 },

  // --- Bags & Accessories ---
  { id: 'p-05', name: 'Canvas Tote Bag', slug: 'canvas-tote-bag', description: 'An everyday carryall in 16oz waxed canvas with reinforced straps and an interior zip pocket.', price: 39.9, inventoryCount: 30, sku: 'BAG-001', categoryId: 'cat-bags', hues: [80, 110], weight: 0.3 },
  { id: 'p-06', name: 'Leather Backpack', slug: 'leather-backpack', description: 'Full-grain leather backpack with a padded 15" laptop sleeve, magnetic closures and brass hardware.', price: 549.9, inventoryCount: 8, sku: 'LBP-006', categoryId: 'cat-bags', hues: [25, 15], weight: 1.4 },
  { id: 'p-07', name: 'Leather Card Wallet', slug: 'leather-card-wallet', description: 'A slim six-card wallet in vegetable-tanned leather. RFID-shielded with a center cash slot.', price: 89.9, compareAtPrice: 119.9, inventoryCount: 45, sku: 'LCW-007', categoryId: 'cat-bags', hues: [30, 45], weight: 0.08 },
  { id: 'p-08', name: 'Travel Duffel', slug: 'travel-duffel', description: 'A 40L weekender in ballistic nylon with a trolley sleeve, shoe compartment and detachable strap.', price: 329.9, inventoryCount: 15, sku: 'TDF-008', categoryId: 'cat-bags', hues: [150, 170], weight: 1.1 },

  // --- Home & Kitchen ---
  { id: 'p-09', name: 'Ceramic Coffee Mug', slug: 'ceramic-coffee-mug', description: 'A 350ml stoneware mug with a matte glaze and comfortable wide handle. Dishwasher and microwave safe.', price: 34.9, inventoryCount: 0, sku: 'MUG-001', categoryId: 'cat-home', hues: [190, 210], weight: 0.4 },
  { id: 'p-10', name: 'Scented Soy Candle', slug: 'scented-soy-candle', description: 'Hand-poured soy wax candle with cedar and bergamot notes. 45-hour burn time in a reusable glass jar.', price: 69.9, inventoryCount: 60, sku: 'SSC-010', categoryId: 'cat-home', hues: [45, 30], weight: 0.5 },
  { id: 'p-11', name: 'Bamboo Cutting Board', slug: 'bamboo-cutting-board', description: 'An end-grain bamboo board that is gentle on knives, with a juice groove and inset handles.', price: 119.9, inventoryCount: 22, sku: 'BCB-011', categoryId: 'cat-home', hues: [90, 70], weight: 1.2 },
  { id: 'p-12', name: 'Stoneware Plate Set', slug: 'stoneware-plate-set', description: 'A set of four reactive-glaze dinner plates. Each piece is unique, oven-safe to 220°C.', price: 249.9, inventoryCount: 10, sku: 'SPS-012', categoryId: 'cat-home', hues: [200, 180], weight: 2.4 },

  // --- Stationery & Tech ---
  { id: 'p-13', name: 'Wireless Headphones', slug: 'wireless-headphones', description: 'Over-ear headphones with active noise cancelling, 40-hour battery and multipoint Bluetooth 5.3.', price: 899.9, inventoryCount: 18, sku: 'WHP-013', categoryId: 'cat-tech', hues: [260, 280], weight: 0.35 },
  { id: 'p-14', name: 'Notebook Set', slug: 'notebook-set', description: 'Three A5 dot-grid notebooks with 120gsm paper, lay-flat binding and numbered pages.', price: 29.9, inventoryCount: 80, sku: 'NBS-014', categoryId: 'cat-tech', hues: [330, 310], weight: 0.45 },
  { id: 'p-15', name: 'Bluetooth Speaker', slug: 'bluetooth-speaker', description: 'A pocket-size speaker with surprising low end, IPX7 waterproofing and 14-hour playtime.', price: 199.9, compareAtPrice: 259.9, inventoryCount: 26, sku: 'BTS-015', categoryId: 'cat-tech', hues: [170, 190], weight: 0.3 },
  { id: 'p-16', name: 'Felt Desk Mat', slug: 'felt-desk-mat', description: 'A 80x30cm merino felt desk mat with a cork base. Protects the desk and quiets the keyboard.', price: 99.9, inventoryCount: 34, sku: 'FDM-016', categoryId: 'cat-tech', hues: [220, 230], weight: 0.6 },
]

const CATEGORY_NAME: Record<string, string> = Object.fromEntries(
  MOCK_CATEGORIES.map((c) => [c.id, c.name]),
)

export const MOCK_PRODUCTS: Product[] = SEEDS.map((s, i) => ({
  id: s.id,
  tenantId: 'mock',
  name: s.name,
  slug: s.slug,
  description: s.description,
  price: s.price,
  compareAtPrice: s.compareAtPrice ?? null,
  currency: 'BRL',
  status: 'active',
  inventoryCount: s.inventoryCount,
  sku: s.sku,
  sortOrder: i,
  metadata: {},
  images: [image(s.id, s.name, s.hues[0], s.hues[1])],
  categoryId: s.categoryId,
  categoryName: CATEGORY_NAME[s.categoryId] ?? null,
  isPhysical: true,
  weight: s.weight,
  weightUnit: 'kg',
  // staggered timestamps → deterministic 'newest' sort (p-16 newest)
  createdAt: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
  updatedAt: `2026-01-${String(i + 1).padStart(2, '0')}T12:00:00.000Z`,
}))

export const MOCK_DISCOUNTS: Discount[] = [
  {
    id: 'disc-welcome',
    tenantId: 'mock',
    title: 'Welcome 10%',
    code: 'BEMVINDO10',
    type: 'percentage',
    method: 'code',
    value: 10,
    usageLimit: null,
    oncePerCustomer: false,
    startsAt: T0,
    endsAt: null,
    status: 'active',
    timesUsed: 0,
    createdAt: T0,
    updatedAt: T0,
  },
]

// ---------------------------------------------------------------------------
// buildMockCatalog — terse per-store catalog definition. Generates ids,
// slugs, SVG imagery and staggered timestamps so every store gets a
// deterministic, e2e-stable catalog from a few lines of data.
// ---------------------------------------------------------------------------

export interface CatalogCategoryInput {
  name: string
  description?: string
  image?: string
}

export interface CatalogProductInput {
  name: string
  description: string
  price: number
  compareAtPrice?: number
  inventory: number
  sku: string
  /** Category name — must match one of the categories */
  category: string
  hues?: [number, number]
  weight?: number
  image?: string
}

export interface CatalogInput {
  categories: CatalogCategoryInput[]
  products: CatalogProductInput[]
  /** Percentage discount codes, e.g. [{ code: 'BEMVINDO10', percent: 10 }] */
  discounts?: Array<{ code: string; percent: number; title?: string }>
  currency?: string
}

function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function buildMockCatalog(input: CatalogInput): { products: Product[]; categories: Category[]; discounts: Discount[] } {
  const categories: Category[] = input.categories.map((c, i) => ({
    id: `cat-${slugifyName(c.name)}`,
    tenantId: 'mock',
    name: c.name,
    slug: slugifyName(c.name),
    description: c.description ?? null,
    parentId: null,
    sortOrder: i,
    imageUrl: c.image ?? null,
    createdAt: T0,
  }))
  const byName = Object.fromEntries(categories.map((c) => [c.name, c]))

  const products: Product[] = input.products.map((p, i) => {
    const cat = byName[p.category]
    const id = `p-${String(i + 1).padStart(2, '0')}`
    const hues = p.hues ?? [(i * 47) % 360, (i * 47 + 50) % 360]
    const stamp = `2026-01-${String((i % 27) + 1).padStart(2, '0')}T12:00:00.000Z`
    return {
      id,
      tenantId: 'mock',
      name: p.name,
      slug: slugifyName(p.name),
      description: p.description,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      currency: input.currency ?? 'BRL',
      status: 'active',
      inventoryCount: p.inventory,
      sku: p.sku,
      sortOrder: i,
      metadata: {},
      images: [
        {
          id: `img-${id}-0`,
          productId: id,
          url: p.image ?? svgPlaceholder(p.name, hues[0], hues[1]),
          altText: p.name,
          sortOrder: 0,
          isPrimary: true,
          createdAt: T0,
        },
      ],
      categoryId: cat?.id ?? null,
      categoryName: cat?.name ?? null,
      isPhysical: true,
      weight: p.weight ?? 0.5,
      weightUnit: 'kg',
      createdAt: stamp,
      updatedAt: stamp,
    }
  })

  const discounts: Discount[] = (input.discounts ?? []).map((d, i) => ({
    id: `disc-${slugifyName(d.code)}`,
    tenantId: 'mock',
    title: d.title ?? `${d.percent}% off`,
    code: d.code,
    type: 'percentage',
    method: 'code',
    value: d.percent,
    usageLimit: null,
    oncePerCustomer: false,
    startsAt: T0,
    endsAt: null,
    status: 'active',
    timesUsed: 0,
    createdAt: T0,
    updatedAt: T0,
  }))

  return { products, categories, discounts }
}
