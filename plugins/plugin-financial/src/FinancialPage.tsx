import React from 'react'
import { Card } from '@fayz/ui/primitives'

export const FinancialPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Financial</h1>
        <p className="text-sm text-muted-foreground mt-1">Financial overview and cash flow management</p>
      </div>
      <Card className="flex items-center justify-center h-96 text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <span className="text-5xl" role="img" aria-label="money">💰</span>
          <span className="text-lg font-medium">Financial Overview</span>
          <span className="text-sm text-center max-w-xs">
            Revenue summary, payables, receivables, and cash flow will render here.
          </span>
        </div>
      </Card>
    </div>
  )
}
