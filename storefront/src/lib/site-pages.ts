/**
 * Curated list of static/content pages surfaced in the header predictive
 * search (the "Páginas" section). These are fixed routes — not catalog data —
 * so they live in code and are filtered client-side by title + keywords,
 * mirroring how categories are matched. Keep keywords lowercase/unaccented
 * where helpful so partial queries still match.
 */
export type SitePage = {
  name: string
  href: string
  description: string
  /** Extra search terms (synonyms, accent-free variants) that should match. */
  keywords?: string[]
}

export const SITE_PAGES: SitePage[] = [
  {
    name: "Assistência Técnica",
    href: "/assistencia-tecnica",
    description: "Instalação, reparação e manutenção",
    keywords: [
      "assistencia",
      "tecnica",
      "reparação",
      "reparacao",
      "manutenção",
      "manutencao",
      "instalação",
      "instalacao",
      "avaria",
      "técnico",
      "tecnico",
      "contrato",
      "fagor",
      "sammic",
      "nilfisk",
    ],
  },
  {
    name: "Catálogo",
    href: "/store",
    description: "Ver todos os produtos",
    keywords: ["catalogo", "catálogo", "loja", "produtos", "store"],
  },
  {
    name: "Apoio ao Cliente",
    href: "/customer-service",
    description: "Ajuda, devoluções e suporte",
    keywords: [
      "apoio",
      "cliente",
      "ajuda",
      "suporte",
      "devoluções",
      "devolucoes",
      "contacto",
    ],
  },
  {
    name: "Contactos",
    href: "/contact",
    description: "Morada, telefone e email",
    keywords: [
      "contacto",
      "contactos",
      "morada",
      "telefone",
      "email",
      "mirandela",
    ],
  },
  {
    name: "A minha conta",
    href: "/account",
    description: "Encomendas e dados pessoais",
    keywords: ["conta", "encomendas", "login", "sessão", "perfil"],
  },
  {
    name: "Política de Privacidade",
    href: "/content/privacy-policy",
    description: "Como tratamos os seus dados",
    keywords: ["privacidade", "rgpd", "dados", "politica", "política"],
  },
  {
    name: "Termos e Condições",
    href: "/content/terms-of-use",
    description: "Condições de utilização e venda",
    keywords: ["termos", "condições", "condicoes", "venda", "utilização"],
  },
]
