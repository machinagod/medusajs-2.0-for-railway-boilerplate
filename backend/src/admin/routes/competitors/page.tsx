import { defineRouteConfig } from "@medusajs/admin-sdk"
import { BuildingStorefront } from "@medusajs/icons"
import { Badge, Container, Heading, Input, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

type Competitor = {
  id: string
  name: string
  handle: string
  base_url?: string | null
  country?: string | null
  scraper_key?: string
  scraper_hints?: Record<string, any> | null
  is_active?: boolean
  metadata?: { discovered?: boolean } | null
  mapping_count?: number
  priced_count?: number
}

const CompetitorsPage = () => {
  const [search, setSearch] = useState("")
  const { data, isLoading } = useQuery({
    queryKey: ["competitors"],
    queryFn: () =>
      sdk.client.fetch<{ competitors: Competitor[] }>("/admin/competitors", {
        method: "GET",
      }),
  })

  const rows = useMemo(() => {
    let cs = data?.competitors ?? []
    const q = search.trim().toLowerCase()
    if (q) {
      cs = cs.filter((c) =>
        [c.name, c.handle, c.country, c.scraper_key].filter(Boolean).some((v) =>
          String(v).toLowerCase().includes(q)
        )
      )
    }
    return [...cs].sort((a, b) => (b.priced_count ?? 0) - (a.priced_count ?? 0))
  }, [data, search])

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-3 px-4 py-4 md:flex-row md:items-center md:justify-between md:px-6">
        <div>
          <Heading>Competitors & Parsers</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Discovered price sources and the deterministic parser configured for each.
          </Text>
        </div>
        <Input
          type="search"
          placeholder="Search name / country / parser…"
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
      {!isLoading && rows.length === 0 && (
        <div className="px-4 py-6 md:px-6">
          <Text size="small" className="text-ui-fg-subtle">
            No competitors yet.
          </Text>
        </div>
      )}

      {rows.map((c) => (
        <CompetitorRow key={c.id} c={c} />
      ))}
    </Container>
  )
}

const parserSummary = (c: Competitor): string => {
  if (c.scraper_key === "config-selectors") {
    const sel = c.scraper_hints?.price
    return sel ? `selectors: ${sel}` : "selectors (unconfigured)"
  }
  if (c.scraper_key === "prestashop") return "PrestaShop JSON-LD"
  return "JSON-LD / microdata"
}

const CompetitorRow = ({ c }: { c: Competitor }) => {
  const discovered = c.metadata?.discovered
  const coverage =
    c.mapping_count != null
      ? `${c.priced_count ?? 0}/${c.mapping_count} priced`
      : "—"
  return (
    <div className="flex items-center justify-between gap-x-3 px-4 py-3 md:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-x-2">
          <Text size="small" weight="plus" className="truncate">
            {c.name}
          </Text>
          {c.country ? <Badge size="2xsmall">{c.country}</Badge> : null}
          {discovered ? (
            <Badge size="2xsmall" color="orange">
              discovered
            </Badge>
          ) : null}
          {c.is_active === false ? (
            <Badge size="2xsmall" color="red">
              inactive
            </Badge>
          ) : null}
        </div>
        {c.base_url ? (
          <a
            href={c.base_url}
            target="_blank"
            rel="noreferrer"
            className="text-ui-fg-interactive line-clamp-1 text-xs"
          >
            {c.base_url}
          </a>
        ) : null}
        <Text size="xsmall" className="text-ui-fg-muted line-clamp-1">
          {parserSummary(c)}
        </Text>
      </div>
      <div className="shrink-0 text-right">
        <Badge size="2xsmall">{c.scraper_key}</Badge>
        <Text size="xsmall" className="text-ui-fg-subtle">
          {coverage}
        </Text>
      </div>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Competitors & Parsers",
  icon: BuildingStorefront,
})

export default CompetitorsPage
