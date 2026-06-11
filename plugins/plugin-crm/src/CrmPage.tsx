import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@fayz/ui/primitives'
import { Button } from '@fayz/ui/primitives'

export interface CrmPageProps {
  title?: string
  subtitle?: string
}

export function CrmPage({ title = 'Sales', subtitle = 'CRM, leads, deals, and pipeline management' }: CrmPageProps) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Leads</CardTitle>
            <CardDescription>Track and manage your incoming leads</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">View Leads</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline</CardTitle>
            <CardDescription>Visualize your sales pipeline stages</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">View Pipeline</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quotes</CardTitle>
            <CardDescription>Create and send quotes to prospects</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm">View Quotes</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
