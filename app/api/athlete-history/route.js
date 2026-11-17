import { sql, withSeason } from '@/lib/season-server'
import { reopenHistory } from '@/lib/athlete-history-handler.mjs'
import { readAthleteHistory } from '@/lib/athlete-history-google.mjs'
import { validHistoryGoogleUrl } from '@/lib/athlete-history-csv.mjs'
export const GET = withSeason(async function GET(request,{season}) {
  return Response.json(await readAthleteHistory(season,{force:new URL(request.url).searchParams.get('refresh')==='1'}))
})
export const POST = withSeason(async function POST(request,{season}) {
  let body
  try { body = await request.json() } catch { return Response.json({ error: 'Ação inválida.' }, { status: 400 }) }
  if(body.action==='connectGoogle'){
    if(!validHistoryGoogleUrl(body.url))return Response.json({error:'Informe o link publicado em CSV do Google Planilhas.'},{status:400})
    await sql`INSERT INTO season_settings(key,value) VALUES ('history_google_url',${body.url}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`
    return Response.json(await readAthleteHistory(season,{force:true}))
  }
  const id = Number(body.athleteId)
  if (body.action !== 'reopen' || !Number.isSafeInteger(id) || id < 1) return Response.json({ error: 'Selecione um atleta válido.' }, { status: 400 })
  if (!(await reopenHistory(id))) return Response.json({ error: 'Este atleta ainda não enviou o questionário.' }, { status: 404 })
  return Response.json({ reopened: true })
})
