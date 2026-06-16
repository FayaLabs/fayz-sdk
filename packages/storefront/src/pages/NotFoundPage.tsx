import React from 'react'
import { Link } from '../router'
import { useStorefrontConfig } from '../config'
import { useStorefrontHead } from '../hooks/useStorefrontHead'

/** Fallback for unknown routes. Previously these silently rendered the home/catalog page with a 200. */
export function NotFoundPage() {
  const config = useStorefrontConfig()
  useStorefrontHead({ title: `Página não encontrada — ${config.name}` })
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-16 text-center">
      <p className="sf-heading text-5xl font-bold tracking-tight text-primary">404</p>
      <h1 className="mt-3 text-xl font-semibold">Página não encontrada</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        O endereço que você tentou acessar não existe ou foi movido.
      </p>
      <Link
        to={config.catalogPath}
        className="mt-6 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Ir para a loja
      </Link>
    </main>
  )
}
