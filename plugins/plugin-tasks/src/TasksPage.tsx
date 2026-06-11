import React from 'react'

export interface TasksPageProps {
  config?: {
    labels?: {
      drawerTitle?: string
    }
  }
}

export function TasksPage({ config }: TasksPageProps) {
  const title = config?.labels?.drawerTitle ?? 'Tasks'

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 600, margin: 0 }}>{title}</h1>
        <p style={{ color: '#6b7280', margin: '4px 0 0' }}>Manage your team tasks</p>
      </div>
      <div style={{ padding: '32px', border: '1px dashed #d1d5db', borderRadius: '8px', textAlign: 'center', color: '#9ca3af' }}>
        Tasks plugin — full UI available in saas-core
      </div>
    </div>
  )
}
