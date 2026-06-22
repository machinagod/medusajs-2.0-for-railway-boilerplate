type Brand = { name: string; logo?: string }

// Brands we represent. SVG logos live in /public/brands; brands without a clean
// public SVG fall back to a styled wordmark (Sammic, Vileda Origo, CELEA).
const BRANDS: Brand[] = [
  { name: "Fagor", logo: "/brands/fagor.svg" },
  { name: "Vileda", logo: "/brands/vileda.svg" },
  { name: "Sammic" },
  { name: "Nilfisk", logo: "/brands/nilfisk.svg" },
  { name: "Vileda Origo" },
  { name: "CELEA" },
]

const Suppliers = () => {
  return (
    <section>
      <div className="rounded-card border border-hairline bg-white px-[18px] py-[22px] small:px-10 small:py-[34px]">
        <div className="mb-5 text-center text-[11px] font-bold uppercase tracking-[0.14em] text-[#98a0a8] small:mb-[22px]">
          Marcas que representamos
        </div>
        <div className="flex flex-wrap items-center justify-start gap-x-7 gap-y-5 small:justify-between small:gap-[30px]">
          {BRANDS.map((brand) =>
            brand.logo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                key={brand.name}
                src={brand.logo}
                alt={brand.name}
                loading="lazy"
                className="h-6 w-auto object-contain opacity-70 grayscale transition-all duration-200 hover:opacity-100 hover:grayscale-0 small:h-8"
              />
            ) : (
              <span
                key={brand.name}
                className="cursor-default text-[17px] font-extrabold tracking-tight text-[#b9c1c9] transition-colors hover:text-brand-ink small:text-xl"
              >
                {brand.name}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  )
}

export default Suppliers
