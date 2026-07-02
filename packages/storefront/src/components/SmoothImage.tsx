import React from 'react'
import { useStorefrontConfigOptional, type StorefrontImageLoadingConfig } from '../config'

export interface SmoothImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  imageLoading?: StorefrontImageLoadingConfig
}

export function SmoothImage({
  imageLoading,
  loading = 'lazy',
  decoding = 'async',
  onLoad,
  style,
  ...props
}: SmoothImageProps) {
  const config = useStorefrontConfigOptional()
  const resolved = {
    ...config?.imageLoading,
    ...imageLoading,
  }
  const mode = resolved.mode ?? 'fade'
  const durationMs = resolved.durationMs ?? 420
  const easing = resolved.easing ?? 'cubic-bezier(0.22, 1, 0.36, 1)'
  const blur = resolved.blur ?? true
  const ref = React.useRef<HTMLImageElement | null>(null)
  const [loaded, setLoaded] = React.useState(mode === 'none')

  React.useEffect(() => {
    if (mode === 'none') {
      setLoaded(true)
      return
    }
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true)
  }, [mode, props.src])

  const revealStyle: React.CSSProperties =
    mode === 'none'
      ? {}
      : {
          opacity: loaded ? 1 : 0,
          filter: blur && !loaded ? 'blur(10px)' : 'blur(0px)',
          transition: `opacity ${durationMs}ms ${easing}, filter ${durationMs}ms ${easing}, transform ${durationMs}ms ${easing}`,
        }

  return (
    <img
      {...props}
      ref={ref}
      loading={loading}
      decoding={decoding}
      data-sf-image-loaded={loaded ? 'true' : 'false'}
      style={{ ...style, ...revealStyle }}
      onLoad={(event) => {
        setLoaded(true)
        onLoad?.(event)
      }}
    />
  )
}
