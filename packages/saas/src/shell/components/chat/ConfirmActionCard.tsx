import * as React from 'react'
import { AlertTriangle, Check, Infinity as InfinityIcon, ShieldCheck, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../hooks/useTranslation'
import { grantAutoApproval } from '../../lib/agent-approvals'
import { lookupRecordRef, looksLikeRecordId } from '../../lib/record-refs'
import { humanizeToolName } from './ChatMessages'
import { RecordChip } from './RecordChip'
import type { PendingAgentAction, PendingActionField } from '../../stores/chat.store'

/**
 * The human gate in front of an agent write: shows what the agent wants to do
 * (tool + arguments) and blocks the conversation until the user decides — the
 * FAB's native rendering of the confirmation step every channel has (WhatsApp
 * asks "responda SIM", MCP uses elicitation).
 *
 * Three answers, not two. "Always allow" is what turns the assistant from a
 * demo into a tool someone uses forty times a day; it is scoped to this exact
 * action (create THIS entity), and for anything destructive it only lasts the
 * session — a misheard voice command must never be able to delete data under a
 * rule granted last month and forgotten.
 */
export function ConfirmActionCard({
  action,
  onResolve,
}: {
  action: PendingAgentAction
  onResolve: (approved: boolean, values?: Record<string, unknown>) => void
}) {
  const { t } = useTranslation()
  // Each argument, resolved to the record behind it when the conversation
  // already produced that id.
  // The card is a form, not a receipt: the model's guesses are the starting
  // values and the user corrects them here, before anything is written.
  const [values, setValues] = React.useState<Record<string, unknown>>(() => ({ ...action.params }))
  const [showAll, setShowAll] = React.useState(false)
  React.useEffect(() => setValues({ ...action.params }), [action.params])

  const schema = action.fields ?? []
  const isSet = (v: unknown) => v !== undefined && v !== null && v !== ''

  // Shown up front: what the model filled, plus anything required it left out.
  // The rest of the schema waits behind "show all" so the card stays readable.
  const primaryKeys = React.useMemo(() => {
    const keys = Object.keys(action.params).filter((k) => isSet(action.params[k]))
    for (const f of schema) if (f.required && !keys.includes(f.key)) keys.push(f.key)
    return keys
  }, [action.params, schema])

  const extraKeys = React.useMemo(
    () => schema.map((f) => f.key).filter((k) => !primaryKeys.includes(k) && k !== 'id'),
    [schema, primaryKeys],
  )

  const visibleKeys = showAll ? [...primaryKeys, ...extraKeys] : primaryKeys
  const fieldOf = (key: string) => schema.find((f) => f.key === key)
  const entries = visibleKeys.map((key) => ({
    key,
    value: values[key],
    record: lookupRecordRef(values[key]),
    field: fieldOf(key),
  }))
  const destructive = !!action.destructive
  // What this action IS, in the reader's language. A tool's `description` is
  // written FOR THE MODEL ("Takes IDS, not names: resolve the client/service
  // ids first via findAnything…") and putting it here made the card read like
  // an internal spec sheet.
  // A caller-supplied title wins — "Criar Cliente" beats "Create record".
  const toolKey = `chat.tool.${action.toolName}`
  const translatedTool = t(toolKey)
  const heading =
    action.title ??
    (translatedTool !== toolKey ? translatedTool : humanizeToolName(action.toolName))
  const ruleLabel = action.scopeLabel ?? heading

  const approve = React.useCallback(() => onResolve(true, values), [onResolve, values])
  const decline = React.useCallback(() => onResolve(false), [onResolve])
  const approveAlways = React.useCallback(() => {
    grantAutoApproval({
      toolName: action.toolName,
      scope: action.scope,
      label: ruleLabel,
      session: destructive,
    })
    onResolve(true, values)
  }, [action.toolName, action.scope, ruleLabel, destructive, onResolve, values])

  // The card owns the conversation while it is up, so it owns the keyboard:
  // Enter confirms, Escape declines — no reaching for the mouse mid-flow.
  React.useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT'
      if (event.key === 'Enter' && !event.shiftKey && !typing) {
        event.preventDefault()
        approve()
      } else if (event.key === 'Escape') {
        event.preventDefault()
        decline()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [approve, decline])

  return (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={heading}
      className={cn(
        'mx-1 my-1.5 overflow-hidden rounded-xl border shadow-sm motion-safe:animate-zoom-in',
        destructive
          ? 'border-destructive/40 bg-destructive/5'
          : 'border-primary/30 bg-primary/[0.04]',
      )}
    >
      <div className="flex items-start gap-2 px-3 pt-2.5">
        <span
          className={cn(
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            destructive ? 'bg-destructive/15 text-destructive' : 'bg-primary/15 text-primary',
          )}
        >
          {destructive ? (
            <AlertTriangle className="h-3 w-3" />
          ) : (
            <ShieldCheck className="h-3 w-3" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('chat.confirmAction.title')}
          </p>
          <p className="mt-0.5 text-[13px] font-medium leading-snug text-foreground">
            {heading}
          </p>
        </div>
      </div>

      {entries.length > 0 && (
        <dl className="mt-2 space-y-px px-3">
          {entries.map(({ key, value, record, field }) => (
            <div
              key={key}
              className="flex items-baseline gap-2 rounded-md bg-background/60 px-2 py-1"
            >
              <dt className="w-24 shrink-0 truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                {field?.label ?? humanizeKey(record ? stripIdSuffix(key) : key)}
                {field?.required && <span className="text-destructive"> *</span>}
              </dt>
              <dd className="min-w-0 flex-1 break-words text-[12px] text-foreground">
                {record ? (
                  <RecordChip link={record} variant="inline" />
                ) : looksLikeRecordId(value) ? (
                  // An id is a reference, not something to hand-edit.
                  <span className="font-mono text-[11px] text-muted-foreground" title={value}>
                    {value.slice(0, 8)}…
                  </span>
                ) : (
                  <FieldInput
                    field={field}
                    value={value}
                    onChange={(next) => setValues((v) => ({ ...v, [key]: next }))}
                  />
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {extraKeys.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="mt-1 px-3 text-[11px] font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {showAll
            ? t('chat.confirmAction.showLess')
            : t('chat.confirmAction.showAll', { count: extraKeys.length })}
        </button>
      )}

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-border/40 bg-background/40 px-2 py-2">
        <button
          type="button"
          onClick={approve}
          autoFocus
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium transition-all',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            destructive
              ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          {t('chat.confirmAction.confirm')}
        </button>
        <button
          type="button"
          onClick={approveAlways}
          title={t('chat.confirmAction.alwaysHint', { label: ruleLabel })}
          className={cn(
            'inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-[12px] font-medium text-muted-foreground transition-colors',
            'hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          )}
        >
          <InfinityIcon className="h-3.5 w-3.5" />
          {destructive
            ? t('chat.confirmAction.alwaysSession')
            : t('chat.confirmAction.always')}
        </button>
        <button
          type="button"
          onClick={decline}
          className="ml-auto inline-flex h-8 items-center gap-1 rounded-lg px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="h-3.5 w-3.5" />
          {t('chat.confirmAction.cancel')}
        </button>
      </div>
    </div>
  )
}

/** `client_id` → `client`, once the row shows a name instead of the id. */
function stripIdSuffix(key: string): string {
  return key.replace(/[_-]?id$/i, '') || key
}

/** `client_name` / `clientName` → `Client name`. The model speaks column
 *  names; the person reading the card should not have to. */
function humanizeKey(key: string): string {
  const spaced = key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase()
}

function formatValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? '✓' : '—'
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(', ')
  if (value && typeof value === 'object') return JSON.stringify(value)
  const text = String(value)
  // ISO datetimes are unreadable in a confirmation the user has 2 seconds for.
  const iso = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/.exec(text)
  if (iso) {
    const parsed = new Date(text)
    if (!Number.isNaN(parsed.getTime())) return parsed.toLocaleString()
  }
  return text
}

/** ISO ⇄ the value shape each datetime-ish input actually accepts. */
function toInputDate(value: unknown, type?: string): string {
  if (typeof value !== 'string' || !value) return ''
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
  const time = `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  if (type === 'date') return date
  if (type === 'time') return time
  return `${date}T${time}`
}

/** One editable value, rendered from the entity's own `FieldType`. A timestamp
 *  is not a text box and a boolean is not the string "true". */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field?: PendingActionField
  value: unknown
  onChange: (next: unknown) => void
}) {
  const base =
    'w-full min-w-0 rounded border border-transparent bg-transparent px-1 py-0.5 text-[12px] text-foreground ' +
    'hover:border-border focus:border-primary focus:bg-background focus:outline-none'
  const type = field?.type

  if (field?.readOnly) {
    return <span className="text-[12px] text-muted-foreground">{formatValue(value)}</span>
  }

  if (type === 'boolean' || typeof value === 'boolean') {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border"
      />
    )
  }

  if (field?.options?.length) {
    return (
      <select value={String(value ?? '')} onChange={(e) => onChange(e.target.value)} className={base}>
        <option value="" />
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label ?? o.value}
          </option>
        ))}
      </select>
    )
  }

  if (type === 'textarea' || type === 'markdown') {
    return (
      <textarea
        rows={2}
        value={value === undefined || value === null ? '' : String(value)}
        placeholder={field?.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(base, 'resize-none leading-snug')}
      />
    )
  }

  if (type === 'date' || type === 'datetime' || type === 'time') {
    const inputType = type === 'datetime' ? 'datetime-local' : type
    return (
      <input
        type={inputType}
        value={toInputDate(value, type)}
        onChange={(e) => {
          const raw = e.target.value
          if (!raw) return onChange('')
          // Times have no date to anchor to; everything else goes back as ISO.
          onChange(type === 'time' ? raw : new Date(raw).toISOString())
        }}
        className={base}
      />
    )
  }

  if (type === 'number' || type === 'currency' || typeof value === 'number') {
    return (
      <input
        type="number"
        inputMode="decimal"
        step={type === 'currency' ? '0.01' : 'any'}
        min={field?.min}
        max={field?.max}
        value={value === undefined || value === null ? '' : String(value)}
        placeholder={field?.placeholder}
        onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
        className={base}
      />
    )
  }

  const htmlType = type === 'email' ? 'email' : type === 'phone' ? 'tel' : type === 'url' ? 'url' : 'text'
  return (
    <input
      type={htmlType}
      value={value === undefined || value === null ? '' : String(value)}
      placeholder={field?.placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={base}
    />
  )
}
