import React from 'react'

export interface InventoryPageProps {
  config?: {
    labels?: {
      pageTitle?: string
      pageSubtitle?: string
    }
  }
}

export function InventoryPage({ config }: InventoryPageProps) {
  const title = config?.labels?.pageTitle ?? 'Inventory'
  const subtitle = config?.labels?.pageSubtitle ?? 'Product catalog and stock management'

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>{title}</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0' }}>{subtitle}</p>
      </div>
      <div style={{ padding: '32px', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
        Inventory plugin — full UI available in saas-core
      </div>
    </div>
  )
}
