import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getFeaturedCategories } from "@lib/data/categories"

const Hero = async () => {
  const featured = await getFeaturedCategories()
  const href = (label: string) =>
    featured.find((c) => c.label === label)?.href ?? "/store"

  return (
    <div className="grid grid-cols-1 gap-5 small:grid-cols-[1.15fr_0.85fr]">
      {/* Main cyan card */}
      <div className="relative flex min-h-0 flex-col items-start gap-5 overflow-hidden rounded-hero bg-gradient-to-br from-brand-navy to-brand-cyan px-6 py-8 text-white small:min-h-[440px] small:flex-row small:items-center small:px-13 small:py-12">
        {/* Decorative orbs (desktop only) */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-28 -top-28 hidden h-[420px] w-[420px] rounded-full bg-white/10 small:block"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-40 right-16 hidden h-80 w-80 rounded-full bg-white/[0.06] small:block"
        />

        <div className="relative z-[2] small:flex-[1_1_56%]">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#bdeaff]">
            <span className="ind" />
            Higiene profissional
          </span>

          <h1 className="mt-4 max-w-[15ch] text-[27px] font-extrabold leading-[1.04] tracking-tight small:text-[52px]">
            Aceitamos desafios. Entregamos soluções.
          </h1>

          <p className="mt-3 max-w-[42ch] text-sm leading-relaxed text-white/90 small:mt-4 small:text-[17px]">
            Produtos, equipamento e máquinas de limpeza para hotelaria,
            restauração e indústria — com stock próprio e entrega rápida em
            Portugal Continental.
          </p>

          <div className="mt-5 flex flex-col gap-2.5 small:mt-8 small:flex-row small:flex-wrap small:gap-3">
            <LocalizedClientLink
              href="/store"
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-pill bg-white px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-brand-navy shadow-lg transition-transform hover:-translate-y-0.5 small:w-auto small:justify-start"
            >
              Ver catálogo
              <span aria-hidden>→</span>
            </LocalizedClientLink>
            <LocalizedClientLink
              href={href("Equipamento Hoteleiro")}
              className="inline-flex w-full items-center justify-center gap-2.5 rounded-pill border-[1.5px] border-white/45 bg-white/[0.14] px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition-transform hover:-translate-y-0.5 hover:bg-white/25 small:w-auto small:justify-start"
            >
              Equipamento hoteleiro
            </LocalizedClientLink>
          </div>
        </div>
      </div>

      {/* Side column */}
      <div className="grid grid-cols-1 gap-3 small:grid-rows-2 small:gap-5">
        {/* Featured card */}
        <div className="relative flex flex-col justify-center overflow-hidden rounded-card border border-hairline bg-white p-5 small:p-7">
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(0,173,239,0.18),transparent_70%)]"
          />
          <div className="relative z-[2]">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-cyan">
              <span className="ind" />
              Em destaque
            </span>
            <h3 className="mt-2.5 max-w-[13ch] text-xl font-bold leading-tight tracking-tight text-brand-ink small:text-2xl">
              Detergentes ultraconcentrados
            </h3>
            <p className="mt-2 max-w-[28ch] text-[13px] font-medium leading-snug text-[#5a636c]">
              Menos embalagem, mais rendimento. Gama profissional.
            </p>
            <LocalizedClientLink
              href={href("Detergentes")}
              className="mt-4 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.04em] text-brand-ink"
            >
              Comprar
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-cyan text-white">
                →
              </span>
            </LocalizedClientLink>
          </div>
        </div>

        {/* Service card */}
        <div className="relative flex flex-col justify-center overflow-hidden rounded-card border border-svc-line bg-svc-ground p-5 text-svc-fg small:p-7">
          <span
            aria-hidden
            className="pointer-events-none absolute -bottom-8 -right-8 h-36 w-36 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(255,122,26,0.22),transparent_70%)]"
          />
          <div className="relative z-[2]">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-svc-signal">
              <span className="ind amber" />
              Assistência Técnica
            </span>
            <h3 className="mt-2.5 max-w-[13ch] text-xl font-bold leading-tight tracking-tight text-white small:text-2xl">
              Instalação, reparação e manutenção
            </h3>
            <p className="mt-2 max-w-[28ch] text-[13px] font-medium leading-snug text-svc-fg-muted">
              Técnicos certificados em todo o país. Resposta rápida no Norte.
            </p>
            <LocalizedClientLink
              href="/assistencia-tecnica"
              className="mt-4 inline-flex items-center gap-2.5 text-xs font-bold uppercase tracking-[0.04em] text-white"
            >
              Pedir assistência
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-svc-signal text-white">
                →
              </span>
            </LocalizedClientLink>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Hero
