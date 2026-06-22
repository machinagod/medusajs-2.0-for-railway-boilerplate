"use client"

import { useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

const VISIBLE = 3

const chipCls =
  "rounded-pill border border-hairline bg-white px-3.5 py-1.5 text-sm font-medium text-brand-ink transition-colors hover:border-brand-cyan hover:text-brand-cyan"

/**
 * Subcategory chips — shows the first few and collapses the rest behind a
 * "+N mais" tag that expands on click (keeps the toolbar compact on mobile).
 */
const SubcategoryChips = ({
  categories,
}: {
  categories?: HttpTypes.StoreProductCategory[]
}) => {
  const [expanded, setExpanded] = useState(false)

  if (!categories?.length) {
    return null
  }

  const shown = expanded ? categories : categories.slice(0, VISIBLE)
  const hidden = categories.length - VISIBLE

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {shown.map((c) => (
        <LocalizedClientLink
          key={c.id}
          href={`/categories/${c.handle}`}
          className={chipCls}
        >
          {c.name}
        </LocalizedClientLink>
      ))}
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="rounded-pill border border-dashed border-hairline bg-transparent px-3.5 py-1.5 text-sm font-semibold text-grey-60 transition-colors hover:border-brand-cyan hover:text-brand-cyan"
        >
          {expanded ? "Menos" : `+${hidden} mais`}
        </button>
      )}
    </div>
  )
}

export default SubcategoryChips
