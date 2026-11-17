import {createHash} from 'node:crypto'
import {sql} from './season-db.mjs'
import {parseHistoryCsv,matchHistoryAthlete,validHistoryGoogleUrl} from './athlete-history-csv.mjs'
const hash=text=>createHash('sha256').update(text).digest('hex')
export function prepareGoogleHistory(csv,url,athletes) {
  const parsed=parseHistoryCsv(csv),sourceKey=hash(url)
  return {...parsed,sourceKey,records:parsed.records.map(record=>{
    const rowKey=hash(JSON.stringify([sourceKey,record.athleteName,record.createdAt])),id='google:'+hash(JSON.stringify([rowKey,record.raw])),athlete=matchHistoryAthlete(record.athleteName,athletes)
    return {...record,id,rowKey,sourceKey,athleteId:athlete?.id||null}
  })}
}
export function mergeHistoryResponses(native,google) {
  const records=[...native.map(r=>({...r,source:'internal'})),...google.map(r=>({...r,source:'google',allows_update:false}))]
  records.sort((a,b)=>Date.parse(b.created_at)-Date.parse(a.created_at)||(Date.parse(b.imported_at||b.created_at)-Date.parse(a.imported_at||a.created_at))||String(b.id).localeCompare(String(a.id)))
  const seen=new Set()
  return records.filter(r=>r.athlete_id!=null).map(r=>{const current=!seen.has(r.athlete_id);seen.add(r.athlete_id);return {...r,is_current:current}})
}
export function enrichHistoryAthletes(athletes,responses) {
  return athletes.map(athlete=>{
    const answer=responses.find(r=>r.is_current&&r.athlete_id===athlete.id)?.answers
    if(!answer)return athlete
    return {...athlete,birth_date:/^\d{4}-\d{2}-\d{2}$/.test(answer.birthDate||'')?answer.birthDate:athlete.birth_date,city:answer.origin||athlete.city,height_cm:typeof answer.heightCm==='number'?Math.round(answer.heightCm):athlete.height_cm,weight_kg:typeof answer.weightKg==='number'?answer.weightKg:athlete.weight_kg,position:athlete.position||(['GK','LD','LE','ZAG','VOL','MEI','ATA','EXT'].includes(answer.position)?answer.position:null),dominant_foot:({'Destro':'Direito','Canhoto':'Esquerdo'})[answer.dominantFoot]||athlete.dominant_foot}
  })
}
async function setting(key){const{rows}=await sql`SELECT value FROM season_settings WHERE key=${key}`;return rows[0]?.value||null}
export async function syncGoogleHistory(season,{force=false,fetcher=fetch}={}) {
  const url=await setting('history_google_url')
  let previous={};try{previous=JSON.parse(await setting('history_google_sync'))||{}}catch{}
  if(!url)return {connected:false}
  const result={...previous,connected:true,sourceUrl:url}
  if(!force&&Date.now()-Date.parse(previous.checkedAt||'')<60000)return result
  const{rows:lock}=await sql`SELECT pg_try_advisory_xact_lock(hashtext(${'history-google:'+season.id})) AS acquired`
  if(!lock[0].acquired)return result
  const checkedAt=new Date().toISOString()
  try{
    if(!validHistoryGoogleUrl(url))throw new Error('Configure um link publicado em CSV do Google Planilhas.')
    const response=await fetcher(url,{cache:'no-store',signal:AbortSignal.timeout(12000)})
    if(!response.ok)throw new Error('O Google está indisponível no momento.')
    const text=await response.text(),{rows:athletes}=await sql`SELECT id,name FROM athletes`,prepared=prepareGoogleHistory(text,url,athletes)
    if(prepared.issues.length)throw new Error('Há linhas com nome, data ou colunas inválidas na planilha. A última sincronização foi mantida.')
    const unmatched=[...new Set(prepared.records.filter(r=>!r.athleteId).map(r=>r.athleteName))]
    for(let i=0;i<prepared.records.length;i+=100){const batch=prepared.records.slice(i,i+100)
      await sql`INSERT INTO athlete_history_google(id,source_key,row_key,athlete_id,athlete_name,created_at,answers,raw) SELECT value->>'id',value->>'sourceKey',value->>'rowKey',(value->>'athleteId')::integer,value->>'athleteName',(value->>'createdAt')::timestamptz,value->'answers',value->'raw' FROM jsonb_array_elements(${JSON.stringify(batch)}::jsonb) ON CONFLICT(id) DO UPDATE SET athlete_id=EXCLUDED.athlete_id`
    }
    const state={checkedAt,lastSuccessAt:checkedAt,rowCount:prepared.records.length,matchedCount:prepared.records.filter(r=>r.athleteId).length,reviewCount:prepared.records.filter(r=>r.answers._warnings.length).length,unmatched,warning:null}
    await sql`INSERT INTO season_settings(key,value) VALUES ('history_google_sync',${JSON.stringify(state)}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`
    return {...state,connected:true,sourceUrl:url}
  }catch(error){
    const state={...previous,checkedAt,warning:error.name==='TimeoutError'?'O Google demorou a responder. A última sincronização foi mantida.':error.message||'Falha na consulta ao Google. A última sincronização foi mantida.'}
    await sql`INSERT INTO season_settings(key,value) VALUES ('history_google_sync',${JSON.stringify(state)}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`
    return {...state,connected:true,sourceUrl:url}
  }
}
export async function readAthleteHistory(season,options={}) {
  const sync=await syncGoogleHistory(season,options)
  const{rows:athletes}=await sql`SELECT * FROM athletes WHERE NOT EXISTS (SELECT 1 FROM squad_exclusions e WHERE lower(e.player_name)=lower(athletes.name)) ORDER BY name`
  const{rows:native}=await sql`SELECT * FROM athlete_questionnaires ORDER BY created_at DESC,id`,{rows:google}=await sql`SELECT id,athlete_id,athlete_name,created_at,answers,imported_at FROM athlete_history_google`
  const responses=mergeHistoryResponses(native,google)
  return {athletes:enrichHistoryAthletes(athletes,responses),responses,sync}
}
