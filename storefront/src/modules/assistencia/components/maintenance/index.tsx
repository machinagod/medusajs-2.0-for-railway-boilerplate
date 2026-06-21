import { Check, ArrowRight } from "lucide-react"

const POINTS = [
  {
    title: "Manutenção preventiva",
    body: "Visitas planeadas que antecipam avarias antes de pararem a operação.",
  },
  {
    title: "Prioridade de resposta",
    body: "Clientes com contrato são atendidos em primeiro lugar.",
  },
  {
    title: "Custo previsível",
    body: "Plano anual sem surpresas, adaptado ao seu equipamento.",
  },
  {
    title: "Histórico completo",
    body: "Registo de cada intervenção e estado de cada máquina.",
  },
]

/**
 * Maintenance-contract highlight block — the strategic recurring offer. Uses the
 * cyan family link as accent (eyebrow) to tie it to the brand.
 */
const Maintenance = () => {
  return (
    <section className="content-container pb-16 sm:pb-[74px]">
      <div className="grid grid-cols-1 overflow-hidden rounded-hero border border-svc-line bg-svc-ground-2 lg:grid-cols-2">
        <div className="p-8 sm:p-[50px]">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-brand-cyan">
            <span className="ind" />
            Contrato de manutenção
          </span>
          <h2 className="mt-4 max-w-[16ch] text-3xl font-extrabold leading-[1.1] tracking-[-0.025em] text-white sm:text-[34px]">
            Menos paragens. Mais tranquilidade.
          </h2>
          <p className="mt-3.5 max-w-[44ch] text-[15px] leading-relaxed text-svc-fg-muted">
            O contrato de manutenção é a forma mais inteligente de proteger o
            investimento em equipamento profissional. Nós tratamos da
            manutenção; você concentra-se no negócio.
          </p>
          <div className="mt-6">
            <a
              href="#pedir"
              className="inline-flex items-center gap-[10px] rounded-pill bg-svc-signal px-7 py-[15px] text-[13px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_12px_30px_rgba(255,122,26,0.32)] transition hover:-translate-y-0.5 hover:bg-svc-signal-ink"
            >
              Falar com a equipa
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="flex flex-col justify-center gap-[18px] bg-[#0e1116] p-8 sm:p-[50px]">
          {POINTS.map((p) => (
            <div key={p.title} className="flex items-start gap-4">
              <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-[9px] bg-svc-ok/[0.14] text-svc-ok">
                <Check className="h-[15px] w-[15px]" />
              </span>
              <div>
                <b className="text-[15px] font-bold leading-snug text-white">
                  {p.title}
                </b>
                <span className="mt-[3px] block text-[13px] leading-snug text-svc-fg-muted">
                  {p.body}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Maintenance
