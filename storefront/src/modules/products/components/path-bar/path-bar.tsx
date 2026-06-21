"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/** One selectable option inside a segment dropdown. */
export type PathOption = {
  label: string
  href: string
  current?: boolean
}

/** A single dropdown segment in the trail. */
export type PathSegment = {
  /** Label shown in the bar (the current item at this level). */
  label: string
  /** Sibling options listed in the dropdown. */
  options: PathOption[]
}

type PathBarProps = {
  segments: PathSegment[]
}

const ChevronIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-3.5 w-3.5 flex-none text-[#98a0a8] transition-transform duration-200 group-data-[open=true]:rotate-180 group-data-[open=true]:text-brand-cyan"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const WrenchIcon = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-4 w-4 flex-none"
  >
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)

/**
 * Pathbar — a merged breadcrumb + sideways category/product navigation for the
 * product page. Each segment is a dropdown listing the siblings at that level so
 * the user can jump laterally; the current item is highlighted. The "Pedir
 * assistência" link sits at the far right.
 *
 * The dropdown menu is rendered fixed-positioned (escaping the horizontally
 * scrolling trail) and positioned imperatively under its trigger, mirroring the
 * mockup behaviour without the raw mockup JS.
 */
const PathBar = ({ segments }: PathBarProps) => {
  // index of the open segment, or null
  const [openIndex, setOpenIndex] = useState<number | null>(null)
  const triggerRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuRef = useRef<HTMLDivElement | null>(null)
  const trailRef = useRef<HTMLDivElement | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(
    null
  )

  const closeMenu = useCallback(() => {
    setOpenIndex(null)
    setMenuPos(null)
  }, [])

  // Position the open menu under its trigger, clamped to the viewport.
  useLayoutEffect(() => {
    if (openIndex === null) return
    const trigger = triggerRefs.current[openIndex]
    const menu = menuRef.current
    if (!trigger) return
    const r = trigger.getBoundingClientRect()
    const menuWidth = menu?.offsetWidth ?? 220
    let left = r.left
    if (left + menuWidth > window.innerWidth - 12) {
      left = window.innerWidth - 12 - menuWidth
    }
    if (left < 12) left = 12
    setMenuPos({ top: r.bottom + 6, left })
  }, [openIndex])

  // Close on outside click, scroll of the trail, resize, or Escape.
  useEffect(() => {
    if (openIndex === null) return

    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if (triggerRefs.current.some((t) => t?.contains(target))) return
      closeMenu()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu()
    }
    const trail = trailRef.current

    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    window.addEventListener("resize", closeMenu)
    window.addEventListener("scroll", closeMenu, true)
    trail?.addEventListener("scroll", closeMenu)

    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
      window.removeEventListener("resize", closeMenu)
      window.removeEventListener("scroll", closeMenu, true)
      trail?.removeEventListener("scroll", closeMenu)
    }
  }, [openIndex, closeMenu])

  if (!segments.length) return null

  const openSegment = openIndex !== null ? segments[openIndex] : null

  return (
    <nav className="relative z-40 border-b border-hairline bg-white">
      <div className="content-container flex h-[54px] items-center gap-3">
        <div
          ref={trailRef}
          className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Início — hidden on phones */}
          <LocalizedClientLink
            href="/"
            className="hidden flex-none whitespace-nowrap rounded-rounded px-3 py-[9px] text-[13px] font-semibold text-[#4a5560] transition-colors hover:bg-[#f1f4f7] hover:text-brand-ink xsmall:inline-flex"
          >
            Início
          </LocalizedClientLink>

          {segments.map((segment, i) => {
            const isOpen = openIndex === i
            const isLeaf = i === segments.length - 1
            return (
              <div key={i} className="flex flex-none items-center gap-0.5">
                <span
                  className={
                    i === 0
                      ? "hidden flex-none select-none px-0.5 text-[13px] font-semibold text-[#c4ccd4] xsmall:inline"
                      : "flex-none select-none px-0.5 text-[13px] font-semibold text-[#c4ccd4]"
                  }
                  aria-hidden
                >
                  /
                </span>
                <button
                  type="button"
                  ref={(el) => {
                    triggerRefs.current[i] = el
                  }}
                  data-open={isOpen}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className={`group flex flex-none items-center gap-2 whitespace-nowrap rounded-rounded px-3 py-[9px] text-[13px] transition-colors ${
                    isLeaf ? "font-bold" : "font-semibold"
                  } ${
                    isOpen
                      ? "bg-[#eaf7fe] text-brand-cyan"
                      : isLeaf
                      ? "text-brand-ink hover:bg-[#f1f4f7]"
                      : "text-[#4a5560] hover:bg-[#f1f4f7] hover:text-brand-ink"
                  }`}
                >
                  {segment.label}
                  <ChevronIcon />
                </button>
              </div>
            )
          })}
        </div>

        {/* Pedir assistência — label hidden on phones */}
        <LocalizedClientLink
          href="/assistencia-tecnica"
          className="flex flex-none items-center gap-2 rounded-pill bg-svc-signal px-[13px] py-2.5 text-[12px] font-bold uppercase tracking-[0.04em] text-white transition-colors hover:bg-svc-signal-ink small:px-[18px]"
        >
          <WrenchIcon />
          <span className="hidden small:inline">Pedir assistência</span>
        </LocalizedClientLink>
      </div>

      {/* Fixed-positioned dropdown menu (escapes the scroll container) */}
      {openSegment && menuPos && (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: menuPos.top, left: menuPos.left }}
          className="fixed z-[80] min-w-[220px] max-w-[calc(100vw-24px)] rounded-large border border-hairline bg-white p-1.5 shadow-[0_18px_44px_rgba(16,24,40,.16)]"
        >
          {openSegment.options.map((opt, j) => (
            <LocalizedClientLink
              key={j}
              href={opt.href}
              onClick={closeMenu}
              className={`flex items-center gap-2.5 rounded-[9px] px-3 py-[11px] text-[13px] font-semibold transition-colors hover:bg-[#f1f4f7] hover:text-brand-ink ${
                opt.current
                  ? "text-brand-cyan"
                  : "pl-[29px] text-[#4a5560]"
              }`}
              role="menuitem"
            >
              {opt.current && (
                <span className="h-[7px] w-[7px] flex-none rounded-full bg-brand-cyan shadow-[0_0_0_3px_rgba(0,173,239,.18)]" />
              )}
              {opt.label}
            </LocalizedClientLink>
          ))}
        </div>
      )}
    </nav>
  )
}

export default PathBar
