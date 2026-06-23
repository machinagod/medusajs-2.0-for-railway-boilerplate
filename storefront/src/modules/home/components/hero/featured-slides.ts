// Shared (server-safe) slide data for the hero "Em destaque" carousel. Kept out of
// the "use client" component so server components (the home page) can import it to
// resolve a representative product image per collection.
export type Slide = {
  title: string
  blurb: string
  href: string
  handle: string
}

export const SLIDES: Slide[] = [
  {
    title: "Fornos profissionais",
    blurb: "Fornos combinados Fagor para cozinha profissional.",
    href: "/collections/fornos-profissionais",
    handle: "fornos-profissionais",
  },
  {
    title: "Máquinas de limpeza",
    blurb: "Lavadoras-secadoras e aspiradores Nilfisk e Viper.",
    href: "/collections/maquinas-de-limpeza",
    handle: "maquinas-de-limpeza",
  },
  {
    title: "Diversey",
    blurb: "Suma, Taski, Clax e outras marcas profissionais Diversey.",
    href: "/collections/diversey",
    handle: "diversey",
  },
  {
    title: "Unilever",
    blurb: "Cif, Sun, Comfort e outras marcas profissionais Unilever.",
    href: "/collections/unilever",
    handle: "unilever",
  },
  {
    title: "Vileda",
    blurb: "Mopas, panos microfibra, carros e sistemas de limpeza Vileda.",
    href: "/collections/vileda",
    handle: "vileda",
  },
]
