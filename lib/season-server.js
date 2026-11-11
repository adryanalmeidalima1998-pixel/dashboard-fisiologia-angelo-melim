import { createPool } from '@vercel/postgres'
import { getOwnerSession } from './auth'
import { createSeasonHandler } from './season-handler.mjs'
import { prepareSeason, inSeason } from './season-db.mjs'
export { sql } from './season-db.mjs'
let pool
const initialization = new Map()
async function initialize(season) {
  if (!pool) pool = createPool()
  if (!initialization.has(season.id)) {
    const pending = (async () => {
      const client = await pool.connect()
      try { await prepareSeason(client, season.id) } finally { client.release() }
    })().catch(error => { initialization.delete(season.id); throw error })
    initialization.set(season.id, pending)
  }
  await initialization.get(season.id)
}
export const withSeason = createSeasonHandler({
  getSession: getOwnerSession,
  canonicalOrigin: () => process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : null,
  runDatabase: async (season, execute) => {
    await initialize(season)
    const client = await pool.connect()
    try { return await inSeason(client, season.id, execute) }
    finally { client.release() }
  },
})
