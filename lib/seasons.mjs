export const OWNER = Object.freeze({ name: 'Ângelo Melim', role: 'Preparador físico e fisiologista' })
export const LEGACY_SEASON_ID = '2026-novorizontino'
export const SEASONS = Object.freeze([
  Object.freeze({ id: LEGACY_SEASON_ID, year: 2026, club: 'Grêmio Novorizontino', shortName: 'Novorizontino', location: 'Novo Horizonte · SP', logo: '/club/escudonovorizontino.png', theme: 'novorizontino', schema: 'public', accent: '#f59e0b', label: 'Temporada 2026' }),
  Object.freeze({ id: '2027-americano', year: 2027, club: 'Americano Futebol Clube', shortName: 'Americano FC', location: 'Campos dos Goytacazes · RJ', logo: '/club/americano.webp', theme: 'americano', schema: 'season_2027_americano', accent: '#52525b', label: 'Temporada 2027' }),
])
export function findSeason(id) { return SEASONS.find(s => s.id === id) || null }
export function seasonHref(path, seasonId) {
  if (!findSeason(seasonId)) throw new Error('Temporada inválida')
  const url = new URL(path, 'https://dashboard.local')
  if (url.origin !== 'https://dashboard.local') throw new Error('Destino inválido')
  url.searchParams.set('temporada', seasonId)
  return url.pathname + url.search + url.hash
}
export function storageKey(seasonId, key) {
  if (!findSeason(seasonId)) throw new Error('Temporada inválida')
  return `angelo:${seasonId}:${key}`
}
export function seasonStorage(storage, seasonId) {
  return {
    getItem(key) {
      const scoped = storageKey(seasonId, key)
      const current = storage.getItem(scoped)
      if (current !== null || seasonId !== LEGACY_SEASON_ID) return current
      const legacy = storage.getItem(key)
      if (legacy !== null) storage.setItem(scoped, legacy)
      return legacy
    },
    setItem(key, value) { storage.setItem(storageKey(seasonId, key), value) },
    removeItem(key) { storage.removeItem(storageKey(seasonId, key)) },
  }
}
