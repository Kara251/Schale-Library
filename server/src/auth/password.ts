/**
 * PBKDF2 密码哈希（WebCrypto crypto.subtle）。
 * 存储格式：$pbkdf2$<iter>$<saltB64>$<hashB64>，迭代次数 ≥100000。
 */
const PBKDF2_ITERATIONS = 210000
const HASH_LENGTH = 32
export const PASSWORD_HASH_PREFIX = '$pbkdf2$'

function toBase64(bytes: Uint8Array): string {
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
  return btoa(binary)
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt as BufferSource,
      iterations,
    },
    keyMaterial,
    HASH_LENGTH * 8
  )
  return new Uint8Array(bits)
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const hash = await derive(password, salt, PBKDF2_ITERATIONS)
  return `${PASSWORD_HASH_PREFIX}${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`
}

/** 恒定时间比较，避免时序侧信道。 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  if (!stored.startsWith(PASSWORD_HASH_PREFIX)) return false
  const parts = stored.slice(PASSWORD_HASH_PREFIX.length).split('$')
  if (parts.length !== 3) return false
  const [iterRaw, saltB64, hashB64] = parts as [string, string, string]
  const iterations = Number(iterRaw)
  if (!Number.isInteger(iterations) || iterations < 100000) return false

  let salt: Uint8Array
  let expected: Uint8Array
  try {
    salt = fromBase64(saltB64)
    expected = fromBase64(hashB64)
  } catch {
    return false
  }
  if (salt.length === 0 || expected.length === 0) return false

  const actual = await derive(password, salt, iterations)
  return constantTimeEqual(actual, expected)
}
