import test from 'node:test'
import assert from 'node:assert/strict'
import { PGlite } from '@electric-sql/pglite'
import { SEASONS, LEGACY_SEASON_ID, seasonStorage, seasonHref, findSeason } from '../lib/seasons.mjs'
import { prepareSeason, inSeason, sql } from '../lib/season-db.mjs'
import { hashPassword, verifyPassword } from '../lib/password.mjs'
import { defaultWellnessSource, validWellnessSource } from '../lib/wellness.mjs'
const old = LEGACY_SEASON_ID, next = '2027-americano'

test('legacy browser data is copied only into the 2026 namespace and remains intact', () => {
  const map = new Map([['rtp', 'historico'],['aphoto_atleta', 'foto-2026']])
  const storage = { getItem:k => map.get(k) ?? null, setItem:(k,v) => map.set(k,v), removeItem:k=>map.delete(k) }
  const a=seasonStorage(storage,old), b=seasonStorage(storage,next)
  assert.equal(a.getItem('rtp'),'historico'); assert.equal(b.getItem('rtp'),null)
  b.setItem('rtp','Americano'); assert.equal(a.getItem('rtp'),'historico'); assert.equal(b.getItem('rtp'),'Americano')
  assert.equal(map.get('rtp'),'historico'); assert.equal(b.getItem('aphoto_atleta'),null)
  assert.throws(()=>seasonStorage(storage,'unknown').getItem('rtp'))
})
test('navigation carries the season through individual reports and new tabs', () => {
  assert.equal(seasonHref('/print/individual?atleta=Joao',next),'/print/individual?atleta=Joao&temporada=2027-americano')
  assert.throws(()=>seasonHref('https://other.example',next)); assert.equal(findSeason('public'),null)
})
test('the Americano has no legacy wellness source', () => {
  assert.equal(defaultWellnessSource(next,{}),'')
  assert.match(defaultWellnessSource(old,{}),/^https:\/\/docs.google.com/)
  assert.equal(validWellnessSource('http://127.0.0.1/private'),false)
  assert.equal(validWellnessSource('https://docs.google.com.evil.test/spreadsheets/d/e/id/pub?output=csv'),false)
  assert.equal(validWellnessSource(defaultWellnessSource(old,{})),true)
})
test('password verification rejects incorrect and legacy plaintext credentials', () => {
  const hash=hashPassword('UmaSenhaLocal!2027'); assert.equal(verifyPassword('UmaSenhaLocal!2027',hash),true)
  assert.equal(verifyPassword('errada',hash),false); assert.equal(verifyPassword('uma','uma'),false)
  assert.notEqual(hash,hashPassword('UmaSenhaLocal!2027'))
})
test('real PostgreSQL engine preserves legacy data and isolates every season table', async t => {
  const db = new PGlite()
  await db.exec(`CREATE TABLE gps_sessions (id SERIAL PRIMARY KEY, session_date VARCHAR(20) NOT NULL, session_name VARCHAR(255) NOT NULL, filename VARCHAR(255), uploaded_at TIMESTAMPTZ DEFAULT NOW(), rows JSONB NOT NULL); INSERT INTO gps_sessions(session_date,session_name,rows) VALUES ('02/01/2026','Histórico','[]');`)
  await prepareSeason(db,old); await prepareSeason(db,next)
  await t.test('initialization preserves the legacy record and adds no records to Americano', async()=>{
    assert.equal((await inSeason(db,old,()=>sql`SELECT * FROM gps_sessions`)).rows.length,1)
    assert.equal((await inSeason(db,next,()=>sql`SELECT * FROM gps_sessions`)).rows.length,0)
    await prepareSeason(db,old); assert.equal((await db.query('SELECT count(*) FROM public.gps_sessions')).rows[0].count,1)
  })
  const writes=[
    ["athletes","INSERT INTO athletes(name) VALUES ('Mesmo nome')"],
    ["cmj_baseline","INSERT INTO cmj_baseline(athlete_name,melhor_salto) VALUES ('Mesmo nome',42)"],
    ["cmj_coletas","INSERT INTO cmj_coletas(athlete_name,data_coleta,media) VALUES ('Mesmo nome','2027-01-02',39)"],
    ["injury_history","INSERT INTO injury_history(athlete_name,injury_date,body_region,injury_type) VALUES ('Mesmo nome','2027-01-02','coxa','Teste')"],
    ["name_aliases","INSERT INTO name_aliases(gps_name,bem_name) VALUES ('Mesmo nome','Apelido')"],
    ["squad_exclusions","INSERT INTO squad_exclusions(player_name,normalized_name) VALUES ('Mesmo nome','mesmo nome')"],
    ["season_settings","INSERT INTO season_settings(key,value) VALUES ('wellness_url','url-2027')"],
  ]
  for(const [table,statement]of writes)await t.test(`${table}: insert, read and delete stay in the selected season`,async()=>{
    await inSeason(db,next,()=>db.query(statement))
    assert.equal((await inSeason(db,old,()=>db.query(`SELECT * FROM ${table}`))).rows.length,0)
    await inSeason(db,old,()=>db.query(statement))
    await inSeason(db,next,()=>db.query(`DELETE FROM ${table}`))
    assert.equal((await inSeason(db,old,()=>db.query(`SELECT * FROM ${table}`))).rows.length,1)
  })
  await t.test('same dates and session names cannot overwrite another season',async()=>{
    await inSeason(db,next,()=>sql`INSERT INTO gps_sessions(session_date,session_name,rows) VALUES (${'02/01/2026'},${'Histórico'},${JSON.stringify([{playerName:'Americano'}])}) ON CONFLICT(session_date,session_name) DO UPDATE SET rows=EXCLUDED.rows`)
    assert.deepEqual((await inSeason(db,old,()=>sql`SELECT rows FROM gps_sessions`)).rows[0].rows,[])
    await inSeason(db,next,()=>sql`DELETE FROM gps_sessions WHERE id = ${1}`)
    assert.equal((await inSeason(db,old,()=>sql`SELECT * FROM gps_sessions`)).rows.length,1)
  })
  await t.test('failed transactions roll back and never fall back to the legacy schema',async()=>{
    await assert.rejects(inSeason(db,next,async()=>{await sql`INSERT INTO athletes(name) VALUES (${'Rollback'})`;throw Error('fail')}))
    assert.equal((await inSeason(db,next,()=>sql`SELECT * FROM athletes`)).rows.length,0)
    await inSeason(db,next,async()=>{await sql`INSERT INTO athletes(name) VALUES (${'Rollback response'})`;return new Response('',{status:500})})
    assert.equal((await inSeason(db,next,()=>sql`SELECT * FROM athletes`)).rows.length,0)
    assert.equal((await db.query('SELECT current_schema() AS name')).rows[0].name,'public')
    await db.exec('DROP TABLE season_2027_americano.cmj_coletas')
    await assert.rejects(inSeason(db,next,()=>sql`SELECT * FROM cmj_coletas`))
    assert.equal((await db.query('SELECT count(*) FROM public.cmj_coletas')).rows[0].count,1)
    await assert.rejects(inSeason(db,'public; DROP SCHEMA public',()=>sql`SELECT 1`))
    assert.throws(()=>sql`SELECT 1`)
  })
  await db.close()
})
test('concurrent requests keep separate database clients',async()=>{
  const seen=[[],[]]
  const clients=seen.map(list=>({query:async(text,values)=>{list.push({text,values});return {rows:[]}}}))
  await Promise.all(SEASONS.map((s,i)=>inSeason(clients[i],s.id,async()=>{await new Promise(r=>setTimeout(r,i?2:8));await sql`SELECT ${s.id}` })))
  assert.equal(seen[0].find(x=>x.text==='SELECT $1').values[0],old)
  assert.equal(seen[1].find(x=>x.text==='SELECT $1').values[0],next)
})
