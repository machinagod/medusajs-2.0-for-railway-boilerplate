import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { getNavCategories } from "@lib/data/categories"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import CategoryNav from "@modules/layout/components/category-nav"
import SearchBox from "@modules/layout/components/search-box"
import { Phone, User, ShoppingBag, Wrench } from "lucide-react"

export default async function Nav() {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)
  const categories = await getNavCategories()

  const cartFallback = (
    <LocalizedClientLink
      href="/cart"
      data-testid="nav-cart-link"
      className="flex items-center gap-x-1.5 small:gap-x-2.5 px-3 small:px-4 py-2.5 rounded-pill bg-brand-ink text-white text-xs font-semibold uppercase tracking-wide hover:bg-black transition-colors"
    >
      <ShoppingBag className="h-[18px] w-[18px]" />
      <span className="hidden small:inline">Carrinho</span>
      <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-pill bg-brand-cyan text-white text-[11px] font-bold">
        0
      </span>
    </LocalizedClientLink>
  )

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {/* Utility topbar — dark "pro" register with contacts */}
      <div className="bg-svc-ground text-[#aeb6c0]">
        <div className="content-container flex items-center justify-between gap-x-3 h-9 text-xs font-medium">
          {/* Left — contacts */}
          <div className="flex min-w-0 items-center gap-x-4 small:gap-x-5">
            <a
              href="tel:+351278262913"
              className="flex items-center gap-x-2 hover:text-white transition-colors"
            >
              <Phone className="h-3.5 w-3.5" />
              <span className="font-semibold text-white">
                +351 278 262 913
              </span>
            </a>
            <a
              href="mailto:higitotal@higitotal.pt"
              className="hidden xsmall:inline hover:text-white transition-colors"
            >
              higitotal@higitotal.pt
            </a>
            <span className="hidden small:flex items-center gap-x-2">
              <span className="ind" />
              Especialistas em higiene profissional desde 1999
            </span>
          </div>
          {/* Right — assistência chip */}
          <LocalizedClientLink
            href="/assistencia-tecnica"
            className="inline-flex shrink-0 items-center gap-x-1.5 rounded-pill bg-svc-signal px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-svc-signal-ink"
            data-testid="util-assistencia-link"
          >
            <Wrench className="h-3 w-3" />
            Assistência Técnica
          </LocalizedClientLink>
        </div>
      </div>

      {/* Main header — logo, search, account, cart */}
      <header className="bg-white/90 backdrop-blur-md border-b border-hairline">
        <div className="content-container flex items-center gap-x-3 small:gap-x-7 min-h-[60px] small:h-[84px] py-2 small:py-0 flex-wrap small:flex-nowrap">
          <LocalizedClientLink
            href="/"
            className="flex items-center shrink-0"
            data-testid="nav-store-link"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/higitotal/logo-full-transparent.png"
              alt="Higitotal"
              className="h-8 small:h-[46px] w-auto"
            />
          </LocalizedClientLink>

          {/* Hamburger — mobile only, pinned right on the logo row */}
          <div className="small:hidden flex items-center shrink-0 ml-auto">
            <SideMenu regions={regions} categories={categories} />
          </div>

          {/* Search + cart. On mobile this is its own full-width row with the
              cart pinned to the right of the search; on desktop it's the middle
              search field (the cart shows in the account group instead). */}
          <div className="order-last small:order-none basis-full small:basis-auto small:flex-1 small:max-w-[520px] flex items-center gap-x-2">
            <SearchBox />
            <div className="small:hidden shrink-0">
              <Suspense fallback={cartFallback}>
                <CartButton />
              </Suspense>
            </div>
          </div>

          {/* Account + cart — desktop only, right-aligned */}
          <div className="hidden small:flex items-center gap-x-2 ml-auto">
            <LocalizedClientLink
              href="/account"
              data-testid="nav-account-link"
              className="flex items-center gap-x-2.5 px-4 py-2.5 rounded-pill text-xs font-semibold uppercase tracking-wide text-brand-ink hover:bg-[#f1f4f7] transition-colors"
            >
              <User className="h-[18px] w-[18px]" />
              <span>Conta</span>
            </LocalizedClientLink>
            <Suspense fallback={cartFallback}>
              <CartButton />
            </Suspense>
          </div>
        </div>
      </header>

      {/* Category nav strip — dynamic top-level categories, active-aware */}
      <CategoryNav categories={categories} />
    </div>
  )
}
