import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade · Higitotal",
  description:
    "Como a Higitotal recolhe, utiliza e protege os seus dados pessoais.",
}

export default function PrivacyPolicyPage() {
  return (
    <div className="content-container py-10 small:py-16">
      <article className="max-w-[760px] text-[15px] leading-relaxed text-grey-70">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink small:text-[40px]">
          Política de Privacidade
        </h1>
        <p className="mt-2 text-sm text-grey-50">
          Última atualização: junho de 2026
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          1. Responsável pelo tratamento
        </h2>
        <p className="mt-2">
          A Higitotal — Sistemas e Produtos de Higiene, Lda., com sede na Zona
          Industrial, Rua J nº 137, 5370-565 Mirandela, Portugal, é responsável
          pelo tratamento dos dados pessoais recolhidos através deste sítio.
          Contacto: higitotal@higitotal.pt · +351 278 262 913.
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          2. Que dados recolhemos
        </h2>
        <p className="mt-2">
          Dados de identificação e contacto (nome, email, telefone, empresa),
          morada de envio e faturação, e informação relativa a encomendas e
          pedidos de assistência que nos submeta.
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          3. Finalidades e fundamento
        </h2>
        <p className="mt-2">
          Os dados são tratados para processar e entregar encomendas, prestar
          assistência técnica, responder a contactos e cumprir obrigações legais
          (designadamente fiscais). O tratamento assenta na execução do contrato,
          no cumprimento de obrigações legais e no interesse legítimo da Higitotal.
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          4. Conservação
        </h2>
        <p className="mt-2">
          Os dados são conservados pelo período necessário às finalidades acima e
          pelos prazos legais aplicáveis (nomeadamente em matéria contabilística e
          fiscal).
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          5. Os seus direitos
        </h2>
        <p className="mt-2">
          Pode exercer os direitos de acesso, retificação, apagamento, limitação,
          portabilidade e oposição, bem como retirar consentimentos, contactando
          higitotal@higitotal.pt. Tem ainda o direito de apresentar reclamação à
          Comissão Nacional de Proteção de Dados (CNPD).
        </p>
      </article>
    </div>
  )
}
