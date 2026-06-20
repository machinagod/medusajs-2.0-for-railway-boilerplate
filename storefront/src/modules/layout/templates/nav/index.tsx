import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

const categories = [
  { label: "Detergentes", href: "/store" },
  { label: "Utensílios de Limpeza", href: "/store" },
  { label: "Máquinas de Limpeza", href: "/store" },
  { label: "Equipamento Hoteleiro", href: "/store" },
]

export default async function Nav() {
  const regions = await listRegions().then((regions: StoreRegion[]) => regions)

  return (
    <div className="sticky top-0 inset-x-0 z-50">
      {/* Utility topbar — dark "pro" register with contacts */}
      <div className="bg-svc-ground text-[#aeb6c0]">
        <div className="content-container flex items-center justify-between gap-x-4 h-9 text-xs font-medium">
          <div className="hidden small:flex items-center gap-x-2">
            <span className="ind" />
            <span>
              Especialistas em higiene profissional desde 1999
            </span>
          </div>
          <div className="flex items-center gap-x-4 small:gap-x-5 ml-auto">
            <a
              href="tel:+351278262913"
              className="flex items-center gap-x-2 hover:text-white transition-colors"
            >
              <span aria-hidden="true">☎</span>
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
            <LocalizedClientLink
              href="/assistencia-tecnica"
              className="flex items-center gap-x-2 hover:text-white transition-colors"
              data-testid="util-assistencia-link"
            >
              <span className="ind amber" />
              <span>Assistência Técnica</span>
            </LocalizedClientLink>
          </div>
        </div>
      </div>

      {/* Main header — logo, search, account, cart */}
      <header className="bg-white/90 backdrop-blur-md border-b border-hairline">
        <div className="content-container flex items-center gap-x-4 small:gap-x-7 min-h-[72px] small:h-[84px] py-3 small:py-0 flex-wrap small:flex-nowrap">
          <LocalizedClientLink
            href="/"
            className="flex items-center shrink-0"
            data-testid="nav-store-link"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/higitotal/logo-full.png"
              alt="Higitotal"
              className="h-9 small:h-[46px] w-auto"
            />
          </LocalizedClientLink>

          {process.env.NEXT_PUBLIC_FEATURE_SEARCH_ENABLED && (
            <LocalizedClientLink
              href="/search"
              scroll={false}
              data-testid="nav-search-link"
              className="order-last small:order-none basis-full small:basis-auto flex-1 small:max-w-[520px] flex items-center gap-x-2.5 bg-white border-[1.5px] border-hairline rounded-pill pl-5 pr-1.5 py-1.5 text-fg-muted hover:border-brand-cyan focus-within:border-brand-cyan transition-colors"
            >
              <span className="flex-1 text-sm font-medium text-[#98a0a8] truncate">
                Pesquisar produtos, marcas ou referências…
              </span>
              <span className="flex-none flex items-center justify-center w-10 h-10 rounded-pill bg-brand-cyan text-white">
                <SearchIcon />
              </span>
            </LocalizedClientLink>
          )}

          <div className="flex items-center gap-x-1 small:gap-x-2 ml-auto small:ml-0">
            <LocalizedClientLink
              href="/account"
              data-testid="nav-account-link"
              className="hidden small:flex items-center gap-x-2.5 px-4 py-2.5 rounded-pill text-xs font-semibold uppercase tracking-wide text-brand-ink hover:bg-[#f1f4f7] transition-colors"
            >
              <UserIcon />
              <span>Conta</span>
            </LocalizedClientLink>

            <Suspense
              fallback={
                <LocalizedClientLink
                  href="/cart"
                  data-testid="nav-cart-link"
                  className="flex items-center gap-x-2.5 px-4 py-2.5 rounded-pill bg-brand-ink text-white text-xs font-semibold uppercase tracking-wide hover:bg-black transition-colors"
                >
                  <BagIcon />
                  <span className="hidden small:inline">Carrinho</span>
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-pill bg-brand-cyan text-white text-[11px] font-bold">
                    0
                  </span>
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>

          {/* SideMenu — small screens only */}
          <div className="small:hidden flex items-center shrink-0">
            <SideMenu regions={regions} categories={categories} />
          </div>
        </div>
      </header>

      {/* Category nav strip — horizontal scroll on mobile */}
      <nav className="bg-white border-b border-hairline">
        <div className="content-container flex items-center gap-x-1 h-[54px] overflow-x-auto no-scrollbar">
          {categories.map((cat, idx) => (
            <LocalizedClientLink
              key={`${cat.label}-${idx}`}
              href={cat.href}
              className="whitespace-nowrap flex-none px-4 py-2.5 rounded-[10px] text-[13px] font-semibold text-[#4a5560] hover:bg-[#f1f4f7] hover:text-brand-ink transition-colors"
            >
              {cat.label}
            </LocalizedClientLink>
          ))}
          <LocalizedClientLink
            href="/assistencia-tecnica"
            data-testid="nav-assistencia-link"
            className="ml-auto sticky right-0 flex-none flex items-center gap-x-2 whitespace-nowrap bg-svc-signal text-white px-4 small:px-[18px] py-2.5 rounded-pill text-xs font-bold uppercase tracking-wide hover:bg-svc-signal-ink transition-colors"
          >
            <span className="ind" style={{ background: "#fff", boxShadow: "0 0 0 3px rgba(255,255,255,.35)" }} />
            <span>Assistência Técnica</span>
          </LocalizedClientLink>
        </div>
      </nav>
    </div>
  )
}

const SearchIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
)

const UserIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const BagIcon = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
)
