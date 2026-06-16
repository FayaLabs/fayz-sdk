import React from 'react'
import { Plus, ExternalLink, MousePointerClick, Eye, Globe, Layers, FileText } from 'lucide-react'
import { Button, PageHeaderActions } from '@fayz-ai/ui'

interface Site {
  id: string
  name: string
  type: 'Funnel' | 'Website' | 'Landing page'
  status: 'Published' | 'Draft'
  visits: number
  conversion: number
  accent: string
}

const SITES: Site[] = [
  { id: '1', name: 'Free Consultation Funnel', type: 'Funnel', status: 'Published', visits: 3820, conversion: 12.4, accent: '#6366f1' },
  { id: '2', name: 'Summer Promo Landing', type: 'Landing page', status: 'Published', visits: 1560, conversion: 8.1, accent: '#ec4899' },
  { id: '3', name: 'Agency Website', type: 'Website', status: 'Published', visits: 9240, conversion: 3.2, accent: '#0ea5e9' },
  { id: '4', name: 'Webinar Registration', type: 'Funnel', status: 'Draft', visits: 0, conversion: 0, accent: '#f59e0b' },
  { id: '5', name: 'Lead Magnet — Ebook', type: 'Landing page', status: 'Draft', visits: 0, conversion: 0, accent: '#14b8a6' },
]

const TYPE_ICON = { Funnel: Layers, Website: Globe, 'Landing page': FileText } as const

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" /><span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function SitesHome() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <PageHeaderActions>
        <Button><Plus className="mr-1.5 h-4 w-4" /> New funnel</Button>
      </PageHeaderActions>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={Eye} label="Total visits (30d)" value="14,620" />
        <Stat icon={MousePointerClick} label="Avg. conversion" value="7.1%" />
        <Stat icon={Layers} label="Published funnels" value="3" />
        <Stat icon={FileText} label="Leads captured" value="1,038" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SITES.map((s) => {
          const Icon = TYPE_ICON[s.type]
          return (
            <div key={s.id} className="group overflow-hidden rounded-card border border-border bg-card">
              <div className="flex h-28 items-center justify-center" style={{ backgroundColor: `${s.accent}1a` }}>
                <Icon className="h-8 w-8" style={{ color: s.accent }} />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{s.type}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'Published' ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>{s.status}</span>
                </div>
                <p className="mt-1 text-sm font-semibold text-foreground">{s.name}</p>
                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.visits.toLocaleString()} visits</span>
                  <span>{s.conversion}% conv.</span>
                </div>
                <Button variant="outline" size="sm" className="mt-3 w-full">
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open editor
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Mock preview · the drag-and-drop page builder (block system + public surfaces) ships in a later milestone.
      </p>
    </div>
  )
}
