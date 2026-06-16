import { useEffect } from 'react'

/**
 * Minimal per-route head manager: sets document.title and meta description so
 * each storefront page (product, catalog, account, checkout) has its own title
 * and shareable description instead of one static SPA title. A real SSR/prerender
 * pass (M12) layers OG/canonical on top; this covers the client-rendered baseline.
 */
export function useStorefrontHead(input: { title?: string; description?: string | null }): void {
  const { title, description } = input
  useEffect(() => {
    if (title) document.title = title
  }, [title])

  useEffect(() => {
    if (!description) return
    let tag = document.head.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', description.slice(0, 160))
  }, [description])
}
