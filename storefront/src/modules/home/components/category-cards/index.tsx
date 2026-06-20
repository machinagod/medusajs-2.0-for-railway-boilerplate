import LocalizedClientLink from "@modules/common/components/localized-client-link"

const CATEGORIES = [
  {
    n: "01",
    title: "Detergentes",
    desc: "Ultraconcentrados, pavimentos, cozinha e WC.",
  },
  {
    n: "02",
    title: "Utensílios de Limpeza",
    desc: "Mopas, esfregões, panos e luvas profissionais.",
  },
  {
    n: "03",
    title: "Máquinas de Limpeza",
    desc: "Lavadoras-secadoras e aspiradores Nilfisk.",
  },
  {
    n: "04",
    title: "Equipamento Hoteleiro",
    desc: "Cozinha profissional Fagor e preparação Sammic.",
  },
]

const CategoryCards = () => {
  return (
    <section>
      <div className="mb-7 flex flex-col gap-1">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cyan">
          <span className="ind" />
          Catálogo
        </span>
        <h2 className="text-3xl font-extrabold tracking-tight text-brand-ink">
          Explorar por categoria
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-5 xsmall:grid-cols-2 small:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <LocalizedClientLink
            key={cat.n}
            href="/store"
            className="group relative overflow-hidden rounded-card border border-hairline bg-white p-7 transition-all hover:-translate-y-1 hover:border-white hover:shadow-[0_18px_40px_rgba(16,24,40,0.10)]"
          >
            <span className="absolute right-7 top-7 text-[13px] font-bold text-[#c4ccd4]">
              {cat.n}
            </span>
            <span className="mb-10 flex h-14 w-14 items-center justify-center rounded-large bg-[#eaf7fe] text-2xl font-extrabold text-brand-cyan">
              {cat.title.charAt(0)}
            </span>
            <h3 className="text-lg font-bold leading-tight tracking-tight text-brand-ink">
              {cat.title}
            </h3>
            <p className="mt-1.5 text-[13px] font-medium leading-snug text-[#5a636c]">
              {cat.desc}
            </p>
            <span className="mt-4 flex h-9 w-9 items-center justify-center rounded-full border-[1.5px] border-hairline text-brand-ink transition-colors group-hover:border-brand-cyan group-hover:bg-brand-cyan group-hover:text-white">
              →
            </span>
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}

export default CategoryCards
