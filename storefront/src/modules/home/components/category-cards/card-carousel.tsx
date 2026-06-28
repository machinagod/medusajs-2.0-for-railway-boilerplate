"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

const ROTATE_MS = 3200
/** Per-column phase offset so the grid's cards don't cross-fade in unison. */
const STAGGER_MS = 800

type Props = {
  images: string[]
  /** Card index in the grid — used to stagger the rotation phase. */
  index?: number
}

/**
 * Auto-rotating stack of a category's primary product thumbnails, pinned to the
 * bottom-right corner of a home category card. Decorative and click-through
 * (aria-hidden + pointer-events-none) so the surrounding card link still owns
 * the tap. Renders nothing when the category has no product images.
 */
const CategoryCardCarousel = ({ images, index = 0 }: Props) => {
  const [active, setActive] = useState(() =>
    images.length ? index % images.length : 0
  )

  useEffect(() => {
    if (images.length < 2) return
    let interval: ReturnType<typeof setInterval> | undefined
    // Offset the start per column, then settle into a steady interval.
    const start = setTimeout(() => {
      setActive((i) => (i + 1) % images.length)
      interval = setInterval(
        () => setActive((i) => (i + 1) % images.length),
        ROTATE_MS
      )
    }, (index % 4) * STAGGER_MS)
    return () => {
      clearTimeout(start)
      if (interval) clearInterval(interval)
    }
  }, [images.length, index])

  if (!images.length) return null

  return (
    <span
      aria-hidden
      className="pointer-events-none absolute bottom-3 right-3 h-12 w-12 overflow-hidden rounded-[12px] border border-hairline bg-white shadow-[0_8px_20px_rgba(16,24,40,0.10)] small:bottom-6 small:right-6 small:h-[68px] small:w-[68px]"
    >
      {images.map((src, idx) => (
        <Image
          key={src}
          src={src}
          alt=""
          fill
          sizes="68px"
          className={`object-contain p-1.5 transition-opacity duration-700 ${
            idx === active ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
    </span>
  )
}

export default CategoryCardCarousel
