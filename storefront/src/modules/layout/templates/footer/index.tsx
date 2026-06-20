import { getCategoriesList } from "@lib/data/categories"
import { getCollectionsList } from "@lib/data/collections"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  const { collections } = await getCollectionsList(0, 6)
  const { product_categories } = await getCategoriesList(0, 6)

  return (
    <footer className="w-full bg-svc-ground text-svc-fg-muted font-sans">
      <div className="content-container">
        <div className="grid grid-cols-1 gap-10 py-14 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr] lg:gap-10">
          {/* Brand + blurb */}
          <div>
            <LocalizedClientLink href="/" className="inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/higitotal/logo-white-on-black.png"
                alt="Higitotal"
                className="mb-5 h-[42px] w-auto"
              />
            </LocalizedClientLink>
            <p className="max-w-[34ch] text-[13px] leading-[1.65] text-svc-fg-muted">
              Higitotal — Sistemas e Produtos de Higiene, Lda. Distribuição e
              assistência técnica de equipamento profissional de higiene e
              cozinha, desde 1999.
            </p>
          </div>

          {/* Categorias (dynamic) */}
          {product_categories && product_categories.length > 0 && (
            <div>
              <h4 className="mb-4 text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-white">
                Categorias
              </h4>
              <ul
                className="m-0 list-none p-0"
                data-testid="footer-categories"
              >
                {product_categories.slice(0, 6).map((c) => {
                  if (c.parent_category) {
                    return null
                  }

                  return (
                    <li key={c.id} className="mb-[11px]">
                      <LocalizedClientLink
                        className="text-[13px] font-medium leading-none text-svc-fg-muted transition-colors hover:text-white"
                        href={`/categories/${c.handle}`}
                        data-testid="category-link"
                      >
                        {c.name}
                      </LocalizedClientLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Assistência Técnica */}
          <div>
            <h4 className="mb-4 text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-white">
              Assistência Técnica
            </h4>
            <ul className="m-0 list-none p-0">
              {["Instalação", "Reparação", "Contratos de manutenção"].map(
                (item) => (
                  <li key={item} className="mb-[11px]">
                    <LocalizedClientLink
                      className="text-[13px] font-medium leading-none text-svc-fg-muted transition-colors hover:text-white"
                      href="/assistencia-tecnica"
                    >
                      {item}
                    </LocalizedClientLink>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Collections (dynamic) + Contactos */}
          <div className="flex flex-col gap-8">
            {collections && collections.length > 0 && (
              <div>
                <h4 className="mb-4 text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-white">
                  Coleções
                </h4>
                <ul className="m-0 list-none p-0">
                  {collections.slice(0, 6).map((c) => (
                    <li key={c.id} className="mb-[11px]">
                      <LocalizedClientLink
                        className="text-[13px] font-medium leading-none text-svc-fg-muted transition-colors hover:text-white"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h4 className="mb-4 text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-white">
                Contactos
              </h4>
              <div className="flex flex-col gap-[14px] text-[13px] font-medium leading-[1.5] text-svc-fg">
                <div className="flex items-start gap-3">
                  <span className="mt-px shrink-0 text-brand-cyan">
                    <span className="ind" />
                  </span>
                  <span>
                    Zona Industrial, Rua J nº 137
                    <br />
                    5370-565 Mirandela, Portugal
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-px shrink-0 text-brand-cyan">
                    <span className="ind" />
                  </span>
                  <a
                    href="tel:+351278262913"
                    className="transition-colors hover:text-white"
                  >
                    +351 278 262 913
                  </a>
                </div>
                <div className="flex items-start gap-3">
                  <span className="mt-px shrink-0 text-brand-cyan">
                    <span className="ind" />
                  </span>
                  <a
                    href="mailto:higitotal@higitotal.pt"
                    className="transition-colors hover:text-white"
                  >
                    higitotal@higitotal.pt
                  </a>
                </div>
                <LocalizedClientLink
                  href="/assistencia-tecnica"
                  className="mt-1 inline-flex items-center gap-2 self-start rounded-btn bg-svc-signal px-[18px] py-[11px] text-[12px] font-bold uppercase leading-none tracking-[0.04em] text-white transition-colors hover:bg-svc-signal-ink"
                >
                  <span className="ind amber" /> Pedir assistência
                </LocalizedClientLink>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col gap-2 border-t border-svc-line py-7 text-[12px] text-svc-fg-muted sm:flex-row sm:items-center sm:justify-between">
          <span>
            © {new Date().getFullYear()} Higitotal — Sistemas e Produtos de
            Higiene, Lda.
          </span>
          <span>Mirandela · Portugal</span>
        </div>
      </div>
    </footer>
  )
}
