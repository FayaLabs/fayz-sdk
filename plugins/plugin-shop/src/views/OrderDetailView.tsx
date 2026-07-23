import React, { useEffect, useState } from 'react'
import { Card, CardContent, Skeleton } from '@fayz-ai/ui'
import { adminNavigateTo } from '@fayz-ai/saas'
import { PersonLink } from '@fayz-ai/saas'
import { shopCustomerLookup } from './customerLookup'
import type { Order, ShopProvider } from '@fayz-ai/shop'
import { getSupabaseClientOptional } from '@fayz-ai/core'

/** A shipment as stored in public.fulfillments (0018). */
type Fulfillment = {
  id: string
  status: string
  carrier: string | null
  service: string | null
  tracking_code: string | null
  tracking_url: string | null
  shipped_at: string | null
  estimated_delivery_at: string | null
  delivered_at: string | null
}

/**
 * The receivable this order raised, as the financial plugin models it: bills are
 * obligations (plg_financial_movements, movement_kind='bill') and
 * v_invoice_balances derives what is billed, paid and still owed.
 */
type Bill = {
  id: string
  amount: number
  paid_amount: number | null
  status: string
  due_date: string
  installment_number: number | null
}
type Receivable = {
  balance: { amount: number; paid: number; balance: number; status: string; reference_number: string | null }
  bills: Bill[]
}

const RECEIVABLE_LABEL: Record<string, string> = {
  open: 'Em aberto', partial: 'Parcialmente recebido', paid: 'Recebido',
  overdue: 'Vencido', cancelled: 'Cancelado',
}
const RECEIVABLE_TONE: Record<string, string> = {
  open: 'bg-blue-100 text-blue-800', partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-emerald-100 text-emerald-800', overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-700',
}

const SHIPMENT_LABEL: Record<string, string> = {
  pending: 'Aguardando coleta', in_transit: 'Em trânsito', delivered: 'Entregue',
  failed: 'Falhou', returned: 'Devolvido', cancelled: 'Cancelado',
}

// ---------------------------------------------------------------------------
// Order detail — modelled on what a merchant actually needs to act on an order:
// what was bought, whether the money arrived, and where it has to go. The three
// blocks mirror the three downstream systems (catalogue, financial, logistics)
// so the page doubles as the integration surface.
//
// Fields the schema cannot supply yet are shown as explicit gaps rather than
// omitted, because "no tracking code" and "tracking code not modelled" are very
// different problems for whoever picks this up.
// ---------------------------------------------------------------------------

const money = (v: number, currency = 'BRL') =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(Number(v) || 0)

const dateTime = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))

const TONE: Record<string, string> = {
  paid: 'bg-emerald-100 text-emerald-800',
  pending: 'bg-yellow-100 text-yellow-800',
  refunded: 'bg-orange-100 text-orange-700',
  partially_refunded: 'bg-orange-100 text-orange-700',
  voided: 'bg-gray-100 text-gray-700',
  fulfilled: 'bg-emerald-100 text-emerald-800',
  unfulfilled: 'bg-gray-100 text-gray-700',
  partially_fulfilled: 'bg-blue-100 text-blue-800',
  open: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-700',
  archived: 'bg-gray-100 text-gray-700',
}

const PAYMENT_LABEL: Record<string, string> = {
  pix: 'Pix', credit_card: 'Cartão de crédito', debit_card: 'Cartão de débito',
  boleto: 'Boleto', cash: 'Dinheiro', other: 'Outro',
}

const LABEL: Record<string, string> = {
  paid: 'Pago', pending: 'Aguardando pagamento', refunded: 'Estornado',
  partially_refunded: 'Estorno parcial', voided: 'Cancelado',
  fulfilled: 'Enviado', unfulfilled: 'Não enviado', partially_fulfilled: 'Envio parcial',
  open: 'Aberto', cancelled: 'Cancelado', archived: 'Arquivado',
}

function Badge({ value }: { value: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TONE[value] ?? TONE.open}`}>
      {LABEL[value] ?? value}
    </span>
  )
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <h3 className="text-sm font-semibold">{title}</h3>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
        <div className="mt-3">{children}</div>
      </CardContent>
    </Card>
  )
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-4 py-1 ${strong ? 'font-semibold' : ''}`}>
      <span className={strong ? '' : 'text-muted-foreground'}>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}

