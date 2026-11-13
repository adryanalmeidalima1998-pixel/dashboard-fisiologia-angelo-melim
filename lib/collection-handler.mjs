import {createHmac} from 'node:crypto'
import {findSeason} from './seasons.mjs'
import {sql} from './season-db.mjs'
import {validCollectionToken,activeCollectionToken} from './collection-token.mjs'
import {collectionDate,validateCollection,CollectionError} from './collection-rules.mjs'
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}})
export async function readCollectionConfig(){const{rows}=await sql`SELECT value FROM season_settings WHERE key='wellness_form'`;if(!rows.length)return null;try{return JSON.parse(rows[0].value)}catch{return null}}
export function createCollectionHandlers({runDatabase,secret,canonicalOrigin}){
 async function handle(request,context,submit){try{
  const{seasonId}=await context.params,season=findSeason(seasonId),token=request.headers.get('authorization')?.replace(/^Bearer /,''),key=secret()
  if(!season||!validCollectionToken(token,seasonId,key))return json({error:'Este link de coleta não está disponível. Solicite o link atual à comissão técnica.'},404)
  if(submit){const origin=request.headers.get('origin'),expected=canonicalOrigin?.()||new URL(request.url).origin;if(origin&&origin!==expected)return json({error:'Origem inválida.'},403);if(!request.headers.get('content-type')?.startsWith('application/json'))return json({error:'Formato de resposta inválido.'},415)}
  let payload;if(submit){const text=await request.text();if(Buffer.byteLength(text)>12000)return json({error:'Resposta muito grande.'},413);try{payload=validateCollection(JSON.parse(text))}catch(error){if(error instanceof SyntaxError)return json({error:'Resposta inválida.'},400);throw error}}
  return await runDatabase(season,async()=>{
   const config=await readCollectionConfig();if(!activeCollectionToken(token,config))return json({error:'Este link foi desativado. Solicite o link atual à comissão técnica.'},404)
   if(!submit){const{rows}=await sql`SELECT id,name FROM athletes WHERE NOT EXISTS (SELECT 1 FROM squad_exclusions e WHERE lower(e.player_name)=lower(athletes.name)) ORDER BY name`;return json({season:{id:season.id,name:season.shortName,year:season.year,logo:season.logo,theme:season.theme},athletes:rows,date:collectionDate()})}
   const{rows:athletes}=await sql`SELECT id,name FROM athletes WHERE id=${payload.athleteId} AND NOT EXISTS (SELECT 1 FROM squad_exclusions e WHERE lower(e.player_name)=lower(athletes.name))`;if(!athletes.length)return json({error:'Atleta indisponível. Reabra o formulário e selecione um atleta do elenco.'},400)
   const ip=request.headers.get('x-real-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'unknown',bucket=createHmac('sha256',key).update(`collection-rate:${season.id}:${ip}`).digest('hex')
   const{rows:limits}=await sql`INSERT INTO wellness_form_rate_limits (key) VALUES (${bucket}) ON CONFLICT (key) DO UPDATE SET hits=CASE WHEN wellness_form_rate_limits.window_start < NOW()-INTERVAL '1 minute' THEN 1 ELSE wellness_form_rate_limits.hits+1 END, window_start=CASE WHEN wellness_form_rate_limits.window_start < NOW()-INTERVAL '1 minute' THEN NOW() ELSE wellness_form_rate_limits.window_start END RETURNING hits`;if(limits[0].hits>120)return json({error:'Muitos envios neste momento. Aguarde um minuto e tente novamente.'},429)
   const athlete=athletes[0],encoded=JSON.stringify(payload),{rows:saved}=await sql`INSERT INTO wellness_responses (id,athlete_id,athlete_name,collection_date,activity,session_slot,weight_kg,response) VALUES (${payload.submissionId},${athlete.id},${athlete.name},${payload.date},${payload.type},${payload.sessionSlot},${payload.weightKg},${encoded}::jsonb) ON CONFLICT DO NOTHING RETURNING id`
   if(!saved.length){const{rows:same}=await sql`SELECT id FROM wellness_responses WHERE id=${payload.submissionId} AND deleted_at IS NULL AND response=${encoded}::jsonb`;if(!same.length)return json({error:'Já existe uma resposta deste atleta para esta atividade hoje. Para outra sessão, escolha 2ª ou 3ª atividade. Para corrigir, fale com a comissão técnica.'},409)}
   return json({saved:true,date:payload.date,type:payload.type},saved.length?201:200)
  })
 }catch(error){if(error instanceof CollectionError)return json({error:error.message},error.status);console.error('Falha na coleta:',error.code||error.name);return json({error:'Não foi possível registrar a coleta. Seus dados continuam na tela; tente novamente.'},503)}}
 return{GET:(r,c)=>handle(r,c,false),POST:(r,c)=>handle(r,c,true)}
}
