import React, { useEffect, useState } from 'react'
import { ChevronLeft } from 'lucide-react'
import { useProduct } from '../hooks/useProduct'
import { useCartStore } from '../stores/cart.store'
import { Link } from '../router'
import { Price } from '../components/Price'
import { QuantityInput } from '../components/QuantityInput'
import { ProductOptionSelector } from '../components/ProductOptionSelector'
import { getProductOptionGroups, type ProductOptionSelection } from '../product-options'
import { TID } from '../testids'

export function ProductDetailPage({ slug }: { slug: string }) {
  const { product, loading } = useProduct(slug)
  const addItem = useCartStore((s) => s.addItem)
  const openDrawer = useCartStore((s) => s.openDrawer)
  const [qty, setQty] = useState(1)
  const [selectedOptions, setSelectedOptions] = useState<ProductOptionSelection>({})

  const optionGroups = product ? getProductOptionGroups(product) : []

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
  const image = product.images.find((i) => i.isPrimary) ?? product.images[0]

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
          <span className="text-sm text-muted-foreground">{product.categoryName}</span>
          <h1 data-testid={TID.pdpName} className="mt-1 text-3xl font-bold tracking-tight">
            {product.name}
          </h1>
          <div className="mt-3 text-xl">
            <Price
              value={product.price}
              compareAt={product.compareAtPrice}
              testId={TID.pdpPrice}
              compareTestId={TID.pdpComparePrice}
            />
          </div>
          <p data-testid={TID.pdpDescription} className="mt-5 leading-relaxed text-muted-foreground">
            {product.description}
          </p>
          <dl className="mt-5 space-y-1 text-sm text-muted-foreground">
            {product.sku && <div>SKU: {product.sku}</div>}
            <div>{soldOut ? 'Sem estoque' : `${product.inventoryCount} em estoque`}</div>
          </dl>

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
              onClick={() => {
                addItem(product, qty, selectedOptions)
                openDrawer()
              }}
              className="sf-cta flex-1 bg-primary py-3.5 font-semibold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0"
              style={{ borderRadius: 'var(--sf-radius-button)' }}
            >
              {soldOut ? 'Esgotado' : 'Adicionar ao carrinho'}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}
