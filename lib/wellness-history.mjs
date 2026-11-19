import {createHash} from 'node:crypto'
import {sql} from './season-db.mjs'
import {defaultWellnessSource,validWellnessSource} from './wellness.mjs'
import {parseWellnessCSV,mergeWellnessRecords,mergeGoogleWellness,latestWellnessRecords} from './wellness-data.mjs'
import {collectionToRecord} from './collection-rules.mjs'
import {readCollectionConfig} from './collection-handler.mjs'
export async function wellnessSettings(season){const{rows}=await sql`SELECT key,value FROM season_settings WHERE key LIKE 'wellness_%'`;const values=Object.fromEntries(rows.map(r=>[r.key,r.value]));return {...values,wellness_url:values.wellness_url??defaultWellnessSource(season.id),wellness_provider:values.wellness_provider||'hybrid',wellness_scale:values.wellness_scale||'legacy-mixed'}}
export async function wellnessSource(season){return (await wellnessSettings(season)).wellness_url}
const fingerprint=value=>createHash('sha256').update(value).digest('hex')
async function fetchSource(url,options){if(!validWellnessSource(url))throw new Error('Fonte de bem-estar inválida.');const r=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!r.ok)throw new Error('O Google está indisponível no momento.');const csv=await r.text();if(csv.length>10000000||csv.trimStart().startsWith('<'))throw new Error('A fonte não retornou um CSV válido.');return parseWellnessCSV(csv,options)}
export async function readLegacySource(url,options){return(await fetchSource(url,options)).records}
export async function readWellnessRecords(season,{force=false}={}){
 const settings=await wellnessSettings(season),source=settings.wellness_url,googleMode=settings.wellness_provider==='google',config=await readCollectionConfig()
 const{rows:native}=await sql`SELECT id,athlete_name,response,created_at FROM wellness_responses WHERE deleted_at IS NULL ORDER BY created_at`,{rows:archive}=await sql`SELECT record FROM wellness_legacy_archive`
 const warnings=[];let external=[],sync=null,usingCachedSource=false
 const signature=fingerprint(source+'|'+settings.wellness_scale)
 let cached;try{cached=JSON.parse(settings.wellness_google_snapshot||'null')}catch{}
 if(cached?.signature!==signature)cached=null
 if(source&&(googleMode||settings.wellness_archive_url!==fingerprint(source))){
  if(cached&&!force&&Date.now()-new Date(cached.syncedAt).getTime()<30000){sync=cached;external=cached.records}
  else try{
   const result=await fetchSource(source,{scaleMode:settings.wellness_scale});sync={signature,syncedAt:new Date().toISOString(),...result};external=result.records
   await sql`INSERT INTO season_settings(key,value) VALUES ('wellness_google_snapshot',${JSON.stringify(sync)}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`
  }catch(e){if(cached){sync=cached;external=cached.records;usingCachedSource=true;warnings.push(`${e.message} Exibindo a última sincronização de bem-estar.`)}else warnings.push(`${e.message} As respostas já salvas continuam disponíveis.`)}
 }
 warnings.push(...(sync?.warnings||[]))
 const others=[...archive.map(r=>r.record),...native.map(collectionToRecord)],records=googleMode?mergeGoogleWellness(external,others):mergeWellnessRecords([...archive.map(r=>r.record),...external],native.map(collectionToRecord))
 return {records,warnings,sourceConfigured:!!(config?.enabled||source||records.length),sourceProvider:settings.wellness_provider,formUrl:settings.wellness_form_url||'',lastSyncAt:sync?.syncedAt||null,usingCachedSource,hasWeightField:sync?.hasWeightField??null,googleCount:latestWellnessRecords(external).length,rawGoogleCount:external.length,duplicateCount:external.length-latestWellnessRecords(external).length,internalCount:native.length,archivedCount:archive.length}
}
export async function archiveWellnessHistory(season){
 const settings=await wellnessSettings(season),source=settings.wellness_url;if(!source)throw new Error('Nenhum histórico do Google está conectado nesta temporada.')
 const records=await readLegacySource(source,{scaleMode:settings.wellness_scale});if(!records.length)throw new Error('Nenhuma resposta válida encontrada. O histórico atual foi mantido.')
 for(let i=0;i<records.length;i+=200){const batch=records.slice(i,i+200).map(record=>({sourceKey:fingerprint(JSON.stringify(record)),record}));await sql`INSERT INTO wellness_legacy_archive(source_key,record) SELECT value->>'sourceKey',value->'record' FROM jsonb_array_elements(${JSON.stringify(batch)}::jsonb) ON CONFLICT(source_key) DO NOTHING`}
 await sql`INSERT INTO season_settings(key,value) VALUES ('wellness_archive_url',${fingerprint(source)}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`;return records.length
}
