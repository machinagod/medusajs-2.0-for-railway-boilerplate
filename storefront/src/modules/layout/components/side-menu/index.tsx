"use client"

import { Popover, Transition } from "@headlessui/react"
import { ArrowRightMini, XMark } from "@medusajs/icons"
import { Text, clx, useToggleState } from "@medusajs/ui"
import { Fragment } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CountrySelect from "../country-select"
import { HttpTypes } from "@medusajs/types"
import { Wrench } from "lucide-react"

type Category = { label: string; href: string }

const defaultCategories: Category[] = [
  { label: "Início", href: "/" },
  { label: "Loja", href: "/store" },
  { label: "Conta", href: "/account" },
  { label: "Carrinho", href: "/cart" },
]

const SideMenu = ({
  regions,
  categories,
}: {
  regions: HttpTypes.StoreRegion[] | null
  categories?: Category[]
}) => {
  const toggleState = useToggleState()

  const storeLinks: Category[] = categories?.length
    ? categories
    : defaultCategories

  return (
    <div className="h-full">
      <div className="flex items-center h-full">
        <Popover className="h-full flex">
          {({ open, close }) => (
            <>
              <div className="relative flex h-full">
                <Popover.Button
                  data-testid="nav-menu-button"
                  aria-label="Abrir menu"
                  className="relative flex items-center justify-center w-11 h-11 rounded-pill text-brand-ink hover:bg-[#f1f4f7] transition-colors focus:outline-none"
                >
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <line x1="3" y1="6" x2="21" y2="6" />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                </Popover.Button>
              </div>

              <Transition
                show={open}
                as={Fragment}
                enter="transition ease-out duration-150"
                enterFrom="opacity-0"
                enterTo="opacity-100 backdrop-blur-2xl"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 backdrop-blur-2xl"
                leaveTo="opacity-0"
              >
                <Popover.Panel className="flex flex-col absolute w-full pr-4 sm:pr-0 sm:w-1/3 2xl:w-1/4 sm:min-w-min h-[calc(100vh-1rem)] z-30 inset-x-0 text-sm m-2">
                  <div
                    data-testid="nav-menu-popup"
                    className="flex flex-col h-full bg-svc-ground text-svc-fg rounded-card border border-svc-line justify-between p-6"
                  >
                    <div className="flex items-center justify-between" id="xmark">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/higitotal/logo-reversed.png"
                        alt="Higitotal"
                        className="h-8 w-auto"
                      />
                      <button
                        data-testid="close-menu-button"
                        aria-label="Fechar menu"
                        className="text-svc-fg-muted hover:text-white transition-colors"
                        onClick={close}
                      >
                        <XMark />
                      </button>
                    </div>

                    <ul className="flex flex-col gap-5 items-start justify-start mt-8">
                      {storeLinks.map((item) => (
                        <li key={item.label}>
                          <LocalizedClientLink
                            href={item.href}
                            className="text-2xl font-semibold leading-tight text-white hover:text-brand-cyan transition-colors"
                            onClick={close}
                            data-testid={`${item.label
                              .toLowerCase()
                              .replace(/\s+/g, "-")}-link`}
                          >
                            {item.label}
                          </LocalizedClientLink>
                        </li>
                      ))}
                      <li className="mt-2 w-full">
                        <LocalizedClientLink
                          href="/assistencia-tecnica"
                          className="flex w-full items-center justify-center gap-x-2 bg-svc-signal text-white px-4 py-3 rounded-pill text-xs font-bold uppercase tracking-wide hover:bg-svc-signal-ink transition-colors"
                          onClick={close}
                          data-testid="assistencia-tecnica-link"
                        >
                          <Wrench className="h-4 w-4" />
                          Assistência Técnica
                        </LocalizedClientLink>
                      </li>
                    </ul>

                    <div className="flex flex-col gap-y-6">
                      <div
                        className="flex justify-between"
                        onMouseEnter={toggleState.open}
                        onMouseLeave={toggleState.close}
                      >
                        {regions && (
                          <CountrySelect
                            toggleState={toggleState}
                            regions={regions}
                          />
                        )}
                        <ArrowRightMini
                          className={clx(
                            "transition-transform duration-150",
                            toggleState.state ? "-rotate-90" : ""
                          )}
                        />
                      </div>
                      <Text className="flex justify-between txt-compact-small text-svc-fg-muted">
                        © {new Date().getFullYear()} Higitotal — Sistemas e
                        Produtos de Higiene, Lda.
                      </Text>
                    </div>
                  </div>
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
      </div>
    </div>
  )
}

export default SideMenu
