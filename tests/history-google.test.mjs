import test from 'node:test'
import assert from 'node:assert/strict'
import {randomUUID} from 'node:crypto'
import {PGlite} from '@electric-sql/pglite'
import {prepareSeason,inSeason,sql} from '../lib/season-db.mjs'
import {findSeason} from '../lib/seasons.mjs'
import {parseHistoryCsv,validHistoryGoogleUrl} from '../lib/athlete-history-csv.mjs'
import {prepareGoogleHistory,readAthleteHistory,syncGoogleHistory,mergeHistoryResponses} from '../lib/athlete-history-google.mjs'
const headers=['Carimbo de data/hora','NOME COMPLETO:','DATA DE NASCIMENTO','CIDADE/ ESTADO DE ORIGEM','ALTURA:','PESO:','POSIÇÃO QUE ATUA:','PÉ DOMINANTE','QUAIS CLUBES VOCÊ JÁ DEFENDEU (INCLUIR CATEGORIA E ANO?','PARTICIPOU DE ALGUMA COMPETIÇÃO OFICIAL NOS ÚLTIMOS 12 MESES?','NÚMERO APROXIMADO DE JOGOS DISPUTADOS NOS ÚLTIMOS 6 MESES?','NÚMERO APROXIMADO DE MINUTOS JOGADOS NOS ÚLTIMOS 6 MESES?','JÁ SOFREU ALGUMA LESÃO MUSCULAR OU ÓSSEA SIGNIFICATIVA?','SE A RESPOSTA ACIMA FOI SIM, DESCREVA QUAIS LESÃO FOI:','JÁ PASSOU POR CIRURGIA?','CASO TENHA PASSADO POR CIRUGIA, DESCREVA QUAL FOI:','REALIZA ALGUM TRABALHO FÍSICO COMPLEMENTAR FORA DO CLUBE?','CASO A RESPOSTA ACIMA SEJA SIM, DESCREVA QUAL TRABALHO:','COSTUMA DORMIR QUANTAS HORAS POR DIA?','FAZ USO DE BEBIBAS ALCOOLICAS?','POSSUI ACOMPANHAMENTO NUTRICIONAL?','UTILIZA ALGUNS SUPLEMEMTOS?','CASO UTILIZE ALGUM SUPLEMENTO, DESCREVA ABAIXO QUAIS SÃO UTILIZADOS:','POSSUI ACOMPANHAMENTO PSICOLÓGICO?','UTILIZA ALGUM TIPO MEDICAMENTOS? SE A RESPOSTA FOR (SIM) DESCREVA QUAL.']
const values=(name='Atleta de Teste')=>['16/11/2026 12:03:46',name,'12/03/2003','Campos / RJ','1,89','79 kg','ZAGUEIRO','CANHOTO','Clube teste - base 2025\nClube B - profissional 2026','SIM','0','0','Não','','Não','','Não','','6-8 HORAS','Não','Sim','Não','','Não','']
const csv=rows=>[headers,...rows].map(row=>row.map(value=>'"'+String(value).replaceAll('"','""')+'"').join(',')).join('\n')
const url='https://docs.google.com/spreadsheets/d/e/2PACX-test/pub?output=csv',next='2027-americano',old='2026-novorizontino'
test('Google parsing preserves narratives, absence, unit mistakes and source dates without inventing missing answers',()=>{
 const row=values(),result=parseHistoryCsv(csv([row]));assert.equal(result.records.length,1);assert.deepEqual(result.issues,[])
 const record=result.records[0];assert.equal(record.createdAt,'2026-11-16T12:03:46-03:00');assert.equal(record.answers.birthDate,'2003-03-12');assert.equal(record.answers.heightCm,189);assert.equal(record.answers.weightKg,79);assert.equal(record.answers.gamesSixMonths,0);assert.equal(record.answers.medication,null);assert.match(record.answers.clubs,/\n/)
 row[5]='83km';row[10]='10 jogos (competição de teste)';row[24]='Texto original informado'
 const changed=parseHistoryCsv(csv([row])).records[0];assert.equal(changed.answers.weightKg,'83km');assert.equal(changed.answers._warnings.length,1);assert.equal(changed.answers.gamesSixMonths,row[10]);assert.equal(changed.answers.medication,row[24]);assert.equal(changed.raw['PESO:'],'83km')
 assert.throws(()=>parseHistoryCsv('Nome,Peso\nA,80'),/colunas/)
 const invalid=values();invalid[0]='31/02/2026 12:00:00';assert.equal(parseHistoryCsv(csv([invalid])).issues.length,1)
 assert.equal(validHistoryGoogleUrl(url),true);for(const bad of['http://localhost/private','https://docs.google.com.evil.test/spreadsheets/d/e/test/pub?output=csv','https://docs.google.com:8443/spreadsheets/d/e/test/pub?output=csv'])assert.equal(validHistoryGoogleUrl(bad),false)
})
test('source snapshots are deterministic and names only match an unambiguous normalized full name',()=>{
 const data=csv([values('ATLETA DE TÉSTE')]),roster=[{id:7,name:'Atleta de Teste'}],p=prepareGoogleHistory(data,url,roster)
 assert.equal(p.records[0].athleteId,7);assert.equal(prepareGoogleHistory(data,url,roster).records[0].id,p.records[0].id)
 assert.equal(prepareGoogleHistory(data,url,[{id:2,name:'Atleta de Teste Silva'}]).records[0].athleteId,null)
 assert.equal(prepareGoogleHistory(data,url,[...roster,{id:8,name:'Atleta de Teste'}]).records[0].athleteId,null)
 const merged=mergeHistoryResponses([{id:'native',athlete_id:7,created_at:'2026-11-17T12:00:00Z'}],[{id:p.records[0].id,athlete_id:7,created_at:p.records[0].createdAt,answers:p.records[0].answers}]);assert.equal(merged.length,2);assert.equal(merged[0].id,'native');assert.equal(merged[1].is_current,false)
})
test('Google synchronization keeps versions, cached history through outages, roster enrichment and season isolation',async()=>{
 const db=new PGlite(),season=findSeason(next);let source=csv([values(),values('Atleta ainda não cadastrado')]),calls=0
 const fetcher=async()=>{calls++;return new Response(source)}
 try{
  await prepareSeason(db,next);await prepareSeason(db,old)
  await inSeason(db,next,async()=>{await sql`INSERT INTO athletes(name,notes) VALUES (${'Atleta de Teste'},${'Nota da comissão'})`;await sql`INSERT INTO season_settings(key,value) VALUES ('history_google_url',${url})`})
  const first=await inSeason(db,next,()=>readAthleteHistory(season,{fetcher}));assert.equal(first.responses.length,1);assert.equal(first.athletes[0].height_cm,189);assert.equal(first.athletes[0].weight_kg,79);assert.equal(first.athletes[0].notes,'Nota da comissão');assert.equal(first.sync.matchedCount,1);assert.equal(first.sync.unmatched.length,1)
  await inSeason(db,next,()=>syncGoogleHistory(season,{fetcher}));assert.equal(calls,1)
  const changed=values();changed[8]='Clubes revisados';source=csv([changed,values('Atleta ainda não cadastrado')])
  const second=await inSeason(db,next,()=>readAthleteHistory(season,{fetcher,force:true}));assert.equal(second.responses.length,2);assert.equal(second.responses[0].answers.clubs,'Clubes revisados');assert.equal(second.responses.filter(r=>r.is_current).length,1)
  const outage=await inSeason(db,next,()=>readAthleteHistory(season,{force:true,fetcher:async()=>{throw Error('Fonte temporariamente indisponível')}}));assert.equal(outage.responses.length,2);assert.match(outage.sync.warning,/indisponível/)
  await inSeason(db,next,()=>sql`INSERT INTO athletes(name) VALUES (${'Atleta ainda não cadastrado'})`)
  const linked=await inSeason(db,next,()=>readAthleteHistory(season,{fetcher,force:true}));assert.equal(linked.sync.unmatched.length,0);assert.equal(linked.responses.filter(r=>r.is_current).length,2)
  const nativeId=randomUUID();await inSeason(db,next,()=>sql`INSERT INTO athlete_questionnaires(id,athlete_id,athlete_name,form_version,answers,created_at) VALUES (${nativeId},1,${'Atleta de Teste'},1,${JSON.stringify({notes:'Resposta interna preservada'})}::jsonb,'2026-11-17T17:00:00Z')`)
  const together=await inSeason(db,next,()=>readAthleteHistory(season,{fetcher}));assert.equal(together.responses[0].id,nativeId);assert.equal(together.responses.length,4)
  assert.equal((await inSeason(db,old,()=>sql`SELECT * FROM athlete_history_google`)).rows.length,0)
 }finally{await db.close()}
})
