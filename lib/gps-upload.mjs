import {sql} from './season-db.mjs'
export async function saveGpsImport(parsed,{name,filename,metadata={}}){
 const {sessionDate,rows,importInfo}=parsed
 if(importInfo.fingerprint){
  await sql`SELECT pg_advisory_xact_lock(hashtext(${`gps-import:${sessionDate}`}))`
  const {rows:existing}=await sql`SELECT id, session_name FROM gps_sessions WHERE session_date=${sessionDate} AND metadata->'gpsImport'->>'fingerprint'=${importInfo.fingerprint} LIMIT 1`
  if(existing.length)return {duplicate:true,id:existing[0].id,name:existing[0].session_name}
 }
 const {rows:saved}=await sql`INSERT INTO gps_sessions(session_date,session_name,filename,rows,metadata) VALUES (${sessionDate},${name},${filename},${JSON.stringify(rows)},${JSON.stringify({...metadata,gpsImport:importInfo})}) ON CONFLICT(session_date,session_name) DO UPDATE SET filename=EXCLUDED.filename,rows=EXCLUDED.rows,metadata=EXCLUDED.metadata,uploaded_at=NOW() RETURNING id`
 return {duplicate:false,id:saved[0].id,name}
}
