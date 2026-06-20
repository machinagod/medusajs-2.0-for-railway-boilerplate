type Service = {
  num: string
  icon: string
  title: string
  body: string
  points: string[]
}

const SERVICES: Service[] = [
  {
    num: "01",
    icon: "🔧",
    title: "Instalação",
    body: "Instalação e arranque de equipamento profissional, com configuração e formação à sua equipa.",
    points: [
      "Cozinhas e lavandaria Fagor",
      "Preparação de alimentos Sammic",
      "Máquinas de limpeza Nilfisk",
    ],
  },
  {
    num: "02",
    icon: "⚙",
    title: "Reparação",
    body: "Diagnóstico e reparação no local ou em oficina, com peças originais e garantia do serviço.",
    points: [
      "Resposta rápida a avarias",
      "Peças originais em stock",
      "Orçamento sem compromisso",
    ],
  },
  {
    num: "03",
    icon: "🗓",
    title: "Contratos de manutenção",
    body: "Manutenção preventiva planeada que reduz avarias, prolonga o equipamento e evita paragens.",
    points: [
      "Visitas periódicas programadas",
      "Prioridade no atendimento",
      "Relatórios e histórico de equipamento",
    ],
  },
]

/**
 * Three services 3-up. The maintenance contract (03) is the strategic recurring
 * offer — it gets a persistent amber border to stand out.
 */
const Services = () => {
  return (
    <section id="servicos" className="content-container py-16 sm:py-[74px]">
      <div className="mx-auto mb-12 max-w-[640px] text-center">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-svc-signal">
          <span className="ind amber" />O que fazemos
        </span>
        <h2 className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-[-0.025em] text-white sm:text-[38px]">
          Três formas de o manter a trabalhar
        </h2>
        <p className="mt-3.5 text-base leading-relaxed text-svc-fg-muted">
          Do primeiro arranque à manutenção planeada, acompanhamos o ciclo de
          vida completo do seu equipamento.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {SERVICES.map((s) => {
          const featured = s.num === "03"
          return (
            <div
              key={s.num}
              className={`group relative overflow-hidden rounded-card border bg-svc-ground-2 p-8 transition hover:-translate-y-1.5 hover:border-svc-signal ${
                featured ? "border-svc-signal" : "border-svc-line"
              }`}
            >
              <div className="text-[13px] font-extrabold leading-none tracking-[0.1em] text-svc-signal">
                {s.num}
              </div>
              <div className="my-5 flex h-[58px] w-[58px] items-center justify-center rounded-[16px] bg-svc-signal/[0.12] text-[26px] text-svc-signal">
                {s.icon}
              </div>
              <h3 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-white">
                {s.title}
              </h3>
              {featured && (
                <span className="mt-2 inline-block rounded-pill bg-svc-signal/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-svc-signal">
                  O nosso serviço estratégico
                </span>
              )}
              <p className="mt-3 text-sm leading-relaxed text-svc-fg-muted">
                {s.body}
              </p>
              <ul className="mt-[18px] list-none p-0">
                {s.points.map((p) => (
                  <li
                    key={p}
                    className="relative mb-[9px] pl-6 text-[13px] font-medium leading-snug text-svc-fg"
                  >
                    <span className="absolute left-0 top-[6px] h-[7px] w-[7px] rounded-full bg-svc-ok" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export default Services
