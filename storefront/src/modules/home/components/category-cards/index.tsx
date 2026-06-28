import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getNavCategoriesWithImages } from "@lib/data/categories"
import CategoryIcon from "@modules/common/icons/category-icon"
import CategoryCardCarousel from "./card-carousel"
import { ArrowRight } from "lucide-react"

const CategoryCards = async ({ countryCode }: { countryCode: string }) => {
  const categories = await getNavCategoriesWithImages(countryCode)

  if (!categories.length) {
    return null
  }

  return (
    <section>
      <div className="mb-[18px] flex flex-col items-start gap-1 small:mb-7 small:flex-row small:items-end small:justify-between small:gap-5">
        <div className="flex flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cyan">
            <span className="ind" />
            Catálogo
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink small:text-[34px]">
            Explorar por categoria
          </h2>
        </div>
        <LocalizedClientLink
          href="/store"
          className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.04em] text-brand-cyan small:text-xs"
        >
          Todas as categorias
          <span aria-hidden>→</span>
        </LocalizedClientLink>
      </div>

      <div className="grid grid-cols-2 gap-2.5 small:grid-cols-4 small:gap-5">
        {categories.map((cat, idx) => (
          <LocalizedClientLink
            key={cat.href}
            href={cat.href}
            className="group relative overflow-hidden rounded-[16px] border border-hairline bg-white p-4 transition-all hover:-translate-y-1 hover:border-white hover:shadow-[0_18px_40px_rgba(16,24,40,0.10)] small:rounded-card small:p-7"
          >
            <span className="absolute right-4 top-4 text-[13px] font-bold text-[#c4ccd4] small:right-7 small:top-7">
              {String(idx + 1).padStart(2, "0")}
            </span>
            <span className="mb-4 flex h-[42px] w-[42px] items-center justify-center rounded-[16px] bg-[#eaf7fe] text-brand-cyan small:mb-10 small:h-14 small:w-14">
              <CategoryIcon name={cat.icon} className="h-5 w-5 small:h-7 small:w-7" />
            </span>
            <h3 className="pr-12 text-[15px] font-bold leading-tight tracking-tight text-brand-ink small:pr-16 small:text-lg">
              {cat.label}
            </h3>
            <span className="mt-3 flex h-[30px] w-[30px] items-center justify-center rounded-full border-[1.5px] border-hairline text-brand-ink transition-colors group-hover:border-brand-cyan group-hover:bg-brand-cyan group-hover:text-white small:mt-4 small:h-9 small:w-9">
              <ArrowRight className="h-4 w-4" />
            </span>
            <CategoryCardCarousel images={cat.images} index={idx} />
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}

export default CategoryCards
