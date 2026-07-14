import type {
  Course, Module, Lesson,
  Offer, Order, Subscription, Payout, PaymentMethod,
} from './types'

// Deterministic placeholder thumbnail (gradient SVG data-URI, no network).
function thumb(label: string, hue: number): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="hsl(${hue},65%,55%)"/>` +
    `<stop offset="1" stop-color="hsl(${(hue + 40) % 360},65%,40%)"/>` +
    `</linearGradient></defs><rect width="640" height="360" fill="url(#g)"/>` +
    `<text x="32" y="320" fill="white" font-family="system-ui" font-size="40" font-weight="700">${label}</text>` +
    `</svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const YT = (id: string) => `https://www.youtube.com/embed/${id}`
const t0 = '2026-01-01T00:00:00.000Z'

// ---------------------------------------------------------------------------
// Course seed — a tiny education catalog the admin manages and the member area
// plays. Both apps start from this so admin↔member look consistent.
// ---------------------------------------------------------------------------

export interface CourseSeedInput {
  slug: string
  title: string
  subtitle?: string
  description?: string
  price?: number
  hue?: number
  modules: Array<{
    title: string
    lessons: Array<{ title: string; description?: string; youtubeId: string; durationSec?: number }>
  }>
}

export interface CourseCatalog {
  courses: Course[]
  modules: Module[]
  lessons: Lesson[]
  /** One default one-time offer per course, plus a recurring "club" offer on the first. */
  offers: Offer[]
}

/** Build a deterministic CourseCatalog from a terse declarative seed. */
export function buildCourseCatalog(input: CourseSeedInput[]): CourseCatalog {
  const courses: Course[] = []
  const modules: Module[] = []
  const lessons: Lesson[] = []
  const offers: Offer[] = []

  input.forEach((c, ci) => {
    const courseId = `course-${String(ci + 1).padStart(2, '0')}`
    const price = c.price ?? 197
    // Default one-time offer (the course's headline price).
    offers.push({
      id: `${courseId}-offer-01`,
      courseId,
      name: c.title,
      price,
      currency: 'BRL',
      kind: 'one_time',
      recurringInterval: null,
      isDefault: true,
      isOrderBump: false,
      sortOrder: 0,
    })
    // The first course also ships a recurring "club" offer + an order-bump, to
    // exercise subscriptions and bumps (mirrors Kiwify's multi-offer product).
    if (ci === 0) {
      offers.push({
        id: `${courseId}-offer-02`,
        courseId,
        name: `${c.title} + Club (mensal)`,
        price: Math.round(price * 0.24 * 100) / 100,
        currency: 'BRL',
        kind: 'subscription',
        recurringInterval: 'month',
        isDefault: false,
        isOrderBump: false,
        sortOrder: 1,
      })
      offers.push({
        id: `${courseId}-offer-03`,
        courseId,
        name: 'Templates & Bônus (order-bump)',
        price: 47,
        currency: 'BRL',
        kind: 'one_time',
        recurringInterval: null,
        isDefault: false,
        isOrderBump: true,
        sortOrder: 2,
      })
    }
    courses.push({
      id: courseId,
      slug: c.slug,
      title: c.title,
      subtitle: c.subtitle ?? null,
      description: c.description ?? null,
      thumbnailUrl: thumb(c.title, c.hue ?? (ci * 70) % 360),
      price: c.price ?? 197,
      currency: 'BRL',
      status: 'published',
      sortOrder: ci,
      createdAt: t0,
      updatedAt: t0,
    })
    c.modules.forEach((m, mi) => {
      const moduleId = `${courseId}-m${String(mi + 1).padStart(2, '0')}`
      modules.push({ id: moduleId, courseId, title: m.title, sortOrder: mi })
      m.lessons.forEach((l, li) => {
        lessons.push({
          id: `${moduleId}-l${String(li + 1).padStart(2, '0')}`,
          courseId,
          moduleId,
          title: l.title,
          description: l.description ?? null,
          videoUrl: YT(l.youtubeId),
          durationSec: l.durationSec ?? 600,
          sortOrder: li,
        })
      })
    })
  })

  return { courses, modules, lessons, offers }
}

// ---------------------------------------------------------------------------
// Demo commerce ledger — deterministic sample orders/subscriptions/payouts so
// the Sales, Subscriptions, Financial and dashboard surfaces have data on first
// run (mock layer only; a real backend fills these from Stripe webhooks).
// ---------------------------------------------------------------------------

export interface DemoLedger {
  orders: Order[]
  subscriptions: Subscription[]
  payouts: Payout[]
}

/** Platform markup applied to demo sales (5% = 500 bps). Mirrors CreatorAccount. */
export const DEMO_PLATFORM_FEE_BPS = 500

// Days offset from t0, so dates are deterministic (no Date.now()).
function daysFromBase(days: number): string {
  return new Date(Date.parse(t0) + days * 86_400_000).toISOString()
}

const DEMO_BUYERS: Array<{ name: string; email: string }> = [
  { name: 'William Ribeiro', email: 'william@example.com' },
  { name: 'Alan Brancalhão', email: 'alan@example.com' },
  { name: 'Luciano Rufatto', email: 'luciano@example.com' },
  { name: 'Gabriel Boni', email: 'gabriel@example.com' },
  { name: 'Leonardo Lorenzoni', email: 'leonardo@example.com' },
]
const DEMO_METHODS: PaymentMethod[] = ['pix', 'card', 'boleto']

