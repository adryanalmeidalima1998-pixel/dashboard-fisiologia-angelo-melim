import test from 'node:test'
import assert from 'node:assert/strict'
import {PGlite} from '@electric-sql/pglite'
import {prepareSeason,inSeason,sql} from '../lib/season-db.mjs'
import {saveRegistration} from '../lib/athlete-registration.mjs'
import {validateProfileUpdate,profileFormValues,changedProfileFields,profileAge} from '../lib/athlete-profile.mjs'
import {readAthleteHistory} from '../lib/athlete-history-google.mjs'
import {historyAge} from '../lib/athlete-history-view.mjs'

test('profile input accepts decimal comma, optional clears and valid dates; rejects invalid dates, dimensions and unexpected data',()=>{
 assert.deepEqual(validateProfileUpdate({birth_date:'2000-02-29',weight_kg:'78,5',height_cm:'181',city:' Campos / RJ ',notes:'ignore'}),{birth_date:'2000-02-29',weight_kg:78.5,height_cm:181,city:'Campos / RJ'})
 assert.deepEqual(validateProfileUpdate({city:'',weight_kg:null}),{city:null,weight_kg:null});assert.deepEqual(validateProfileUpdate({name:'Teste',position:'ZAG'}),{})
 for(const patch of [{birth_date:'2001-02-29'},{birth_date:'2100-01-01'},{weight_kg:-1},{weight_kg:'78.567'},{weight_kg:true},{height_cm:'1.81'},{height_cm:181.5},{city:'a'.repeat(256)}])assert.throws(()=>validateProfileUpdate(patch))
 const athlete={birth_date:'2000-02-29T00:00:00.000Z',weight_kg:78.5,height_cm:181,city:'Campos / RJ'},form=profileFormValues(athlete)
 assert.deepEqual(changedProfileFields(form,athlete),{});assert.deepEqual(changedProfileFields({...form,city:''},athlete),{city:''})
 assert.equal(profileAge('2000-11-23',new Date('2026-11-23T02:59:00Z')),25)
 assert.equal(profileAge('2000-11-23',new Date('2026-11-23T03:00:00Z')),26)
 assert.equal(profileAge('2001-02-29'),null)
 assert.equal(historyAge('2000-02-29',new Date('2026-11-23T12:00:00Z')),26)
})

test('manual profile edits and clears survive Google refresh, other fields and questionnaire originals stay intact and seasons are isolated',async()=>{
 const db=new PGlite(),season={id:'2027-americano'},original={birthDate:'1999-01-01',weightKg:80,heightCm:180,origin:'Cidade do formulário',_warnings:[]}
 try{
  await prepareSeason(db,'2027-americano');await prepareSeason(db,'2026-novorizontino')
  await inSeason(db,'2027-americano',async()=>{
   const a=await saveRegistration({name:'Atleta teste',position:'ZAG'});assert.equal(a.birth_date,null)
   await sql`INSERT INTO athlete_history_google(id,source_key,row_key,athlete_id,athlete_name,created_at,answers,raw) VALUES ('test','test','test',${a.id},${a.name},NOW(),${JSON.stringify(original)}::jsonb,'{}'::jsonb)`
   const imported=(await readAthleteHistory(season)).athletes[0];assert.equal(imported.weight_kg,80);assert.equal(imported.city,original.origin)
   await saveRegistration({name:a.name,position:'ZAG',birth_date:'2000-02-29',weight_kg:'78,5',height_cm:'181',city:'Campos / RJ'},a.id)
   let saved=(await readAthleteHistory(season)).athletes[0];assert.equal(saved.weight_kg,'78.50');assert.equal(saved.height_cm,181);assert.equal(saved.city,'Campos / RJ');assert.equal(new Date(saved.birth_date).toISOString().slice(0,10),'2000-02-29')
   await saveRegistration({name:a.name,position:'VOL'},a.id)
   saved=(await readAthleteHistory(season)).athletes[0];assert.equal(saved.weight_kg,'78.50');assert.equal(saved.city,'Campos / RJ');assert.equal(saved.position,'VOL')
   await saveRegistration({name:a.name,position:'VOL',city:'',weight_kg:''},a.id)
   saved=(await readAthleteHistory(season)).athletes[0];assert.equal(saved.city,null);assert.equal(saved.weight_kg,null);assert.equal(saved.height_cm,181)
   const unchanged=(await sql`SELECT answers FROM athlete_history_google WHERE id='test'`).rows[0].answers;assert.deepEqual(unchanged,original)
  })
  await inSeason(db,'2026-novorizontino',async()=>{const a=await saveRegistration({name:'Atleta teste',position:'ZAG'});assert.equal(a.city,null);assert.equal((await sql`SELECT * FROM season_settings WHERE key LIKE 'athlete_profile_override:%'`).rows.length,0)})
 }finally{await db.close()}
})
