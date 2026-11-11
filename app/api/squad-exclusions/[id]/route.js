import { sql, withSeason } from '@/lib/season-server'

// DELETE /api/squad-exclusions/[id]
export const DELETE = withSeason(async function DELETE(request, { params }) {
  try {
    const { id } = await params
    const { rowCount } = await sql`
      DELETE FROM squad_exclusions WHERE id = ${id}
    `
    if (rowCount === 0) {
      return Response.json({ error: 'Exclusão não encontrada.' }, { status: 404 })
    }
    return Response.json({ success: true, deleted: id })
  } catch (err) {
    console.error('squad-exclusions DELETE error:', err)
    return Response.json({ error: 'Erro ao remover exclusão.' }, { status: 500 })
  }
})
