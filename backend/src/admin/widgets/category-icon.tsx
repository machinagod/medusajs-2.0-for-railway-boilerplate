import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  DetailWidgetProps,
  AdminProductCategory,
} from "@medusajs/framework/types"
import {
  Button,
  Container,
  Heading,
  Input,
  Text,
  Tooltip,
  clx,
  toast,
} from "@medusajs/ui"
import { useMemo, useState } from "react"
import { DynamicIcon, dynamicIconImports } from "lucide-react/dynamic"
import { sdk } from "../lib/sdk"

const ALL_ICON_NAMES = Object.keys(dynamicIconImports)

// Quick-pick set tuned to a cleaning / hospitality catalog.
const SUGGESTED = [
  "spray-can", "droplets", "droplet", "soap-dispenser-droplet",
  "brush", "paint-roller", "washing-machine", "fan",
  "cog", "wrench", "settings", "container",
  "cooking-pot", "chef-hat", "utensils", "utensils-crossed",
  "scroll-text", "newspaper", "shopping-bag", "trash-2",
  "recycle", "wind", "bug", "leaf",
  "package", "package-2", "boxes", "layers",
  "shield", "shield-check", "sparkles", "star",
]

const CategoryIconWidget = ({
  data,
}: DetailWidgetProps<AdminProductCategory>) => {
  const categoryId = data.id
  const md0 = (data.metadata as Record<string, unknown>) || {}
  const [selected, setSelected] = useState((md0.icon as string) || "")
  const [navOrder, setNavOrder] = useState(
    md0.nav_order != null ? String(md0.nav_order) : ""
  )
  const [query, setQuery] = useState("")
  const [saving, setSaving] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SUGGESTED
    return ALL_ICON_NAMES.filter((n) => n.includes(q)).slice(0, 48)
  }, [query])

  // Persist icon + nav_order together (the POST replaces metadata, so always
  // send both from local state, preserving any other keys).
  const persist = async (next: { icon?: string; navOrder?: string }) => {
    const icon = next.icon !== undefined ? next.icon : selected
    const order = next.navOrder !== undefined ? next.navOrder : navOrder
    setSaving(true)
    try {
      const metadata: Record<string, unknown> = { ...md0 }
      if (icon) metadata.icon = icon
      else delete metadata.icon
      const n = parseInt(order, 10)
      if (order.trim() !== "" && Number.isFinite(n)) metadata.nav_order = n
      else delete metadata.nav_order
      await sdk.client.fetch(`/admin/product-categories/${categoryId}`, {
        method: "POST",
        body: { metadata },
      })
      setSelected(icon)
      setNavOrder(order)
      toast.success("Storefront nav settings saved")
    } catch (e) {
      toast.error("Failed to save storefront nav settings")
    } finally {
      setSaving(false)
    }
  }

  const save = (next: string) => persist({ icon: next })

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Storefront nav</Heading>
        <div className="flex items-center gap-2">
          {selected && (
            <span className="flex items-center gap-2 rounded-md bg-ui-bg-subtle px-2 py-1">
              <DynamicIcon name={selected as any} size={18} />
              <Text size="small" className="text-ui-fg-subtle">
                {selected}
              </Text>
            </span>
          )}
          <Button
            size="small"
            variant="secondary"
            onClick={() => save("")}
            disabled={saving || !selected}
          >
            Clear
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        <Text size="small" className="text-ui-fg-subtle mb-3">
          Pick the Lucide icon shown for this category in the storefront nav and
          home cards. Clearing it falls back to a name-based default.
        </Text>
        <Input
          placeholder="Search all Lucide icons (e.g. broom, droplet, truck)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-3"
        />
        {results.length === 0 ? (
          <Text size="small" className="text-ui-fg-subtle">
            No icons match “{query}”.
          </Text>
        ) : (
          <div className="grid grid-cols-8 gap-2">
            {results.map((name) => (
              <Tooltip key={name} content={name}>
                <button
                  type="button"
                  onClick={() => save(name)}
                  disabled={saving}
                  aria-label={name}
                  className={clx(
                    "flex aspect-square items-center justify-center rounded-lg border transition-colors",
                    name === selected
                      ? "border-ui-border-interactive bg-ui-bg-interactive text-ui-fg-on-color"
                      : "border-ui-border-base bg-ui-bg-subtle text-ui-fg-base hover:bg-ui-bg-base-hover"
                  )}
                >
                  <DynamicIcon name={name as any} size={20} />
                </button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-4">
        <Text size="small" weight="plus" className="mb-1">
          Nav order
        </Text>
        <Text size="small" className="text-ui-fg-subtle mb-3">
          Lower numbers appear first in the top-level navigator and home cards.
          Leave empty to fall back to the category rank.
        </Text>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="e.g. 1"
            value={navOrder}
            onChange={(e) => setNavOrder(e.target.value)}
            className="max-w-[140px]"
          />
          <Button
            size="small"
            onClick={() => persist({ navOrder })}
            isLoading={saving}
          >
            Save order
          </Button>
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.side.after",
})

export default CategoryIconWidget
