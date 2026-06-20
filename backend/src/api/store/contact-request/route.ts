import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { CONTACT_REQUEST } from "../../../modules/email-notifications/templates/contact-request"

type Body = {
  name?: string
  email?: string
  phone?: string
  contactPref?: string
  message?: string
  productTitle?: string
  sku?: string
  quantity?: number
  productUrl?: string
  // honeypot — bots fill hidden fields; humans don't
  company?: string
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Public "Pedir contacto a um comercial" submission. Emails the sales inbox via
 * the configured notification provider (Resend). Requires the publishable key
 * (store route). Quietly succeeds on honeypot hits so bots get no signal.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const b = (req.body ?? {}) as Body

  if (b.company) {
    // honeypot tripped — pretend success
    return res.json({ ok: true })
  }

  const name = (b.name ?? "").trim()
  const email = (b.email ?? "").trim()
  if (!name || !EMAIL_RE.test(email)) {
    return res.status(400).json({ message: "name and a valid email are required" })
  }
  if (!(b.phone ?? "").trim() && !(b.message ?? "").trim()) {
    return res.status(400).json({ message: "provide a phone or a message" })
  }

  const to =
    process.env.CONTACT_REQUEST_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    "higitotal@higitotal.pt"

  const notification = req.scope.resolve(Modules.NOTIFICATION)
  await notification.createNotifications({
    to,
    channel: "email",
    template: CONTACT_REQUEST,
    data: {
      name,
      email,
      phone: (b.phone ?? "").trim() || undefined,
      contactPref: (b.contactPref ?? "").trim() || undefined,
      message: (b.message ?? "").trim() || undefined,
      productTitle: b.productTitle,
      sku: b.sku,
      quantity: b.quantity,
      productUrl: b.productUrl,
    },
  })

  res.json({ ok: true })
}
