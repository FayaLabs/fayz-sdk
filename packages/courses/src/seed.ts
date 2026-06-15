import type { Course, Module, Lesson } from './types'

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
}

/** Build a deterministic CourseCatalog from a terse declarative seed. */
export function buildCourseCatalog(input: CourseSeedInput[]): CourseCatalog {
  const courses: Course[] = []
  const modules: Module[] = []
  const lessons: Lesson[] = []

  input.forEach((c, ci) => {
    const courseId = `course-${String(ci + 1).padStart(2, '0')}`
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

  return { courses, modules, lessons }
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
