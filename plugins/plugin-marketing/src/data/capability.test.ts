// Capability test for the marketing analytics data slice (mock provider) —
// template: plugin-tasks/src/data/capability.test.ts. The Supabase provider
// implements the same MarketingDataProvider interface against
// plg_marketing_channels/_campaigns + v_marketing_attribution.
import { describe, it, expect } from 'vitest'
import { createMockMarketingProvider } from './mock'
import { MARKETING_PRESETS } from '../presets'

function makeProvider() {
  const preset = MARKETING_PRESETS.beauty
  return createMockMarketingProvider({
    channels: preset.channels,
    conversion: preset.conversion,
    domain: 'beauty',
  })
}

describe('plugin-marketing capability · analytics slice (mock provider)', () => {
  it('reports per-channel performance for every configured channel', async () => {
    const provider = makeProvider()
    const perf = await provider.channelPerformance({ range: '30d' })
    expect(perf.map((c) => c.channelId).sort()).toEqual(
      MARKETING_PRESETS.beauty.channels.map((c) => c.id).sort(),
    )
    for (const c of perf) {
      expect(c.conversions).toBeGreaterThanOrEqual(0)
      expect(c.cvr).toBeGreaterThanOrEqual(0)
    }
  })

  it('overview aggregates the same channels the mix reports', async () => {
    const provider = makeProvider()
    const overview = await provider.overview({ range: '30d' })
    expect(overview.channelMix.length).toBe(MARKETING_PRESETS.beauty.channels.length)
    expect(overview.conversions).toBe(
      overview.channelMix.reduce((s, c) => s + c.conversions, 0),
    )
    expect(overview.topChannelId).toBeTruthy()
  })

  it('persists a created campaign: it surfaces in list and get', async () => {
    const provider = makeProvider()
    const created = await provider.saveCampaign({
      name: 'Campanha Teste',
      channelId: 'instagram',
      status: 'active',
      start: new Date('2026-07-01').toISOString(),
      spend: 150,
    })
    expect(created.id).toBeTruthy()

    const listed = await provider.listCampaigns({ range: '30d' })
    expect(listed.some((c) => c.id === created.id)).toBe(true)

    const fetched = await provider.getCampaign(created.id)
    expect(fetched?.name).toBe('Campanha Teste')
    expect(fetched?.channelId).toBe('instagram')
  })

  it('round-trips update and delete', async () => {
    const provider = makeProvider()
    const created = await provider.saveCampaign({
      name: 'temp',
      channelId: 'google',
      status: 'draft',
      start: new Date('2026-07-01').toISOString(),
      spend: 0,
    })

    const updated = await provider.saveCampaign({
      id: created.id,
      name: 'temp',
      channelId: 'google',
      status: 'paused',
      start: created.start,
      spend: 80,
    })
    expect(updated.status).toBe('paused')

    await provider.deleteCampaign(created.id)
    expect(await provider.getCampaign(created.id)).toBeNull()
  })

  it('funnel stages end on the vertical conversion label', async () => {
    const provider = makeProvider()
    const funnel = await provider.funnel({ range: '30d' })
    expect(funnel.length).toBeGreaterThanOrEqual(2)
    expect(funnel[funnel.length - 1].label).toBe(
      MARKETING_PRESETS.beauty.conversion.labelPlural,
    )
  })
})
