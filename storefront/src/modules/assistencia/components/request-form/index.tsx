"use client"

import { useState } from "react"
import { sdk } from "@lib/config"

/**
 * "Pedir assistência" — B2B technical-assistance request form. Posts to the
 * backend /store/contact-request (emails the team via Resend). pt-PT.
 *
 * Mirrors the posting pattern in
 * src/modules/products/components/contact-modal/index.tsx, including the
 * "company" honeypot field.
 */
const RequestForm = () => {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">(
    "idle"
  )

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    setStatus("sending")
    try {
      const equipamento = fd.get("equipamento") as string
      const tipo = fd.get("tipo") as string
      const mensagem = fd.get("mensagem") as string

      // Compose the free-text message so the team gets full context.
      const message = [
        tipo ? `Tipo de serviço: ${tipo}` : null,
        equipamento ? `Equipamento / marca: ${equipamento}` : null,
        mensagem ? `\n${mensagem}` : null,
      ]
        .filter(Boolean)
        .join("\n")

      await sdk.client.fetch("/store/contact-request", {
        method: "POST",
        body: {
          name: fd.get("name"),
          email: fd.get("email"),
          phone: fd.get("phone"),
          message,
          contactPref: fd.get("contactPref"),
          productTitle: "Assistência Técnica",
          company: fd.get("company"), // honeypot
          productUrl:
            typeof window !== "undefined" ? window.location.href : undefined,
        },
      })
      setStatus("done")
    } catch {
      setStatus("error")
    }
  }

  const labelCls =
    "block text-[11px] font-bold uppercase tracking-[0.06em] text-brand-ink mb-[7px]"
  const fieldCls =
    "w-full rounded-[12px] border-[1.5px] border-hairline bg-white px-[15px] py-[13px] text-sm font-medium text-brand-ink outline-none transition focus:border-brand-cyan focus:shadow-[0_0_0_4px_rgba(0,173,239,0.12)]"

  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-hero bg-gradient-to-br from-brand-navy to-brand-cyan lg:grid-cols-[0.9fr_1.1fr]">
      {/* Left rail — pitch + direct contacts */}
      <div className="p-8 text-white sm:p-[50px]">
        <span className="inline-flex items-center gap-2 text-[11px] font-bold uppercase leading-none tracking-[0.14em] text-[#bdeaff]">
          <span className="ind" style={{ background: "#bdeaff" }} />
          Pedir assistência
        </span>
        <h2 className="mt-4 max-w-[14ch] text-3xl font-extrabold leading-[1.08] tracking-[-0.025em] sm:text-[36px]">
          Conte-nos o que precisa
        </h2>
        <p className="mt-4 max-w-[40ch] text-[15px] leading-relaxed text-white/90">
          Respondemos em horas úteis. Para urgências, ligue diretamente — a
          nossa equipa está pronta.
        </p>
        <div className="mt-7 flex flex-col gap-[14px]">
          <a
            href="tel:+351278262913"
            className="flex items-center gap-3 text-[15px] font-semibold"
          >
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-white/[0.16]">
              ☎
            </span>
            +351 278 262 913
          </a>
          <a
            href="mailto:higitotal@higitotal.pt"
            className="flex items-center gap-3 text-[15px] font-semibold"
          >
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-white/[0.16]">
              ✉
            </span>
            higitotal@higitotal.pt
          </a>
          <div className="flex items-center gap-3 text-[15px] font-semibold">
            <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[11px] bg-white/[0.16]">
              ◎
            </span>
            Mirandela · Portugal
          </div>
        </div>
      </div>

      {/* Right rail — form */}
      <div className="bg-white p-8 sm:p-[46px]">
        {status === "done" ? (
          <div
            className="flex h-full flex-col justify-center"
            data-testid="request-form-success"
          >
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-svc-ok/15 text-2xl text-svc-ok">
              ✓
            </div>
            <h3 className="text-xl font-extrabold text-brand-ink">
              Pedido enviado
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-grey-60">
              Obrigado pelo seu contacto. A equipa de assistência técnica da
              Higitotal entrará em contacto consigo brevemente. Para urgências,
              ligue para +351 278 262 913.
            </p>
          </div>
        ) : (
          <form className="grid grid-cols-1 gap-4 sm:grid-cols-2" onSubmit={submit}>
            <div>
              <label className={labelCls} htmlFor="rf-name">
                Nome
              </label>
              <input
                id="rf-name"
                name="name"
                required
                placeholder="O seu nome"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="rf-phone">
                Telefone
              </label>
              <input
                id="rf-phone"
                name="phone"
                placeholder="+351 …"
                className={fieldCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="rf-email">
                Email
              </label>
              <input
                id="rf-email"
                name="email"
                type="email"
                required
                placeholder="email@empresa.pt"
                className={fieldCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="rf-tipo">
                Tipo de serviço
              </label>
              <select
                id="rf-tipo"
                name="tipo"
                className={fieldCls}
                defaultValue="Instalação"
              >
                <option>Instalação</option>
                <option>Reparação</option>
                <option>Contrato de manutenção</option>
                <option>Outro / não sei</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="rf-equipamento">
                Equipamento / marca
              </label>
              <input
                id="rf-equipamento"
                name="equipamento"
                placeholder="Ex.: Fagor, Sammic, Nilfisk…"
                className={fieldCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="rf-mensagem">
                Ocorrência
              </label>
              <textarea
                id="rf-mensagem"
                name="mensagem"
                rows={3}
                placeholder="Ex.: Máquina de lavar louça Fagor não aquece a água…"
                className={`${fieldCls} min-h-[84px] resize-y`}
              />
            </div>

            {/* Prefered contact channel */}
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="rf-contactPref">
                Prefere ser contactado por
              </label>
              <select
                id="rf-contactPref"
                name="contactPref"
                className={fieldCls}
                defaultValue="telefone"
              >
                <option value="telefone">Telefone</option>
                <option value="email">Email</option>
              </select>
            </div>

            {/* honeypot — hidden from users */}
            <input
              name="company"
              tabIndex={-1}
              autoComplete="off"
              className="hidden"
              aria-hidden="true"
            />

            {status === "error" && (
              <p className="text-sm text-rose-600 sm:col-span-2">
                Não foi possível enviar o pedido. Tente novamente ou ligue para
                +351 278 262 913.
              </p>
            )}

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={status === "sending"}
                className="flex w-full items-center justify-center gap-[10px] rounded-pill bg-svc-signal px-7 py-[15px] text-[13px] font-bold uppercase tracking-[0.04em] text-white shadow-[0_12px_30px_rgba(255,122,26,0.32)] transition hover:bg-svc-signal-ink disabled:opacity-60"
              >
                {status === "sending"
                  ? "A enviar…"
                  : "Enviar pedido de assistência →"}
              </button>
            </div>
            <p className="text-center text-xs font-medium leading-relaxed text-grey-50 sm:col-span-2">
              Ao enviar concorda em ser contactado pela equipa Higitotal sobre o
              seu pedido.
            </p>
          </form>
        )}
      </div>
    </div>
  )
}

export default RequestForm
