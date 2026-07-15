import type {
  ContentPlan,
  ContentPlannerProvider,
  ContentPost,
  SocialAccount,
} from './contentTypes'

// ---------------------------------------------------------------------------
// Mock content-planner provider — in-memory CRUD seeded with a realistic
// 8-week clinic plan (2 reels + 1 static per week) so the surface demos well
// without Supabase. Same shape the beauty seed uses in production.
// ---------------------------------------------------------------------------

let counter = 0
const nextId = (prefix: string) => `${prefix}-${++counter}`

const SAMPLE_SCRIPT = `# 5 sinais de que sua queda capilar não é normal

**TEMA:** 5 SINAIS DE QUE SUA QUEDA CAPILAR NÃO É NORMAL
**Formato:** Reel · **Duração:** 45 a 60 segundos

---

## TAKE 1 – GANCHO (0s a 5s)

*Dra. andando até a câmera.*

**Texto na tela:** ⚠️ 5 sinais de alerta

**Fala:** "Seu cabelo está caindo e você não sabe se isso é normal? Existem sinais que merecem atenção."

---

## TAKE 2 – SINAL 1 (5s a 12s)

*Mostrar a Dra. segurando alguns fios de cabelo ou imagem ilustrativa.*

**Texto na tela:** Excesso de fios caindo.

**Fala:** "Primeiro sinal: você percebe muitos fios no travesseiro, no banho ou ao pentear os cabelos."

---

## TAKE 3 – CTA (40s a 60s)

**Fala:** "Se você se identificou com algum desses sinais, agende uma avaliação capilar."

**CTA:** Agende sua avaliação
`

const WEEK_TITLES: Array<[string, string]> = [
  ['5 sinais de que sua queda capilar não é normal', 'Antes e depois de tratamento capilar'],
  ['O que é DHT?', 'Tour pela clínica'],
  ['3 erros que aceleram a calvície', 'Depoimento de paciente'],
  ['Como funciona uma avaliação capilar', 'Mitos sobre queda de cabelo'],
  ['Por que seu tratamento anterior não funcionou?', 'Ozonioterapia para gordura localizada'],
  ['Diferença entre dermatologista e tricologista', 'Caso real de evolução'],
  ['Alopecia feminina explicada', 'Bastidores da clínica'],
  ['Quando procurar ajuda para queda capilar', 'Convite para avaliação gratuita'],
]

function buildSeed() {
  const account: SocialAccount = {
    id: nextId('acc'),
    name: 'Conta demo',
    handle: '@clinica.demo',
    platforms: ['instagram'],
    isActive: true,
  }
  const plan: ContentPlan = {
    id: nextId('plan'),
    accountId: account.id,
    name: 'Plano de conteúdo — 8 semanas',
    status: 'active',
    weeksCount: 8,
    objective: 'Atrair pacientes qualificados para avaliação capilar',
    tone: 'Autoridade acessível — técnica, mas em linguagem simples',
    pillars: ['Educação', 'Autoridade', 'Prova social', 'Bastidores', 'Conversão'],
    formats: ['reel', 'static'],
    weeklyFrequency: 3,
    briefMd: '## Objetivo\n\nPosicionar a especialista como referência em saúde capilar e gerar agendamentos de avaliação.\n\n## Estratégia\n\n- 2 reels educativos/prova social por semana\n- 1 post estático por semana\n- CTA recorrente: agendar avaliação',
  }
  const posts: ContentPost[] = []
  WEEK_TITLES.forEach(([reel1, reel2], i) => {
    const week = i + 1
    posts.push(
      {
        id: nextId('post'), planId: plan.id, weekNumber: week, position: 0,
        title: reel1, format: 'reel', status: week === 1 ? 'script' : 'idea',
        platforms: [], checklist: [], contentMd: week === 1 ? SAMPLE_SCRIPT : '',
      },
      {
        id: nextId('post'), planId: plan.id, weekNumber: week, position: 1,
        title: reel2, format: 'reel', status: 'idea', platforms: [], checklist: [], contentMd: '',
      },
      {
        id: nextId('post'), planId: plan.id, weekNumber: week, position: 2,
        title: 'Estático', format: 'static', status: 'idea', platforms: [], checklist: [], contentMd: '',
      },
    )
  })
  return { accounts: [account], plans: [plan], posts }
}

