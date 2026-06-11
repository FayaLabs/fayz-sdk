import React from 'react'
import { Card } from '@fayz/ui/primitives'

export const AgendaPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agenda</h1>
        <p className="text-sm text-muted-foreground mt-1">Calendar and appointment management</p>
      </div>
      <Card className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl" role="img" aria-label="calendar">📅</span>
          <span className="text-lg font-medium">Agenda</span>
          <span className="text-sm text-center max-w-xs">
            Calendar view and appointment scheduling will render here.
          </span>
        </div>
      </Card>
    </div>
  )
}
