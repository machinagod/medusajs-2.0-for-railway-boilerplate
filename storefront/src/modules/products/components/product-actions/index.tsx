"use client"

import { isEqual } from "lodash"
import { useParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"

import { useIntersection } from "@lib/hooks/use-in-view"
import Divider from "@modules/common/components/divider"
import OptionSelect from "@modules/products/components/product-actions/option-select"

import MobileActions from "./mobile-actions"
import ProductPrice from "../product-price"
import ContactModal from "../contact-modal"
import { addToCart } from "@lib/data/cart"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

type ProductActionsProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  disabled?: boolean
}

const optionsAsKeymap = (variantOptions: any) => {
  return variantOptions?.reduce((acc: Record<string, string | undefined>, varopt: any) => {
    if (varopt.option && varopt.value !== null && varopt.value !== undefined) {
      acc[varopt.option.title] = varopt.value
    }
    return acc
  }, {})
}

export default function ProductActions({
  product,
  region,
  disabled,
}: ProductActionsProps) {
  const [options, setOptions] = useState<Record<string, string | undefined>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [contactOpen, setContactOpen] = useState(false)
  const countryCode = useParams().countryCode as string

  // If there is only 1 variant, preselect the options
  useEffect(() => {
    if (product.variants?.length === 1) {
      const variantOptions = optionsAsKeymap(product.variants[0].options)
      setOptions(variantOptions ?? {})
    }
  }, [product.variants])

  const selectedVariant = useMemo(() => {
    if (!product.variants || product.variants.length === 0) {
      return
    }

    return product.variants.find((v) => {
      const variantOptions = optionsAsKeymap(v.options)
      return isEqual(variantOptions, options)
    })
  }, [product.variants, options])

  // update the options when a variant is selected
  const setOptionValue = (title: string, value: string) => {
    setOptions((prev) => ({
      ...prev,
      [title]: value,
    }))
  }

  // check if the selected variant is in stock
  const inStock = useMemo(() => {
    // If we don't manage inventory, we can always add to cart
    if (selectedVariant && !selectedVariant.manage_inventory) {
      return true
    }

    // If we allow back orders on the variant, we can add to cart
    if (selectedVariant?.allow_backorder) {
      return true
    }

    // If there is inventory available, we can add to cart
    if (
      selectedVariant?.manage_inventory &&
      (selectedVariant?.inventory_quantity || 0) > 0
    ) {
      return true
    }

    // Otherwise, we can't add to cart
    return false
  }, [selectedVariant])

  const actionsRef = useRef<HTMLDivElement>(null)

  const inView = useIntersection(actionsRef, "0px")

  // add the selected variant to the cart
  const handleAddToCart = async () => {
    if (!selectedVariant?.id) return null

    setIsAdding(true)

    await addToCart({
      variantId: selectedVariant.id,
      quantity,
      countryCode,
    })

    setIsAdding(false)
  }

  // gross (c/IVA) hint from the Moloni VAT % stored on the product
  const { variantPrice, cheapestPrice } = getProductPrice({
    product,
    variantId: selectedVariant?.id,
  })
  const selectedPrice = selectedVariant ? variantPrice : cheapestPrice
  const vatPct = Number((product.metadata as any)?.moloni_vat_percent)
  const grossLabel =
    selectedPrice && Number.isFinite(vatPct) && vatPct > 0
      ? new Intl.NumberFormat("pt-PT", {
          style: "currency",
          currency: ((selectedPrice as any).currency_code || "eur").toUpperCase(),
        }).format(
          ((selectedPrice as any).calculated_price_number || 0) * (1 + vatPct / 100)
        )
      : null

  return (
    <>
      <div className="flex flex-col gap-y-2" ref={actionsRef}>
        <div>
          {(product.variants?.length ?? 0) > 1 && (
            <div className="flex flex-col gap-y-4">
              {(product.options || []).map((option) => {
                return (
                  <div key={option.id}>
                    <OptionSelect
                      option={option}
                      current={options[option.title ?? ""]}
                      updateOption={setOptionValue}
                      title={option.title ?? ""}
                      data-testid="product-options"
                      disabled={!!disabled || isAdding}
                    />
                  </div>
                )
              })}
              <Divider />
            </div>
          )}
        </div>

        {/* Price box */}
        <div className="flex items-end gap-3 border-y border-hairline py-5 my-2">
          <ProductPrice product={product} variant={selectedVariant} />
          {grossLabel && (
            <span className="ml-auto text-right text-xsmall-regular text-grey-50 leading-snug">
              <b className="block text-grey-70 text-small-regular">{grossLabel} c/ IVA</b>
              Preço sem IVA
            </span>
          )}
        </div>

        {/* Buy row: quantity + add to cart */}
        <div className="flex items-stretch gap-3 mt-2">
          <div className="flex items-center border-[1.5px] border-hairline rounded-btn overflow-hidden">
            <button
              type="button"
              aria-label="Diminuir quantidade"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-11 h-[52px] text-lg text-brand-ink hover:bg-grey-10"
            >
              −
            </button>
            <input
              value={quantity}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10)
                setQuantity(Number.isFinite(n) && n > 0 ? n : 1)
              }}
              inputMode="numeric"
              aria-label="Quantidade"
              className="w-12 h-[52px] text-center font-bold text-brand-ink outline-none"
            />
            <button
              type="button"
              aria-label="Aumentar quantidade"
              onClick={() => setQuantity((q) => q + 1)}
              className="w-11 h-[52px] text-lg text-brand-ink hover:bg-grey-10"
            >
              +
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddToCart}
            disabled={!inStock || !selectedVariant || !!disabled || isAdding}
            data-testid="add-product-button"
            className="flex-1 h-[52px] rounded-btn bg-brand-ink text-white font-bold uppercase tracking-wide text-small-regular flex items-center justify-center gap-2 transition hover:bg-brand-cyan hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:bg-brand-ink"
          >
            {!selectedVariant
              ? "Selecionar variante"
              : !inStock
              ? "Esgotado"
              : isAdding
              ? "A adicionar…"
              : "Adicionar ao carrinho →"}
          </button>
        </div>

        {/* Secondary CTA: request a salesperson contact */}
        <button
          type="button"
          onClick={() => setContactOpen(true)}
          data-testid="contact-cta"
          className="w-full h-[52px] mt-3 rounded-btn bg-white text-brand-cyan border-[1.5px] border-brand-cyan font-bold uppercase tracking-wide text-small-regular flex items-center justify-center gap-2 transition hover:bg-brand-cyan hover:text-white hover:-translate-y-0.5"
        >
          ☎ Pedir contacto a um comercial
        </button>

        <p className="flex items-center justify-center gap-1.5 mt-3 text-xsmall-regular text-grey-50 text-center">
          Compra em quantidade?&nbsp;
          <span>
            Peça um <b className="text-grey-70">orçamento profissional</b> ao seu comercial.
          </span>
        </p>

        {/* Assurance strip — NOTE: placeholder claims, confirm before launch */}
        <div className="grid grid-cols-3 gap-2 mt-5 text-center">
          {[
            ["Entrega 72h", "Portugal Continental"],
            ["Devolução", "30 dias"],
            ["Em stock", "Envio imediato"],
          ].map(([t, s]) => (
            <div key={t} className="rounded-large border border-hairline py-3 px-1">
              <b className="block text-xsmall-regular text-grey-70">{t}</b>
              <span className="text-[11px] text-grey-50">{s}</span>
            </div>
          ))}
        </div>

        <MobileActions
          product={product}
          variant={selectedVariant}
          options={options}
          updateOptions={setOptionValue}
          inStock={inStock}
          handleAddToCart={handleAddToCart}
          isAdding={isAdding}
          show={!inView}
          optionsDisabled={!!disabled || isAdding}
        />
      </div>

      <ContactModal
        open={contactOpen}
        onClose={() => setContactOpen(false)}
        productTitle={product.title}
        sku={selectedVariant?.sku ?? undefined}
        quantity={quantity}
      />
    </>
  )
}
