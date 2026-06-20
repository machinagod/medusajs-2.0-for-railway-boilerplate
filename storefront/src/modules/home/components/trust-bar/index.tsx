const ITEMS = [
  {
    title: "Desde 1999",
    subtitle: "Especialistas em higiene profissional",
  },
  {
    title: "Entrega 72h",
    subtitle: "Portugal Continental",
  },
  {
    title: "Assistência Técnica",
    subtitle: "Cobertura nacional",
  },
  {
    title: "Marcas oficiais",
    subtitle: "Fagor · Vileda · Sammic · Nilfisk",
  },
]

const TrustBar = () => {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-large border border-hairline bg-white small:grid-cols-4">
      {ITEMS.map((item, i) => (
        <div
          key={item.title}
          className={`flex items-center gap-3.5 border-[#eef1f4] px-6 py-5 ${
            i % 2 === 0 ? "border-r" : ""
          } ${i < ITEMS.length - 1 ? "small:border-r" : "small:border-r-0"}`}
        >
          <span className="mt-1 h-2 w-2 flex-none rounded-full bg-brand-cyan shadow-[0_0_0_4px_rgba(0,173,239,0.18)]" />
          <div>
            <b className="block text-sm font-bold leading-tight text-brand-ink">
              {item.title}
            </b>
            <span className="text-xs leading-snug text-[#5a636c]">
              {item.subtitle}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

export default TrustBar
