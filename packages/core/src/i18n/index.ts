import * as React from 'react'
import { shellTranslations } from './shell-translations'

export interface I18nConfig {
  defaultLocale: string
  supported: string[]
  translations: Record<string, Record<string, string>>
}

const I18nContext = React.createContext<I18nConfig>({
  defaultLocale: 'en',
  supported: ['en'],
  translations: {},
})

export const I18nProvider = I18nContext.Provider

export function useI18nConfig(): I18nConfig {
  return React.useContext(I18nContext)
}

export function useTranslation(): (key: string, params?: Record<string, string | number>) => string {
  const config = React.useContext(I18nContext)
  const localeStore = useLocaleStore()
  const locale = localeStore.locale

  return React.useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const localizedTranslations = config.translations[locale] ?? {}
      const fallback = config.translations[config.defaultLocale] ?? {}
      // Global fallback lets plugins register their locales independently of any
      // I18nProvider — needed when a de-bridged plugin runs under a host shell
      // that doesn't mount @fayz-ai/core's I18nProvider (incremental de-bridge), and
      // for manifest apps where plugins self-register translations.
      const gLocale = _globalTranslations[locale] ?? {}
      const gFallback = _globalTranslations[config.defaultLocale] ?? {}
      let raw = localizedTranslations[key] ?? gLocale[key] ?? fallback[key] ?? gFallback[key] ?? key

      if (params) {
        for (const [k, v] of Object.entries(params)) {
          raw = raw.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
        }
      }
      return raw
    },
    [config, locale],
  )
}

// Minimal locale store (avoids circular dep with stores package)
interface LocaleStore {
  locale: string
  setLocale: (locale: string) => void
}

let _localeStore: LocaleStore = {
  locale: 'en',
  setLocale: (l) => { _localeStore.locale = l },
}

export function setLocaleStore(store: LocaleStore): void {
  _localeStore = store
}

function useLocaleStore(): LocaleStore {
  const [, rerender] = React.useReducer((n: number) => n + 1, 0)
  React.useEffect(() => {
    const prev = _localeStore.setLocale
    _localeStore.setLocale = (l) => {
      prev(l)
      rerender()
    }
    return () => { _localeStore.setLocale = prev }
  }, [])
  return _localeStore
}

export function getCurrentLocale(): string {
  return _localeStore.locale
}

export function setCurrentLocale(locale: string): void {
  _localeStore.setLocale(locale)
}

