import { sql, withSeason } from '@/lib/season-server'

// DELETE /api/cmj/[id]?table=coletas|baseline
export const DELETE = withSeason(async function DELETE(request, { params }) {
  try {
    const id    = parseInt((await params).id)
    const table = new URL(request.url).searchParams.get('table') || 'coletas'

    if (isNaN(id) || id <= 0)
      return Response.json({ error: 'ID inválido.' }, { status: 400 })

    if (table === 'baseline') {
      await sql`DELETE FROM cmj_baseline WHERE id = ${id}`
    } else {
      await sql`DELETE FROM cmj_coletas WHERE id = ${id}`
    }

    return Response.json({ success: true })
  } catch (err) {
    console.error('CMJ DELETE error:', err)
    return Response.json({ error: 'Erro ao remover.' }, { status: 500 })
  }
})
