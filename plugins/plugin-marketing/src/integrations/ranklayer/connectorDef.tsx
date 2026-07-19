// RankLayer as a unified ConnectorDefinition, surfaced in Marketing → settings
// → Integrações (rendered by the shared ConnectorsHub). SCAFFOLD: the hub gives
// us the API-key form + Test/Save; the ExtraPanel below explains that automated
// SEO content sync is being prepared. The real sync lands via an external PR —
// see ./RANKLAYER.md.
import React, { useEffect, useState } from 'react'
import { Sparkles, History, CheckCircle2, AlertCircle } from 'lucide-react'
import type { ConnectorDefinition } from '@fayz-ai/core'
import { createRankLayerProvider } from './data/supabase'
import type { RankLayerIntegration, RankLayerSyncLogEntry } from './types'

const provider = createRankLayerProvider()

function RankLayerExtraPanel() {
  const [integration, setIntegration] = useState<RankLayerIntegration | null>(null)
  const [log, setLog] = useState<RankLayerSyncLogEntry[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const found = await provider.getIntegration()
        if (cancelled) return
        setIntegration(found)
        if (found) setLog(await provider.getSyncLog(found.id))
      } catch {
        /* not connected / no client — nothing to show */
      } finally {
        if (!cancelled) setLoaded(true)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!loaded || !integration) return null // nothing until the connection is saved

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-start gap-3 rounded-md border border-dashed p-3">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Sincronização de conteúdo — em breve</h4>
          <p className="text-xs text-muted-foreground">
            A publicação automática de páginas e artigos de SEO com a RankLayer está em preparação.
            {integration.siteDomain ? ` Domínio configurado: ${integration.siteDomain}.` : ''} Assim que a
            integração estiver ativa, o histórico de sincronizações aparece aqui.
          </p>
        </div>
      </div>

      {log.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">Histórico</h4>
          </div>
          <div className="divide-y rounded-md border text-sm">
            {log.map((r) => (
              <div key={r.id} className="flex items-center gap-3 px-3 py-2">
                <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleString('pt-BR')}</span>
                <span className="ml-auto text-xs">{r.written}/{r.fetched} publicadas</span>
                {r.status === 'success'
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  : <AlertCircle className="h-3.5 w-3.5 text-warning" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const ranklayerConnectorDef: ConnectorDefinition = {
  id: 'ranklayer',
  hostPluginId: 'marketing',
  name: 'RankLayer',
  description: 'Publicação de conteúdo e páginas de SEO por serviço/bairro para ser encontrado no Google e em assistentes de IA.',
  icon: 'Search',
  authKind: 'api-key',
  fields: [
    { key: 'apiKey', label: 'API Key', type: 'password', placeholder: '••••••••' },
    { key: 'siteDomain', label: 'Domínio do site', type: 'text', placeholder: 'exemplo.com.br' },
  ],
  async getStatus() {
    try {
      const found = await provider.getIntegration()
      return { connected: !!found?.apiKey, detail: found?.siteDomain }
    } catch {
      return { connected: false }
    }
  },
  testConnection: (values) => provider.testConnection({ apiKey: values.apiKey }),
  saveConnection: async (values) => { await provider.saveIntegration({ apiKey: values.apiKey, siteDomain: values.siteDomain }) },
  disconnect: () => provider.disconnect(),
  ExtraPanel: RankLayerExtraPanel,
}