/**
 * The buyer's address currently travels as free text in `notes`, prefixed
 * "Entrega:" by the storefront checkout (workflows/checkout.ts). There is no
 * structured address column on plg_shop_orders, so logistics has to read this
 * string. Parsed here so the merchant at least sees it as an address.
 */
function deliveryFromNotes(notes: string | null): string | null {
  if (!notes) return null
  const match = notes.match(/entrega:\s*(.+)/i)
  return (match?.[1] ?? '').trim() || null
}

/**
 * Mirrors the loaded layout (header, two-column grid, same block order) so the
 * page doesn't reflow when the order arrives.
 */
function BlockSkeleton({ rows }: { rows: number }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <Skeleton className="h-4 w-28" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className={`h-3 ${i % 3 === 2 ? 'w-1/2' : i % 3 === 1 ? 'w-2/3' : 'w-full'}`} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <Skeleton className="h-4 w-20" />

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-5 w-20 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardContent className="pt-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="mt-1.5 h-3 w-24" />
              <div className="mt-3 divide-y">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <Skeleton className="h-10 w-10 shrink-0 rounded" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-3.5 w-2/5" />
                      <Skeleton className="h-2.5 w-20" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <BlockSkeleton rows={6} />
        </div>

        <div className="space-y-4">
          <BlockSkeleton rows={2} />
          <BlockSkeleton rows={4} />
          <BlockSkeleton rows={3} />
        </div>
      </div>
    </div>
  )
}

