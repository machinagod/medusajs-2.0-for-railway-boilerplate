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
type Product = {
  title: string
  sku: string | null
  pvp1: number | null
  pvp2: number | null
  cost: number | null
}

const money = (minor?: number | null, cur = "EUR") =>
  minor == null ? "—" : `${(minor / 100).toFixed(2)} ${cur}`

// Compare competitors against PVP2, falling back to PVP1 when PVP2 is absent.
const deltaBasis = (p?: Product, fallback?: number | null): number | null =>
  p?.pvp2 ?? p?.pvp1 ?? fallback ?? null

const PriceTag = ({
  label,
  value,
  strong,
  muted,
}: {
  label: string
  value?: number | null
  strong?: boolean
  muted?: boolean
}) => (
  <div className="text-right">
    <Text size="xsmall" className="text-ui-fg-muted">
      {label}
    </Text>
    <Text
      size="small"
      weight={strong ? "plus" : "regular"}
      className={muted ? "text-ui-fg-subtle" : undefined}
    >
      {value == null ? "—" : `${(value / 100).toFixed(2)}`}
    </Text>
  </div>
)

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

  const { data: hist } = useQuery({
    queryKey: ["competitor-price-history"],
    queryFn: () =>
      sdk.client.fetch<{ history: Record<string, { ours: [number, number][]; market: [number, number][] }> }>(
        "/admin/competitor-prices/price-history",
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
      const fallback = rs.find((r) => r.latest_price?.our_price != null)?.latest_price
        ?.our_price
      return { product_id, product, rows: rs, ourPrice: deltaBasis(product, fallback) }
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
        <ProductGroup key={g.product_id} group={g} series={hist?.history?.[g.product_id]} />
      ))}
    </Container>
  )
}

type Point = [number, number] // [timestamp ms, minor units]
type Series = { ours: Point[]; market: Point[] }

/**
 * Tiny inline price-evolution sparkline: our price (ink line/dot) vs the
 * competitor per-unit observations (faint red) — comparable units, same scale.
 */
const Sparkline = ({ series, w = 132, h = 28 }: { series?: Series; w?: number; h?: number }) => {
  const ours = series?.ours ?? []
  const market = series?.market ?? []
  const all = [...ours, ...market]
  if (all.length === 0) return null
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const pad = 2
  const sx = (t: number) => (maxX === minX ? w / 2 : pad + ((t - minX) / (maxX - minX)) * (w - 2 * pad))
  const sy = (v: number) => (maxY === minY ? h / 2 : h - pad - ((v - minY) / (maxY - minY)) * (h - 2 * pad))
  const line = (pts: Point[]) =>
    pts.map((p, i) => `${i ? "L" : "M"}${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join(" ")
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-label="price history">
      {market.length > 1 ? (
        <path d={line(market)} fill="none" stroke="#e11d48" strokeWidth={1} opacity={0.45} />
      ) : null}
      {market.map((p, i) => (
        <circle key={`m${i}`} cx={sx(p[0])} cy={sy(p[1])} r={1} fill="#e11d48" opacity={0.5} />
      ))}
      {ours.length > 1 ? (
        <path d={line(ours)} fill="none" stroke="currentColor" strokeWidth={1.25} />
      ) : (
        ours.map((p, i) => <circle key={`o${i}`} cx={sx(p[0])} cy={sy(p[1])} r={1.6} fill="currentColor" />)
      )}
    </svg>
  )
}

const ProductGroup = ({ group, series }: { group: Group; series?: Series }) => {
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
        <div className="flex items-baseline gap-x-3 whitespace-nowrap">
          <PriceTag label="PVP1" value={product?.pvp1} />
          <PriceTag label="PVP2" value={product?.pvp2} strong />
          <PriceTag label="Cost" value={product?.cost} muted />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Text size="xsmall" className="text-ui-fg-subtle">
          {rows.length} competitor{rows.length === 1 ? "" : "s"} · Δ vs {product?.pvp2 != null ? "PVP2" : "PVP1"}
        </Text>
        <Sparkline series={series} />
      </div>

      <div className="mt-2">
        {rows
          .slice()
          .sort((a, b) => deltaOf(a, ourPrice) - deltaOf(b, ourPrice))
          .map((r) => (
            <CompetitorRow
              key={r.id}
              row={r}
              pvp1={product?.pvp1 ?? null}
              pvp2={product?.pvp2 ?? null}
            />
          ))}
      </div>
    </div>
  )
}

const compOf = (r: Row): number | null => {
  const lp = r.latest_price
  return lp?.status === "ok" ? lp.unit_price ?? lp.price ?? null : null
}
const deltaOf = (r: Row, basis: number | null): number => {
  const comp = compOf(r)
  if (comp == null || !basis) return Number.POSITIVE_INFINITY
  return ((comp - basis) / basis) * 100
}

const DeltaTag = ({ label, comp, base }: { label: string; comp: number | null; base: number | null }) => {
  if (comp == null || !base) return null
  const d = ((comp - base) / base) * 100
  return (
    <Text size="xsmall" weight="plus" className={d > 0 ? "text-ui-tag-green-text" : "text-ui-tag-red-text"}>
      {label} {d > 0 ? "+" : ""}
      {d.toFixed(0)}%
    </Text>
  )
}

const CompetitorRow = ({
  row,
  pvp1,
  pvp2,
}: {
  row: Row
  pvp1: number | null
  pvp2: number | null
}) => {
  const lp = row.latest_price
  const comp = compOf(row)
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

      {/* Right: competitor price + Δ vs PVP1 and PVP2 (fixed, never wraps) */}
      <div className="shrink-0 text-right">
        <Text size="small" weight="plus">
          {money(comp, lp?.currency_code)}
        </Text>
        {comp == null ? (
          <Text size="xsmall" className="text-ui-fg-muted">
            {row.pack_label ?? "—"}
          </Text>
        ) : (
          <div className="flex items-baseline justify-end gap-x-2">
            <DeltaTag label="P1" comp={comp} base={pvp1} />
            <DeltaTag label="P2" comp={comp} base={pvp2} />
          </div>
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
