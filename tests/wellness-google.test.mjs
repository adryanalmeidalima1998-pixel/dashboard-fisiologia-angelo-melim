import test from 'node:test'
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import {parseWellnessCSV,latestWellnessRecords,mergeGoogleWellness} from '../lib/wellness-data.mjs'
import {prepareSeason,inSeason,sql} from '../lib/season-db.mjs'
import {findSeason} from '../lib/seasons.mjs'
import {readWellnessRecords} from '../lib/wellness-history.mjs'
import {wellnessReportModel,favorableWellnessValue} from '../lib/wellness-report.mjs'
import {buildWellnessPdf} from '../lib/wellness-pdf.js'
import {inflateSync} from 'node:zlib'
const header='Carimbo de data/hora,Atleta:,Atividade:,Fadiga,Qualidade do Sono,Dor Muscular Geral,Nível de Estresse,Humor,Está sentindo dor localizada em um dos pontos  acima?,Dor Localizada:,Cor da Urina,Percepção Subjetiva de Esforço:,Tempo da Sessão em minutos (somente números)'
const csv=header+'\n18/11/2026 07:00:00,Atleta teste,Pré-Atividade,5,5,5,5,5,Não,,1,,\n18/11/2026 07:01:00,Atleta teste,Pré-Atividade,4,4,4,4,4,Sim,9 - Panturrilha Direito,2,,\n18/11/2026 23:50:00,Atleta teste,Pós-Atividade,,,,,,,,,0,90'
const options={scaleMode:'favorable-1-5'}
test('Google scale 5 stays favorable while canonical fatigue, soreness and stress match existing indicators; timestamps use São Paulo',()=>{
 const parsed=parseWellnessCSV(csv,options);assert.equal(parsed.records.length,3);assert.equal(parsed.hasWeightField,false);const [a,b,post]=parsed.records
 assert.equal(a.wellnessScore,5);assert.equal(a.fadiga,1);assert.equal(a.doms,1);assert.equal(a.estresse,1);assert.equal(favorableWellnessValue(a,'fadiga'),5)
 assert.equal(b.wellnessScore,4);assert.equal(b.temDor,true);assert.equal(b.dorLocalizada,'9 - Panturrilha Direito')
 assert.equal(post.srpe,0);assert.equal(post.srpeLoad,0);assert.equal(post.date,'2026-11-18');assert.equal(post.timestamp.toISOString(),'2026-11-19T02:50:00.000Z');assert.equal(post.wellnessScore,null);assert.equal(post.weightKg,null)
 assert.equal(parseWellnessCSV(csv).records[0].wellnessScore,2.6)
})
test('latest answer drives each day and phase without duplicate load, and malformed sources cannot replace valid cached data',()=>{
 const raw=parseWellnessCSV(csv,options).records,current=latestWellnessRecords(raw);assert.equal(current.length,2);assert.equal(current.find(r=>r.type==='pre').wellnessScore,4)
 const native={...current[0],source:'internal',wellnessScore:1,timestamp:new Date('2026-11-18T12:00:00Z')};assert.equal(mergeGoogleWellness(raw,[native]).find(r=>r.type==='pre').wellnessScore,4)
 assert.throws(()=>parseWellnessCSV('wrong,headers\n1,2',options));assert.throws(()=>parseWellnessCSV(header+'\n31/02/2026 07:00:00,Atleta teste,Pré-Atividade',options))
 const incomplete=parseWellnessCSV(header+'\n18/11/2026 07:00:00,Atleta teste,Pré-Atividade,5,,,,,Não,,1,,',options);assert.equal(incomplete.records[0].wellnessScore,null);assert.equal(incomplete.warnings.length,1)
})
test('live Google remains authoritative after archival and its last good snapshot survives an outage with native history retained',async()=>{
 const db=new PGlite(),season=findSeason('2027-americano'),url='https://docs.google.com/spreadsheets/d/e/test-wellness/pub?output=csv',original=globalThis.fetch
 try{
  await prepareSeason(db,season.id)
  await inSeason(db,season.id,async()=>{for(const [key,value] of Object.entries({wellness_url:url,wellness_provider:'google',wellness_scale:'favorable-1-5',wellness_archive_url:createHash('sha256').update(url).digest('hex')}))await sql`INSERT INTO season_settings(key,value) VALUES (${key},${value})`})
  let requests=0;globalThis.fetch=async()=>{requests++;return new Response(csv)}
  const first=await inSeason(db,season.id,()=>readWellnessRecords(season));assert.equal(first.records.length,2);assert.equal(first.rawGoogleCount,3);assert.equal(first.duplicateCount,1);assert.equal(first.records.find(r=>r.type==='pre').wellnessScore,4)
  await inSeason(db,season.id,()=>readWellnessRecords(season));assert.equal(requests,1)
  globalThis.fetch=async()=>{throw Error('Google indisponível')}
  const fallback=await inSeason(db,season.id,()=>readWellnessRecords(season,{force:true}));assert.equal(fallback.records.length,2);assert.equal(fallback.usingCachedSource,true);assert.equal(fallback.warnings.length,1);assert.equal(fallback.lastSyncAt,first.lastSyncAt)
 }finally{globalThis.fetch=original;await db.close()}
})
test('wellness period PDF uses favorable domain cards, zero loads and complete paginated pain narratives',()=>{
 const records=parseWellnessCSV(csv,options).records,model=wellnessReportModel({records,from:'2026-11-18',to:'2026-11-18'});assert.equal(model.selected.length,2);assert.equal(model.totalLoad,0);assert.equal(model.meanWellness,4);assert.equal(model.athletes[0].domains[0].value,4)
 const long={...records[1],dorLocalizada:'Local relatado. '.repeat(450)+'FINAL_DA_RESPOSTA'},doc=buildWellnessPdf({season:{shortName:'Americano FC',year:2027},records:[records[0],long,records[2]],from:'2026-11-18',to:'2026-11-18'}),raw=doc.output(),streams=[]
 for(const m of raw.matchAll(/\/Length (\d+)\n\/Filter \/FlateDecode\n>>\nstream\n/g)){const start=m.index+m[0].length;streams.push(inflateSync(Buffer.from(raw.slice(start,start+Number(m[1])),'binary')).toString('latin1'))}
 assert.match(streams.join('\n'),/FINAL_DA_RESPOSTA/);assert.ok(doc.getNumberOfPages()>=3)
})
