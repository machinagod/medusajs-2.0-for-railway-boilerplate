"use client"

import { usePathname } from "next/navigation"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type NavCategory = { label: string; href: string; icon?: string }

/**
 * Top-level category strip. Mirrors the design mock: clean text pills, the
 * active category marked with a cyan dot, and a right-aligned "Pedir
 * assistência" service pill. The active state needs the current path, so this
 * is a client component (the surrounding nav is server-rendered).
 */
const CategoryNav = ({ categories }: { categories: NavCategory[] }) => {
  const pathname = usePathname() || ""

  const isActive = (href: string) => {
    // href is "/categories/<handle>"; pathname is "/<cc>/categories/<handle>".
    const handle = href.split("/").filter(Boolean).pop()
    return !!handle && pathname.includes(`/categories/${handle}`)
  }

  return (
    <nav className="bg-white border-b border-hairline">
      <div className="content-container flex items-center gap-x-1 h-[54px] overflow-x-auto no-scrollbar">
        {categories.map((cat, idx) => {
          const active = isActive(cat.href)
          return (
            <LocalizedClientLink
              key={`${cat.label}-${idx}`}
              href={cat.href}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap flex-none inline-flex items-center gap-x-2 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold transition-colors ${
                active
                  ? "text-brand-cyan"
                  : "text-[#4a5560] hover:bg-[#f1f4f7] hover:text-brand-ink"
              }`}
            >
              {active && (
                <span className="h-[7px] w-[7px] flex-none rounded-full bg-brand-cyan shadow-[0_0_0_3px_rgba(0,173,239,0.18)]" />
              )}
              {cat.label}
            </LocalizedClientLink>
          )
        })}

        <LocalizedClientLink
          href="/assistencia-tecnica"
          data-testid="nav-assistencia-link"
          className="ml-auto flex-none inline-flex items-center gap-x-2 whitespace-nowrap bg-svc-signal text-white px-3 small:px-[18px] py-2.5 rounded-pill text-xs font-bold uppercase tracking-[0.04em] hover:bg-svc-signal-ink transition-colors"
        >
          <span className="h-2 w-2 flex-none rounded-full bg-white shadow-[0_0_0_3px_rgba(255,255,255,0.35)]" />
          <span className="hidden xsmall:inline">Pedir assistência</span>
          <span className="xsmall:hidden">Assistência</span>
        </LocalizedClientLink>
      </div>
    </nav>
  )
}

export default CategoryNav
