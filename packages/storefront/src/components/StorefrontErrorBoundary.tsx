import React from 'react'

interface Props {
  children: React.ReactNode
}

interface State {
  error: Error | null
}

/**
 * Catches render/runtime errors in the storefront tree so a single thrown
 * error (e.g. a provider failure) shows a recoverable fallback instead of a
 * blank white screen. Key it by route to auto-clear on navigation.
 */
export class StorefrontErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('[storefront] render error:', error, info.componentStack)
  }

  render(): React.ReactNode {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
        <h1 className="sf-heading text-xl font-semibold">Algo deu errado</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocorreu um erro ao carregar esta parte da loja. Tente recarregar a página.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Recarregar
          </button>
          <a href="#/" className="rounded-lg border px-5 py-2.5 text-sm font-semibold transition hover:bg-muted">
            Voltar ao início
          </a>
        </div>
      </div>
    )
  }
}
