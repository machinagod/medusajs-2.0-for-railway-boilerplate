"use client"

import { useState } from "react"
import { sdk } from "@lib/config"

type Props = {
  open: boolean
  onClose: () => void
  productTitle?: string
  sku?: string
  quantity?: number
}

/**
 * "Pedir contacto a um comercial" — B2B contact/quote request. Posts to the
 * backend /store/contact-request (emails sales via Resend). pt-PT.
 */
const ContactModal = ({ open, onClose, productTitle, sku, quantity }: Props) => {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle")

  if (!open) {
    return null
  }

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setStatus("sending")
    try {
      await sdk.client.fetch("/store/contact-request", {
        method: "POST",
        body: {
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          contactPref: fd.get("contactPref"),
          message: fd.get("message"),
          company: fd.get("company"), // honeypot
          productTitle,
          sku,
          quantity,
          productUrl: typeof window !== "undefined" ? window.location.href : undefined,
        },
      })
      setStatus("done")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] bg-white rounded-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="contact-modal"
      >
        <div className="flex items-start justify-between">
          <h3 className="text-xl font-bold text-brand-ink">Pedir contacto</h3>
          <button onClick={onClose} aria-label="Fechar" className="text-grey-50 text-2xl leading-none">
            ×
          </button>
        </div>

        {status === "done" ? (
          <p className="mt-4 text-grey-60">
            Pedido enviado. Um comercial entrará em contacto consigo brevemente.
          </p>
        ) : (
          <form className="mt-4 flex flex-col gap-3" onSubmit={submit}>
            {productTitle && (
              <p className="text-xsmall-regular text-grey-50">Sobre: {productTitle}</p>
            )}
            <input name="name" required placeholder="Nome" className="ht-field" />
            <input name="email" type="email" required placeholder="Email" className="ht-field" />
            <input name="phone" placeholder="Telefone" className="ht-field" />
            <label className="text-xsmall-regular text-grey-50">Prefere ser contactado por</label>
            <select name="contactPref" className="ht-field" defaultValue="telefone">
              <option value="telefone">Telefone</option>
              <option value="email">Email</option>
            </select>
            <textarea
              name="message"
              rows={3}
              placeholder="Mensagem (ex.: quantidade, prazo, orçamento)"
              className="ht-field"
            />
            {/* honeypot — hidden from users */}
            <input
              name="company"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />
            {status === "error" && (
              <p className="text-small-regular text-rose-600">
                Não foi possível enviar. Tente novamente.
              </p>
            )}
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-1 h-12 rounded-btn bg-brand-cyan text-white font-bold uppercase tracking-wide text-small-regular transition hover:bg-brand-cyan-ink disabled:opacity-60"
            >
              {status === "sending" ? "A enviar…" : "Pedir contacto →"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ContactModal
