import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { LeadSubmitError, type LeadFields, type LeadSubmitResult, type PublicFormDef } from './types'

interface PublicFormsContextValue {
  forms: Map<string, PublicFormDef>
  submit: (formId: string, values: LeadFields) => Promise<LeadSubmitResult>
}

const PublicFormsContext = createContext<PublicFormsContextValue | null>(null)

export interface PublicFormsProviderProps extends PublicFormsContextValue {
  children: ReactNode
}

export function PublicFormsProvider({ forms, submit, children }: PublicFormsProviderProps) {
  const value = useMemo(() => ({ forms, submit }), [forms, submit])
  return <PublicFormsContext.Provider value={value}>{children}</PublicFormsContext.Provider>
}

/** The hook a site's own form component calls. Owns only the submission
 *  lifecycle — the markup, the fields and the validation copy stay the site's. */
export function useLeadForm(formId: string) {
  const ctx = useContext(PublicFormsContext)
  if (!ctx) {
    throw new Error('[plugin-crm] useLeadForm must be used within <PublicFormsProvider>.')
  }

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<LeadSubmitError | null>(null)
  const [result, setResult] = useState<LeadSubmitResult | null>(null)

  const submit = useCallback(
    async (values: LeadFields): Promise<LeadSubmitResult | null> => {
      if (submitting) return null
      setSubmitting(true)
      setError(null)
      try {
        const res = await ctx.submit(formId, values)
        setResult(res)
        return res
      } catch (err) {
        const e =
          err instanceof LeadSubmitError
            ? err
            : new LeadSubmitError('unavailable', (err as Error)?.message ?? 'Falha ao enviar.')
        setError(e)
        return null
      } finally {
        setSubmitting(false)
      }
    },
    [ctx, formId, submitting],
  )

  const reset = useCallback(() => {
    setError(null)
    setResult(null)
  }, [])

  return {
    submit,
    reset,
    submitting,
    error,
    result,
    success: result !== null,
    form: ctx.forms.get(formId) ?? null,
  }
}
