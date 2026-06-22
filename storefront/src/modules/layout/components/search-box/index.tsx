"use client"

import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { Search } from "lucide-react"

/**
 * Header search box (matches the design mock): a pill input with a cyan round
 * submit button. Submitting navigates to the MeiliSearch-backed results page.
 */
const SearchBox = () => {
  const router = useRouter()
  const { countryCode } = useParams() as { countryCode?: string }
  const [query, setQuery] = useState("")

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    const cc = countryCode || process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"
    router.push(`/${cc}/results/${encodeURIComponent(q)}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      role="search"
      data-testid="nav-search-form"
      className="flex-1 min-w-0 flex items-center gap-x-2.5 bg-white border-[1.5px] border-hairline rounded-pill pl-5 pr-1.5 py-1.5 transition-colors focus-within:border-brand-cyan focus-within:shadow-[0_0_0_4px_rgba(0,173,239,0.12)]"
    >
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Pesquisar produtos ou marcas…"
        aria-label="Pesquisar"
        className="flex-1 min-w-0 bg-transparent text-sm font-medium text-brand-ink placeholder:text-[#98a0a8] outline-none [&::-webkit-search-cancel-button]:appearance-none"
      />
      <button
        type="submit"
        aria-label="Pesquisar"
        className="flex-none flex items-center justify-center w-10 h-10 rounded-pill bg-brand-cyan text-white hover:bg-brand-cyan-ink transition-colors"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>
    </form>
  )
}

export default SearchBox
