import { sql, withSeason } from '@/lib/season-server'
import {expandGpsActivityIds,patchGpsActivity} from '@/lib/gps-session-actions.mjs'

// DELETE /api/gps/sessions/[id]
export const DELETE = withSeason(async function DELETE(request, context) {
  try {
    const params = await context.params
    const rawId = params?.id
    const id = rawId !== undefined && rawId !== null ? Number(rawId) : NaN

    if (!rawId || isNaN(id) || id <= 0) {
      console.error('GPS delete: ID inválido recebido:', rawId)
      return Response.json({ error: `ID inválido: "${rawId}"` }, { status: 400 })
    }

    const ids=await expandGpsActivityIds([id])
    const { rowCount } = await sql`DELETE FROM gps_sessions WHERE id=ANY(${ids}::int[])`

    if (rowCount === 0) {
      return Response.json({ error: 'Sessão não encontrada.' }, { status: 404 })
    }

    return Response.json({ success: true, message: 'Sessão removida.' })
  } catch (err) {
    console.error('GPS delete error:', err)
    return Response.json({ error: 'Erro ao remover sessão.' }, { status: 500 })
  }
})

// PATCH /api/gps/sessions/[id]
// body: { metadata: { result, mando, opponent, competition, ... } }
// Faz merge: preserva campos existentes, sobrescreve só o que vier no body
export const PATCH = withSeason(async function PATCH(request, context) {
  try {
    const params = await context.params
    const rawId = params?.id
    const id = rawId !== undefined && rawId !== null ? Number(rawId) : NaN

    if (!rawId || isNaN(id) || id <= 0) {
      return Response.json({ error: `ID inválido: "${rawId}"` }, { status: 400 })
    }

    const body = await request.json()
    const { metadata: patch } = body

    if (!patch || typeof patch !== 'object') {
      return Response.json({ error: 'Body inválido. Envie { metadata: { ... } }' }, { status: 400 })
    }

    const merged=await patchGpsActivity(id,patch)
    if(!merged)return Response.json({error:'Sessão não encontrada.'},{status:404})

    return Response.json({ success: true, metadata: merged })
  } catch (err) {
    console.error('GPS PATCH error:', err)
    return Response.json({ error: 'Erro ao atualizar sessão.' }, { status: 500 })
  }
})
