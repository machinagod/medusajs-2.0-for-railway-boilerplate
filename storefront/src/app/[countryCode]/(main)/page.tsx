import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import TrustBar from "@modules/home/components/trust-bar"
import CategoryCards from "@modules/home/components/category-cards"
import AtFeature from "@modules/home/components/at-feature"
import { getCollectionsWithProducts } from "@lib/data/collections"
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
  const collections = await getCollectionsWithProducts(countryCode)
  const region = await getRegion(countryCode)

  if (!collections || !region) {
    return null
  }

  return (
    <div className="content-container flex flex-col gap-14 py-9 small:gap-16 small:py-10">
      <div className="flex flex-col gap-5">
        <Hero />
        <TrustBar />
      </div>

      <CategoryCards />

      <section>
        <div className="mb-7 flex flex-col gap-1">
          <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cyan">
            <span className="ind" />
            Mais vendidos
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight text-brand-ink">
            Em destaque
          </h2>
        </div>
        <ul className="flex flex-col gap-x-6">
          <FeaturedProducts collections={collections} region={region} />
        </ul>
      </section>

      <AtFeature />
    </div>
  )
}
