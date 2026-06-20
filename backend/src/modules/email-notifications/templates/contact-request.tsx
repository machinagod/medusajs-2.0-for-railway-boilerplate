import { Section, Text, Hr } from '@react-email/components'
import { Base } from './base'

export const CONTACT_REQUEST = 'contact-request'

export interface ContactRequestEmailProps {
  /** Customer name */
  name: string
  /** Customer email */
  email: string
  /** Customer phone (optional) */
  phone?: string
  /** Preferred contact channel: "telefone" | "email" */
  contactPref?: string
  /** Free-text message (optional) */
  message?: string
  /** Product the request is about */
  productTitle?: string
  /** SKU/reference */
  sku?: string
  /** Quantity of interest */
  quantity?: number
  /** Absolute URL of the product page */
  productUrl?: string
  preview?: string
}

export const isContactRequestData = (data: any): data is ContactRequestEmailProps =>
  typeof data?.name === 'string' && typeof data?.email === 'string'

const Row = ({ label, value }: { label: string; value?: string | number }) =>
  value === undefined || value === '' ? null : (
    <Text className="text-black text-[14px] leading-[22px] my-[2px]">
      <strong>{label}:</strong> {value}
    </Text>
  )

export const ContactRequestEmail = ({
  name,
  email,
  phone,
  contactPref,
  message,
  productTitle,
  sku,
  quantity,
  productUrl,
  preview = 'Novo pedido de contacto comercial',
}: ContactRequestEmailProps) => {
  return (
    <Base preview={preview}>
      <Section className="mt-[24px]">
        <Text className="text-black text-[18px] font-semibold">
          Novo pedido de contacto comercial
        </Text>
        <Text className="text-[#666666] text-[13px] leading-[22px]">
          Um cliente pediu para ser contactado a partir da loja Higitotal.
        </Text>
      </Section>
      <Hr className="border border-solid border-[#eaeaea] my-[16px] mx-0 w-full" />
      <Section>
        <Row label="Nome" value={name} />
        <Row label="Email" value={email} />
        <Row label="Telefone" value={phone} />
        <Row label="Contacto preferido" value={contactPref} />
      </Section>
      <Hr className="border border-solid border-[#eaeaea] my-[16px] mx-0 w-full" />
      <Section>
        <Row label="Produto" value={productTitle} />
        <Row label="Referência" value={sku} />
        <Row label="Quantidade" value={quantity} />
        <Row label="URL" value={productUrl} />
      </Section>
      {message ? (
        <>
          <Hr className="border border-solid border-[#eaeaea] my-[16px] mx-0 w-full" />
          <Section>
            <Text className="text-black text-[14px] leading-[22px]">
              <strong>Mensagem:</strong>
            </Text>
            <Text className="text-black text-[14px] leading-[22px] whitespace-pre-line">
              {message}
            </Text>
          </Section>
        </>
      ) : null}
    </Base>
  )
}

ContactRequestEmail.PreviewProps = {
  name: 'João Silva',
  email: 'joao@exemplo.pt',
  phone: '+351 912 345 678',
  contactPref: 'telefone',
  message: 'Preciso de orçamento para 20 unidades.',
  productTitle: 'Suma Auto Oven 2em1 DA9.10 (2x5L)',
  sku: '100833185',
  quantity: 20,
  productUrl: 'https://higitotal.pt/dk/products/100833185',
} as ContactRequestEmailProps

export default ContactRequestEmail
