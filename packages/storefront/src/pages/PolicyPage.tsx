import React from 'react'
import { Link } from '../router'
import { useStorefrontConfig } from '../config'
import { useStorefrontHead } from '../hooks/useStorefrontHead'

const TITLES = {
  privacy: 'Política de Privacidade',
  terms: 'Termos de Uso',
  returns: 'Trocas e Devoluções',
} as const

export type PolicyKind = keyof typeof TITLES

/** Institutional/legal pages. Content comes from config.legal; absent pages show
 *  a placeholder so the routes + footer links exist (no 404) before the store
 *  publishes its policy — a payment-processor / go-live requirement. */
export function PolicyPage({ kind }: { kind: PolicyKind }) {
  const config = useStorefrontConfig()
  const title = TITLES[kind]
  const content = config.legal?.[kind]
  const email = config.footer?.contact?.email
  useStorefrontHead({ title: `${title} — ${config.name}` })

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link to={config.catalogPath} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
        ← Voltar à loja
      </Link>
      <h1 className="sf-heading mt-4 text-3xl font-bold tracking-tight">{title}</h1>
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
        {content ? (
          content.split('\n').filter((line) => line.trim()).map((paragraph, i) => <p key={i}>{paragraph}</p>)
        ) : (
          <>
            <p>O conteúdo desta política ainda será publicado pela loja.</p>
            {email && (
              <p>
                Em caso de dúvidas, fale com a gente em{' '}
                <a href={`mailto:${email}`} className="text-primary underline">{email}</a>.
              </p>
            )}
          </>
        )}
      </div>
    </main>
  )
}
