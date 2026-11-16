import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { PGlite } from '@electric-sql/pglite'
import { prepareSeason, inSeason, sql } from '../lib/season-db.mjs'
import { newCollectionConfig, collectionToken } from '../lib/collection-token.mjs'
import { historyToken, validHistoryToken } from '../lib/athlete-history-token.mjs'
import { validateHistory, historyValue } from '../lib/athlete-history-rules.mjs'
import { createHistoryHandlers, reopenHistory } from '../lib/athlete-history-handler.mjs'
import { saveRegistration } from '../lib/athlete-registration.mjs'
const old = '2026-novorizontino', next = '2027-americano', secret = 'test-only-history-secret'
export const exampleAnswers = () => ({
  fullName:'Atleta de teste',birthDate:'1998-05-10',origin:'Campos dos Goytacazes / RJ',heightCm:'181',weightKg:'78,50',position:'VOL',dominantFoot:'Destro',
  clubs:'Clube de teste - profissional - 2026',officialCompetition:'Sim',gamesSixMonths:0,minutesSixMonths:0,
  significantInjury:'Não',surgery:'Não',extraWork:'Não',sleep:'6–8 horas',alcohol:'Não',nutrition:'Sim',supplements:'Não',psychology:'Não',medication:'Não',notes:'',
})
const submission = (answers = exampleAnswers()) => ({ submissionId:randomUUID(),athleteId:1,answers })
test('history validates conditional details, zero games and decimal comma; strips hidden and unknown answers', () => {
  const p = validateHistory(submission({...exampleAnswers(),injuryDetails:'stale injury',medicationDetails:'stale medication',untrusted:'ignore'}))
  assert.equal(p.answers.weightKg,78.5);assert.equal(p.answers.gamesSixMonths,0);assert.equal(p.answers.minutesSixMonths,0)
  assert.equal(historyValue({type:'decimal'},'78,5'),'78,5')
  assert.equal(p.answers.injuryDetails,null);assert.equal(p.answers.medicationDetails,null);assert.equal('untrusted' in p.answers,false)
  for(const [key,details] of [['significantInjury','injuryDetails'],['surgery','surgeryDetails'],['extraWork','extraWorkDetails'],['supplements','supplementDetails'],['medication','medicationDetails']]) {
    assert.throws(()=>validateHistory(submission({...exampleAnswers(),[key]:'Sim'})),/Responda/)
    assert.equal(validateHistory(submission({...exampleAnswers(),[key]:'Sim',[details]:'Informação de teste'})).answers[details],'Informação de teste')
  }
  for (const values of [{birthDate:'2026-02-30'},{birthDate:'2099-01-01'},{gamesSixMonths:-1},{minutesSixMonths:1.5},{weightKg:'abc'},{heightCm:'1,81'},{position:'unknown'},{clubs:' '.repeat(4)}]) assert.throws(()=>validateHistory(submission({...exampleAnswers(),...values})))
})
test('history links cannot authorize wellness, another season, or a different signing secret', () => {
  const config = newCollectionConfig(), token = historyToken(next,config.nonce,secret)
  assert.equal(validHistoryToken(token,next,secret),true)
  assert.equal(token,historyToken(next,config.nonce,secret))
  assert.equal(validHistoryToken(token,old,secret),false)
  assert.equal(validHistoryToken(token,next,'other'),false)
  assert.equal(validHistoryToken(collectionToken(next,config.nonce,secret),next,secret),false)
})
test('public question collection keeps clinical data private, preserves versions and requires owner reopening', async () => {
  const db = new PGlite()
  try {
    await prepareSeason(db,old);await prepareSeason(db,next)
    const config=newCollectionConfig(),token=historyToken(next,config.nonce,secret)
    for(const season of [old,next]) await inSeason(db,season,async()=>{
      await sql`INSERT INTO athletes(name,notes,weight_kg,position) VALUES (${'Atleta de teste'},${'private note'},${88},${'VOL'})`
      await sql`INSERT INTO season_settings(key,value) VALUES ('athlete_history_form',${JSON.stringify(config)})`
    })
    let databaseCalls=0
    const handlers=createHistoryHandlers({secret:()=>secret,canonicalOrigin:()=> 'https://dashboard.test',runDatabase:(s,work)=>{databaseCalls++;return inSeason(db,s.id,work)}})
    const request=(method,p,access=token,season=next,origin='https://dashboard.test')=>handlers[method](new Request(`https://dashboard.test/api/questionario/${season}`,{method,headers:{Authorization:`Bearer ${access}`,'Content-Type':'application/json',Origin:origin},...(p?{body:JSON.stringify(p)}:{})}),{params:Promise.resolve({seasonId:season})})
    assert.equal((await request('GET',null,'bad')).status,404);assert.equal(databaseCalls,0)
    assert.equal((await request('GET',null,token,old)).status,404);assert.equal(databaseCalls,0)
    assert.equal((await request('POST',submission(),token,next,'https://evil.test')).status,403);assert.equal(databaseCalls,0)
    const info=await(await request('GET')).json();assert.deepEqual(Object.keys(info.athletes[0]).sort(),['id','name']);assert.doesNotMatch(JSON.stringify(info),/private note|weight|medication/)
    const first=submission({...exampleAnswers(),medication:'Sim',medicationDetails:'Medication test - no clinical assertion'})
    assert.equal((await request('POST',first)).status,201)
    assert.deepEqual(await(await request('POST',first)).json(),{saved:true})
    assert.equal((await request('POST',submission())).status,409)
    assert.equal((await request('POST',{...first,answers:exampleAnswers()})).status,409)
    const snapshots=()=>inSeason(db,next,()=>sql`SELECT * FROM athlete_questionnaires ORDER BY created_at`)
    assert.equal((await snapshots()).rows.length,1)
    const before=await snapshots();assert.equal(before.rows[0].answers.medication,'Sim')
    // No self-reported measurement can overwrite the roster's authoritative data.
    assert.equal((await inSeason(db,next,()=>sql`SELECT weight_kg FROM athletes WHERE id=1`)).rows[0].weight_kg,'88.00')
    assert.equal(await inSeason(db,next,()=>reopenHistory(1)),true)
    const second=submission();assert.equal((await request('POST',second)).status,201)
    const versions=(await snapshots()).rows;assert.equal(versions.length,2);assert.equal(versions.filter(r=>r.is_current).length,1)
    assert.equal(versions.find(r=>r.id===first.submissionId).answers.medicationDetails,first.answers.medicationDetails)
    assert.equal(versions.find(r=>r.id===first.submissionId).is_current,false)
    assert.equal((await request('POST',first)).status,200)
    assert.equal((await request('POST',submission())).status,409)
    assert.equal((await inSeason(db,old,()=>sql`SELECT * FROM athlete_questionnaires`)).rows.length,0)
    assert.equal((await request('POST',{...submission(),athleteId:999})).status,400)
    await inSeason(db,next,()=>sql`UPDATE season_settings SET value=${JSON.stringify({...config,enabled:false})} WHERE key='athlete_history_form'`)
    assert.equal((await request('GET')).status,404);assert.equal((await request('POST',submission())).status,404)
    await inSeason(db,next,()=>sql`UPDATE season_settings SET value=${JSON.stringify(newCollectionConfig())} WHERE key='athlete_history_form'`)
    assert.equal((await request('GET')).status,404)
  } finally { await db.close() }
})
test('editing or importing a name and position never erases existing athlete metadata',async()=>{
  const db=new PGlite()
  try {
    await prepareSeason(db,next)
    await inSeason(db,next,async()=>{
      await sql`INSERT INTO athletes(name,position,full_name,birth_date,notes,weight_kg,height_cm,dominant_foot,city) VALUES (${'Atleta de teste'},${'VOL'},${'Nome completo preservado'},${'1998-05-10'},${'Nota preservada'},${88},${181},${'Direito'},${'Campos / RJ'})`
      const a=await saveRegistration({name:'Atleta de teste',position:'MEI',notes:null})
      assert.equal(a.notes,'Nota preservada');assert.equal(a.weight_kg,'88.00');assert.equal(a.full_name,'Nome completo preservado')
      const b=await saveRegistration({name:'Atleta de teste',position:'VOL'},a.id)
      assert.equal(b.city,'Campos / RJ');assert.equal(b.height_cm,181);assert.equal(b.dominant_foot,'Direito');assert.equal(b.position,'VOL')
    })
  } finally {await db.close()}
})
test('individual and general PDFs retain long answers and include pending athletes',async()=>{
  const {buildHistoryPdf}=await import('../lib/athlete-history-pdf.js')
  const athletes=[{id:1,name:'Atleta teste'},{id:2,name:'Atleta pendente'}],answers=validateHistory(submission()).answers
  answers.clubs='Histórico de clubes com detalhes. '.repeat(160)+'FINAL_DO_HISTORICO'
  const responses=[{athlete_id:1,created_at:'2026-11-16T14:00:00Z',answers,is_current:true}]
  const season={shortName:'Americano FC',year:2027}
  const individual=buildHistoryPdf({season,athletes:[athletes[0]],responses,individual:true})
  assert.ok(individual.getNumberOfPages()>1);assert.match(individual.output(),/FINAL_DO_HISTORICO/)
  const general=buildHistoryPdf({season,athletes,responses})
  assert.match(general.output(),/Atleta pendente/);assert.match(general.output(),/Pendente/);assert.match(general.output(),/FINAL_DO_HISTORICO/)
})
