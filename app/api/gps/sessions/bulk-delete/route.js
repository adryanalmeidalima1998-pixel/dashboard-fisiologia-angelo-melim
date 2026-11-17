import { sql, withSeason } from '@/lib/season-server'
import {expandGpsActivityIds} from '@/lib/gps-session-actions.mjs'

// POST /api/gps/sessions/bulk-delete
// Body: { ids: number[] }
export const POST = withSeason(async function POST(request) {
  try {
    const { ids } = await request.json()

    if (!Array.isArray(ids) || ids.length === 0) {
      return Response.json({ error: 'Lista de IDs inválida.' }, { status: 400 })
    }

    const validIds = ids.map(Number).filter(n => !isNaN(n) && n > 0)
    if (validIds.length === 0) {
      return Response.json({ error: 'Nenhum ID válido na lista.' }, { status: 400 })
    }

    const activityIds=await expandGpsActivityIds(validIds)
    const { rowCount } = await sql`
      DELETE FROM gps_sessions WHERE id = ANY(${activityIds}::int[])
    `

    return Response.json({
      success: true,
      deleted: rowCount,
      message: `${rowCount} sessão(ões) removida(s).`
    })

  } catch (err) {
    console.error('GPS bulk-delete error:', err)
    return Response.json({ error: 'Erro ao remover sessões.' }, { status: 500 })
  }
})
