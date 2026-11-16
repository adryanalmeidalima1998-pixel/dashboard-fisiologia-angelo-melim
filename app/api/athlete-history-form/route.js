import { sql, withSeason } from '@/lib/season-server'
import { readHistoryConfig } from '@/lib/athlete-history-handler.mjs'
import { historyPath } from '@/lib/athlete-history-token.mjs'
import { newCollectionConfig } from '@/lib/collection-token.mjs'
async function describe(season) {
  const config = await readHistoryConfig()
  return { configured: !!config, enabled: !!config?.enabled, origin: process.env.NEXTAUTH_URL ? new URL(process.env.NEXTAUTH_URL).origin : null, path: config ? historyPath(season.id, config, process.env.NEXTAUTH_SECRET) : null }
}
export const GET = withSeason(async function GET(request, { season }) { return Response.json(await describe(season)) })
export const POST = withSeason(async function POST(request, { season }) {
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Ação inválida.' }, { status: 400 }) }
  if (!['enable', 'disable', 'rotate'].includes(body.action)) return Response.json({ error: 'Ação inválida.' }, { status: 400 })
  let config = await readHistoryConfig()
  if (!config || body.action === 'rotate') config = newCollectionConfig()
  config.enabled = body.action !== 'disable'
  await sql`INSERT INTO season_settings(key,value) VALUES ('athlete_history_form',${JSON.stringify(config)}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`
  return Response.json(await describe(season))
})
