import React, { useEffect, useState } from 'react'
import { ChevronLeft, RefreshCcw, ShieldCheck, Truck } from 'lucide-react'
import { useProduct } from '../hooks/useProduct'
import { useCartStore } from '../stores/cart.store'
import { useStorefrontConfig } from '../config'
import { useStorefrontHead } from '../hooks/useStorefrontHead'
import { Link } from '../router'
import { Price } from '../components/Price'
import { QuantityInput } from '../components/QuantityInput'
import { ProductOptionSelector } from '../components/ProductOptionSelector'
import { ProductSpecs } from '../components/ProductSpecs'
import { RelatedProducts } from '../components/RelatedProducts'
import { getProductOptionGroups, type ProductOptionSelection } from '../product-options'
import { TID } from '../testids'

export function ProductDetailPage({ slug }: { slug: string }) {
  const config = useStorefrontConfig()
  const { product, loading } = useProduct(slug)
  const addItem = useCartStore((s) => s.addItem)
  const [qty, setQty] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<ProductOptionSelection>({})

  const optionGroups = product ? getProductOptionGroups(product) : []
  useStorefrontHead({
    title: product ? `${product.name} — ${config.name}` : config.name,
    description: product?.description,
  })

  useEffect(() => {
    if (!product) return
    const defaults = Object.fromEntries(
      getProductOptionGroups(product).map((group) => [group.label, group.values[0] ?? '']),
    )
    setSelectedOptions(defaults)
  }, [product?.id])

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="grid animate-pulse gap-10 md:grid-cols-2">
          <div className="aspect-square rounded-2xl bg-muted" />
          <div className="space-y-4 py-4">
            <div className="h-8 w-3/4 rounded bg-muted" />
            <div className="h-6 w-1/3 rounded bg-muted" />
            <div className="h-24 rounded bg-muted" />
          </div>
        </div>
      </main>
    )
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6">
        <p className="text-lg text-muted-foreground">Produto não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Voltar à loja</Link>
      </main>
    )
  }

  const soldOut = product.inventoryCount <= 0
  const lowStock = !soldOut && product.inventoryCount <= 5
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0]
  const discountPct =
    product.compareAtPrice && product.compareAtPrice > product.price
      ? Math.round((1 - product.price / product.compareAtPrice) * 100)
      : 0

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Continuar comprando
      </Link>

      <div className="grid animate-fade-up gap-10 md:grid-cols-2">
        <div className="group overflow-hidden border bg-muted" style={{ borderRadius: 'var(--sf-radius-card)' }}>
          {image && (
            <img
              src={image.url}
              alt={image.altText ?? product.name}
              className="aspect-square w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          )}
        </div>

        <div className="flex flex-col py-2 lg:sticky lg:top-24 lg:self-start">
          <nav className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">Início</Link>
            {product.categoryName && (
              <>
                <span aria-hidden>/</span>
                <span>{product.categoryName}</span>
              </>
            )}
            <span aria-hidden>/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>

          <h1 data-testid={TID.pdpName} className="sf-heading text-3xl font-bold tracking-tight">
            {product.name}
          </h1>

          <div className="mt-3 flex items-center gap-3">
            <div className="text-xl">
              <Price
                value={product.price}
                compareAt={product.compareAtPrice}
                testId={TID.pdpPrice}
                compareTestId={TID.pdpComparePrice}
              />
            </div>
            {discountPct > 0 && (
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                −{discountPct}%
              </span>
            )}
          </div>

          <p data-testid={TID.pdpDescription} className="mt-5 leading-relaxed text-muted-foreground">
            {product.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            {soldOut ? (
              <span className="inline-flex items-center gap-2 font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" /> Sem estoque
              </span>
            ) : lowStock ? (
              <span className="inline-flex items-center gap-2 font-semibold text-amber-600">
                <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                Últimas unidades — só {product.inventoryCount} restantes
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 font-medium text-emerald-600">
                <span className="h-2 w-2 rounded-full bg-emerald-500" /> Em estoque
              </span>
            )}
            {product.sku && <span className="text-muted-foreground">SKU: {product.sku}</span>}
          </div>

          <ProductOptionSelector
            groups={optionGroups}
            value={selectedOptions}
            onChange={setSelectedOptions}
          />

          <div className="mt-8 flex items-center gap-4">
            <QuantityInput
              value={qty}
              onChange={setQty}
              max={soldOut ? 1 : product.inventoryCount}
              testId={TID.pdpQtyInput}
            />
            <button
              type="button"
              data-testid={TID.pdpAddToCart}
              disabled={soldOut}
              onClick={() => addItem(product, qty, selectedOptions)}
              className="sf-cta flex-1 bg-primary py-3.5 font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
              style={{ borderRadius: 'var(--sf-radius-button)' }}
            >
              {soldOut ? 'Esgotado' : 'Adicionar ao carrinho'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 border-t pt-6 text-center">
            <div className="flex flex-col items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Truck className="h-5 w-5 text-primary" /> Envio rápido
            </div>
            <div className="flex flex-col items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <RefreshCcw className="h-5 w-5 text-primary" /> Troca fácil
            </div>
            <div className="flex flex-col items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <ShieldCheck className="h-5 w-5 text-primary" /> Pagamento seguro
            </div>
          </div>
        </div>
      </div>

      <ProductSpecs product={product} />
      <RelatedProducts product={product} />
    </main>
  )
}
