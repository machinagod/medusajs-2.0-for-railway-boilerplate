"use client"

import { useEffect, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { ArrowRight } from "lucide-react"

type Slide = { title: string; blurb: string; href: string }

const SLIDES: Slide[] = [
  {
    title: "Fornos profissionais",
    blurb: "Fornos combinados Fagor para cozinha profissional.",
    href: "/collections/fornos-profissionais",
  },
  {
    title: "Máquinas de limpeza",
    blurb: "Lavadoras-secadoras e aspiradores Nilfisk e Viper.",
    href: "/collections/maquinas-de-limpeza",
  },
  {
    title: "Unilever",
    blurb: "Cif, Sun, Comfort e outras marcas profissionais Unilever.",
    href: "/collections/unilever",
  },
]

/**
 * Hero "Em destaque" card as an auto-rotating carousel over a few collections.
 * Slides are stacked + cross-faded (fixed height, no layout shift); auto-advance
 * pauses on hover, and the dots let you jump.
 */
const FeaturedCarousel = () => {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const t = setInterval(
      () => setActive((i) => (i + 1) % SLIDES.length),
      5000
    )
    return () => clearInterval(t)
  }, [paused])

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
        {SLIDES.map((s, idx) => (
          <div
            key={s.href}
            aria-hidden={idx !== active}
            className={`absolute inset-0 transition-opacity duration-500 ${
              idx === active ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-cyan">
              <span className="ind" />
              Em destaque
            </span>
            <h3 className="mt-2.5 max-w-[14ch] text-xl font-bold leading-tight tracking-tight text-brand-ink small:text-2xl">
              {s.title}
            </h3>
            <p className="mt-2 max-w-[30ch] text-[13px] font-medium leading-snug text-[#5a636c]">
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
        ))}
      </div>

      <div className="relative z-[2] mt-4 flex gap-1.5">
        {SLIDES.map((s, idx) => (
          <button
            key={s.href}
            type="button"
            onClick={() => setActive(idx)}
            aria-label={`Ver ${s.title}`}
            aria-current={idx === active}
            className={`h-1.5 rounded-full transition-all ${
              idx === active ? "w-5 bg-brand-cyan" : "w-1.5 bg-hairline"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

export default FeaturedCarousel
