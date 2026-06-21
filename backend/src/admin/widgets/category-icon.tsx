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
  const initial = ((data.metadata as Record<string, unknown>)?.icon as string) || ""
  const [selected, setSelected] = useState(initial)
  const [query, setQuery] = useState("")
  const [saving, setSaving] = useState(false)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return SUGGESTED
    return ALL_ICON_NAMES.filter((n) => n.includes(q)).slice(0, 48)
  }, [query])

  const save = async (next: string) => {
    setSaving(true)
    try {
      const metadata: Record<string, unknown> = {
        ...((data.metadata as Record<string, unknown>) || {}),
      }
      if (next) metadata.icon = next
      else delete metadata.icon
      await sdk.client.fetch(`/admin/product-categories/${categoryId}`, {
        method: "POST",
        body: { metadata },
      })
      setSelected(next)
      toast.success(next ? `Icon set to “${next}”` : "Icon cleared (uses default)")
    } catch (e) {
      toast.error("Failed to save category icon")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">Storefront icon</Heading>
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
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.side.after",
})

export default CategoryIconWidget
