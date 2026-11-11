import { LEGACY_SEASON_ID } from './seasons.mjs'
// Original source retained exclusively for the legacy season.
const LEGACY_SOURCE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS-cmQfBRf3_LpTHaqJmmolqENeue_-egKq6xpPvvW3bFWxqfZF9HbidZdWIqrKWT12-6Zf7BqQ4GSV/pub?output=csv'
export function defaultWellnessSource(id, env = process.env) {
  return id === LEGACY_SEASON_ID ? (env.WELLNESS_URL_2026 || LEGACY_SOURCE) : (env.WELLNESS_URL_2027 || '')
}
export function validWellnessSource(value) {
  if (!value) return true
  try { const url = new URL(value); return url.protocol === 'https:' && url.hostname === 'docs.google.com' && !url.username && !url.password && /^\/spreadsheets\/d\/e\/[^/]+\/pub$/.test(url.pathname) && url.searchParams.get('output') === 'csv' } catch { return false }
}
