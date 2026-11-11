import { AsyncLocalStorage } from 'node:async_hooks'
import { findSeason } from './seasons.mjs'
const scope = new AsyncLocalStorage()
export function requireSeason(id) {
  const season = findSeason(id)
  if (!season) throw new Error('Selecione uma temporada válida.')
  return season
}
export const TABLES = [
  `CREATE TABLE IF NOT EXISTS season_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS gps_sessions (id SERIAL PRIMARY KEY, session_date VARCHAR(20) NOT NULL, session_name VARCHAR(255) NOT NULL, filename VARCHAR(255), uploaded_at TIMESTAMPTZ DEFAULT NOW(), rows JSONB NOT NULL, metadata JSONB NOT NULL DEFAULT '{}')`,
  `ALTER TABLE gps_sessions ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_gps_sessions_date_name ON gps_sessions(session_date, session_name)`,
  `CREATE TABLE IF NOT EXISTS athletes (id SERIAL PRIMARY KEY, name VARCHAR(255) NOT NULL UNIQUE, full_name VARCHAR(255), birth_date DATE, weight_kg DECIMAL(5,2), height_cm INTEGER, dominant_foot VARCHAR(20), city VARCHAR(255), position VARCHAR(50), notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS injury_history (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL, injury_date DATE NOT NULL, body_region VARCHAR(10) NOT NULL, injury_type VARCHAR(255) NOT NULL, description TEXT, severity VARCHAR(20), days_out INTEGER, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS cmj_baseline (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL UNIQUE, melhor_salto FLOAT NOT NULL, data_avaliacao DATE, updated_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS cmj_coletas (id SERIAL PRIMARY KEY, athlete_name VARCHAR(255) NOT NULL, data_coleta DATE NOT NULL, salto_1 FLOAT, salto_2 FLOAT, salto_3 FLOAT, media FLOAT NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS name_aliases (id SERIAL PRIMARY KEY, gps_name VARCHAR(255) NOT NULL UNIQUE, bem_name VARCHAR(255) NOT NULL, created_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE TABLE IF NOT EXISTS squad_exclusions (id SERIAL PRIMARY KEY, player_name VARCHAR(255) NOT NULL, normalized_name VARCHAR(255) NOT NULL UNIQUE, excluded_at TIMESTAMPTZ DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS idx_cmj_date ON cmj_coletas(data_coleta DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_injury_athlete ON injury_history(athlete_name)`,
]
export async function prepareSeason(client, id) {
  const season = requireSeason(id)
  await client.query('BEGIN')
  try {
    // Allowlisted identifiers; no user-supplied SQL identifier is interpolated.
    await client.query(`CREATE SCHEMA IF NOT EXISTS "${season.schema}"`)
    await client.query(`SET LOCAL search_path TO "${season.schema}"`)
    for (const statement of TABLES) await client.query(statement)
    await client.query('COMMIT')
  } catch (error) { await client.query('ROLLBACK'); throw error }
}
export async function inSeason(client, id, work) {
  const season = requireSeason(id)
  await client.query('BEGIN')
  try {
    // Never fall back to public when a table is missing in another season.
    await client.query(`SET LOCAL search_path TO "${season.schema}"`)
    const result = await scope.run({ client, season }, work)
    await client.query(result?.status >= 400 ? 'ROLLBACK' : 'COMMIT')
    return result
  } catch (error) { await client.query('ROLLBACK'); throw error }
}
export function sql(strings, ...values) {
  const current = scope.getStore()
  if (!current) throw new Error('Consulta fora de uma temporada autenticada.')
  const statement = strings.reduce((query, segment, i) => query + (i ? `$${i}` : '') + segment, '')
  return current.client.query(statement, values)
}
