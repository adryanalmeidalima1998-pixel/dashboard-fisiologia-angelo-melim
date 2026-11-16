import { sql, withSeason } from '@/lib/season-server'
import { reopenHistory } from '@/lib/athlete-history-handler.mjs'
export const GET = withSeason(async function GET() {
  const { rows: athletes } = await sql`SELECT id,name,position FROM athletes WHERE NOT EXISTS (SELECT 1 FROM squad_exclusions e WHERE lower(e.player_name)=lower(athletes.name)) ORDER BY name`
  const { rows: responses } = await sql`SELECT * FROM athlete_questionnaires ORDER BY created_at DESC,id`
  return Response.json({ athletes, responses })
})
export const POST = withSeason(async function POST(request) {
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Ação inválida.' }, { status: 400 }) }
  const id = Number(body.athleteId)
  if (body.action !== 'reopen' || !Number.isSafeInteger(id) || id < 1) return Response.json({ error: 'Selecione um atleta válido.' }, { status: 400 })
  if (!(await reopenHistory(id))) return Response.json({ error: 'Este atleta ainda não enviou o questionário.' }, { status: 404 })
  return Response.json({ reopened: true })
})
