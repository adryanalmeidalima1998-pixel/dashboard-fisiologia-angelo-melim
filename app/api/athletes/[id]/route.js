import { sql, withSeason } from '@/lib/season-server'
import { saveRegistration, validateRegistration } from '@/lib/athlete-registration.mjs'
import {validateProfileUpdate} from '@/lib/athlete-profile.mjs'
import {readAthleteHistory} from '@/lib/athlete-history-google.mjs'

// PUT /api/athletes/[id]
export const PUT = withSeason(async function PUT(request, {params,season}) {
  const {id} = await params
  if (!/^[1-9][0-9]*$/.test(id)) return Response.json({error:'Atleta inválido.'}, {status:400})
  let body
  try { body = await request.json(); validateRegistration(body);validateProfileUpdate(body) }
  catch (error) { return Response.json({error:error.message || 'Cadastro inválido.'}, {status:400}) }
  const athlete = await saveRegistration(body,Number(id))
  if (!athlete) return Response.json({error:'Atleta não encontrado.'}, {status:404})
  const {athletes}=await readAthleteHistory(season)
  return Response.json({athlete:athletes.find(a=>a.id===athlete.id)||athlete})
})

// DELETE /api/athletes/[id]
export const DELETE = withSeason(async function DELETE(request, { params }) {
  try {
    const { id } = await params
    // Deleta lesões associadas primeiro
    await sql`DELETE FROM injury_history WHERE athlete_name = (SELECT name FROM athletes WHERE id = ${id})`
    const { rows } = await sql`DELETE FROM athletes WHERE id = ${id} RETURNING name`
    if (rows.length === 0) return Response.json({ error: 'Atleta não encontrado.' }, { status: 404 })
    return Response.json({ deleted: rows[0].name })
  } catch (err) {
    console.error('Athletes DELETE error:', err)
    return Response.json({ error: 'Erro ao deletar atleta.' }, { status: 500 })
  }
})
