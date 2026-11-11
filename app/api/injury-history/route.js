import { sql, withSeason } from '@/lib/season-server'



// GET /api/injury-history?athlete_name=Rodrigo
export const GET = withSeason(async function GET(request) {
  try {
    
    const { searchParams } = new URL(request.url)
    const athleteName = searchParams.get('athlete_name')

    if (athleteName) {
      const { rows } = await sql`
        SELECT * FROM injury_history
        WHERE athlete_name = ${athleteName}
        ORDER BY injury_date DESC
      `
      return Response.json({ injuries: rows })
    }

    // Retorna todas
    const { rows } = await sql`SELECT * FROM injury_history ORDER BY injury_date DESC`
    return Response.json({ injuries: rows })
  } catch (err) {
    console.error('Injury GET error:', err)
    return Response.json({ error: 'Erro ao buscar histórico.' }, { status: 500 })
  }
})

// POST /api/injury-history
export const POST = withSeason(async function POST(request) {
  try {
    
    const body = await request.json()
    const { athlete_name, injury_date, body_region, injury_type, description, severity, days_out } = body

    if (!athlete_name || !injury_date || !body_region || !injury_type) {
      return Response.json({ error: 'Campos obrigatórios: athlete_name, injury_date, body_region, injury_type.' }, { status: 400 })
    }

    const { rows } = await sql`
      INSERT INTO injury_history (athlete_name, injury_date, body_region, injury_type, description, severity, days_out)
      VALUES (
        ${athlete_name},
        ${injury_date},
        ${body_region},
        ${injury_type},
        ${description || null},
        ${severity || null},
        ${days_out || null}
      )
      RETURNING *
    `
    return Response.json({ injury: rows[0] })
  } catch (err) {
    console.error('Injury POST error:', err)
    return Response.json({ error: 'Erro ao salvar lesão.' }, { status: 500 })
  }
})
