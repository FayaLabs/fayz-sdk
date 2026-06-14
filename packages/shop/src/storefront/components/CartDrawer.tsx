import React, { useState } from 'react'
import { X, Trash2 } from 'lucide-react'
import {
  useCartStore,
  selectSubtotal,
  selectDiscountTotal,
  selectShipping,
  selectTotal,
} from '../stores/cart.store'
import { useDiscountValidator } from '../hooks/useDiscountValidator'
import { useStorefrontConfig } from '../config'
import { navigateTo } from '../router'
import { formatMoney } from '../format'
import { QuantityInput } from './QuantityInput'
import { TID } from '../testids'

export function CartDrawer() {
  const config = useStorefrontConfig()
  const cart = useCartStore()
  const validate = useDiscountValidator()
  const [code, setCode] = useState('')
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const subtotal = selectSubtotal(cart)
  const discountTotal = selectDiscountTotal(cart)
  const shipping = selectShipping(cart, config)
  const total = selectTotal(cart, config)
  const money = (v: number) => formatMoney(v, config.currency, config.locale)

  async function applyCode() {
    setApplying(true)
    setDiscountError(null)
    try {
      const result = await validate(code)
      if (result.valid) {
        cart.applyDiscount(code.trim().toUpperCase(), result.percent)
        setCode('')
      } else {
        setDiscountError(result.message ?? 'Cupom inválido.')
      }
    } finally {
      setApplying(false)
    }
  }

  if (!cart.isOpen) return null

  // Free-shipping nudge: how far from the threshold this cart is
  const freeAbove = config.shipping.freeAbove
  const missingForFree = freeAbove != null && subtotal < freeAbove ? freeAbove - subtotal : 0
  const progress = freeAbove != null ? Math.min(100, (subtotal / freeAbove) * 100) : 0

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 animate-fade-in bg-black/40"
        aria-hidden
        onClick={cart.closeDrawer}
      />
      <div
        data-testid={TID.cartDrawer}
        role="dialog"
        aria-label="Carrinho"
        className="absolute right-0 top-0 flex h-full w-full max-w-md animate-slide-in-from-right flex-col bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="text-lg font-semibold">Carrinho</h2>
          <button
            type="button"
            aria-label="Fechar carrinho"
            onClick={cart.closeDrawer}
            className="rounded-full p-1.5 hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {cart.lines.length === 0 ? (
          <div data-testid={TID.cartEmpty} className="flex flex-1 items-center justify-center p-8 text-center text-muted-foreground">
            Seu carrinho está vazio.
          </div>
        ) : (
          <>
            {freeAbove != null && (
              <div data-testid={TID.shippingProgress} className="border-b bg-muted/40 px-5 py-3">
                <p className="text-xs font-medium">
                  {missingForFree > 0 ? (
                    <>Faltam <strong>{money(missingForFree)}</strong> para frete grátis 🚚</>
                  ) : (
                    <>🎉 Você ganhou <strong>frete grátis</strong>!</>
                  )}
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
              {cart.lines.map((line) => (
                <div
                  key={line.productId}
                  data-testid={TID.cartLine}
                  data-product-id={line.productId}
                  className="flex animate-fade-up gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted/40"
                >
                  {line.imageUrl && (
                    <img src={line.imageUrl} alt={line.name} className="h-20 w-20 shrink-0 rounded-lg border object-cover" />
                  )}
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-sm font-medium leading-snug">{line.name}</span>
                      <button
                        type="button"
                        data-testid={TID.lineRemove}
                        aria-label={`Remover ${line.name}`}
                        onClick={() => cart.removeItem(line.productId)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="text-xs text-muted-foreground">{line.sku}</span>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <QuantityInput
                        value={line.quantity}
                        max={line.maxQuantity || undefined}
                        onChange={(n) => cart.setQuantity(line.productId, n)}
                        testId={TID.lineQty}
                        incTestId={TID.lineInc}
                        decTestId={TID.lineDec}
                      />
                      <span
                        className="text-sm font-semibold"
                        data-price={(line.unitPrice * line.quantity).toFixed(2)}
                      >
                        {money(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t px-5 py-4">
              {config.features.discounts && (
                <div className="space-y-1">
                  <div className="flex gap-2">
                    <input
                      data-testid={TID.discountInput}
                      type="text"
                      placeholder="Cupom de desconto"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm uppercase"
                    />
                    <button
                      type="button"
                      data-testid={TID.discountApply}
                      onClick={applyCode}
                      disabled={applying || !code.trim()}
                      className="rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
                    >
                      Aplicar
                    </button>
                  </div>
                  {discountError && (
                    <p data-testid={TID.discountError} className="text-xs text-destructive">
                      {discountError}
                    </p>
                  )}
                </div>
              )}

              <dl className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Subtotal</dt>
                  <dd data-testid={TID.cartSubtotal} data-price={subtotal.toFixed(2)}>{money(subtotal)}</dd>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700" data-testid={TID.discountRow}>
                    <dt>
                      Desconto{' '}
                      <button
                        type="button"
                        onClick={cart.clearDiscount}
                        className="text-xs text-muted-foreground underline"
                      >
                        ({cart.discountCode} ✕)
                      </button>
                    </dt>
                    <dd data-price={discountTotal.toFixed(2)}>−{money(discountTotal)}</dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Frete</dt>
                  <dd data-testid={TID.cartShipping} data-price={shipping.toFixed(2)}>
                    {shipping === 0 ? 'Grátis' : money(shipping)}
                  </dd>
                </div>
                <div className="flex justify-between border-t pt-2 text-base font-semibold">
                  <dt>Total</dt>
                  <dd data-testid={TID.cartTotal} data-price={total.toFixed(2)}>{money(total)}</dd>
                </div>
              </dl>

              <button
                type="button"
                data-testid={TID.goCheckout}
                onClick={() => {
                  cart.closeDrawer()
                  navigateTo('/checkout')
                }}
                className="sf-cta w-full bg-primary py-3.5 font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                style={{ borderRadius: 'var(--sf-radius-button)' }}
              >
                Finalizar compra
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
