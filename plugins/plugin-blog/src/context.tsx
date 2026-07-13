import { createContext, useContext, type ReactNode } from 'react'
import type { BlogDataProvider } from './data/types'
import type { ResolvedBlogConfig } from './config'

export interface BlogContextValue {
  provider: BlogDataProvider
  config: ResolvedBlogConfig
}

const BlogContext = createContext<BlogContextValue | null>(null)

export function BlogProvider({ value, children }: { value: BlogContextValue; children: ReactNode }) {
  return <BlogContext.Provider value={value}>{children}</BlogContext.Provider>
}

/** Read the blog provider + config. Throws if used outside a BlogProvider. */
export function useBlogContext(): BlogContextValue {
  const ctx = useContext(BlogContext)
  if (!ctx) {
    throw new Error('[plugin-blog] useBlogContext must be used within <BlogProvider>. Mount the plugin Provider at the app root.')
  }
  return ctx
}
