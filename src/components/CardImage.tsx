import { useEffect, useRef, useState } from 'react'
import type { ImgHTMLAttributes } from 'react'

export function CardImage({ src, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const image = useRef<HTMLImageElement>(null)
  const [nearViewport, setNearViewport] = useState(false)

  useEffect(() => {
    if (!('IntersectionObserver' in window)) {
      setNearViewport(true)
      return
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNearViewport(true)
        observer.disconnect()
      }
    }, { rootMargin: '300px' })
    if (image.current) observer.observe(image.current)
    return () => observer.disconnect()
  }, [])

  // Native lazy loading can fetch multi-megabyte posters several screens ahead.
  return <img {...props} ref={image} src={nearViewport ? src : undefined}
    data-pending={!nearViewport || undefined} loading="lazy" decoding="async" />
}