// Core built-in translations
export const coreTranslations: Record<string, Record<string, string>> = {
  en: {
    'common.save': 'Save',
    'common.saveChanges': 'Save Changes',
    'common.saving': 'Saving...',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.close': 'Close',
    'common.confirm': 'Confirm',
    'common.discard': 'Discard',
    'common.back': 'Back',
    'common.formIncomplete': 'Fill in the required fields before saving.',
    'connectors.title': 'Integrations',
    'connectors.subtitle': 'Connect external providers to this module.',
    'connectors.connected': 'Connected',
    'connectors.notConnected': 'Not connected',
    'connectors.connect': 'Connect',
    'connectors.disconnect': 'Disconnect',
    'connectors.test': 'Test',
    'connectors.save': 'Save connection',
    'connectors.testing': 'Testing…',
    'connectors.saving': 'Saving…',
    'connectors.empty': 'No integrations available for this module yet.',
    'connectors.configure': 'Configure',
    'saveBar.unsaved': 'Unsaved changes',
    'common.add': 'Add',
    'common.loading': 'Loading...',
    'common.error': 'Something went wrong',
    'common.noResults': 'No results found.',
    'common.search': 'Search',
    'common.actions': 'Actions',
    'common.continue': 'Continue',
    'common.done': 'Done',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.active': 'Active',
    'common.inactive': 'Inactive',
    'common.overview': 'Overview',
    'common.settings': 'Settings',
    'common.plugins': 'Plugins',
    'common.new': 'New',
    'common.filter': 'Filter',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.preview': 'Preview',
    'common.total': 'Total',
    'crud.newItem': 'New {{name}}',
    'crud.editItem': 'Edit {{name}}',
    'crud.deleteConfirm': 'Delete {{name}}?',
    'crud.deleteMessage': 'This action cannot be undone.',
    'crud.created': '{{name}} created',
    'crud.updated': '{{name}} updated',
    'crud.deleted': '{{name}} deleted',
    'crud.noItems': 'No {{namePlural}} yet.',
    'auth.login.title': 'Sign in',
    'auth.login.subtitle': 'Enter your credentials to access your account',
    'auth.login.emailLabel': 'Email',
    'auth.login.passwordLabel': 'Password',
    'auth.login.submit': 'Sign in',
    'auth.login.forgotPassword': 'Forgot password?',
    'auth.login.noAccount': "Don't have an account?",
    'auth.login.signUpLink': 'Sign up',
    'auth.signup.title': 'Create account',
    'auth.signup.submit': 'Create account',
    'auth.signup.hasAccount': 'Already have an account?',
    'auth.signup.signInLink': 'Sign in',
    'settings.title': 'Settings',
    'settings.company': 'Company',
    'settings.branding': 'Branding',
    'settings.security': 'Security',
    'settings.team': 'Team',
    'settings.billing': 'Billing',
    'settings.locations': 'Locations',
    'billing.title': 'Plans & Billing',
    'billing.currentPlan': 'Current Plan',
    'billing.upgrade': 'Upgrade',
    'billing.manage': 'Manage Subscription',
  },
  'pt-BR': {
    'common.save': 'Salvar',
    'common.saveChanges': 'Salvar Alterações',
    'common.saving': 'Salvando...',
    'common.cancel': 'Cancelar',
    'common.delete': 'Excluir',
    'common.edit': 'Editar',
    'common.close': 'Fechar',
    'common.confirm': 'Confirmar',
    'common.discard': 'Descartar',
    'common.back': 'Voltar',
    'common.formIncomplete': 'Preencha os campos obrigatórios antes de salvar.',
    'connectors.title': 'Integrações',
    'connectors.subtitle': 'Conecte provedores externos a este módulo.',
    'connectors.connected': 'Conectado',
    'connectors.notConnected': 'Não conectado',
    'connectors.connect': 'Conectar',
    'connectors.disconnect': 'Desconectar',
    'connectors.test': 'Testar',
    'connectors.save': 'Salvar conexão',
    'connectors.testing': 'Testando…',
    'connectors.saving': 'Salvando…',
    'connectors.empty': 'Nenhuma integração disponível para este módulo ainda.',
    'connectors.configure': 'Configurar',
    'saveBar.unsaved': 'Alterações não salvas',
    'common.add': 'Adicionar',
    'common.loading': 'Carregando...',
    'common.error': 'Algo deu errado',
    'common.noResults': 'Nenhum resultado encontrado.',
    'common.search': 'Buscar',
    'common.actions': 'Ações',
    'common.continue': 'Continuar',
    'common.done': 'Concluído',
    'common.yes': 'Sim',
    'common.no': 'Não',
    'common.active': 'Ativo',
    'common.inactive': 'Inativo',
    'common.overview': 'Visão Geral',
    'common.settings': 'Configurações',
    'common.plugins': 'Plugins',
    'common.new': 'Novo',
    'common.filter': 'Filtrar',
    'common.export': 'Exportar',
    'common.import': 'Importar',
    'common.preview': 'Pré-visualizar',
    'common.total': 'Total',
    'crud.newItem': 'Novo {{name}}',
    'crud.editItem': 'Editar {{name}}',
    'crud.deleteConfirm': 'Excluir {{name}}?',
    'crud.deleteMessage': 'Esta ação não pode ser desfeita.',
    'crud.created': '{{name}} criado',
    'crud.updated': '{{name}} atualizado',
    'crud.deleted': '{{name}} excluído',
    'crud.noItems': 'Nenhum {{namePlural}} ainda.',
    'auth.login.title': 'Entrar',
    'auth.login.subtitle': 'Digite suas credenciais para acessar sua conta',
    'auth.login.emailLabel': 'E-mail',
    'auth.login.passwordLabel': 'Senha',
    'auth.login.submit': 'Entrar',
    'auth.login.forgotPassword': 'Esqueceu a senha?',
    'auth.login.noAccount': 'Não tem uma conta?',
    'auth.login.signUpLink': 'Cadastrar',
    'auth.signup.title': 'Criar conta',
    'auth.signup.submit': 'Criar conta',
    'auth.signup.hasAccount': 'Já tem uma conta?',
    'auth.signup.signInLink': 'Entrar',
    'settings.title': 'Configurações',
    'settings.company': 'Empresa',
    'settings.branding': 'Identidade Visual',
    'settings.security': 'Segurança',
    'settings.team': 'Equipe',
    'settings.billing': 'Faturamento',
    'settings.locations': 'Localizações',
    'billing.title': 'Planos e Faturamento',
    'billing.currentPlan': 'Plano Atual',
    'billing.upgrade': 'Fazer Upgrade',
    'billing.manage': 'Gerenciar Assinatura',
  },
}

// Global translation registry — plugins merge their locales here so keys resolve
// regardless of which shell mounts the I18nProvider.
let _globalTranslations: Record<string, Record<string, string>> = {}

export function registerTranslations(translations?: Record<string, Record<string, string>>): void {
  if (!translations) return
  _globalTranslations = mergeTranslations(_globalTranslations, translations)
}

export function mergeTranslations(
  base: Record<string, Record<string, string>>,
  ...overrides: Array<Record<string, Record<string, string>> | undefined>
): Record<string, Record<string, string>> {
  const result = { ...base }
  for (const override of overrides) {
    if (!override) continue
    for (const [locale, translations] of Object.entries(override)) {
      result[locale] = { ...(result[locale] ?? {}), ...translations }
    }
  }
  return result
}

// Seed the global fallback with core's own translations + the shared shell /
// CRUD / framework translations (extracted from saas-core's central i18n), so
// the native CRUD engine, framework UI and de-bridged plugins resolve their
// keys even under a host shell that does not mount @fayz-ai/core's I18nProvider.
registerTranslations(coreTranslations)
registerTranslations(shellTranslations)
