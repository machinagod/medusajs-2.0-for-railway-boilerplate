import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import TrustBar from "@modules/home/components/trust-bar"
import CategoryCards from "@modules/home/components/category-cards"
import AtFeature from "@modules/home/components/at-feature"
import Suppliers from "@modules/home/components/suppliers"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductsList } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"

export const metadata: Metadata = {
  title: "Higitotal · Higiene profissional & assistência técnica",
  description:
    "Higiene profissional e equipamento para hotelaria, restauração e indústria, com assistência técnica nacional. Especialistas desde 1999.",
}

export default async function Home({
  params,
}: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await params
  const region = await getRegion(countryCode)

  if (!region) {
    return null
  }

  // Populate the "Em destaque" rail directly from the catalog (the store has no
  // collections), so the section is never empty. Prefer products that actually
  // have an image — the first products in default order have no thumbnail, which
  // left the rail (and the hero media) showing blank placeholders. Fall back to
  // the raw pool if too few have images.
  const {
    response: { products: pool },
  } = await getProductsList({ queryParams: { limit: 100 }, countryCode })
  const withImage = pool.filter((p) => p.thumbnail)
  const featured = (withImage.length >= 8 ? withImage : pool).slice(0, 8)

  return (
    <div className="content-container flex flex-col gap-9 py-4 small:gap-16 small:py-10">
      <div className="flex flex-col gap-3 small:gap-5">
        <Hero image={featured?.[0]?.thumbnail} />
        <TrustBar />
      </div>

      <CategoryCards />

      <section>
        <div className="mb-[18px] flex flex-col items-start gap-1 small:mb-7 small:flex-row small:items-end small:justify-between small:gap-5">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cyan">
              <span className="ind" />
              Mais vendidos
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink small:text-[34px]">
              Em destaque esta semana
            </h2>
          </div>
          <LocalizedClientLink
            href="/store"
            className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.04em] text-brand-cyan small:text-xs"
          >
            Ver tudo
            <span aria-hidden>→</span>
          </LocalizedClientLink>
        </div>
        <FeaturedProducts products={featured} region={region} />
      </section>

      <AtFeature />

      <Suppliers />
    </div>
  )
}
