import { createHmac } from 'node:crypto'
import { findSeason } from './seasons.mjs'
import { sql } from './season-db.mjs'
import { validHistoryToken } from './athlete-history-token.mjs'
import { activeCollectionToken } from './collection-token.mjs'
import { HistoryError, validateHistory } from './athlete-history-rules.mjs'
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' } })
export async function readHistoryConfig(lock = false) {
  const { rows } = lock
    ? await sql`SELECT value FROM season_settings WHERE key='athlete_history_form' FOR SHARE`
    : await sql`SELECT value FROM season_settings WHERE key='athlete_history_form'`
  if (!rows.length) return null
  try { return JSON.parse(rows[0].value) } catch { return null }
}
export async function reopenHistory(athleteId) {
  // The same athlete lock is taken by submissions, so reopen never races a save.
  await sql`SELECT id FROM athletes WHERE id=${athleteId} FOR UPDATE`
  const { rows } = await sql`UPDATE athlete_questionnaires SET allows_update=TRUE WHERE athlete_id=${athleteId} AND is_current RETURNING id`
  return rows.length > 0
}
export function createHistoryHandlers({ runDatabase, secret, canonicalOrigin }) {
  async function handle(request, context, submit) {
    try {
      const { seasonId } = await context.params
      const season = findSeason(seasonId), key = secret()
      const token = request.headers.get('authorization')?.replace(/^Bearer /, '')
      if (!season || !validHistoryToken(token, seasonId, key)) return json({ error: 'Link indisponível. Solicite o link do questionário à comissão técnica.' }, 404)
      let payload
      if (submit) {
        const expected = canonicalOrigin?.() || new URL(request.url).origin
        if (request.headers.get('origin') && request.headers.get('origin') !== expected) return json({ error: 'Origem inválida.' }, 403)
        if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Formato de resposta inválido.' }, 415)
        const text = await request.text()
        if (Buffer.byteLength(text) > 60000) return json({ error: 'Resposta muito grande.' }, 413)
        try { payload = validateHistory(JSON.parse(text)) } catch (error) { if (error instanceof SyntaxError) return json({ error: 'Resposta inválida.' }, 400); throw error }
      }
      return await runDatabase(season, async () => {
        const config = await readHistoryConfig(true)
        if (!activeCollectionToken(token, config)) return json({ error: 'Este link foi desativado. Solicite o link atual à comissão técnica.' }, 404)
        if (!submit) {
          const { rows } = await sql`SELECT id,name FROM athletes WHERE NOT EXISTS (SELECT 1 FROM squad_exclusions e WHERE lower(e.player_name)=lower(athletes.name)) ORDER BY name`
          return json({ athletes: rows })
        }
        const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown'
        const bucket = createHmac('sha256', key).update(`history-rate:${season.id}:${ip}`).digest('hex')
        const { rows: limits } = await sql`INSERT INTO wellness_form_rate_limits (key) VALUES (${bucket}) ON CONFLICT (key) DO UPDATE SET hits=CASE WHEN wellness_form_rate_limits.window_start < NOW()-INTERVAL '1 minute' THEN 1 ELSE wellness_form_rate_limits.hits+1 END, window_start=CASE WHEN wellness_form_rate_limits.window_start < NOW()-INTERVAL '1 minute' THEN NOW() ELSE wellness_form_rate_limits.window_start END RETURNING hits`
        if (limits[0].hits > 120) return json({ error: 'Muitos envios. Aguarde um minuto e tente novamente.' }, 429)
        const { rows: athletes } = await sql`SELECT id,name FROM athletes WHERE id=${payload.athleteId} AND NOT EXISTS (SELECT 1 FROM squad_exclusions e WHERE lower(e.player_name)=lower(athletes.name)) FOR UPDATE`
        if (!athletes.length) return json({ error: 'Atleta indisponível. Selecione seu nome no elenco atual.' }, 400)
        const encoded = JSON.stringify(payload.answers)
        const { rows: same } = await sql`SELECT athlete_id,answers FROM athlete_questionnaires WHERE id=${payload.submissionId}`
        if (same.length) {
          const { rows: identical } = await sql`SELECT id FROM athlete_questionnaires WHERE id=${payload.submissionId} AND athlete_id=${payload.athleteId} AND answers=${encoded}::jsonb`
          return identical.length ? json({ saved: true }) : json({ error: 'Este envio já foi registrado com outros dados. Reabra o formulário.' }, 409)
        }
        const { rows: current } = await sql`SELECT id,allows_update FROM athlete_questionnaires WHERE athlete_id=${payload.athleteId} AND is_current`
        if (current.length && !current[0].allows_update) return json({ error: 'Já existe um questionário registrado para este atleta. Para corrigir ou atualizar, peça à comissão técnica que libere uma nova resposta.' }, 409)
        if (current.length) await sql`UPDATE athlete_questionnaires SET is_current=FALSE,allows_update=FALSE WHERE id=${current[0].id}`
        await sql`INSERT INTO athlete_questionnaires(id,athlete_id,athlete_name,form_version,answers) VALUES (${payload.submissionId},${payload.athleteId},${athletes[0].name},${payload.version},${encoded}::jsonb)`
        return json({ saved: true }, 201)
      })
    } catch (error) {
      if (error instanceof HistoryError) return json({ error: error.message }, error.status)
      console.error('Falha no questionário:', error.code || error.name)
      return json({ error: 'Não foi possível registrar. As respostas continuam na tela; tente novamente.' }, 503)
    }
  }
  return { GET: (r, c) => handle(r, c, false), POST: (r, c) => handle(r, c, true) }
}
