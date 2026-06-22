import { Phone, ArrowRight, ArrowLeft } from "lucide-react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { IberiaMap } from "@modules/assistencia/components/coverage"

/**
 * Assistência Técnica hero — dark "pro" register. Headline about keeping
 * professional equipment running, CTAs, and a CSS-only coverage motif
 * (concentric rings centred on Mirandela, no external map images).
 */
const Hero = () => {
  return (
    <div className="relative overflow-hidden py-16 sm:py-20">
      {/* Ambient glows (cyan family link + amber signal) */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-[-200px] h-[900px] w-[900px] -translate-x-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(0,173,239,.10), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-260px] right-[-160px] h-[560px] w-[560px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(255,122,26,.10), transparent 62%)",
        }}
      />

      <div className="content-container relative z-[2] grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-svc-signal">
            <span className="ind amber" />
            Assistência Técnica Higitotal
          </span>
          <h1 className="mt-5 max-w-[15ch] text-4xl font-extrabold leading-[1.04] tracking-[-0.03em] text-white sm:text-5xl lg:text-[56px]">
            A sua equipa de <span className="text-svc-signal">manutenção</span>,
            em todo o país.
          </h1>
          <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-svc-fg-muted">
            Instalamos, reparamos e mantemos o seu equipamento profissional de
            cozinha, lavandaria e limpeza. Técnicos experientes, peças originais
            e contratos de manutenção que mantêm o seu negócio a funcionar.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#pedir"
              className="inline-flex items-center gap-[10px] rounded-pill bg-svc-signal px-7 py-[15px] text-[13px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_12px_30px_rgba(255,122,26,0.32)] transition hover:-translate-y-0.5 hover:bg-svc-signal-ink"
            >
              Pedir assistência
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="tel:+351278262913"
              className="inline-flex items-center gap-[10px] rounded-pill border-[1.5px] border-svc-line bg-transparent px-7 py-[15px] text-[13px] font-bold uppercase tracking-[0.04em] text-white transition hover:-translate-y-0.5 hover:bg-svc-ground-2"
            >
              <Phone className="h-4 w-4" /> +351 278 262 913
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-[26px]">
            <div>
              <b className="block text-[26px] font-extrabold leading-none tracking-[-0.02em] text-white">
                27 anos
              </b>
              <span className="mt-1.5 block text-xs font-medium leading-snug text-svc-fg-muted">
                de experiência no terreno
              </span>
            </div>
            <div>
              <b className="block text-[26px] font-extrabold leading-none tracking-[-0.02em] text-white">
                ≈200 km
              </b>
              <span className="mt-1.5 block text-xs font-medium leading-snug text-svc-fg-muted">
                resposta prioritária no Norte
              </span>
            </div>
            <div>
              <b className="block text-[26px] font-extrabold leading-none tracking-[-0.02em] text-white">
                Nacional
              </b>
              <span className="mt-1.5 block text-xs font-medium leading-snug text-svc-fg-muted">
                cobertura em Portugal Continental
              </span>
            </div>
          </div>
        </div>

        {/* Coverage panel — the real Iberia map layered over the stylized rings */}
        <div className="relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[28px] border border-svc-line bg-svc-ground-2 p-6 sm:min-h-[420px] sm:p-9">
          {/* stylized concentric rings (decorative backdrop) */}
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-svc-line opacity-25"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-svc-line opacity-40"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-[210px] w-[210px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-svc-line opacity-50"
          />
          {/* label */}
          <span className="absolute left-6 top-6 z-[2] rounded-[14px] border border-svc-line bg-[#0f1115]/70 px-4 py-3 text-xs font-bold leading-snug text-white backdrop-blur">
            Cobertura
            <span className="mt-1 block font-medium text-svc-fg-muted">
              Sede em Mirandela
            </span>
          </span>
          {/* real map */}
          <div className="relative z-[1] w-full max-w-[400px]">
            <IberiaMap />
          </div>
        </div>
      </div>

      {/* keep the localized-link import meaningful: family link back to shop */}
      <div className="content-container relative z-[2] mt-8">
        <LocalizedClientLink
          href="/store"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.03em] text-svc-fg-muted transition hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Voltar à loja
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default Hero
