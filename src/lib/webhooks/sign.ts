import crypto from 'node:crypto'

// =============================================================================
// Webhooks — firma (puro, sin imports de servidor → testeable y reutilizable)
// =============================================================================

/** Firma HMAC-SHA256 del cuerpo, en el formato `sha256=<hex>`. */
export function signPayload(secret: string, body: string): string {
  return 'sha256=' + crypto.createHmac('sha256', secret).update(body).digest('hex')
}

/** Genera un secret de firma nuevo (formato `whsec_<hex>`, 24 bytes). */
export function generateWebhookSecret(): string {
  return 'whsec_' + crypto.randomBytes(24).toString('hex')
}
