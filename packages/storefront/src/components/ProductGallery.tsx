import React, { useEffect, useRef, useState } from 'react'
import type { ProductImage } from '@fayz-ai/shop/types'
import type { ProductGalleryProps } from '../component-contracts'
import { SmoothImage } from './SmoothImage'
import { TID } from '../testids'
import { storefrontComponentContracts } from '../component-selectors'

/**
 * Product gallery: one framed image, hover-to-zoom, and a thumbnail strip when
 * the product has more than one photo.
 *
 * It replaces a bare <img> that rendered only the primary image. Three things
 * were wrong with that:
 *
 *   · the frame was a grid child with the default `stretch`, so it grew to the
 *     height of the (much taller) details column and left a slab of empty dark
 *     box under a square photo;
 *   · `plg_shop_product_images` has always been a collection with sort_order and
 *     is_primary, and every extra photo a merchant uploaded was invisible;
 *   · zooming is table stakes for anything sold by its looks — food especially.
 *
 * Zoom is pointer-driven: the transform origin follows the cursor, so the part
 * under the pointer is the part magnified. Disabled on coarse pointers, where
 * there is no hover and a stuck 2× would just be a broken image.
 */
export function ProductGallery({ product, images, primaryImage }: ProductGalleryProps) {
  const ordered = orderImages(images, primaryImage)
  const [index, setIndex] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const canHover = useCanHover()

  // A different product (client-side navigation) must not keep the previous
  // product's selected slide.
  useEffect(() => { setIndex(0); setZoom(null) }, [product.id])

  const current = ordered[Math.min(index, ordered.length - 1)]

  function trackPointer(event: React.MouseEvent<HTMLDivElement>) {
    if (!canHover) return
    const frame = frameRef.current
    if (!frame) return
    const rect = frame.getBoundingClientRect()
    setZoom({
      x: ((event.clientX - rect.left) / rect.width) * 100,
      y: ((event.clientY - rect.top) / rect.height) * 100,
    })
  }

  function step(delta: number) {
    if (ordered.length < 2) return
    setIndex((current) => (current + delta + ordered.length) % ordered.length)
    setZoom(null)
  }

  return (
    <div className="flex flex-col gap-3 self-start">
      <div
        {...storefrontComponentContracts.productDetail.gallery}
        ref={frameRef}
        // `self-start` above and a fixed aspect here: the frame is sized by the
        // image, never by whatever the column beside it happens to contain.
        className="group relative aspect-square w-full overflow-hidden border bg-muted"
        style={{ borderRadius: 'var(--sf-radius-card)' }}
        onMouseMove={trackPointer}
        onMouseLeave={() => setZoom(null)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowRight') step(1)
          if (event.key === 'ArrowLeft') step(-1)
        }}
        tabIndex={ordered.length > 1 ? 0 : -1}
        role={ordered.length > 1 ? 'group' : undefined}
        aria-label={ordered.length > 1 ? `Imagens de ${product.name}` : undefined}
      >
        {/*
          The transform lives on a wrapper, not on the image: SmoothImage writes
          its own inline `transition` for the load fade (SmoothImage.tsx:52,
          spread AFTER any style passed in), which would have stretched the zoom
          to 420ms and left it visibly lagging the cursor.
        */}
        {current && (
          <div
            className="h-full w-full transition-transform duration-150 ease-out"
            style={zoom
              ? { transform: 'scale(2)', transformOrigin: `${zoom.x}% ${zoom.y}%` }
              : { transform: 'scale(1)' }}
          >
            <SmoothImage
              key={current.id}
              src={current.url}
              alt={current.altText ?? product.name}
              data-testid={TID.pdpGalleryImage}
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {ordered.length > 1 && (
          <>
            <GalleryArrow side="left" onClick={() => step(-1)} />
            <GalleryArrow side="right" onClick={() => step(1)} />
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white">
              {index + 1}/{ordered.length}
            </span>
          </>
        )}
      </div>

      {ordered.length > 1 && (
        <ul data-testid={TID.pdpGalleryThumbs} className="flex gap-2 overflow-x-auto pb-1">
          {ordered.map((image, position) => (
            <li key={image.id}>
              <button
                type="button"
                data-testid={TID.pdpGalleryThumb}
                data-index={position}
                aria-label={`Imagem ${position + 1} de ${ordered.length}`}
                aria-current={position === index}
                onClick={() => { setIndex(position); setZoom(null) }}
                className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border transition ${
                  position === index ? 'border-primary ring-2 ring-primary/20' : 'border-border opacity-70 hover:opacity-100'
                }`}
              >
                <img src={image.url} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Primary first, then sort_order — the order the merchant set in the admin. */
function orderImages(images: ProductImage[], primary?: ProductImage): ProductImage[] {
  const all = images.length > 0 ? images : primary ? [primary] : []
  return [...all].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return (a.sortOrder ?? 0) - (b.sortOrder ?? 0)
  })
}

/**
 * Whether the device actually has a hover-capable pointer. On a phone every
 * element is permanently "hovered" by some emulations, which would leave the
 * photo stuck at 2× with no way back.
 */
function useCanHover(): boolean {
  const [canHover, setCanHover] = useState(false)
  useEffect(() => {
    const query = window.matchMedia?.('(hover: hover) and (pointer: fine)')
    if (!query) return
    setCanHover(query.matches)
    const onChange = (event: MediaQueryListEvent) => setCanHover(event.matches)
    query.addEventListener?.('change', onChange)
    return () => query.removeEventListener?.('change', onChange)
  }, [])
  return canHover
}

function GalleryArrow({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={side === 'left' ? 'Imagem anterior' : 'Próxima imagem'}
      className={`absolute top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-background/80 opacity-0 shadow-md backdrop-blur transition hover:bg-background focus:opacity-100 group-hover:opacity-100 ${
        side === 'left' ? 'left-3' : 'right-3'
      }`}
    >
      <span aria-hidden className="text-lg leading-none">{side === 'left' ? '‹' : '›'}</span>
    </button>
  )
}
