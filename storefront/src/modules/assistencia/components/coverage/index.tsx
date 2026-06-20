const REGIONS = [
  "Trás-os-Montes",
  "Porto",
  "Braga",
  "Vila Real",
  "Bragança",
]

/**
 * Coverage section — typographic / CSS-only treatment (no map images). All of
 * mainland Portugal, fastest in the north within ~200 km of Mirandela.
 */
const Coverage = () => {
  return (
    <section className="content-container pb-16 sm:pb-[74px]">
      <div className="grid grid-cols-1 gap-10 overflow-hidden rounded-hero border border-svc-line bg-svc-ground-2 p-8 sm:p-[50px] lg:grid-cols-2 lg:items-center">
        <div>
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-svc-signal">
            <span className="ind amber" />
            Onde chegamos
          </span>
          <h2 className="mt-4 max-w-[18ch] text-3xl font-extrabold leading-[1.1] tracking-[-0.025em] text-white sm:text-[34px]">
            Todo o Portugal Continental, mais rápido no Norte.
          </h2>
          <p className="mt-3.5 max-w-[46ch] text-[15px] leading-relaxed text-svc-fg-muted">
            A partir da nossa sede em Mirandela, damos resposta prioritária num
            raio de cerca de 200 km — Trás-os-Montes, Porto, Braga, Vila Real e
            Bragança. Para o resto do país, planeamos a deslocação consigo.
          </p>
          <div className="mt-6 flex flex-wrap gap-2.5">
            {REGIONS.map((r) => (
              <span
                key={r}
                className="rounded-pill border border-svc-line bg-svc-ground px-4 py-2 text-[13px] font-semibold text-svc-fg"
              >
                {r}
              </span>
            ))}
          </div>
        </div>

        {/* Big typographic stat block */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-svc-line bg-svc-line">
          <div className="bg-svc-ground p-7">
            <b className="block text-[40px] font-extrabold leading-none tracking-[-0.03em] text-svc-signal">
              ≈200 km
            </b>
            <span className="mt-2 block text-[13px] font-medium leading-snug text-svc-fg-muted">
              raio de resposta prioritária a partir de Mirandela
            </span>
          </div>
          <div className="bg-svc-ground p-7">
            <b className="block text-[40px] font-extrabold leading-none tracking-[-0.03em] text-white">
              Nacional
            </b>
            <span className="mt-2 block text-[13px] font-medium leading-snug text-svc-fg-muted">
              cobertura em todo o Portugal Continental
            </span>
          </div>
          <div className="bg-svc-ground p-7">
            <b className="block text-[40px] font-extrabold leading-none tracking-[-0.03em] text-brand-cyan">
              5 distritos
            </b>
            <span className="mt-2 block text-[13px] font-medium leading-snug text-svc-fg-muted">
              no Norte com técnico mais próximo
            </span>
          </div>
          <div className="bg-svc-ground p-7">
            <b className="block text-[40px] font-extrabold leading-none tracking-[-0.03em] text-svc-ok">
              Mirandela
            </b>
            <span className="mt-2 block text-[13px] font-medium leading-snug text-svc-fg-muted">
              sede &amp; equipa técnica
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Coverage
