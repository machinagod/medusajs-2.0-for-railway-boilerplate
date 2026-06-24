import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CurrencyDollar } from "@medusajs/icons"
import { Badge, Container, Heading, Input, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

type Price = {
  price?: number | null
  unit_price?: number | null
  our_price?: number | null
  currency_code?: string
  status?: string
  scraped_at?: string
}
type Row = {
  id: string
  product_id?: string | null
  competitor?: { name?: string } | null
  title?: string | null
  product_sku?: string | null
  competitor_url?: string | null
  match_status?: string
  match_score?: number | null
  pack_label?: string | null
  last_error?: string | null
  latest_price?: Price | null
}
type Product = { title: string; sku: string | null; our_price: number | null }

const money = (minor?: number | null, cur = "EUR") =>
  minor == null ? "—" : `${(minor / 100).toFixed(2)} ${cur}`

type Group = { product_id: string; product?: Product; rows: Row[]; ourPrice: number | null }

const CompetitorPricesPage = () => {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["competitor-products"],
    queryFn: () =>
      sdk.client.fetch<{ competitor_products: Row[]; products: Record<string, Product> }>(
        "/admin/competitor-products",
        { method: "GET" }
      ),
  })

  const groups = useMemo<Group[]>(() => {
    const rows = data?.competitor_products ?? []
    const products = data?.products ?? {}
    const byProduct = new Map<string, Row[]>()
    for (const r of rows) {
      const key = r.product_id ?? "_unmatched"
      if (!byProduct.has(key)) byProduct.set(key, [])
      byProduct.get(key)!.push(r)
    }
    let gs: Group[] = [...byProduct.entries()].map(([product_id, rs]) => {
      const product = products[product_id]
      const ourPrice =
        product?.our_price ??
        rs.find((r) => r.latest_price?.our_price != null)?.latest_price?.our_price ??
        null
      return { product_id, product, rows: rs, ourPrice }
    })
    const q = search.trim().toLowerCase()
    if (q) {
      gs = gs.filter((g) =>
        [g.product?.title, g.product?.sku, ...g.rows.map((r) => r.competitor?.name), ...g.rows.map((r) => r.title)]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
    }
    return gs.sort((a, b) => (a.product?.title ?? "").localeCompare(b.product?.title ?? ""))
  }, [data, search])

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <Heading>Competitor Prices</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Competitor listings grouped by our product — our price vs each competitor.
          </Text>
        </div>
        <Input
          type="search"
          placeholder="Search product / SKU / competitor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-72"
        />
      </div>

      {isLoading && (
        <div className="px-4 py-6 md:px-6">
          <Text size="small">Loading…</Text>
        </div>
      )}
      {!isLoading && groups.length === 0 && (
        <div className="px-4 py-6 md:px-6">
          <Text size="small" className="text-ui-fg-subtle">
            No competitor mappings yet.
          </Text>
        </div>
      )}

      {groups.map((g) => (
        <ProductGroup key={g.product_id} group={g} />
      ))}
    </Container>
  )
}

const ProductGroup = ({ group }: { group: Group }) => {
  const { product, rows, ourPrice } = group
  const title = product?.title ?? rows[0]?.title ?? group.product_id
  const sku = product?.sku ?? rows[0]?.product_sku
  return (
    <div className="px-4 py-4 md:px-6">
      {/* Heading: our product + our price, wraps cleanly on mobile */}
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <Text weight="plus" className="truncate">
            {title}
          </Text>
          {sku ? <Badge size="2xsmall">{sku}</Badge> : null}
        </div>
        <div className="flex items-baseline gap-x-1.5 whitespace-nowrap">
          <Text size="xsmall" className="text-ui-fg-muted">
            Our price
          </Text>
          <Text weight="plus">{money(ourPrice)}</Text>
        </div>
      </div>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {rows.length} competitor{rows.length === 1 ? "" : "s"}
      </Text>

      <div className="mt-2">
        {rows
          .slice()
          .sort((a, b) => deltaOf(a, ourPrice) - deltaOf(b, ourPrice))
          .map((r) => (
            <CompetitorRow key={r.id} row={r} ourPrice={ourPrice} />
          ))}
      </div>
    </div>
  )
}

const deltaOf = (r: Row, ourPrice: number | null): number => {
  const lp = r.latest_price
  const comp = lp?.status === "ok" ? lp.unit_price ?? lp.price ?? null : null
  if (comp == null || !ourPrice) return Number.POSITIVE_INFINITY
  return ((comp - ourPrice) / ourPrice) * 100
}

const CompetitorRow = ({ row, ourPrice }: { row: Row; ourPrice: number | null }) => {
  const lp = row.latest_price
  const comp = lp?.status === "ok" ? lp.unit_price ?? lp.price ?? null : null
  const d = comp != null && ourPrice ? ((comp - ourPrice) / ourPrice) * 100 : null
  return (
    <div className="flex items-center justify-between gap-x-3 border-t border-ui-border-base py-2 first:border-t-0">
      {/* Left: competitor + listing (shrinks/truncates on mobile) */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-x-1.5">
          <Text size="small" weight="plus" className="truncate">
            {row.competitor?.name ?? "—"}
          </Text>
          <Badge size="2xsmall" className="shrink-0">
            {row.match_status}
            {row.match_score != null ? ` ${row.match_score}` : ""}
          </Badge>
        </div>
        {row.competitor_url ? (
          <a
            href={row.competitor_url}
            target="_blank"
            rel="noreferrer"
            className="text-ui-fg-interactive line-clamp-1 text-xs"
          >
            {row.title || row.competitor_url}
          </a>
        ) : (
          <Text size="xsmall" className="text-ui-fg-subtle line-clamp-1">
            {row.title || "—"}
          </Text>
        )}
        {row.last_error && comp == null ? (
          <Text size="xsmall" className="text-ui-fg-error line-clamp-1">
            {row.last_error}
          </Text>
        ) : null}
      </div>

      {/* Right: price + Δ (fixed, never wraps) */}
      <div className="shrink-0 text-right">
        <Text size="small" weight="plus">
          {money(comp, lp?.currency_code)}
        </Text>
        {d == null ? (
          <Text size="xsmall" className="text-ui-fg-muted">
            {row.pack_label ?? "—"}
          </Text>
        ) : (
          <Text
            size="xsmall"
            weight="plus"
            className={d > 0 ? "text-ui-tag-green-text" : "text-ui-tag-red-text"}
          >
            {d > 0 ? "+" : ""}
            {d.toFixed(0)}%
          </Text>
        )}
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Competitor Prices",
  icon: CurrencyDollar,
})

export default CompetitorPricesPage