function feeFor(total: number): number {
  return Math.round((total * DEMO_PLATFORM_FEE_BPS) / 10000 * 100) / 100
}

/** Build a deterministic ledger from a catalog's default (one-time) offers. */
export function buildDemoLedger(catalog: CourseCatalog): DemoLedger {
  const orders: Order[] = []
  const subscriptions: Subscription[] = []
  const oneTime = catalog.offers.filter((o) => o.kind === 'one_time' && !o.isOrderBump)

  oneTime.forEach((offer, oi) => {
    // 3 paid sales per course, spread across buyers/methods/dates.
    for (let i = 0; i < 3; i++) {
      const buyer = DEMO_BUYERS[(oi * 3 + i) % DEMO_BUYERS.length]
      const total = offer.price
      const platformFee = feeFor(total)
      orders.push({
        id: `order-${offer.courseId}-${String(i + 1).padStart(2, '0')}`,
        courseId: offer.courseId,
        offerId: offer.id,
        customerId: `cust-${buyer.email}`,
        customerName: buyer.name,
        customerEmail: buyer.email,
        currency: offer.currency,
        total,
        platformFee,
        netValue: Math.round((total - platformFee) * 100) / 100,
        paymentMethod: DEMO_METHODS[(oi + i) % DEMO_METHODS.length],
        financialStatus: 'paid',
        stripePaymentIntentId: null,
        createdAt: daysFromBase(160 + oi * 7 + i * 2),
      })
    }
  })

  // Two active subscriptions on the first course's recurring offer.
  const sub = catalog.offers.find((o) => o.kind === 'subscription')
  if (sub) {
    for (let i = 0; i < 2; i++) {
      const buyer = DEMO_BUYERS[(3 + i) % DEMO_BUYERS.length]
      subscriptions.push({
        id: `sub-${sub.courseId}-${String(i + 1).padStart(2, '0')}`,
        courseId: sub.courseId,
        offerId: sub.id,
        customerId: `cust-${buyer.email}`,
        customerName: buyer.name,
        customerEmail: buyer.email,
        currency: sub.currency,
        netValue: Math.round((sub.price - feeFor(sub.price)) * 100) / 100,
        interval: sub.recurringInterval ?? 'month',
        status: 'active',
        stripeSubscriptionId: null,
        startedAt: daysFromBase(150 + i * 2),
        canceledAt: null,
      })
    }
  }

  // A few successful payouts.
  const payouts: Payout[] = [200, 216.33, 196.33, 801.33].map((amount, i) => ({
    id: `payout-${String(i + 1).padStart(2, '0')}`,
    amount,
    currency: 'BRL',
    status: 'paid',
    createdAt: daysFromBase(120 + i * 20),
  }))

  return { orders, subscriptions, payouts }
}

/** Default seed shared by both example apps. */
export const DEFAULT_COURSE_CATALOG: CourseCatalog = buildCourseCatalog([
  {
    slug: 'react-do-zero',
    title: 'React do Zero ao Profissional',
    subtitle: 'Construa interfaces modernas com React',
    description: 'Do básico de componentes a hooks avançados e padrões de produção.',
    price: 297,
    hue: 210,
    modules: [
      {
        title: 'Fundamentos',
        lessons: [
          { title: 'Boas-vindas e setup', youtubeId: 'aqz-KE-bpKQ', durationSec: 420 },
          { title: 'JSX e componentes', youtubeId: 'LXb3EKWsInQ', durationSec: 720 },
        ],
      },
      {
        title: 'Hooks',
        lessons: [
          { title: 'useState e useEffect', youtubeId: 'jNQXAC9IVRw', durationSec: 900 },
          { title: 'Hooks customizados', youtubeId: 'aqz-KE-bpKQ', durationSec: 840 },
        ],
      },
    ],
  },
  {
    slug: 'design-de-produto',
    title: 'Design de Produto na Prática',
    subtitle: 'Do problema ao protótipo validado',
    description: 'Pesquisa, fluxos, wireframes e testes de usabilidade.',
    price: 247,
    hue: 320,
    modules: [
      {
        title: 'Descoberta',
        lessons: [
          { title: 'Entrevistas com usuários', youtubeId: 'LXb3EKWsInQ', durationSec: 660 },
          { title: 'Mapeando jornadas', youtubeId: 'jNQXAC9IVRw', durationSec: 540 },
        ],
      },
    ],
  },
  {
    slug: 'marketing-digital',
    title: 'Marketing Digital para Criadores',
    subtitle: 'Audiência, conteúdo e conversão',
    description: 'Estratégias de tráfego, funil e lançamentos.',
    price: 197,
    hue: 30,
    modules: [
      {
        title: 'Fundamentos',
        lessons: [
          { title: 'Posicionamento', youtubeId: 'aqz-KE-bpKQ', durationSec: 480 },
          { title: 'Criando conteúdo que converte', youtubeId: 'LXb3EKWsInQ', durationSec: 600 },
        ],
      },
    ],
  },
])

/** Default demo ledger shared by the mock provider (sales/subscriptions/payouts). */
export const DEFAULT_DEMO_LEDGER: DemoLedger = buildDemoLedger(DEFAULT_COURSE_CATALOG)
