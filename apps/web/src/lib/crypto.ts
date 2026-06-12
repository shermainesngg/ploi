/**
 * AES-256-GCM encrypt-at-rest helpers for server-only secrets (the Google
 * Calendar refresh token). The key lives in GCAL_TOKEN_ENC_KEY (base64-encoded
 * 32 bytes) and never leaves the server.
 *
 * Output format: `iv:authTag:ciphertext`, each part base64-encoded. GCM gives an
 * authentication tag we store alongside the ciphertext so tampering is detected
 * on decrypt.
 *
 * The key is only validated when these functions are actually called, so the app
 * still boots unconfigured (Google Calendar sync is a silent no-op without it).
 */

import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96-bit IV, the recommended size for GCM
const KEY_LENGTH = 32 // 256 bits

/** Resolve and validate the encryption key. Throws only when invoked. */
function getKey(): Buffer {
  const raw = process.env.GCAL_TOKEN_ENC_KEY
  if (!raw) {
    throw new Error('GCAL_TOKEN_ENC_KEY is not set — cannot encrypt/decrypt secrets')
  }
  const key = Buffer.from(raw, 'base64')
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `GCAL_TOKEN_ENC_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length}); ` +
        'generate one with `openssl rand -base64 32`',
    )
  }
  return key
}

/** Encrypt a plaintext secret. Returns `iv:authTag:ciphertext` (base64 parts). */
export function encryptSecret(plain: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('base64'), authTag.toString('base64'), ciphertext.toString('base64')].join(':')
}

/** Decrypt a payload produced by {@link encryptSecret}. */
export function decryptSecret(payload: string): string {
  const key = getKey()
  const [ivB64, authTagB64, ciphertextB64] = payload.split(':')
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Malformed encrypted payload — expected `iv:authTag:ciphertext`')
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'))
  const plain = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, 'base64')),
    decipher.final(),
  ])
  return plain.toString('utf8')
}
