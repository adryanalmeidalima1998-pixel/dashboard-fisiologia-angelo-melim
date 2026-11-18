import test from 'node:test'
import assert from 'node:assert/strict'
import {inflateSync} from 'node:zlib'
import {buildSessionPdf,sessionReportModel,sessionPdfFilename} from '../lib/session-pdf.js'
const season={shortName:'Americano FC',year:2027},session={name:'Treino teste (4 blocos)',date:'17/11/2026',metadata:{type:'treino',period:'tarde',gpsImport:{sourceFormat:'catapult-english-v1'}},sourceFiles:Array.from({length:4},(_,i)=>({filename:`parte ${i+1}.csv`}))}
const row=(name,value=100)=>({playerName:name,periodNumber:0,isOutlier:false,totalDistance:value,distanceRelative:50,hsr:0,sprintDistance:0,sprintCount:0,acceleration:3,deceleration:4,playerLoad:20,maxVelocity:25,durationMin:20,vmaxPct:null})
const textOf=doc=>{const raw=doc.output(),streams=[];for(const m of raw.matchAll(/\/Length (\d+)\n\/Filter \/FlateDecode\n>>\nstream\n/g)){const start=m.index+m[0].length;streams.push(inflateSync(Buffer.from(raw.slice(start,start+Number(m[1])),'binary')).toString('latin1'))}return streams.join('\n')}
test('session PDF preserves zero, unknown values, selected athletes and consolidated source count',()=>{
 const model=sessionReportModel({session,athletes:[row('Atleta A',0),row('Atleta B',100),{...row('Ignorado'),isOutlier:true},{...row('Periodo'),periodNumber:1}],filterPosition:'VOL'})
 assert.equal(model.rows.length,2);assert.equal(model.stats.totalDistance,50);assert.equal(model.stats.hsr,0);assert.equal(model.stats.vmaxPct,null);assert.equal(model.stats.peakVelocity,25);assert.equal(model.filterPosition,'VOL');assert.equal(model.sources.length,4)
 const unknown=sessionReportModel({session,athletes:[{...row('Atleta C'),acceleration:null}]});assert.equal(unknown.rows[0].accDecel,null)
 assert.throws(()=>sessionReportModel({session,athletes:[]}))
})
test('session PDF paginates every athlete in cards, retains names on final page, and shows measured zero instead of invented rankings',()=>{
 const athletes=Array.from({length:22},(_,i)=>row(`Atleta ${String(i+1).padStart(2,'0')} FINAL_${i+1}`,100+i)),doc=buildSessionPdf({season,session,athletes,generatedAt:new Date('2026-11-18T12:00:00Z')}),text=textOf(doc)
 assert.equal(doc.getNumberOfPages(),6);assert.match(text,/FINAL_22/);assert.match(text,/FINAL_1/);assert.match(text,/registraram 0 m/);assert.match(text,/Treino teste/)
 const single=buildSessionPdf({season,session,athletes:[row('ATLETA_ESCOLHIDO')]});assert.equal(single.getNumberOfPages(),3);assert.doesNotMatch(textOf(single),/FINAL_22/)
 assert.equal(sessionPdfFilename(session),'sessao-gps-17-11-2026-treino-teste-4-blocos.pdf')
})
