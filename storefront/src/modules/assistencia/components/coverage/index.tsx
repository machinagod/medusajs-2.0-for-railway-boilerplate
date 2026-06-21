const REGIONS = [
  "Trás-os-Montes",
  "Porto",
  "Braga",
  "Vila Real",
  "Bragança",
]

const STATS = [
  {
    value: "≈200 km",
    label: "raio de resposta prioritária a partir de Mirandela",
    color: "text-svc-signal",
  },
  {
    value: "Nacional",
    label: "cobertura em todo o Portugal Continental",
    color: "text-white",
  },
  {
    value: "5 distritos",
    label: "no Norte com técnico mais próximo",
    color: "text-brand-cyan",
  },
  {
    value: "Mirandela",
    label: "sede & equipa técnica",
    color: "text-svc-ok",
  },
]

/**
 * Iberian-peninsula contour (Portugal highlighted) with the Mirandela HQ marked
 * and a ~200 km priority-response ring. The SVG uses a simple equirectangular
 * projection over the peninsula's bounding box (lon −9.5…3.3, lat 36…43.8) into
 * a 504×400 viewBox, so Mirandela (≈41.48 N, 7.18 W) sits correctly in NE
 * Portugal — and the same projection places the reference cities and the ring.
 */
const IberiaMap = () => (
  <svg
    viewBox="0 0 504 400"
    role="img"
    aria-label="Mapa da Península Ibérica com Mirandela assinalada"
    className="h-auto w-full"
  >
    {/* Iberian peninsula */}
    <path
      d="M24,21 L224,15 L303,21 L504,77 L461,123 L362,221 L295,364 L154,400 L98,349 L24,349 L0,256 L32,138 Z"
      fill="rgba(255,255,255,0.05)"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    {/* Portugal, highlighted */}
    <path
      d="M25,99 L100,95 L104,169 L98,251 L83,338 L24,349 L0,256 L32,138 Z"
      fill="rgba(0,173,239,0.12)"
      stroke="rgba(0,173,239,0.55)"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />

    {/* ~200 km priority-response ring around Mirandela */}
    <circle
      cx="91"
      cy="119"
      r="93"
      fill="rgba(255,122,26,0.05)"
      stroke="rgba(255,122,26,0.45)"
      strokeWidth="1.5"
      strokeDasharray="5 6"
    />

    {/* Reference cities */}
    {[
      { cx: 35, cy: 136, name: "Porto" },
      { cx: 14, cy: 261, name: "Lisboa" },
    ].map((c) => (
      <g key={c.name}>
        <circle cx={c.cx} cy={c.cy} r="3.5" fill="rgba(255,255,255,0.5)" />
        <text
          x={c.cx + 8}
          y={c.cy + 4}
          fill="rgba(255,255,255,0.55)"
          fontSize="13"
          fontWeight="600"
        >
          {c.name}
        </text>
      </g>
    ))}

    {/* Mirandela HQ marker */}
    <g>
      <circle cx="91" cy="119" r="10" fill="rgba(255,122,26,0.25)">
        <animate
          attributeName="r"
          values="9;16;9"
          dur="2.4s"
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0.4;0;0.4"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </circle>
      <circle
        cx="91"
        cy="119"
        r="6"
        fill="#ff7a1a"
        stroke="#fff"
        strokeWidth="2"
      />
      <text
        x="103"
        y="116"
        fill="#fff"
        fontSize="15"
        fontWeight="800"
        letterSpacing="-0.3"
      >
        Mirandela
      </text>
    </g>
  </svg>
)

/**
 * Coverage section — Iberian map with the Mirandela HQ + ~200 km priority ring,
 * the served regions, and the headline coverage stats. All of mainland Portugal,
 * fastest in the north.
 */
const Coverage = () => {
  return (
    <section className="content-container pb-16 sm:pb-[74px]">
      <div className="overflow-hidden rounded-hero border border-svc-line bg-svc-ground-2 p-8 sm:p-[50px]">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:items-center">
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

          {/* Iberian map */}
          <div className="relative mx-auto w-full max-w-[460px]">
            <IberiaMap />
          </div>
        </div>

        {/* Headline stats */}
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-card border border-svc-line bg-svc-line sm:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.value} className="bg-svc-ground p-7">
              <b
                className={`block text-[32px] font-extrabold leading-none tracking-[-0.03em] sm:text-[34px] ${s.color}`}
              >
                {s.value}
              </b>
              <span className="mt-2 block text-[13px] font-medium leading-snug text-svc-fg-muted">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Coverage
