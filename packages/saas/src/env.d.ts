/**
 * Ambient typing for the Vite-injected env this package reads. The apps that
 * consume @fayz-ai/saas build with Vite (envPrefix VITE_/PUBLIC_), which inlines
 * import.meta.env.* at build time. This package doesn't depend on vite/client,
 * so we declare only the keys we actually touch here.
 */
interface ImportMetaEnv {
  /** Deployment-fixed canonical origin (e.g. https://beauty-saas.live.fayz.ai),
   *  injected by the container. Used to build invite/magic-link redirects. */
  readonly VITE_APP_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
