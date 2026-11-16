import { sql } from './season-db.mjs'
import { normalizePhotoName } from './athlete-photo-key.mjs'
export { normalizePhotoName } from './athlete-photo-key.mjs'
export function validateAthletePhoto(body) {
  if (!body || typeof body.name !== 'string' || !body.name.trim() || body.name.length > 255) throw new Error('Selecione um atleta válido.')
  const key = normalizePhotoName(body.name)
  if (!key) throw new Error('Nome de atleta inválido.')
  if (typeof body.dataUrl !== 'string' || body.dataUrl.length > 280000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(body.dataUrl)) throw new Error('Escolha uma foto JPG, PNG ou WEBP de até 10 MB. A imagem será redimensionada antes de salvar.')
  const bytes = Buffer.from(body.dataUrl.slice('data:image/jpeg;base64,'.length), 'base64')
  if (bytes.length > 200000 || bytes.length < 20 || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('Arquivo de imagem inválido.')
  let cursor = 2, dimensions = false
  while (cursor + 4 < bytes.length) {
    if (bytes[cursor++] !== 255) break
    while (bytes[cursor] === 255) cursor++
    const marker = bytes[cursor++]
    if (marker === 218 || marker === 217) break
    if (marker === 1 || marker >= 208 && marker <= 215) continue
    if (cursor + 2 > bytes.length) break
    const length = bytes.readUInt16BE(cursor)
    if (length < 2 || cursor + length > bytes.length) break
    if ([192,193,194].includes(marker) && length >= 8) {
      const height = bytes.readUInt16BE(cursor + 3), width = bytes.readUInt16BE(cursor + 5)
      if (width < 1 || height < 1 || width > 512 || height > 512) throw new Error('A foto deve ser redimensionada antes do envio.')
      dimensions = true
    }
    cursor += length
  }
  if (!dimensions) throw new Error('Não foi possível reconhecer a foto. Escolha outra imagem.')
  return { name: body.name.trim(), key, dataUrl: body.dataUrl }
}
export async function saveAthletePhoto(body) {
  const photo = validateAthletePhoto(body)
  await sql`INSERT INTO athlete_photos(name_key,athlete_name,data_url) VALUES (${photo.key},${photo.name},${photo.dataUrl}) ON CONFLICT(name_key) DO UPDATE SET athlete_name=EXCLUDED.athlete_name,data_url=EXCLUDED.data_url,updated_at=NOW()`
  return photo
}
