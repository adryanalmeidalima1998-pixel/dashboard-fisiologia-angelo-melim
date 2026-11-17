import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import Papa from 'papaparse'
import {PGlite} from '@electric-sql/pglite'
import {parseGpsCSV,gpsDurationMinutes,repairGpsText} from '../lib/gps-csv.mjs'
import {weightedGpsRate,sortGpsSessions,buildGpsPositions} from '../lib/gps-data.mjs'
import {prepareSeason,inSeason,sql} from '../lib/season-db.mjs'
import {saveGpsImport} from '../lib/gps-upload.mjs'
const fixture=part=>readFileSync(new URL(`./fixtures/gps-english-part-${part}.csv`,import.meta.url),'utf8')
const mutate=(csv,change,delimiter=',')=>{const records=Papa.parse(csv,{skipEmptyLines:'greedy'}).data;change(records);return Papa.unparse(records,{delimiter})}
test('English exports retain short trailing tag rows, source values, session and periods, and Excel durations',()=>{
 for(const [part,distance,minutes] of [[1,339.54,6],[3,336.28,6.6],[4,534.09,466/60]]){
  const parsed=parseGpsCSV(fixture(part)),r=parsed.rows[0]
  assert.equal(parsed.sessionDate,'17/11/2026');assert.equal(parsed.rows.length,2);assert.equal(parsed.importInfo.playersCount,1)
  assert.equal(r.totalDistance,distance);assert.ok(Math.abs(r.durationMin-minutes)<1e-10)
  assert.equal(r.hsr,0);assert.equal(r.sprintDistance,0);assert.equal(r.sprintCount,0)
  assert.ok(r.playerLoad>0);assert.ok(r.maxVelocity>0);assert.ok(r.maxDeceleration<0)
  assert.equal(parsed.rows[1].periodNumber,1);assert.equal(parsed.rows[1].period,'Período 1')
  assert.equal(r.rawValues['Period Tags'],'');assert.equal(parsed.importInfo.zoneThresholds,null)
 }
 const r=parseGpsCSV(fixture(1)).rows[0];assert.equal(r.distanceRelative,56.58);assert.equal(r.acceleration,5);assert.equal(r.deceleration,4);assert.equal(r.accelDecelAvg,9);assert.equal(r.accelDecelPerMinute,1.5);assert.equal(r.impacts,7)
})
test('CSV accepts quoted names and multiline tags, semicolons, decimal commas, UTF8/BOM and repairs broken accents',()=>{
 const csv=mutate(fixture(1),records=>{for(const r of records.slice(5)){r[0]='JoÃ£o, Teste';r[10]=r[10].replace('.',',');r[44]='Treino\ncom bola'}},';')
 const parsed=parseGpsCSV('\uFEFF'+csv);assert.equal(parsed.rows[0].playerName,'João, Teste');assert.equal(parsed.rows[0].totalDistance,339.54);assert.equal(parsed.rows[0].rawValues['Activity Tags'],'Treino\ncom bola')
 assert.equal(repairGpsText('Ruan de Souza RosÃ¡rÃ­o'),'Ruan de Souza Rosárío');assert.equal(repairGpsText('João da Silva'),'João da Silva')
})
test('legacy Portuguese columns and seconds stay compatible; missing metrics are null rather than fabricated zero',()=>{
 const csv=Papa.unparse([['Date:','31/12/2026'],['Player Name','Period Name','Period Number','DISTÂNCIA TOTAL (m)','DURAÇÃO TOTAL','VELOCIDADE MÁXIMA km/h','DISTÂNCIA RELATIVA (m/min)','DISTÂNCIA EM ALTA >20KM','ACELERAÇÃO','DECELERAÇÃO'],['Atleta teste','Session',0,600,600,25,60,0,3,4]])
 const p=parseGpsCSV(csv),r=p.rows[0];assert.equal(r.durationMin,10);assert.equal(r.totalDistance,600);assert.equal(r.hsr,0);assert.equal(r.sprintDistance,null);assert.equal(r.accelDecelAvg,7);assert.equal(p.importInfo.zoneThresholds.hsrKmh,20);assert.equal(p.warnings.length,1)
 assert.equal(gpsDurationMinutes('00:06:36'),6.6);assert.equal(gpsDurationMinutes('06:36'),6.6);assert.equal(gpsDurationMinutes('396'),6.6);assert.equal(gpsDurationMinutes('00:80:00'),null)
})
test('bad dates, missing distance, invalid numbers and incomplete period-only exports cannot silently create zero loads',()=>{
 for(const change of [r=>r[0][1]='31/02/2026',r=>r[5][10]='not a number',r=>r[5][10]='',r=>r[5][9]='00:00:00',r=>r[5][5]='1.2',r=>r.splice(5,1),r=>r.push([...r[5]])])assert.throws(()=>parseGpsCSV(mutate(fixture(1),change)))
 assert.throws(()=>parseGpsCSV('a,b\n1,2'))
})
test('report rates are weighted by minutes, zero remains measured, chronological order crosses month and year, positions use roster',()=>{
 assert.equal(weightedGpsRate([{distanceRelative:100,durationMin:10},{distanceRelative:50,durationMin:30}]),62.5)
 assert.equal(weightedGpsRate([{distanceRelative:0,durationMin:10}]),0)
 assert.equal(weightedGpsRate([{distanceRelative:null,durationMin:10}]),null)
 const sessions=sortGpsSessions([{date:'01/01/2027',name:'parte 2'},{date:'31/12/2026',name:'parte 1'},{date:'01/02/2026',name:'sessao'}]);assert.deepEqual(sessions.map(s=>s.date),['01/02/2026','31/12/2026','01/01/2027'])
 assert.equal(buildGpsPositions([{rows:[{playerName:'Joao Teste',positionName:null}]}],[{name:'João Teste',position:'VOL'}])['Joao Teste'],'VOL')
})
test('identical parts with different filenames are idempotent, distinct parts add once, and seasons stay isolated',async()=>{
 const db=new PGlite(),season='2027-americano',p1=parseGpsCSV(fixture(1)),p3=parseGpsCSV(fixture(3)),p4=parseGpsCSV(fixture(4))
 try{
  await prepareSeason(db,season);await prepareSeason(db,'2026-novorizontino')
  await inSeason(db,season,async()=>{
   assert.equal((await saveGpsImport(p1,{name:'parte 1',filename:'parte 1.csv'})).duplicate,false)
   const duplicate=await saveGpsImport(p1,{name:'parte 2',filename:'parte 2.csv'});assert.equal(duplicate.duplicate,true);assert.equal(duplicate.name,'parte 1')
   await saveGpsImport(p3,{name:'parte 3',filename:'parte 3.csv'});await saveGpsImport(p4,{name:'parte 4',filename:'parte 4.csv'})
   const {rows:saved}=await sql`SELECT rows,metadata FROM gps_sessions`;assert.equal(saved.length,3)
   const totals=saved.flatMap(s=>s.rows.filter(r=>r.periodNumber===0));assert.ok(Math.abs(totals.reduce((s,r)=>s+r.totalDistance,0)-1209.91)<1e-8);assert.ok(Math.abs(totals.reduce((s,r)=>s+r.durationMin,0)-(6+6.6+466/60))<1e-8)
   assert.equal(saved[0].metadata.gpsImport.sourceFormat,'catapult-english-v1');assert.equal(saved[0].rows[0].rawValues['Distance'],'339.54')
  })
  await inSeason(db,'2026-novorizontino',async()=>{assert.equal((await sql`SELECT * FROM gps_sessions`).rows.length,0);assert.equal((await saveGpsImport(p1,{name:'parte 1',filename:'parte 1.csv'})).duplicate,false)})
 }finally{await db.close()}
})
