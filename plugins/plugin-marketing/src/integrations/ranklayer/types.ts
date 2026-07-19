export interface RankLayerIntegration {
  id: string
  apiKey?: string
  siteDomain?: string
  active: boolean
  lastSyncAt?: string
}

export interface RankLayerSyncLogEntry {
  id: string
  createdAt: string
  status: 'success' | 'partial' | 'error'
  message?: string
  fetched: number
  written: number
}
