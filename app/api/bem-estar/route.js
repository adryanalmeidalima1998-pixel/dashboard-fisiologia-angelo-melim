import { sql, withSeason } from '@/lib/season-server'
import { defaultWellnessSource, validWellnessSource } from '@/lib/wellness.mjs'
export const GET = withSeason(async function GET(request, { season }) {
  const { rows } = await sql`SELECT value FROM season_settings WHERE key = 'wellness_url'`
  const url = rows.length ? rows[0].value : defaultWellnessSource(season.id)
  if (!url) return new Response('', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'X-Source-Configured': 'false' } })
  if (!validWellnessSource(url)) return Response.json({ error: 'Fonte de bem-estar inválida.' }, { status: 422 })
  try {
    const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(15000) })
    if (!response.ok) return Response.json({ error: 'Não foi possível acessar a planilha.' }, { status: 502 })
    const csv = await response.text()
    if (csv.trimStart().startsWith('<')) return Response.json({ error: 'A planilha não retornou CSV. Confira a publicação.' }, { status: 502 })
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'X-Source-Configured': 'true' } })
  } catch { return Response.json({ error: 'Não foi possível acessar a planilha.' }, { status: 502 }) }
})
