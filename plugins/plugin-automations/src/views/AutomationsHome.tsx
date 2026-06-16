import React from 'react'
import { Zap, Plus, Play, Pause, ArrowRight, Filter, Mail, Tag, MessageSquare, Clock } from 'lucide-react'
import { Button, PageHeaderActions } from '@fayz-ai/ui'

interface Workflow {
  id: string
  name: string
  trigger: string
  steps: Array<{ icon: React.ComponentType<{ className?: string }>; label: string }>
  enrolled: number
  active: boolean
}

const WORKFLOWS: Workflow[] = [
  {
    id: '1', name: 'New lead → nurture', trigger: 'Form submitted', enrolled: 342, active: true,
    steps: [
      { icon: MessageSquare, label: 'Send SMS' },
      { icon: Clock, label: 'Wait 1 day' },
      { icon: Mail, label: 'Send email' },
      { icon: Tag, label: 'Tag "nurtured"' },
    ],
  },
  {
    id: '2', name: 'Missed call text-back', trigger: 'Call missed', enrolled: 128, active: true,
    steps: [
      { icon: MessageSquare, label: 'Text back' },
      { icon: Tag, label: 'Create task' },
    ],
  },
  {
    id: '3', name: 'Appointment reminder', trigger: 'Appointment booked', enrolled: 87, active: true,
    steps: [
      { icon: Clock, label: 'Wait until 24h before' },
      { icon: MessageSquare, label: 'WhatsApp reminder' },
    ],
  },
  {
    id: '4', name: 'Won deal → review request', trigger: 'Deal marked Won', enrolled: 41, active: false,
    steps: [
      { icon: Clock, label: 'Wait 2 days' },
      { icon: Mail, label: 'Ask for review' },
    ],
  },
]

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  )
}

export function AutomationsHome() {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <PageHeaderActions>
        <Button><Plus className="mr-1.5 h-4 w-4" /> New workflow</Button>
      </PageHeaderActions>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active workflows" value="3" />
        <Stat label="Contacts enrolled" value="598" />
        <Stat label="Actions run (30d)" value="2,140" />
        <Stat label="Success rate" value="98.6%" />
      </div>

      <div className="mt-6 space-y-3">
        {WORKFLOWS.map((w) => (
          <div key={w.id} className="rounded-card border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                  <Zap className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{w.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Filter className="h-3 w-3" /> When: {w.trigger} · {w.enrolled} enrolled
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${w.active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'}`}>
                  {w.active ? 'Active' : 'Paused'}
                </span>
                <Button variant="outline" size="icon">{w.active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}</Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-muted/40 p-3">
              {w.steps.map((s, i) => (
                <React.Fragment key={i}>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground">
                    <s.icon className="h-3.5 w-3.5 text-muted-foreground" /> {s.label}
                  </span>
                  {i < w.steps.length - 1 && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Mock preview · the visual builder + execution engine (event bus, scheduler) ships in a later milestone.
      </p>
    </div>
  )
}
