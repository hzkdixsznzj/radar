export const LEGAL_INFO = {
  companyName:
    process.env.NEXT_PUBLIC_COMPANY_NAME ??
    '[À configurer : NEXT_PUBLIC_COMPANY_NAME]',
  bceNumber:
    process.env.NEXT_PUBLIC_BCE_NUMBER ??
    '[À configurer : NEXT_PUBLIC_BCE_NUMBER]',
  vatNumber:
    process.env.NEXT_PUBLIC_VAT_NUMBER ??
    '[À configurer : NEXT_PUBLIC_VAT_NUMBER]',
  companyAddress:
    process.env.NEXT_PUBLIC_COMPANY_ADDRESS ??
    '[À configurer : NEXT_PUBLIC_COMPANY_ADDRESS]',
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? 'contact@radar.be',
  privacyEmail:
    process.env.NEXT_PUBLIC_PRIVACY_EMAIL ?? 'privacy@radar.be',
  dpoEmail: process.env.NEXT_PUBLIC_DPO_EMAIL ?? 'dpo@radar.be',
} as const;
