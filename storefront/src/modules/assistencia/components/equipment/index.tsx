import { BRANDS } from "@lib/brands"

/**
 * Equipment covered — brand chips plus the general hygiene/catering equipment
 * note.
 */
const Equipment = () => {
  return (
    <section className="content-container pb-16 sm:pb-[74px]">
      <div className="mx-auto mb-12 max-w-[640px] text-center">
        <span className="inline-flex items-center justify-center gap-2 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-svc-signal">
          <span className="ind amber" />
          Equipamento que assistimos
        </span>
        <h2 className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-[-0.025em] text-white sm:text-[38px]">
          As marcas com que trabalha, assistidas por quem as conhece
        </h2>
        <p className="mt-3.5 text-base leading-relaxed text-svc-fg-muted">
          Trabalhamos com as principais marcas de equipamento de cozinha,
          lavandaria e limpeza profissional — e com o restante equipamento de
          higiene e hotelaria do seu negócio.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-3.5">
        {BRANDS.map((b) => (
          <span
            key={b.name}
            className="rounded-pill border border-svc-line bg-svc-ground-2 px-[26px] py-[13px] text-base font-extrabold tracking-[-0.01em] text-[#c2cad2]"
          >
            {b.name}
          </span>
        ))}
        <span className="rounded-pill border border-dashed border-svc-line bg-svc-ground-2 px-[26px] py-[13px] text-base font-semibold tracking-[-0.01em] text-svc-fg-muted">
          + equipamento geral de higiene e catering
        </span>
      </div>
    </section>
  )
}

export default Equipment