export function OrderDetailView({
  orderId,
  provider,
  onBack,
}: {
  orderId: string
  provider: () => ShopProvider
  onBack: () => void
}) {
  const [order, setOrder] = useState<Order | null>(null)
  const [shipments, setShipments] = useState<Fulfillment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState<string | null>(null)
  const [receivable, setReceivable] = useState<Receivable | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    provider().getOrder(orderId)
      .then((o) => { if (!cancelled) setOrder(o) })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [orderId, provider])

  useEffect(() => {
    let cancelled = false
    const db = getSupabaseClientOptional() as unknown as { from: (t: string) => any } | null
    if (!db) return
    db.from('fulfillments')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .then(({ data }: { data: Fulfillment[] | null }) => {
        if (!cancelled) setShipments(data ?? [])
      })
    return () => { cancelled = true }
  }, [orderId])

  /**
   * Load the receivable this order raised.
   *
   * The order does not decide whether it was paid — the receivable does. It is
   * created by the financial plugin's own fn_invoice_from_order the moment the
   * order is placed, and plg_shop_orders.financial_status is derived from it, so
   * this panel is the money and the badge above is a consequence of it.
   *
   * NOTE: this hook must stay ABOVE the early returns below (loading/error/!order)
   * — a hook placed after a conditional return changes the hook order between
   * renders (React "change in the order of Hooks" error).
   */
  useEffect(() => {
    let cancelled = false
    const db = getSupabaseClientOptional() as unknown as { from: (t: string) => any } | null
    if (!db) return
    void (async () => {
      const [balance, bills] = await Promise.all([
        db.from('v_invoice_balances').select('*').eq('invoice_id', orderId).maybeSingle(),
        db.from('plg_financial_movements').select('*')
          .eq('invoice_id', orderId).eq('movement_kind', 'bill')
          .order('installment_number', { ascending: true }),
      ])
      if (cancelled || !balance?.data) return
      setReceivable({ balance: balance.data, bills: bills?.data ?? [] })
    })()
    return () => { cancelled = true }
  }, [orderId, confirming])

  if (loading) return <OrderDetailSkeleton />
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-medium">Não foi possível carregar o pedido.</p>
        <p className="mt-1 text-red-700">{error}</p>
      </div>
    )
  }
  if (!order) return <div className="py-12 text-center text-sm text-muted-foreground">Pedido não encontrado.</div>

  const delivery = deliveryFromNotes(order.notes)
  const addr = order.shippingAddress

  /**
   * Register the receipt. This used to be "Marcar como pago" — a button that
   * flipped an enum, which is an assertion about money with no counterpart
   * anywhere: no receivable, no due date, no instalment, no bank, no fee.
   *
   * It now writes `payment` movements against the open instalments, which is
   * what the Financeiro reads, and the order's status follows from that.
   */
  async function registerReceipt() {
    if (!order) return
    setConfirming(true)
    setConfirmError(null)
    try {
      const updated = await provider().confirmPayment?.(order.id)
      if (updated) setOrder(updated)
      else setOrder(await provider().getOrder(order.id))
    } catch (err: unknown) {
      setConfirmError(err instanceof Error ? err.message : String(err))
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        ← Pedidos
      </button>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold">Pedido #{order.orderNumber}</h1>
        <Badge value={order.financialStatus} />
        <Badge value={order.fulfillmentStatus} />
        <span className="text-sm text-muted-foreground">{dateTime(order.createdAt)}</span>
      </div>
      {confirmError && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Não foi possível confirmar o pagamento: {confirmError}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Block title="Itens" hint={`${order.items.length} item(ns)`}>
            <div className="divide-y">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 py-2">
                  {item.imageUrl
                    ? <img src={item.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded object-cover" />
                    : <div className="h-10 w-10 shrink-0 rounded bg-muted" />}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name}</p>
                    {item.sku && <p className="text-xs text-muted-foreground">{item.sku}</p>}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {item.quantity} × {money(item.unitPrice, order.currency)}
                  </span>
                  <span className="w-24 text-right text-sm font-medium tabular-nums">
                    {money(item.total, order.currency)}
                  </span>
                </div>
              ))}
            </div>
          </Block>

          <Block title="Pagamento" hint="O que o financeiro precisa conciliar">
            <div className="text-sm">
              <Row label="Subtotal" value={money(order.subtotal, order.currency)} />
              {order.discountTotal > 0 && (
                <Row
                  label={`Desconto${order.discountCode ? ` (${order.discountCode})` : ''}`}
                  value={`− ${money(order.discountTotal, order.currency)}`}
                />
              )}
              <Row label="Entrega" value={money(order.shippingTotal, order.currency)} />
              <Row label="Impostos" value={money(order.taxTotal, order.currency)} />
              <div className="mt-2 border-t pt-2">
                <Row label="Total" value={money(order.total, order.currency)} strong />
              </div>
              <div className="mt-3 border-t pt-2">
                <Row label="Forma de pagamento" value={PAYMENT_LABEL[order.paymentMethodKind ?? ''] ?? '—'} />
                {order.paidAt && <Row label="Pago em" value={dateTime(order.paidAt)} />}
              </div>
              {!order.paymentMethodKind && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Este pedido é anterior ao registro de forma de pagamento.
                </p>
              )}
            </div>
          </Block>

          {/*
            The receivable, which is where the money actually lives. This block
            replaced a "Marcar como pago" button: that flipped an enum and left
            no receivable, no due date, no instalment and nothing for the
            Financeiro to reconcile. financial_status above is now DERIVED from
            what is shown here, so the two cannot disagree.
          */}
          <Block
            title="Contas a receber"
            hint="Criado automaticamente quando o pedido foi feito — o mesmo registro que o Financeiro lê"
          >
            {!receivable ? (
              <p className="text-sm text-muted-foreground">
                Sem conta a receber para este pedido.
              </p>
            ) : (
              <div className="text-sm">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="font-mono font-semibold">
                    {receivable.balance.reference_number ?? '—'}
                  </span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    RECEIVABLE_TONE[receivable.balance.status] ?? RECEIVABLE_TONE.open}`}>
                    {RECEIVABLE_LABEL[receivable.balance.status] ?? receivable.balance.status}
                  </span>
                </div>

                <Row label="Faturado" value={money(receivable.balance.amount, order.currency)} />
                <Row label="Recebido" value={money(receivable.balance.paid, order.currency)} />
                <div className="mt-2 border-t pt-2">
                  <Row label="Saldo" value={money(receivable.balance.balance, order.currency)} strong />
                </div>

                {receivable.bills.length > 1 && (
                  <ul className="mt-3 space-y-1 border-t pt-2 text-xs">
                    {receivable.bills.map((bill) => (
                      <li key={bill.id} className="flex items-baseline justify-between gap-3">
                        <span className="text-muted-foreground">
                          Parcela {bill.installment_number} · vence {new Date(bill.due_date).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="tabular-nums">
                          {money(Number(bill.paid_amount ?? 0), order.currency)} / {money(Number(bill.amount), order.currency)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-4 flex flex-wrap gap-2">
                  {receivable.balance.balance > 0 && receivable.balance.status !== 'cancelled' && (
                    <button
                      type="button"
                      onClick={registerReceipt}
                      disabled={confirming}
                      data-testid="order-register-receipt"
                      className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
                    >
                      {confirming ? 'Registrando…' : 'Registrar recebimento'}
                    </button>
                  )}
                  {/* The full flow — banco, maquininha, taxa, caixa — is the
                      Financeiro's own screen. Duplicating it here would be a
                      second answer to the same question. */}
                  <button
                    type="button"
                    onClick={() => adminNavigateTo('/financial')}
                    className="rounded-md border px-3 py-1.5 text-sm font-medium transition hover:bg-muted"
                  >
                    Abrir no Financeiro
                  </button>
                </div>

                {confirmError && (
                  <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {confirmError}
                  </p>
                )}
              </div>
            )}
          </Block>
        </div>

        <div className="space-y-4">
          <Block title="Cliente">
            <div className="space-y-1 text-sm">
              {/* Links to the customer record so the operator can see history,
                  contact details and other orders without leaving the flow. */}
              {order.customerId ? (
                <PersonLink
                  personId={order.customerId}
                  name={order.customerName ?? order.customerEmail ?? 'Cliente'}
                  lookup={shopCustomerLookup(provider)}
                  profileHref={`#/shop/customers/${order.customerId}`}
                  className="font-medium"
                />
              ) : (
                <p className="font-medium">{order.customerName ?? '—'}</p>
              )}
              {order.customerEmail && <p className="text-muted-foreground">{order.customerEmail}</p>}
              {!order.customerId && (
                <p className="text-xs text-muted-foreground">
                  Compra sem cadastro — não há ficha de cliente para abrir.
                </p>
              )}
            </div>
          </Block>

          <Block title="Entrega" hint="O que a logística precisa">
            <div className="space-y-2 text-sm">
              {addr ? (
                <div className="space-y-0.5">
                  <p>{[addr.street, addr.number].filter(Boolean).join(', ')}{addr.complement ? ` — ${addr.complement}` : ''}</p>
                  {addr.district && <p className="text-muted-foreground">{addr.district}</p>}
                  <p className="text-muted-foreground">
                    {[addr.city, addr.state].filter((v) => v && v !== '—').join('/')}
                    {addr.postal_code ? ` · ${addr.postal_code}` : ''}
                  </p>
                  {(addr.recipient || addr.phone) && (
                    <p className="text-xs text-muted-foreground">
                      {[addr.recipient, addr.phone].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <p className={delivery ? '' : 'text-muted-foreground'}>
                    {delivery ?? 'Nenhum endereço registrado neste pedido.'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Pedido anterior ao endereço estruturado — só existe o texto livre das
                    observações, sem CEP, número ou bairro separáveis.
                  </p>
                </>
              )}
              <div className="border-t pt-2">
                <Row label="Status" value={<Badge value={order.fulfillmentStatus} />} />

                {shipments.length === 0 ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Nenhum envio registrado. Ao despachar, informe transportadora e código
                    de rastreio — o status do pedido é calculado a partir dos envios.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {shipments.map((s) => (
                      <div key={s.id} className="rounded-md border px-2 py-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {[s.carrier, s.service].filter(Boolean).join(' · ') || 'Envio'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {SHIPMENT_LABEL[s.status] ?? s.status}
                          </span>
                        </div>
                        {s.tracking_code && (
                          <p className="mt-0.5 font-mono text-xs">
                            {s.tracking_url
                              ? <a href={s.tracking_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{s.tracking_code}</a>
                              : s.tracking_code}
                          </p>
                        )}
                        <div className="mt-1 space-y-0.5 text-[11px] text-muted-foreground">
                          {s.shipped_at && <p>Despachado em {dateTime(s.shipped_at)}</p>}
                          {s.estimated_delivery_at && <p>Previsão: {dateTime(s.estimated_delivery_at)}</p>}
                          {s.delivered_at && <p>Entregue em {dateTime(s.delivered_at)}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Block>

          <Block title="Histórico">
            <div className="space-y-1 text-sm">
              <Row label="Criado" value={dateTime(order.createdAt)} />
              <Row label="Atualizado" value={dateTime(order.updatedAt)} />
              <Row label="Situação" value={<Badge value={order.status} />} />
            </div>
          </Block>

          {order.notes && (
            <Block title="Observações">
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{order.notes}</p>
            </Block>
          )}
        </div>
      </div>
    </div>
  )
}

export const orderDetailPath = (id: string) => `/shop/orders/${id}`
export const goToOrder = (id: string) => adminNavigateTo(orderDetailPath(id))
