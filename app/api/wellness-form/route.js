import {sql,withSeason} from '@/lib/season-server'
import {readCollectionConfig} from '@/lib/collection-handler.mjs'
import {newCollectionConfig,collectionPath} from '@/lib/collection-token.mjs'
import {archiveWellnessHistory,wellnessSource} from '@/lib/wellness-history.mjs'
async function describe(season){const config=await readCollectionConfig(),{rows}=await sql`SELECT (SELECT COUNT(*) FROM athletes) AS athletes,(SELECT COUNT(*) FROM wellness_responses WHERE deleted_at IS NULL) AS responses,(SELECT COUNT(*) FROM wellness_legacy_archive) AS archived`;return{origin:process.env.NEXTAUTH_URL?new URL(process.env.NEXTAUTH_URL).origin:null,configured:!!config,enabled:!!config?.enabled,path:config?collectionPath(season.id,config,process.env.NEXTAUTH_SECRET):null,athleteCount:Number(rows[0].athletes),responseCount:Number(rows[0].responses),archivedCount:Number(rows[0].archived),hasGoogleSource:!!(await wellnessSource(season))}}
export const GET=withSeason(async function GET(request,{season}){return Response.json(await describe(season))})
export const POST=withSeason(async function POST(request,{season}){
 let body;try{body=await request.json()}catch{return Response.json({error:'Ação inválida.'},{status:400})}
 if(!['enable','disable','rotate','import'].includes(body.action))return Response.json({error:'Ação inválida.'},{status:400})
 if(body.action==='import'){try{const imported=await archiveWellnessHistory(season);return Response.json({...await describe(season),imported})}catch(e){return Response.json({error:e.message},{status:422})}}
 let config=await readCollectionConfig();if(body.action==='rotate'||!config)config=newCollectionConfig();config.enabled=body.action!=='disable'
 await sql`INSERT INTO season_settings(key,value) VALUES ('wellness_form',${JSON.stringify(config)}) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value`;return Response.json(await describe(season))
})
