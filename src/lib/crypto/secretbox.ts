/**
 * secretbox — cifrado simétrico AES-256-GCM para secretos en reposo.
 *
 * Se usa para guardar los tokens OAuth de QuickBooks (y, en el futuro,
 * `tax_id_encrypted` de empleados) en la columna `integrations.credentials_encrypted`,
 * que hoy está en texto plano.
 *
 * Clave: `process.env.ENCRYPTION_KEY`, 32 bytes en base64 (recomendado) o hex.
 * Genera una con:  `openssl rand -base64 32`
 *
 * Degradación elegante: si no hay clave, `isEncryptionConfigured()` devuelve false
 * y las features que dependen de cifrado (QuickBooks) se deshabilitan con un mensaje,
 * igual que Mapbox/Stripe cuando faltan sus keys. NUNCA se importa en el cliente:
 * usa `node:crypto` y solo debe llamarse desde código de servidor.
 *
 * Formato del blob: base64( iv[12] | authTag[16] | ciphertext ).
 */
import crypto from 'node:crypto'

const ALGO = 'aes-256-gcm'
const IV_LEN = 12 // nonce de 96 bits, recomendado para GCM
const TAG_LEN = 16

/**
 * Decodifica la ENCRYPTION_KEY a un Buffer de 32 bytes.
 * Acepta base64 o hex. Devuelve null si falta o no mide 32 bytes.
 */
function getKey(): Buffer | null {
  const raw = process.env.ENCRYPTION_KEY
  if (!raw || raw.trim().length === 0) return null

  // Intenta base64 primero.
  const b64 = Buffer.from(raw, 'base64')
  if (b64.length === 32) return b64

  // Luego hex (64 chars).
  const hex = Buffer.from(raw, 'hex')
  if (hex.length === 32) return hex

  return null
}

/** True si hay una ENCRYPTION_KEY válida de 32 bytes. */
export function isEncryptionConfigured(): boolean {
  return getKey() !== null
}

/** Cifra un string UTF-8 y devuelve el blob base64. Lanza si no hay key. */
export function encryptSecret(plaintext: string): string {
  const key = getKey()
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY no configurada. Genera una con `openssl rand -base64 32` y ponla en .env.local.',
    )
  }
  const iv = crypto.randomBytes(IV_LEN)
  const cipher = crypto.createCipheriv(ALGO, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

/** Descifra un blob base64 producido por `encryptSecret`. Lanza si no hay key o el tag no valida. */
export function decryptSecret(blob: string): string {
  const key = getKey()
  if (!key) {
    throw new Error('ENCRYPTION_KEY no configurada; no se puede descifrar el secreto.')
  }
  const buf = Buffer.from(blob, 'base64')
  if (buf.length < IV_LEN + TAG_LEN) {
    throw new Error('Blob cifrado inválido (demasiado corto).')
  }
  const iv = buf.subarray(0, IV_LEN)
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN)
  const ciphertext = buf.subarray(IV_LEN + TAG_LEN)
  const decipher = crypto.createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

/**
 * Helper de conveniencia para serializar+cifrar un objeto JSON (p.ej. tokens OAuth).
 */
export function encryptJson(value: unknown): string {
  return encryptSecret(JSON.stringify(value))
}

/** Descifra y parsea un objeto JSON. Devuelve null si falla (key ausente o blob corrupto). */
export function decryptJson<T>(blob: string | null | undefined): T | null {
  if (!blob) return null
  try {
    return JSON.parse(decryptSecret(blob)) as T
  } catch {
    return null
  }
}
