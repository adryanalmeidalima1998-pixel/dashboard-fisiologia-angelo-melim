import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {PGlite} from '@electric-sql/pglite'
import {parseGpsCSV} from '../lib/gps-csv.mjs'
import {saveGpsImport} from '../lib/gps-upload.mjs'
import {consolidateGpsActivities} from '../lib/gps-activity.mjs'
import {expandGpsActivityIds,patchGpsActivity} from '../lib/gps-session-actions.mjs'
import {prepareSeason,inSeason,sql} from '../lib/season-db.mjs'
const parse=part=>parseGpsCSV(readFileSync(new URL(`./fixtures/gps-english-part-${part}.csv`,import.meta.url),'utf8'))
const activity=part=>({id:'test-four-blocks',name:'Treino de teste',expectedParts:4,part,confirmedDistinct:true})
const source=(part,p,id=part)=>({id,date:p.sessionDate,name:`parte ${part}`,filename:`parte ${part}.csv`,metadata:{type:'treino',gpsImport:p.importInfo,gpsActivity:activity(part)},rows:p.rows})
test('four explicitly confirmed blocks form one total without summing the Session and its periods twice',()=>{
 const p1=parse(1),p3=parse(3),p4=parse(4),sources=[source(1,p1),source(2,p1),source(3,p3),source(4,p4)],before=JSON.stringify(sources)
 const combined=consolidateGpsActivities(sources);assert.equal(combined.length,1);const s=combined[0],r=s.rows.find(r=>r.periodNumber===0)
 assert.equal(s.id,1);assert.equal(s.name,'Treino de teste (4 blocos)');assert.equal(s.metadata.gpsActivity.complete,true);assert.equal(s.rows.length,5)
 assert.ok(Math.abs(r.totalDistance-1549.45)<1e-8);assert.ok(Math.abs(r.durationMin-(12+6.6+466/60))<1e-8);assert.ok(Math.abs(r.distanceRelative-r.totalDistance/r.durationMin)<1e-8)
 assert.equal(r.maxVelocity,18.98);assert.equal(r.acceleration,33);assert.equal(r.deceleration,20);assert.equal(r.sourceBlockCount,4)
 assert.deepEqual(s.rows.filter(r=>r.periodNumber>0).map(r=>r.sourcePart),[1,2,3,4]);assert.deepEqual(s.sourceSessionIds,[1,2,3,4]);assert.equal(JSON.stringify(sources),before)
 const regular={...source(1,p1,9),metadata:{type:'treino'}}
 assert.equal(consolidateGpsActivities([...sources,regular]).length,2)
 const partial=consolidateGpsActivities(sources.slice(0,3))[0];assert.equal(partial.metadata.gpsActivity.complete,false)
})
test('missing measurements remain unknown and maximum deceleration preserves its sign',()=>{
 const p1=parse(1),a=source(1,p1),b=source(2,structuredClone(p1));b.rows[0].hsr=null;b.rows[0].maxDeceleration=-7
 const r=consolidateGpsActivities([a,b])[0].rows[0];assert.equal(r.hsr,null);assert.equal(r.maxDeceleration,-7)
})
test('confirmed identical blocks persist once each, reupload retains grouping, and activity edits target all source blocks',async()=>{
 const db=new PGlite(),season='2027-americano',parts=[parse(1),parse(1),parse(3),parse(4)]
 try{
  await prepareSeason(db,season)
  await inSeason(db,season,async()=>{
   const ids=[]
   for(let i=0;i<parts.length;i++){const result=await saveGpsImport(parts[i],{name:`parte ${i+1}`,filename:`parte ${i+1}.csv`,metadata:{type:'treino',gpsActivity:activity(i+1)}});assert.equal(result.duplicate,false);ids.push(result.id)}
   await saveGpsImport(parts[1],{name:'parte 2',filename:'parte 2.csv',metadata:{type:'treino'}})
   const {rows:raw}=await sql`SELECT id,session_date AS date,session_name AS name,filename,rows,metadata FROM gps_sessions ORDER BY id`
   assert.equal(raw.length,4);assert.equal(raw[1].metadata.gpsActivity.part,2);assert.equal(consolidateGpsActivities(raw).length,1)
   assert.deepEqual(await expandGpsActivityIds([ids[0]]),ids)
   await patchGpsActivity(ids[0],{type:'jogo',opponent:'Clube de teste',gpsActivity:{id:'must-not-replace'},gpsImport:{fingerprint:'must-not-replace'}})
   const {rows:edited}=await sql`SELECT metadata FROM gps_sessions ORDER BY id`
   assert.deepEqual(edited.map(r=>r.metadata.gpsActivity.part),[1,2,3,4]);assert.ok(edited.every(r=>r.metadata.type==='jogo'));assert.equal(edited[0].metadata.gpsImport.fingerprint,parts[0].importInfo.fingerprint)
   await sql`INSERT INTO gps_sessions(session_date,session_name,rows,metadata) VALUES (${'18/11/2026'},${'outro dia'},${'[]'},${JSON.stringify({gpsActivity:activity(1)})})`
   assert.deepEqual(await expandGpsActivityIds([ids[0]]),ids)
  })
 }finally{await db.close()}
})
