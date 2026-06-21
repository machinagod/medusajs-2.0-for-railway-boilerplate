import HigiIcon from "@modules/common/icons/higi-icon"

const ITEMS = [
  {
    icon: "truck",
    title: "Entrega rápida",
    subtitle: "Portugal Continental",
  },
  {
    icon: "award",
    title: "27 anos",
    subtitle: "de experiência",
  },
  {
    icon: "star",
    title: "Marcas líderes",
    subtitle: "Fagor · Sammic · Nilfisk",
  },
  {
    icon: "headset",
    title: "Assistência própria",
    subtitle: "Equipa técnica certificada",
  },
]

const TrustBar = () => {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-large border border-hairline bg-white small:grid-cols-4">
      {ITEMS.map((item, i) => {
        // Mobile (2x2): right border on left column only, bottom border on top row only.
        // Desktop (4-up): right border on all but the last.
        const mobileRight = i % 2 === 0 ? "border-r" : "border-r-0"
        const mobileBottom = i < 2 ? "border-b" : "border-b-0"
        const desktopRight =
          i < ITEMS.length - 1 ? "small:border-r" : "small:border-r-0"
        return (
          <div
            key={item.title}
            className={`flex items-center gap-2.5 border-[#eef1f4] p-3.5 small:gap-3.5 small:border-b-0 small:px-6 small:py-5 ${mobileRight} ${mobileBottom} ${desktopRight}`}
          >
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-[12px] bg-[#eaf7fe] text-brand-cyan small:h-[42px] small:w-[42px]">
              <HigiIcon name={item.icon} className="h-[18px] w-[18px] small:h-5 small:w-5" />
            </span>
            <div>
              <b className="block text-[13px] font-bold leading-tight text-brand-ink small:text-sm">
                {item.title}
              </b>
              <span className="text-[11px] leading-snug text-[#5a636c] small:text-xs">
                {item.subtitle}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default TrustBar
