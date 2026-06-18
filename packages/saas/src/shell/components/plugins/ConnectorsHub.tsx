import React, { useCallback, useEffect, useState } from 'react'
import { Plug, CheckCircle2, Loader2, ChevronDown, Power } from 'lucide-react'
import { Button, ICON_MAP } from '@fayz-ai/ui'
import type { ConnectorDefinition, ConnectorStatus } from '@fayz-ai/core'
import { useTranslation } from '../../hooks/useTranslation'
import { toast } from '../notifications/ToastProvider'

// ---------------------------------------------------------------------------
// Connectors hub — the ONE unified setup experience every connector uses.
//
// An addon plugin contributes a ConnectorDefinition; the host plugin's settings
// render this hub in its "Integrations" tab. Credential connectors (api-key /
// mtls) get a declarative form (Test / Save); OAuth connectors get a Connect
// button. Each connector's own extras (import statement, sync now, history) come
// from its `ExtraPanel`. Adding a new connector needs no change here.
// ---------------------------------------------------------------------------

function ConnectorCard({ connector }: { connector: ConnectorDefinition }) {
  const { t } = useTranslation()
  const [status, setStatus] = useState<ConnectorStatus | null>(null)
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [testing, setTesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [oauthing, setOauthing] = useState(false)

  const loadStatus = useCallback(async () => {
    try { setStatus(await connector.getStatus()) } catch { setStatus({ connected: false }) }
  }, [connector])

  useEffect(() => { void loadStatus() }, [loadStatus])

  const connected = !!status?.connected
  const Icon = connector.icon ? (ICON_MAP[connector.icon] ?? Plug) : Plug

  async function handleTest() {
    if (!connector.testConnection) return
    setTesting(true)
    try {
      const res = await connector.testConnection(values)
      res.ok ? toast.success(res.message ?? t('connectors.connected')) : toast.error(res.message ?? t('common.error'))
    } catch (e: any) { toast.error(e?.message ?? t('common.error')) }
    finally { setTesting(false) }
  }

  async function handleSave() {
    if (!connector.saveConnection) return
    setSaving(true)
    try {
      await connector.saveConnection(values)
      toast.success(t('connectors.save'))
      await loadStatus()
    } catch (e: any) { toast.error(e?.message ?? t('common.error')) }
    finally { setSaving(false) }
  }

  async function handleConnectOAuth() {
    if (!connector.startOAuth) return
    setOauthing(true)
    try { window.location.href = await connector.startOAuth(window.location.href) }
    catch (e: any) { toast.error(e?.message ?? t('common.error')); setOauthing(false) }
  }

  async function handleDisconnect() {
    if (!connector.disconnect) return
    try { await connector.disconnect(); toast.success(t('connectors.disconnect')); await loadStatus() }
    catch (e: any) { toast.error(e?.message ?? t('common.error')) }
  }

  const ExtraPanel = connector.ExtraPanel

  return (
    <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{connector.name}</p>
          {connector.description && <p className="text-[11px] text-muted-foreground truncate">{connector.description}</p>}
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] shrink-0 ${connected ? 'text-success' : 'text-muted-foreground'}`}>
          {connected
            ? <><CheckCircle2 className="h-3.5 w-3.5" /> {t('connectors.connected')}</>
            : t('connectors.notConnected')}
        </span>
        <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t px-4 py-4 space-y-4">
          {/* Connect panel — credentials form OR OAuth */}
          {connector.authKind === 'oauth' ? (
            <div className="flex items-center gap-2">
              <Button onClick={handleConnectOAuth} disabled={oauthing}>
                {oauthing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plug className="h-4 w-4" />}
                {connected ? t('connectors.connected') : `${t('connectors.connect')} ${connector.name}`}
              </Button>
              {connected && connector.disconnect && (
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Power className="h-3.5 w-3.5" /> {t('connectors.disconnect')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                {(connector.fields ?? []).map((f) => (
                  <label key={f.key} className="block">
                    <span className="text-xs font-medium text-muted-foreground">{f.label}</span>
                    <input
                      type={f.type}
                      value={values[f.key] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full mt-1 rounded-input border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </label>
                ))}
              </div>
              <div className="flex gap-2">
                {connector.testConnection && (
                  <Button variant="outline" size="sm" onClick={handleTest} disabled={testing}>
                    {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5" />} {t('connectors.test')}
                  </Button>
                )}
                {connector.saveConnection && (
                  <Button size="sm" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} {t('connectors.save')}
                  </Button>
                )}
                {connected && connector.disconnect && (
                  <Button variant="outline" size="sm" onClick={handleDisconnect}>
                    <Power className="h-3.5 w-3.5" /> {t('connectors.disconnect')}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Connector-specific extras (import / sync / history) */}
          {ExtraPanel && <div className="pt-1"><ExtraPanel /></div>}
        </div>
      )}
    </div>
  )
}

export function ConnectorsHub({ connectors }: { connectors: ConnectorDefinition[] }) {
  const { t } = useTranslation()
  if (!connectors || connectors.length === 0) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{t('connectors.empty')}</p>
  }
  return (
    <div className="space-y-3 max-w-3xl">
      {connectors.map((c) => <ConnectorCard key={c.id} connector={c} />)}
    </div>
  )
}
