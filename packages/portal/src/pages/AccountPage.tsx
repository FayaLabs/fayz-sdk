import React from 'react'
import { useMemberSession } from '../session'
import { signOutMember } from '../auth'
import { navigateTo } from '../router'

export function AccountPage() {
  const session = useMemberSession()

  if (!session.customerId) {
    navigateTo('/')
    return null
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10 sm:px-6">
      <h1 className="mb-6 text-2xl font-bold text-foreground">Minha conta</h1>
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <Row label="Nome" value={session.name || '—'} />
        <Row label="E-mail" value={session.email || '—'} />
        <button
          data-testid="account-signout"
          onClick={() => { void signOutMember(); navigateTo('/') }}
          className="mt-2 rounded-md border border-border bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
        >
          Sair
        </button>
      </div>
    </main>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}
