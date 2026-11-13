import {createHash} from 'node:crypto'
import {sql} from './season-db.mjs'
import {defaultWellnessSource,validWellnessSource} from './wellness.mjs'
import {parseBemEstarCSV,mergeWellnessRecords} from './wellness-data.mjs'
import {collectionToRecord} from './collection-rules.mjs'
import {readCollectionConfig} from './collection-handler.mjs'
export async function wellnessSource(season){const{rows}=await sql`SELECT value FROM season_settings WHERE key='wellness_url'`;return rows.length?rows[0].value:defaultWellnessSource(season.id)}
const fingerprint=url=>createHash('sha256').update(url).digest('hex')
export async function readLegacySource(url){if(!validWellnessSource(url))throw new Error('Fonte de histórico inválida.');const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('O histórico do Google está indisponível no momento.');const csv=await r.text();if(csv.length>10000000||csv.trimStart().startsWith('<'))throw new Error('A fonte de histórico não retornou um CSV válido.');return parseBemEstarCSV(csv)}
export async function readWellnessRecords(season){
 const{rows:native}=await sql`SELECT id,athlete_name,response,created_at FROM wellness_responses WHERE deleted_at IS NULL ORDER BY created_at`,{rows:archive}=await sql`SELECT record FROM wellness_legacy_archive`,{rows:frozen}=await sql`SELECT value FROM season_settings WHERE key='wellness_archive_url'`
 const source=await wellnessSource(season),config=await readCollectionConfig(),warnings=[];let external=[]
 if(source&&frozen[0]?.value!==fingerprint(source)){try{external=await readLegacySource(source)}catch(e){warnings.push(`${e.message} As coletas internas continuam disponíveis.`)}}
 const records=mergeWellnessRecords([...archive.map(r=>r.record),...external],native.map(collectionToRecord));return{records,warnings,sourceConfigured:!!(config?.enabled||source||records.length),internalCount:native.length,archivedCount:archive.length}
}
export async function archiveWellnessHistory(season){
 const source=await wellnessSource(season);if(!source)throw new Error('Nenhum histórico do Google está conectado nesta temporada.')
 const records=await readLegacySource(source);if(!records.length)throw new Error('Nenhuma resposta válida encontrada. O histórico atual foi mantido.')
 for(let i=0;i<records.length;i+=200){const batch=records.slice(i,i+200).map(record=>({sourceKey:createHash('sha256').update(JSON.stringify(record)).digest('hex'),record}));await sql`INSERT INTO wellness_legacy_archive(source_key,record) SELECT value->>'sourceKey',value->'record' FROM jsonb_array_elements(${JSON.stringify(batch)}::jsonb) ON CONFLICT(source_key) DO NOTHING`}
 await sql`INSERT INTO season_settings(key,value) VALUES ('wellness_archive_url',${fingerprint(source)}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`;return records.length
}
