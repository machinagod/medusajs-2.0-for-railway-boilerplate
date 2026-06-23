import { Metadata } from "next"
import { Phone, Mail, MapPin, ArrowRight } from "lucide-react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Contacto · Higitotal",
  description:
    "Fale com a equipa Higitotal — higiene profissional, equipamento e assistência técnica em Portugal.",
}

export default function ContactPage() {
  return (
    <div className="content-container py-10 small:py-16">
      <div className="max-w-[760px]">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink small:text-[40px]">
          Contacto
        </h1>
        <p className="mt-4 leading-relaxed text-grey-60">
          Estamos disponíveis em horário útil para questões comerciais, encomendas
          e apoio. Para pedidos de assistência técnica, utilize o formulário
          dedicado.
        </p>

        <div className="mt-8 flex flex-col gap-4 text-brand-ink">
          <a
            href="tel:+351278262913"
            className="flex items-center gap-3 font-semibold transition-colors hover:text-brand-cyan"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[#f1f4f7] text-brand-cyan">
              <Phone className="h-[18px] w-[18px]" />
            </span>
            +351 278 262 913
          </a>
          <a
            href="mailto:higitotal@higitotal.pt"
            className="flex items-center gap-3 font-semibold transition-colors hover:text-brand-cyan"
          >
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[#f1f4f7] text-brand-cyan">
              <Mail className="h-[18px] w-[18px]" />
            </span>
            higitotal@higitotal.pt
          </a>
          <div className="flex items-start gap-3 font-medium text-grey-70">
            <span className="mt-px flex h-10 w-10 flex-none items-center justify-center rounded-btn bg-[#f1f4f7] text-brand-cyan">
              <MapPin className="h-[18px] w-[18px]" />
            </span>
            <span>
              Zona Industrial, Rua J nº 137
              <br />
              5370-565 Mirandela, Portugal
            </span>
          </div>
        </div>

        <LocalizedClientLink
          href="/assistencia-tecnica"
          className="mt-8 inline-flex items-center gap-2.5 rounded-pill bg-brand-cyan px-6 py-3.5 text-[13px] font-bold uppercase tracking-[0.04em] text-white transition-transform hover:-translate-y-0.5"
        >
          Pedir assistência técnica
          <ArrowRight className="h-4 w-4" />
        </LocalizedClientLink>
      </div>
    </div>
  )
}
