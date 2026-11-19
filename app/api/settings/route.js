import {sql,withSeason} from '@/lib/season-server'
import {validWellnessSource,validWellnessForm} from '@/lib/wellness.mjs'
import {wellnessSettings} from '@/lib/wellness-history.mjs'
export const GET=withSeason(async function GET(request,{season}){const s=await wellnessSettings(season);return Response.json({wellnessUrl:s.wellness_url,wellnessFormUrl:s.wellness_form_url||'',provider:s.wellness_provider,scaleMode:s.wellness_scale,seasonId:season.id})})
export const PUT=withSeason(async function PUT(request){
 const body=await request.json()
 if(typeof body.wellnessUrl!=='string'||!validWellnessSource(body.wellnessUrl.trim()))return Response.json({error:'Use o link do Google Sheets publicado na Web em formato CSV.'},{status:400})
 if(body.wellnessFormUrl!==undefined&&(typeof body.wellnessFormUrl!=='string'||!validWellnessForm(body.wellnessFormUrl.trim())))return Response.json({error:'Use o link público do Google Formulários.'},{status:400})
 if(body.scaleMode!==undefined&&!['legacy-mixed','favorable-1-5'].includes(body.scaleMode))return Response.json({error:'Escala inválida.'},{status:400})
 const settings={wellness_url:body.wellnessUrl.trim(),...(body.wellnessFormUrl!==undefined?{wellness_form_url:body.wellnessFormUrl.trim()}:{}),...(body.scaleMode?{wellness_scale:body.scaleMode}:{})}
 for(const [key,value] of Object.entries(settings))await sql`INSERT INTO season_settings(key,value) VALUES (${key},${value}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`
 return Response.json({success:true})
})
