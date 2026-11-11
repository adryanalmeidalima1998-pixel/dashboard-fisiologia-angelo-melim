import { sql, withSeason } from '@/lib/season-server'
import { defaultWellnessSource, validWellnessSource } from '@/lib/wellness.mjs'
export const GET = withSeason(async function GET(request, { season }) {
  const { rows } = await sql`SELECT value FROM season_settings WHERE key = 'wellness_url'`
  return Response.json({ wellnessUrl: rows.length ? rows[0].value : defaultWellnessSource(season.id), seasonId: season.id })
})
export const PUT = withSeason(async function PUT(request) {
  const body = await request.json()
  if (typeof body.wellnessUrl !== 'string' || !validWellnessSource(body.wellnessUrl.trim())) return Response.json({ error: 'Use o link do Google Sheets publicado na Web em formato CSV.' }, { status: 400 })
  const value = body.wellnessUrl.trim()
  await sql`INSERT INTO season_settings (key, value) VALUES ('wellness_url', ${value}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
  return Response.json({ success: true })
})
