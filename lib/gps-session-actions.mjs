import {sql} from './season-db.mjs'
// A consolidated activity retains its raw source rows; edits/deletes target all its blocks.
export async function expandGpsActivityIds(ids){
 const valid=[...new Set(ids.map(Number).filter(n=>Number.isInteger(n)&&n>0))]
 if(!valid.length)return []
 const {rows}=await sql`SELECT s.id FROM gps_sessions s WHERE s.id=ANY(${valid}::int[]) OR EXISTS (SELECT 1 FROM gps_sessions chosen WHERE chosen.id=ANY(${valid}::int[]) AND chosen.session_date=s.session_date AND chosen.metadata->'gpsActivity'->>'confirmedDistinct'='true' AND s.metadata->'gpsActivity'->>'confirmedDistinct'='true' AND chosen.metadata->'gpsActivity'->>'id'=s.metadata->'gpsActivity'->>'id') ORDER BY s.id`
 return rows.map(r=>r.id)
}
export async function patchGpsActivity(id,patch){
 const {rows}=await sql`SELECT metadata FROM gps_sessions WHERE id=${id}`
 if(!rows.length)return null
 const {gpsActivity,gpsImport,...editable}=patch,ids=await expandGpsActivityIds([id])
 await sql`UPDATE gps_sessions SET metadata=metadata || ${JSON.stringify(editable)}::jsonb WHERE id=ANY(${ids}::int[])`
 return {...rows[0].metadata,...editable}
}
