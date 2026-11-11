import { sql, withSeason } from '@/lib/season-server'



// GET /api/athletes
export const GET = withSeason(async function GET() {
  try {
    
    const { rows } = await sql`SELECT * FROM athletes ORDER BY name ASC`
    return Response.json({ athletes: rows })
  } catch (err) {
    console.error('Athletes GET error:', err)
    return Response.json({ error: 'Erro ao buscar atletas.' }, { status: 500 })
  }
})

// POST /api/athletes
export const POST = withSeason(async function POST(request) {
  try {
    
    const body = await request.json()
    const { name, full_name, birth_date, weight_kg, height_cm, dominant_foot, city, position, notes } = body

    if (!name) return Response.json({ error: 'name é obrigatório.' }, { status: 400 })

    const { rows } = await sql`
      INSERT INTO athletes (name, full_name, birth_date, weight_kg, height_cm, dominant_foot, city, position, notes)
      VALUES (
        ${name},
        ${full_name || null},
        ${birth_date || null},
        ${weight_kg || null},
        ${height_cm || null},
        ${dominant_foot || null},
        ${city || null},
        ${position || null},
        ${notes || null}
      )
      ON CONFLICT (name) DO UPDATE SET
        full_name     = EXCLUDED.full_name,
        birth_date    = EXCLUDED.birth_date,
        weight_kg     = EXCLUDED.weight_kg,
        height_cm     = EXCLUDED.height_cm,
        dominant_foot = EXCLUDED.dominant_foot,
        city          = EXCLUDED.city,
        position      = EXCLUDED.position,
        notes         = EXCLUDED.notes,
        updated_at    = NOW()
      RETURNING *
    `
    return Response.json({ athlete: rows[0] })
  } catch (err) {
    console.error('Athletes POST error:', err)
    return Response.json({ error: 'Erro ao salvar atleta.' }, { status: 500 })
  }
})
