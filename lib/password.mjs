import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto'
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  return `scrypt:${salt}:${scryptSync(password, salt, 64).toString('hex')}`
}
export function verifyPassword(password, encoded) {
  try {
    const [kind, salt, hex] = encoded.split(':')
    if (kind !== 'scrypt' || !/^[0-9a-f]{32}$/.test(salt) || !/^[0-9a-f]{128}$/.test(hex)) return false
    return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(hex, 'hex'))
  } catch { return false }
}
export function verifyConfiguredPassword(password, env = process.env) {
  if (typeof password !== 'string' || password.length > 1024) return false
  if (env.DASHBOARD_PASSWORD) {
    if (env.DASHBOARD_PASSWORD.length < 12 || env.DASHBOARD_PASSWORD.length > 1024) return false
    const supplied = createHash('sha256').update(password).digest()
    const configured = createHash('sha256').update(env.DASHBOARD_PASSWORD).digest()
    return timingSafeEqual(supplied, configured)
  }
  return verifyPassword(password, env.DASHBOARD_PASSWORD_HASH || '')
}
export function credentialVersion(env = process.env) {
  const configured = env.DASHBOARD_PASSWORD ? `direct:${env.DASHBOARD_PASSWORD}` : (env.DASHBOARD_PASSWORD_HASH || '')
  return createHash('sha256').update(env.DASHBOARD_USERNAME || 'angelo.melim').update(configured).digest('hex').slice(0, 24)
}
