import { sql, withSeason } from '@/lib/season-server'
import { saveAthletePhoto, validateAthletePhoto } from '@/lib/athlete-photo.mjs'
export const GET = withSeason(async function GET() {
  const { rows } = await sql`SELECT name_key,athlete_name,data_url FROM athlete_photos`
  return Response.json({ photos: rows })
})
export const POST = withSeason(async function POST(request) {
  let body
  try {
    const text = await request.text()
    if (Buffer.byteLength(text) > 285000) return Response.json({error:'Imagem muito grande.'},{status:413})
    body = JSON.parse(text); validateAthletePhoto(body)
  } catch(error) { return Response.json({error:error instanceof SyntaxError ? 'Imagem inválida.' : error.message},{status:400}) }
  const photo = await saveAthletePhoto(body)
  return Response.json({ saved:true, name:photo.name })
})
