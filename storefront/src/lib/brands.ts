export type Brand = { name: string; logo?: string }

// Single source of truth for the brands we represent — shared by the homepage
// "Marcas que representamos" strip and the Assistência Técnica equipment section,
// so the list and casing never drift apart. SVG logos live in /public/brands;
// brands without a clean public SVG render as a styled wordmark.
export const BRANDS: Brand[] = [
  { name: "Fagor", logo: "/brands/fagor.svg" },
  { name: "Vileda", logo: "/brands/vileda.svg" },
  { name: "Sammic" },
  { name: "Nilfisk", logo: "/brands/nilfisk.svg" },
  { name: "Vileda Origo" },
  { name: "CELEA" },
]