export function createMockContentPlannerProvider(): ContentPlannerProvider {
  const db = buildSeed()

  return {
    async listAccounts() {
      return [...db.accounts]
    },

    async saveAccount(input) {
      if (input.id) {
        const acc = db.accounts.find((a) => a.id === input.id)
        if (!acc) throw new Error('Account not found')
        Object.assign(acc, {
          name: input.name ?? acc.name,
          handle: input.handle ?? acc.handle,
          platforms: input.platforms ?? acc.platforms,
          isActive: input.isActive ?? acc.isActive,
        })
        return { ...acc }
      }
      const acc: SocialAccount = {
        id: nextId('acc'),
        name: input.name,
        handle: input.handle,
        platforms: input.platforms ?? ['instagram'],
        isActive: input.isActive ?? true,
      }
      db.accounts.push(acc)
      return { ...acc }
    },

    async deleteAccount(id) {
      db.accounts = db.accounts.filter((a) => a.id !== id)
      const planIds = new Set(db.plans.filter((p) => p.accountId === id).map((p) => p.id))
      db.plans = db.plans.filter((p) => p.accountId !== id)
      db.posts = db.posts.filter((p) => !planIds.has(p.planId))
    },

    async listPlans(accountId) {
      return db.plans.filter((p) => p.accountId === accountId).map((p) => ({ ...p }))
    },

    async getPlan(id) {
      const plan = db.plans.find((p) => p.id === id)
      return plan ? { ...plan } : null
    },

    async savePlan(input) {
      if (input.id) {
        const plan = db.plans.find((p) => p.id === input.id)
        if (!plan) throw new Error('Plan not found')
        Object.assign(plan, {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.weeksCount !== undefined && { weeksCount: input.weeksCount }),
          ...(input.startDate !== undefined && { startDate: input.startDate ?? undefined }),
          ...(input.objective !== undefined && { objective: input.objective }),
          ...(input.tone !== undefined && { tone: input.tone }),
          ...(input.pillars !== undefined && { pillars: input.pillars }),
          ...(input.formats !== undefined && { formats: input.formats }),
          ...(input.weeklyFrequency !== undefined && { weeklyFrequency: input.weeklyFrequency }),
          ...(input.briefMd !== undefined && { briefMd: input.briefMd }),
        })
        return { ...plan }
      }
      if (!input.accountId) throw new Error('accountId is required')
      const plan: ContentPlan = {
        id: nextId('plan'),
        accountId: input.accountId,
        name: input.name ?? 'Novo plano',
        status: input.status ?? 'draft',
        weeksCount: input.weeksCount ?? 4,
        startDate: input.startDate ?? undefined,
        objective: input.objective,
        tone: input.tone,
        pillars: input.pillars ?? [],
        formats: input.formats ?? ['reel', 'static'],
        weeklyFrequency: input.weeklyFrequency ?? 3,
        briefMd: input.briefMd ?? '',
      }
      db.plans.push(plan)
      return { ...plan }
    },

    async deletePlan(id) {
      db.plans = db.plans.filter((p) => p.id !== id)
      db.posts = db.posts.filter((p) => p.planId !== id)
    },

    async listPosts(planId) {
      return db.posts
        .filter((p) => p.planId === planId)
        .sort((a, b) => a.weekNumber - b.weekNumber || a.position - b.position)
        .map((p) => ({ ...p }))
    },

    async getPost(id) {
      const post = db.posts.find((p) => p.id === id)
      return post ? { ...post } : null
    },

    async savePost(input) {
      if (input.id) {
        const post = db.posts.find((p) => p.id === input.id)
        if (!post) throw new Error('Post not found')
        Object.assign(post, {
          ...(input.weekNumber !== undefined && { weekNumber: input.weekNumber }),
          ...(input.position !== undefined && { position: input.position }),
          ...(input.title !== undefined && { title: input.title }),
          ...(input.format !== undefined && { format: input.format }),
          ...(input.status !== undefined && { status: input.status }),
          ...(input.scheduledDate !== undefined && { scheduledDate: input.scheduledDate ?? undefined }),
          ...(input.platforms !== undefined && { platforms: input.platforms }),
          ...(input.checklist !== undefined && { checklist: input.checklist }),
          ...(input.mediaUrl !== undefined && { mediaUrl: input.mediaUrl ?? undefined }),
          ...(input.hook !== undefined && { hook: input.hook }),
          ...(input.cta !== undefined && { cta: input.cta }),
          ...(input.contentMd !== undefined && { contentMd: input.contentMd }),
        })
        return { ...post }
      }
      if (!input.planId) throw new Error('planId is required')
      const week = input.weekNumber ?? 1
      const siblings = db.posts.filter((p) => p.planId === input.planId && p.weekNumber === week)
      const post: ContentPost = {
        id: nextId('post'),
        planId: input.planId,
        weekNumber: week,
        position: input.position ?? siblings.length,
        title: input.title ?? '',
        format: input.format ?? 'reel',
        status: input.status ?? 'idea',
        scheduledDate: input.scheduledDate ?? undefined,
        platforms: input.platforms ?? [],
        checklist: input.checklist ?? [],
        mediaUrl: input.mediaUrl ?? undefined,
        hook: input.hook,
        cta: input.cta,
        contentMd: input.contentMd ?? '',
      }
      db.posts.push(post)
      return { ...post }
    },

    async deletePost(id) {
      db.posts = db.posts.filter((p) => p.id !== id)
    },
  }
}
