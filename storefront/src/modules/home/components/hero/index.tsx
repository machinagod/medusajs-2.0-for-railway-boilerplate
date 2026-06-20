import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="relative overflow-hidden rounded-hero bg-gradient-to-br from-brand-navy to-brand-cyan px-7 py-12 text-white small:px-13 small:py-14">
      {/* Decorative orbs */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-28 -top-28 h-[420px] w-[420px] rounded-full bg-white/10"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-40 right-16 h-80 w-80 rounded-full bg-white/[0.06]"
      />

      <div className="relative z-[2] max-w-3xl">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#bdeaff]">
          <span className="ind" />
          Desde 1999
        </span>

        <h1 className="mt-4 max-w-[15ch] text-4xl font-extrabold leading-[1.04] tracking-tight small:text-[52px]">
          Aceitamos desafios. Entregamos soluções.
        </h1>

        <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-white/90 small:text-[17px]">
          Higiene profissional e equipamento para hotelaria, restauração e
          indústria — com assistência técnica nacional e entrega rápida em
          Portugal Continental.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-2.5 rounded-pill bg-brand-ink px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-black"
          >
            Ver catálogo
            <span aria-hidden>→</span>
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/assistencia-tecnica"
            className="inline-flex items-center gap-2.5 rounded-pill border-[1.5px] border-svc-signal/80 bg-svc-signal/10 px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition-transform hover:-translate-y-0.5 hover:bg-svc-signal/25"
          >
            <span className="ind amber" />
            Pedir assistência
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default Hero
