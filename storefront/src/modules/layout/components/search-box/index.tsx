"use client"

import { useParams, useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { Search, Loader2, FileText } from "lucide-react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { search } from "@modules/search/actions"
import { SITE_PAGES, type SitePage } from "@lib/site-pages"

export type SearchCategory = {
  name: string
  handle: string
  type: "category" | "subcategory"
  parent?: string
}

// Strip accents so "assistencia" matches "Assistência", etc.
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

type ProductHit = {
  id: string
  title: string
  handle: string
  thumbnail?: string
  sku?: string
}

/**
 * Header search with a predictive dropdown: matching categories/subcategories
 * (filtered client-side) plus product hits from MeiliSearch. Each product shows
 * its Moloni reference (SKU) — the identifier the company/customers use.
 */
const SearchBox = ({
  categories = [],
  pages = SITE_PAGES,
}: {
  categories?: SearchCategory[]
  pages?: SitePage[]
}) => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode?: string }
  const cc = countryCode || process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"

  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const [products, setProducts] = useState<ProductHit[]>([])
  const [loading, setLoading] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  const q = query.trim()

  const catMatches = useMemo(() => {
    const needle = normalize(q)
    if (needle.length < 2) return []
    return categories
      .filter((c) => normalize(c.name).includes(needle))
      .slice(0, 5)
  }, [q, categories])

  // Static site pages (Assistência Técnica, Contactos, …) matched by title or
  // keyword — accent-insensitive so "assistencia"/"reparacao" both hit.
  const pageMatches = useMemo(() => {
    const needle = normalize(q)
    if (needle.length < 2) return []
    return pages
      .filter(
        (p) =>
          normalize(p.name).includes(needle) ||
          (p.keywords || []).some((k) => normalize(k).includes(needle))
      )
      .slice(0, 4)
  }, [q, pages])

  // Debounced product search (MeiliSearch via the existing server action).
  useEffect(() => {
    if (q.length < 2) {
      setProducts([])
      setLoading(false)
      return
    }
    setLoading(true)
    const t = setTimeout(async () => {
      try {
        const hits = await search(q)
        setProducts(
          (hits || []).slice(0, 6).map((h: any) => ({
            id: h.id || h.objectID,
            title: h.title,
            handle: h.handle,
            thumbnail: h.thumbnail,
            sku: Array.isArray(h.variant_sku) ? h.variant_sku[0] : h.variant_sku,
          }))
        )
      } catch {
        setProducts([])
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  // Close on outside click.
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const close = () => {
    setOpen(false)
    setQuery("")
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!q) return
    setOpen(false)
    router.push(`/${cc}/results/${encodeURIComponent(q)}`)
  }

  const showDropdown = open && q.length >= 2
  const hasResults =
    catMatches.length > 0 || pageMatches.length > 0 || products.length > 0
  const itemCls =
    "flex w-full items-center gap-3 rounded-btn px-2 py-2 text-left transition-colors hover:bg-[#f1f4f7]"
  const headingCls =
    "px-2 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[#98a0a8]"

  return (
    <div ref={boxRef} className="relative flex-1 min-w-0">
      <form
        onSubmit={onSubmit}
        role="search"
        data-testid="nav-search-form"
        className="flex items-center gap-x-2.5 rounded-pill border-[1.5px] border-hairline bg-white pl-5 pr-1.5 py-1.5 transition-colors focus-within:border-brand-cyan focus-within:shadow-[0_0_0_4px_rgba(0,173,239,0.12)]"
      >
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Pesquisar produtos ou marcas…"
          aria-label="Pesquisar"
          className="min-w-0 flex-1 bg-transparent text-sm font-medium text-brand-ink outline-none placeholder:text-[#98a0a8] [&::-webkit-search-cancel-button]:appearance-none"
        />
        <button
          type="submit"
          aria-label="Pesquisar"
          className="flex h-10 w-10 flex-none items-center justify-center rounded-pill bg-brand-cyan text-white transition-colors hover:bg-brand-cyan-ink"
        >
          <Search className="h-[18px] w-[18px]" />
        </button>
      </form>

      {showDropdown && (
        <div className="absolute inset-x-0 top-[calc(100%+8px)] z-50 max-h-[70vh] overflow-y-auto rounded-card border border-hairline bg-white shadow-[0_18px_40px_rgba(16,24,40,0.16)]">
          {catMatches.length > 0 && (
            <div className="p-2">
              <div className={headingCls}>Categorias</div>
              {catMatches.map((c) => (
                <LocalizedClientLink
                  key={`${c.type}-${c.handle}`}
                  href={`/categories/${c.handle}`}
                  onClick={close}
                  className={itemCls}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-[#eaf7fe] text-brand-cyan">
                    {c.type === "subcategory" ? "↳" : "#"}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-brand-ink">
                      {c.name}
                    </span>
                    <span className="block text-xs text-grey-50">
                      {c.type === "subcategory"
                        ? `Subcategoria${c.parent ? ` · ${c.parent}` : ""}`
                        : "Categoria"}
                    </span>
                  </span>
                </LocalizedClientLink>
              ))}
            </div>
          )}

          {pageMatches.length > 0 && (
            <div className="border-t border-hairline p-2 first:border-t-0">
              <div className={headingCls}>Páginas</div>
              {pageMatches.map((p) => (
                <LocalizedClientLink
                  key={p.href}
                  href={p.href}
                  onClick={close}
                  className={itemCls}
                >
                  <span className="flex h-9 w-9 flex-none items-center justify-center rounded-btn bg-[#eaf7fe] text-brand-cyan">
                    <FileText className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-brand-ink">
                      {p.name}
                    </span>
                    <span className="block truncate text-xs text-grey-50">
                      {p.description}
                    </span>
                  </span>
                </LocalizedClientLink>
              ))}
            </div>
          )}

          {products.length > 0 && (
            <div className="border-t border-hairline p-2">
              <div className={headingCls}>Produtos</div>
              {products.map((p) => (
                <LocalizedClientLink
                  key={p.id}
                  href={`/products/${p.handle}`}
                  onClick={close}
                  className={itemCls}
                >
                  {p.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.thumbnail}
                      alt=""
                      className="h-10 w-10 flex-none rounded-btn bg-[#f5f7f9] object-contain"
                    />
                  ) : (
                    <span className="h-10 w-10 flex-none rounded-btn bg-[#f5f7f9]" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-brand-ink">
                      {p.title}
                    </span>
                    {p.sku && (
                      <span className="block text-xs text-grey-50">
                        Ref: {p.sku}
                      </span>
                    )}
                  </span>
                </LocalizedClientLink>
              ))}
            </div>
          )}

          {hasResults ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false)
                router.push(`/${cc}/results/${encodeURIComponent(q)}`)
              }}
              className="block w-full border-t border-hairline px-4 py-3 text-left text-sm font-bold text-brand-cyan transition-colors hover:bg-[#f1f4f7]"
            >
              Ver todos os resultados para “{q}”
            </button>
          ) : loading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-6 text-sm text-grey-50">
              <Loader2 className="h-4 w-4 animate-spin" /> A pesquisar…
            </div>
          ) : (
            <div className="px-4 py-6 text-center text-sm text-grey-50">
              Sem resultados para “{q}”.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBox
