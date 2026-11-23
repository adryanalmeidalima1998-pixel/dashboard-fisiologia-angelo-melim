import { sql } from './season-db.mjs'
import { validateProfileUpdate } from './athlete-profile.mjs'
export const REGISTRATION_POSITIONS = ['GK','ZAG','LD','LE','VOL','MC','MEI','PD','PE','CA','ATA','EXT']
export function validateRegistration(body) {
  if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.trim().length > 255) throw new Error('Informe o nome do atleta em até 255 caracteres.')
  if (!REGISTRATION_POSITIONS.includes(body.position)) throw new Error('Selecione a posição do atleta.')
  return { name: body.name.trim(), position: body.position }
}
export async function saveRegistration(body, id = null) {
  const { name, position } = validateRegistration(body)
  const profile=id==null?{}:validateProfileUpdate(body)
  // Absent profile fields retain stored values; explicit clears are preserved too.
  const result = id == null
    ? await sql`INSERT INTO athletes(name,position) VALUES (${name},${position}) ON CONFLICT(name) DO UPDATE SET position=EXCLUDED.position,updated_at=NOW() RETURNING *`
    : await sql`UPDATE athletes SET name=${name},position=${position},
      birth_date=CASE WHEN ${Object.hasOwn(profile,'birth_date')} THEN ${profile.birth_date??null}::date ELSE birth_date END,
      weight_kg=CASE WHEN ${Object.hasOwn(profile,'weight_kg')} THEN ${profile.weight_kg??null}::numeric ELSE weight_kg END,
      height_cm=CASE WHEN ${Object.hasOwn(profile,'height_cm')} THEN ${profile.height_cm??null}::integer ELSE height_cm END,
      city=CASE WHEN ${Object.hasOwn(profile,'city')} THEN ${profile.city??null}::text ELSE city END,
      updated_at=NOW() WHERE id=${id} RETURNING *`
  if(result.rows[0]&&Object.keys(profile).length) {
    const key='athlete_profile_override:'+id,flags=JSON.stringify(Object.fromEntries(Object.keys(profile).map(key=>[key,true])))
    await sql`INSERT INTO season_settings(key,value) VALUES (${key},${flags}) ON CONFLICT(key) DO UPDATE SET value=(season_settings.value::jsonb||EXCLUDED.value::jsonb)::text`
  }
  return result.rows[0] || null
}
