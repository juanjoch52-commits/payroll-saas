import { describe, it, expect } from 'vitest'
import { signPayload, generateWebhookSecret } from './sign'

describe('signPayload', () => {
  const body = '{"event":"ping"}'

  it('produce la firma HMAC-SHA256 esperada (vector fijo)', () => {
    expect(signPayload('whsec_test', body)).toBe(
      'sha256=645e86a36ef1ed458be359c7d3c57737f8a202a88274a809a507f208ba54d991',
    )
  })

  it('prefija con sha256=', () => {
    expect(signPayload('s', 'x')).toMatch(/^sha256=[0-9a-f]{64}$/)
  })

  it('es determinista', () => {
    expect(signPayload('k', body)).toBe(signPayload('k', body))
  })

  it('cambia con el secret', () => {
    expect(signPayload('k1', body)).not.toBe(signPayload('k2', body))
  })

  it('cambia con el cuerpo', () => {
    expect(signPayload('k', 'a')).not.toBe(signPayload('k', 'b'))
  })
})

describe('generateWebhookSecret', () => {
  it('tiene el prefijo whsec_ y 48 hex chars', () => {
    expect(generateWebhookSecret()).toMatch(/^whsec_[0-9a-f]{48}$/)
  })

  it('genera valores únicos', () => {
    expect(generateWebhookSecret()).not.toBe(generateWebhookSecret())
  })
})
