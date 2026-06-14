// Compat wrapper → @fayz-ai/core's unified translator. The shell calls
// `const { t } = useTranslation()`, while @fayz-ai/core returns `t` directly — this
// keeps the `{ t, locale }` shape so shell components resolve from the SAME
// registry the native plugins use (registered by createSaasApp).
import { useTranslation as coreUseTranslation, getCurrentLocale } from '@fayz-ai/core'

export function useTranslation() {
  const t = coreUseTranslation()
  return { t, locale: getCurrentLocale() }
}
