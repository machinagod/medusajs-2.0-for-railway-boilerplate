import { DynamicIcon, dynamicIconImports } from "lucide-react/dynamic"

const VALID = new Set(Object.keys(dynamicIconImports))

/**
 * Render a Lucide icon chosen per category. The name comes from the category's
 * `metadata.icon` (set in the admin icon picker) or a keyword-derived default —
 * always a real Lucide kebab-case id. Any unknown name falls back to "package"
 * so a bad value never breaks the page.
 */
const CategoryIcon = ({
  name,
  className = "h-5 w-5",
}: {
  name?: string | null
  className?: string
}) => {
  const safe = name && VALID.has(name) ? name : "package"
  return <DynamicIcon name={safe as any} className={className} aria-hidden />
}

export default CategoryIcon
