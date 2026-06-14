import React from 'react'
import { useMemberConfig } from '../config'
import { useMemberSession } from '../session'
import { signOutMember } from '../auth'
import { Link, navigateTo } from '../router'

export function MemberHeader() {
  const config = useMemberConfig()
  const session = useMemberSession()
  const [menuOpen, setMenuOpen] = React.useState(false)

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 font-bold text-foreground" data-testid="member-logo">
          {config.logoUrl ? (
            <img src={config.logoUrl} alt={config.name} className="h-7" />
          ) : (
            <span>{config.name}</span>
          )}
        </Link>

        {session.customerId ? (
          <div className="relative">
            <button
              data-testid="member-usermenu"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                {(session.email ?? '?').charAt(0).toUpperCase()}
              </span>
              <span className="hidden sm:inline">{session.name || session.email}</span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                <button
                  onClick={() => { setMenuOpen(false); navigateTo('/account') }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                >
                  Minha conta
                </button>
                <button
                  data-testid="member-header-signout"
                  onClick={() => { setMenuOpen(false); void signOutMember(); navigateTo('/') }}
                  className="block w-full px-4 py-2.5 text-left text-sm text-foreground hover:bg-muted"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </header>
  )
}
