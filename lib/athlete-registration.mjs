import { sql } from './season-db.mjs'
export const REGISTRATION_POSITIONS = ['GK','ZAG','LD','LE','VOL','MC','MEI','PD','PE','CA','ATA','EXT']
export function validateRegistration(body) {
  if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 255) throw new Error('Informe o nome do atleta em até 255 caracteres.')
  if (!REGISTRATION_POSITIONS.includes(body.position)) throw new Error('Selecione a posição do atleta.')
  return { name: body.name.trim(), position: body.position }
}
export async function saveRegistration(body, id = null) {
  const { name, position } = validateRegistration(body)
  // Complementary historical data is retained when registration is edited.
  const result = id == null
    ? await sql`INSERT INTO athletes(name,position) VALUES (${name},${position}) ON CONFLICT(name) DO UPDATE SET position=EXCLUDED.position,updated_at=NOW() RETURNING *`
    : await sql`UPDATE athletes SET name=${name},position=${position},updated_at=NOW() WHERE id=${id} RETURNING *`
  return result.rows[0] || null
}
