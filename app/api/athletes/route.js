import { sql, withSeason } from '@/lib/season-server'
import { saveRegistration, validateRegistration } from '@/lib/athlete-registration.mjs'
import { readAthleteHistory } from '@/lib/athlete-history-google.mjs'



// GET /api/athletes
export const GET = withSeason(async function GET(request,{season}) {
  try {
    
    const {athletes}=await readAthleteHistory(season)
    return Response.json({ athletes })
  } catch (err) {
    console.error('Athletes GET error:', err)
    return Response.json({ error: 'Erro ao buscar atletas.' }, { status: 500 })
  }
})

// Registration contains only name and position. Historical answers stay separate.
export const POST = withSeason(async function POST(request) {
  let body
  try { body = await request.json(); validateRegistration(body) }
  catch (error) { return Response.json({error: error.message || 'Cadastro inválido.'}, {status:400}) }
  const athlete = await saveRegistration(body)
  return Response.json({athlete})
})
