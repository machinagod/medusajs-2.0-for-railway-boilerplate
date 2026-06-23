import { Metadata } from "next"
import { Phone, Mail, Wrench, Truck } from "lucide-react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Apoio ao Cliente · Higitotal",
  description:
    "Ajuda com encomendas, entregas, devoluções e assistência técnica Higitotal.",
}

export default function CustomerServicePage() {
  return (
    <div className="content-container py-10 small:py-16">
      <div className="max-w-[760px]">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink small:text-[40px]">
          Apoio ao Cliente
        </h1>
        <p className="mt-4 leading-relaxed text-grey-60">
          A nossa equipa ajuda-o com encomendas, entregas, devoluções e
          equipamento. Escolha a opção mais adequada ao seu pedido.
        </p>

        <div className="mt-8 grid grid-cols-1 gap-4 small:grid-cols-2">
          <LocalizedClientLink
            href="/assistencia-tecnica"
            className="flex items-start gap-3 rounded-card border border-hairline bg-white p-5 transition-colors hover:border-brand-cyan"
          >
            <Wrench className="mt-0.5 h-5 w-5 flex-none text-brand-cyan" />
            <span>
              <b className="block text-brand-ink">Assistência técnica</b>
              <span className="text-sm text-grey-60">
                Instalação, reparação e contratos de manutenção.
              </span>
            </span>
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/contact"
            className="flex items-start gap-3 rounded-card border border-hairline bg-white p-5 transition-colors hover:border-brand-cyan"
          >
            <Truck className="mt-0.5 h-5 w-5 flex-none text-brand-cyan" />
            <span>
              <b className="block text-brand-ink">Encomendas e entregas</b>
              <span className="text-sm text-grey-60">
                Dúvidas sobre o estado de uma encomenda ou devoluções.
              </span>
            </span>
          </LocalizedClientLink>
        </div>

        <div className="mt-8 flex flex-col gap-3 text-brand-ink">
          <a
            href="tel:+351278262913"
            className="flex items-center gap-3 font-semibold transition-colors hover:text-brand-cyan"
          >
            <Phone className="h-[18px] w-[18px] text-brand-cyan" />
            +351 278 262 913
          </a>
          <a
            href="mailto:higitotal@higitotal.pt"
            className="flex items-center gap-3 font-semibold transition-colors hover:text-brand-cyan"
          >
            <Mail className="h-[18px] w-[18px] text-brand-cyan" />
            higitotal@higitotal.pt
          </a>
        </div>
      </div>
    </div>
  )
}
