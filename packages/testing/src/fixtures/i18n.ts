// ---------------------------------------------------------------------------
// Locale string table — the i18n-aware defaults every contract falls back to.
//
// The login chrome is English in ALL dogfood apps (even pt-BR shells), so the
// sign-in button default is 'Sign in' regardless of locale. Everything else
// follows the shell locale. Any single string is overridable per-app via the
// config (see ./config) — e.g. resto renders the EN gate string under a pt-BR
// locale, so it sets `restrictedText: 'Access restricted'` explicitly.
// ---------------------------------------------------------------------------
export type Locale = 'pt-BR' | 'en'

export interface LocaleStrings {
  /** SaveBar button that COMMITS a new record. `Adicionar {entity}` / `Add {entity}`. */
  saveNew: (entity: string) => string
  /** List-page nav button that OPENS the create form. `+ Adicionar {entity}` / `+ Add {entity}`. */
  addNav: (entity: string) => string
  /** SaveBar button that commits an edit. */
  saveEdit: string
  /** Generic modal confirm/save (agenda "Salvar"/"Save"). */
  save: string
  /** Agenda edit confirm ("Atualizar"/"Update"). */
  update: string
  /** Destructive confirm button ("Excluir"/"Delete"). */
  delete: string
  /** Permission gate text shown on a blocked route. */
  restricted: string
  /** Workspace switcher menu heading. */
  workspacesMenu: string | RegExp
  /** Assistant FAB open button (English in every app). */
  fabOpen: string
  /** Honest "unconfigured" assistant text. */
  fabUnconfigured: RegExp
  /** Notification bell button (sidebar layout only). */
  bell: string
  /** Notifications inbox marker. */
  inbox: string | RegExp
}

const PT: LocaleStrings = {
  saveNew: (e) => `Adicionar ${e}`,
  addNav: (e) => `+ Adicionar ${e}`,
  saveEdit: 'Salvar Alterações',
  save: 'Salvar',
  update: 'Atualizar',
  delete: 'Excluir',
  restricted: 'Acesso restrito',
  workspacesMenu: 'Áreas de trabalho',
  fabOpen: 'Open chat',
  fabUnconfigured: /Assistente não configurado/i,
  bell: 'Notifications',
  inbox: 'Inbox',
}

const EN: LocaleStrings = {
  saveNew: (e) => `Add ${e}`,
  addNav: (e) => `+ Add ${e}`,
  saveEdit: 'Save Changes',
  save: 'Save',
  update: 'Update',
  delete: 'Delete',
  restricted: 'Access restricted',
  workspacesMenu: /workspace/i,
  fabOpen: 'Open chat',
  fabUnconfigured: /Assistant not configured/i,
  bell: 'Notifications',
  inbox: /Inbox|notifications/i,
}

export function strings(locale: Locale): LocaleStrings {
  return locale === 'en' ? EN : PT
}
