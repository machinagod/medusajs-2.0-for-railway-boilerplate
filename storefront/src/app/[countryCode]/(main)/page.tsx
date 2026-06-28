import { Metadata } from "next"
import { HttpTypes } from "@medusajs/types"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import TrustBar from "@modules/home/components/trust-bar"
import CategoryCards from "@modules/home/components/category-cards"
import AtFeature from "@modules/home/components/at-feature"
import Suppliers from "@modules/home/components/suppliers"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getProductsList } from "@lib/data/products"
import { getCollectionByHandle } from "@lib/data/collections"
import { getRegion } from "@lib/data/regions"
import { SLIDES } from "@modules/home/components/hero/featured-slides"
import { canonicalUrl, SITE_DESCRIPTION, SITE_NAME } from "@lib/util/seo"

const FEATURED_COLLECTION = "fornos-profissionais"

export async function generateMetadata(): Promise<Metadata> {
  const canonical = await canonicalUrl("")
  const title = `${SITE_NAME} · Higiene profissional & assistência técnica`

  return {
    title: { absolute: title },
    description: SITE_DESCRIPTION,
    alternates: { canonical },
    openGraph: {
      type: "website",
      title,
      description: SITE_DESCRIPTION,
      url: canonical,
    },
  }
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

  // Drive the "Em destaque" rail from the Fornos Profissionais collection.
  // Falls back to image-bearing catalog products if the collection is missing or
  // empty, so the section is never blank.
  const collection = await getCollectionByHandle(FEATURED_COLLECTION).catch(
    () => null
  )
  let featured: HttpTypes.StoreProduct[] = []
  if (collection?.id) {
    const {
      response: { products },
    } = await getProductsList({
      queryParams: { collection_id: [collection.id], limit: 8 } as any,
      countryCode,
    })
    featured = products
  }
  if (!featured.length) {
    const {
      response: { products: pool },
    } = await getProductsList({ queryParams: { limit: 100 }, countryCode })
    const withImage = pool.filter((p) => p.thumbnail)
    featured = (withImage.length >= 8 ? withImage : pool).slice(0, 8)
  }

  // Resolve a representative product image per hero carousel collection so the
  // "Em destaque" carousel shows product imagery — including on mobile, where the
  // big hero shot is hidden. Empty/draft collections resolve to undefined, leaving
  // that slide text-only.
  const carouselImages = Object.fromEntries(
    await Promise.all(
      SLIDES.map(async (slide) => {
        const slideCollection = await getCollectionByHandle(slide.handle).catch(
          () => null
        )
        if (!slideCollection?.id) {
          return [slide.handle, undefined] as const
        }
        const {
          response: { products: slideProducts },
        } = await getProductsList({
          queryParams: { collection_id: [slideCollection.id], limit: 1 } as any,
          countryCode,
        })
        return [
          slide.handle,
          slideProducts.find((p) => p.thumbnail)?.thumbnail,
        ] as const
      })
    )
  )

  return (
    <div className="content-container flex flex-col gap-6 py-3 small:gap-16 small:py-10">
      <div className="flex flex-col gap-2.5 small:gap-5">
        <Hero
          image={featured?.[0]?.thumbnail}
          carouselImages={carouselImages}
        />
        <TrustBar />
      </div>

      <CategoryCards countryCode={countryCode} />

      <section>
        <div className="mb-3 flex flex-col items-start gap-1 small:mb-7 small:flex-row small:items-end small:justify-between small:gap-5">
          <div className="flex flex-col gap-1">
            <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-brand-cyan">
              <span className="ind" />
              Em destaque
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-brand-ink small:text-[34px]">
              Fornos profissionais
            </h2>
          </div>
          <LocalizedClientLink
            href={`/collections/${FEATURED_COLLECTION}`}
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
