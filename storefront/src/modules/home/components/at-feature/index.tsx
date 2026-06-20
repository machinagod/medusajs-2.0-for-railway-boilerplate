import LocalizedClientLink from "@modules/common/components/localized-client-link"

const PILLS = ["Instalação", "Reparação", "Contratos de manutenção"]

const AtFeature = () => {
  return (
    <section className="relative overflow-hidden rounded-hero bg-svc-ground">
      <div className="grid grid-cols-1 small:grid-cols-[1.05fr_0.95fr]">
        {/* Copy */}
        <div className="relative z-[2] px-7 py-12 text-svc-fg small:px-14 small:py-16">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-svc-signal">
            <span className="ind amber" />
            Assistência Técnica
          </span>

          <h2 className="mt-4 max-w-[16ch] text-3xl font-extrabold leading-[1.06] tracking-tight text-white small:text-[42px]">
            A sua equipa de manutenção, em todo o país.
          </h2>

          <p className="mt-5 max-w-[46ch] text-base leading-relaxed text-svc-fg-muted">
            Instalamos, reparamos e mantemos o seu equipamento profissional —
            cozinhas Fagor, preparação Sammic, máquinas Nilfisk e muito mais.
            Contratos de manutenção que garantem o funcionamento do seu negócio,
            sem paragens.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            {PILLS.map((pill) => (
              <span
                key={pill}
                className="inline-flex items-center gap-2 rounded-pill border border-svc-line bg-svc-ground-2 px-4 py-2.5 text-[13px] font-semibold text-svc-fg"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-svc-ok" />
                {pill}
              </span>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <LocalizedClientLink
              href="/assistencia-tecnica"
              className="inline-flex items-center gap-2.5 rounded-pill bg-svc-signal px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_12px_30px_rgba(255,122,26,0.32)] transition-transform hover:-translate-y-0.5 hover:bg-svc-signal-ink"
            >
              Pedir assistência
              <span aria-hidden>→</span>
            </LocalizedClientLink>
            <LocalizedClientLink
              href="/assistencia-tecnica"
              className="inline-flex items-center gap-2.5 rounded-pill border-[1.5px] border-svc-line bg-transparent px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-svc-ground-2"
            >
              Saber mais
            </LocalizedClientLink>
          </div>
        </div>

        {/* Visual */}
        <div className="relative min-h-[280px] overflow-hidden bg-svc-ground-2 small:min-h-[480px]">
          <span className="absolute left-[42%] top-[38%] h-[170px] w-[170px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-svc-line" />
          <span className="absolute left-[42%] top-[38%] h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-svc-line opacity-70" />
          <span className="absolute left-[42%] top-[38%] h-[480px] w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-svc-line opacity-40" />
          <span className="absolute left-[42%] top-[38%] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-svc-signal shadow-[0_0_0_6px_rgba(255,122,26,0.22)]" />
          <div className="absolute left-[42%] top-[38%] translate-x-4 -translate-y-9">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-white">
              Mirandela
            </span>
            <small className="mt-1 block text-[11px] font-medium normal-case tracking-[0.04em] text-svc-fg-muted">
              Sede &amp; equipa técnica
            </small>
          </div>
          <div className="absolute bottom-7 right-7 min-w-[170px] rounded-large border border-svc-line bg-[rgba(15,17,21,0.72)] px-5 py-4 text-white backdrop-blur">
            <b className="text-3xl font-extrabold tracking-tight text-white">
              ≈200<em className="not-italic text-svc-signal">km</em>
            </b>
            <span className="mt-1.5 block text-xs font-medium leading-snug text-svc-fg-muted">
              Resposta prioritária na região Norte — cobertura nacional.
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default AtFeature
