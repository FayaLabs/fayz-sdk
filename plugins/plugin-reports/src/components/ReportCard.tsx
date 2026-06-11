import React from 'react'
import * as LucideIcons from 'lucide-react'
import { Badge } from '@fayz/ui'
import type { ReportDef } from '../types'

interface ReportCardProps {
  report: ReportDef
  onClick: (report: ReportDef) => void
}

export function ReportCard({ report, onClick }: ReportCardProps) {
  const IconComp = (LucideIcons as any)[report.icon] ?? LucideIcons.FileText

  return (
    <button
      type="button"
      onClick={() => onClick(report)}
      className="flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-all hover:border-primary/30 hover:shadow-md"
    >
      <div className="flex w-full items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <IconComp className="h-5 w-5" />
        </div>
        {report.badge && (
          <Badge variant="secondary" className="text-xs capitalize">
            {report.badge}
          </Badge>
        )}
      </div>
      <div>
        <h4 className="font-medium text-sm">{report.name}</h4>
        {report.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{report.description}</p>
        )}
      </div>
    </button>
  )
}
