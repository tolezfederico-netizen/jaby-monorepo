// Número listo para wa.me: solo dígitos y con el código de país de Argentina (54) una sola vez,
// sin importar si se cargó como "11 2345-6789", "+54 9 11..." o "54911...".
export function toWhatsAppNumber(raw: string | null | undefined): string {
  const digits = (raw ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('54') ? digits : `54${digits}`
}
