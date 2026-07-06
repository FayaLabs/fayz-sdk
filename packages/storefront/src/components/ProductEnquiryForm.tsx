import React, { useState } from 'react'
import { Mail, MessageCircle, Send } from 'lucide-react'
import { getShopProvider } from '@fayz-ai/shop/runtime'
import type { Product } from '@fayz-ai/shop/types'
import { useStorefrontConfig } from '../config'
import { storefrontComponentContracts } from '../component-selectors'
import { TID } from '../testids'

export interface ProductEnquiryFormProps {
  product: Product
  onSuccess?: () => void
}

function defaultSubject(prefix: string, product: Product): string {
  return `${prefix}: ${product.name}`
}

function buildWhatsAppHref(url: string, product: Product): string {
  const text = encodeURIComponent(`Hello, I would like more information about ${product.name}.`)
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}text=${text}`
}

export function ProductEnquiryForm({ product, onSuccess }: ProductEnquiryFormProps) {
  const config = useStorefrontConfig()
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [subject, setSubject] = useState(defaultSubject(config.enquiry.subjectPrefix, product))
  const [message, setMessage] = useState(`I would like more information about ${product.name}.`)
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setStatus('submitting')
    setError(null)
    try {
      const provider = getShopProvider()
      if (provider.createProductEnquiry) {
        await provider.createProductEnquiry({
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          customerName,
          customerEmail,
          customerPhone: customerPhone || undefined,
          subject,
          message,
          sourceUrl: typeof window === 'undefined' ? undefined : window.location.href,
          metadata: { sku: product.sku, categoryName: product.categoryName },
        })
      } else if (config.enquiry.email) {
        window.location.href = `mailto:${config.enquiry.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
      }
      setStatus('success')
      onSuccess?.()
    } catch (e) {
      setStatus('error')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <form
      {...storefrontComponentContracts.productDetail.enquiryForm}
      onSubmit={submit}
      className="space-y-4"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1.5 text-sm font-medium">
          <span>Your name</span>
          <input
            data-testid={TID.enquiryName}
            required
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border bg-background px-3 py-2 outline-none focus:border-primary"
            style={{ borderRadius: 'var(--sf-radius-input)' }}
          />
        </label>
        <label className="space-y-1.5 text-sm font-medium">
          <span>Your email</span>
          <input
            data-testid={TID.enquiryEmail}
            required
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            className="w-full border bg-background px-3 py-2 outline-none focus:border-primary"
            style={{ borderRadius: 'var(--sf-radius-input)' }}
          />
        </label>
      </div>
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Phone{config.enquiry.requirePhone ? '' : ' (optional)'}</span>
        <input
          data-testid={TID.enquiryPhone}
          required={config.enquiry.requirePhone}
          value={customerPhone}
          onChange={(e) => setCustomerPhone(e.target.value)}
          className="w-full border bg-background px-3 py-2 outline-none focus:border-primary"
          style={{ borderRadius: 'var(--sf-radius-input)' }}
        />
      </label>
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Subject</span>
        <input
          data-testid={TID.enquirySubject}
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full border bg-background px-3 py-2 outline-none focus:border-primary"
          style={{ borderRadius: 'var(--sf-radius-input)' }}
        />
      </label>
      <label className="block space-y-1.5 text-sm font-medium">
        <span>Message</span>
        <textarea
          data-testid={TID.enquiryMessage}
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full resize-none border bg-background px-3 py-2 outline-none focus:border-primary"
          style={{ borderRadius: 'var(--sf-radius-input)' }}
        />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button
          data-testid={TID.enquirySubmit}
          type="submit"
          disabled={status === 'submitting'}
          className="sf-cta inline-flex items-center gap-2 bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:cursor-wait disabled:opacity-60"
          style={{ borderRadius: 'var(--sf-radius-button)' }}
        >
          <Send className="h-4 w-4" />
          {status === 'submitting' ? 'Sending...' : 'Send enquiry'}
        </button>
        {config.enquiry.whatsappUrl && (
          <a
            href={buildWhatsAppHref(config.enquiry.whatsappUrl, product)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            style={{ borderRadius: 'var(--sf-radius-button)' }}
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </a>
        )}
        {config.enquiry.email && (
          <a
            href={`mailto:${config.enquiry.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`}
            className="inline-flex items-center gap-2 border px-5 py-3 text-sm font-semibold transition-colors hover:bg-muted"
            style={{ borderRadius: 'var(--sf-radius-button)' }}
          >
            <Mail className="h-4 w-4" />
            Email
          </a>
        )}
      </div>
      {status === 'success' && (
        <p data-testid={TID.enquirySuccess} className="text-sm font-medium text-emerald-600">
          {config.enquiry.successMessage}
        </p>
      )}
      {error && (
        <p data-testid={TID.enquiryError} className="text-sm font-medium text-red-600">
          {error}
        </p>
      )}
    </form>
  )
}
