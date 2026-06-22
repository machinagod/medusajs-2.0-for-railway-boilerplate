import { Metadata } from "next"

import Hero from "@modules/assistencia/components/hero"
import Services from "@modules/assistencia/components/services"
import Equipment from "@modules/assistencia/components/equipment"
import Maintenance from "@modules/assistencia/components/maintenance"
import RequestForm from "@modules/assistencia/components/request-form"

export const metadata: Metadata = {
  title: "Assistência Técnica · Higitotal",
  description:
    "Instalação, reparação e contratos de manutenção de equipamento profissional de cozinha, lavandaria e limpeza. Cobertura em todo o Portugal Continental, resposta prioritária no Norte a partir de Mirandela.",
}

type Params = {
  params: {
    countryCode: string
  }
}

export default function AssistenciaTecnicaPage({}: Params) {
  return (
    <div className="bg-svc-ground text-svc-fg">
      <Hero />
      <Services />
      <Maintenance />
      <Equipment />

      <section
        id="pedir"
        className="content-container scroll-mt-32 pb-20 sm:scroll-mt-40 sm:pb-[74px]"
      >
        <RequestForm />
      </section>
    </div>
  )
}
