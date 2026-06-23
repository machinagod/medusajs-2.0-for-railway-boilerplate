import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Termos e Condições · Higitotal",
  description:
    "Termos e condições de utilização e de venda da loja online Higitotal.",
}

export default function TermsOfUsePage() {
  return (
    <div className="content-container py-10 small:py-16">
      <article className="max-w-[760px] text-[15px] leading-relaxed text-grey-70">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-ink small:text-[40px]">
          Termos e Condições
        </h1>
        <p className="mt-2 text-sm text-grey-50">
          Última atualização: junho de 2026
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          1. Identificação
        </h2>
        <p className="mt-2">
          Esta loja é operada pela Higitotal — Sistemas e Produtos de Higiene,
          Lda., com sede na Zona Industrial, Rua J nº 137, 5370-565 Mirandela,
          Portugal (higitotal@higitotal.pt · +351 278 262 913).
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          2. Encomendas e preços
        </h2>
        <p className="mt-2">
          Todos os preços apresentados não incluem IVA à taxa legal em vigor, que
          é acrescentado conforme aplicável. As encomendas estão sujeitas a
          confirmação e disponibilidade. Sempre que um artigo não esteja em stock,
          poderá ser fornecido sob encomenda, com o prazo a confirmar.
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          3. Pagamento e entrega
        </h2>
        <p className="mt-2">
          O pagamento é efetuado pelos meios disponibilizados no momento da compra.
          As entregas são realizadas em Portugal Continental; os prazos e custos de
          envio são indicados durante a finalização da compra.
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          4. Devoluções
        </h2>
        <p className="mt-2">
          Aplicam-se os direitos previstos na lei. Para iniciar uma devolução ou
          troca, contacte a nossa equipa de apoio ao cliente.
        </p>

        <h2 className="mt-8 text-xl font-bold text-brand-ink">
          5. Lei aplicável
        </h2>
        <p className="mt-2">
          Os presentes termos regem-se pela lei portuguesa. Em caso de litígio, o
          consumidor pode recorrer a uma entidade de resolução alternativa de
          litígios de consumo.
        </p>
      </article>
    </div>
  )
}
