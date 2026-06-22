"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight } from "lucide-react"
import { SLIDES } from "@modules/home/components/hero/featured-slides"

const SLIDE_MS = 5000

type FeaturedCarouselProps = {
  // Representative product image per slide, keyed by collection handle. Resolved
  // server-side; a slide with no image (e.g. an empty/draft collection) renders
  // text-only.
  images?: Record<string, string | undefined>
}

/**
 * Hero "Em destaque" card as an auto-rotating carousel over a few collections.
 * Slides are stacked + cross-faded (fixed height, no layout shift); auto-advance
 * pauses on hover, and the dots let you jump. Each slide shows a product image
 * (when available) on all breakpoints, so mobile gets imagery the desktop-only
 * hero shot doesn't provide.
 */
const FeaturedCarousel = ({ images }: FeaturedCarouselProps) => {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  // setTimeout keyed on [paused, active] so the timer restarts whenever the slide
  // changes (auto-advance or manual), keeping it in sync with the progress bar.
  useEffect(() => {
    if (paused) return
    const t = setTimeout(
      () => setActive((i) => (i + 1) % SLIDES.length),
      SLIDE_MS
    )
    return () => clearTimeout(t)
  }, [paused, active])

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-card border border-hairline bg-white p-5 small:p-7"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(0,173,239,0.18),transparent_70%)]"
      />

      <div className="relative z-[2] min-h-[160px] small:min-h-[170px]">
        {SLIDES.map((s, idx) => {
          const image = images?.[s.handle]
          return (
            <div
              key={s.href}
              aria-hidden={idx !== active}
              className={`absolute inset-0 flex items-center gap-4 transition-opacity duration-500 ${
                idx === active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <div className="min-w-0 flex-1">
                <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-cyan">
                  <span className="ind" />
                  Em destaque
                </span>
                <h3 className="mt-2.5 max-w-[14ch] text-xl font-bold leading-tight tracking-tight text-brand-ink small:text-2xl">
                  {s.title}
                </h3>
                <p className="mt-2 max-w-[26ch] text-[13px] font-medium leading-snug text-[#5a636c]">
                  {s.blurb}
                </p>
                <LocalizedClientLink
                  href={s.href}
                  className="mt-4 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.04em] text-brand-ink"
                >
                  Comprar
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-cyan text-white">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </LocalizedClientLink>
              </div>

              {image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={image}
                  alt=""
                  aria-hidden
                  className="h-24 w-24 shrink-0 self-center rounded-card object-contain small:h-28 small:w-28"
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="relative z-[2] mt-4 flex items-center gap-1.5">
        {SLIDES.map((s, idx) => (
          <button
            key={s.href}
            type="button"
            onClick={() => setActive(idx)}
            aria-label={`Ver ${s.title}`}
            aria-current={idx === active}
            className={`relative h-1.5 overflow-hidden rounded-full bg-hairline transition-all ${
              idx === active ? "w-7" : "w-1.5"
            }`}
          >
            {idx === active && (
              // Fills left→right over the auto-advance interval to show progress
              // to the next slide; freezes while the carousel is paused (hover).
              <span
                className="absolute inset-0 origin-left rounded-full bg-brand-cyan"
                style={{
                  animation: `carousel-progress ${SLIDE_MS}ms linear forwards`,
                  animationPlayState: paused ? "paused" : "running",
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default FeaturedCarousel
