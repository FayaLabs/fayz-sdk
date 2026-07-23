import React, { useEffect, useRef, useState } from 'react'
import type { Product, ProductImage, ShopProvider } from '@fayz-ai/shop'

/**
 * The product's whole gallery, not just its cover.
 *
 * plg_shop_product_images has always been a collection — sort_order, is_primary
 * — but the admin only ever exposed the single `EntityImageConfig` slot on the
 * form, so a merchant could set one photo and no more, and the storefront had
 * nothing to build a carousel from. This is the missing half.
 *
 * Deliberately not drag-and-drop: ordering is done with arrows because a
 * keyboard and a screen reader can use them, and because reordering four
 * photos of a rib is not worth a drag library.
 */
export function ProductImagesTab({ item, getProvider }: {
  item: unknown
  getProvider: () => ShopProvider
}) {
  const product = item as Product
  const [images, setImages] = useState<ProductImage[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function reload() {
    const fresh = await getProvider().getProduct(product.id)
    setImages(sortImages(fresh?.images ?? []))
  }

  useEffect(() => { void reload().catch(() => {}) }, [product.id])

  async function run(action: () => Promise<unknown>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      await reload()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return
    // Sequential, not Promise.all: each upload reads the current max sort_order
    // to place itself last, and running them together makes them all read the
    // same value and land on the same position.
    await run(async () => {
      for (const file of Array.from(files)) {
        await getProvider().uploadProductImage(product.id, file)
      }
      if (fileRef.current) fileRef.current.value = ''
    })
  }

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= images.length) return
    const a = images[index]!
    const b = images[target]!
    // Swap the two positions rather than renumbering the list: fewer writes, and
    // a failure halfway leaves an order that is still coherent.
    void run(async () => {
      const update = getProvider().updateProductImage
      if (!update) throw new Error('Este provider não suporta reordenar imagens.')
      await update(a.id, { sortOrder: b.sortOrder ?? target })
      await update(b.id, { sortOrder: a.sortOrder ?? index })
    })
  }

  const update = getProvider().updateProductImage

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Fotos do produto</h3>
          <p className="text-xs text-muted-foreground">
            A primeira foto é a capa — aparece no catálogo, no carrinho e no pedido.
            As demais viram o carrossel na página do produto.
          </p>
        </div>
        <label className="inline-flex cursor-pointer items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition hover:opacity-90">
          {busy ? 'Enviando…' : 'Adicionar fotos'}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            disabled={busy}
            className="hidden"
            onChange={(event) => void upload(event.target.files)}
          />
        </label>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      )}

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          Nenhuma foto ainda. Produtos com mais de uma foto vendem melhor — mostre a
          embalagem, o produto pronto e uma referência de tamanho.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li key={image.id} className="overflow-hidden rounded-lg border">
              <div className="relative aspect-square bg-muted">
                <img src={image.url} alt={image.altText ?? ''} className="h-full w-full object-cover" />
                {image.isPrimary && (
                  <span className="absolute left-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                    Capa
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-1 px-2 py-1.5">
                <div className="flex gap-1">
                  <IconButton label="Mover para trás" disabled={busy || index === 0}
                    onClick={() => move(index, -1)}>←</IconButton>
                  <IconButton label="Mover para frente" disabled={busy || index === images.length - 1}
                    onClick={() => move(index, 1)}>→</IconButton>
                </div>
                <div className="flex gap-1">
                  {!image.isPrimary && update && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void run(() => update(image.id, { isPrimary: true }))}
                      className="rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      Usar como capa
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => getProvider().deleteProductImage(image.id))}
                    className="rounded px-1.5 py-0.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function IconButton({ label, disabled, onClick, children }: {
  label: string
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-40"
    >
      {children}
    </button>
  )
}

/** Cover first, then the merchant's order — the same rule the storefront uses. */
function sortImages(images: ProductImage[]): ProductImage[] {
  return [...images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
}
