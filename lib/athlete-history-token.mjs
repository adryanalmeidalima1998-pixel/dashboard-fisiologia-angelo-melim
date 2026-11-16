import { createHmac, timingSafeEqual } from 'node:crypto'
// Deliberately distinct from wellness: a link cannot authorize the other form.
export function historyToken(seasonId, nonce, secret) {
  if (!secret) throw new Error('Configuração de acesso indisponível.')
  return `${nonce}.${createHmac('sha256', secret).update(`athraven-athlete-history:${seasonId}:${nonce}`).digest('base64url')}`
}
export function validHistoryToken(token, seasonId, secret) {
  if (!secret || typeof token !== 'string' || !/^[A-Za-z0-9_-]{32}\.[A-Za-z0-9_-]{43}$/.test(token)) return false
  return timingSafeEqual(Buffer.from(token), Buffer.from(historyToken(seasonId, token.split('.')[0], secret)))
}
export const historyPath = (seasonId, config, secret) => `/questionario/${seasonId}#acesso=${historyToken(seasonId, config.nonce, secret)}`
