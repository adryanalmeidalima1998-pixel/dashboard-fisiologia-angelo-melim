import test from 'node:test'
import assert from 'node:assert/strict'
import {PGlite} from '@electric-sql/pglite'
import {prepareSeason,inSeason,sql} from '../lib/season-db.mjs'
import {validateAthletePhoto,saveAthletePhoto} from '../lib/athlete-photo.mjs'
const image='data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAeAB4DASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDiaKKK9w8oKKKKACiiigAooooA/9k='
test('photos reject non-image payloads, oversized inputs and unsupported dimensions',()=>{
 assert.equal(validateAthletePhoto({name:' João da Silva ',dataUrl:image}).key,'joao_da_silva')
 for(const body of [{name:'',dataUrl:image},{name:'Test',dataUrl:'data:image/svg+xml;base64,PHN2Zz4='},{name:'Test',dataUrl:'data:image/jpeg;base64,'+'A'.repeat(280001)},{name:'Test',dataUrl:'data:image/jpeg;base64,AAAA'}])assert.throws(()=>validateAthletePhoto(body))
 const bytes=Buffer.from(image.split(',')[1],'base64')
 for(let i=0;i<bytes.length-8;i++)if(bytes[i]===255&&[192,193,194].includes(bytes[i+1])){bytes.writeUInt16BE(1024,i+7);break}
 assert.throws(()=>validateAthletePhoto({name:'Test',dataUrl:'data:image/jpeg;base64,'+bytes.toString('base64')}),/redimensionada/)
})
test('photos persist independently per season and replacement keeps one image per athlete',async()=>{
 const db=new PGlite(),old='2026-novorizontino',next='2027-americano'
 try{
  await prepareSeason(db,old);await prepareSeason(db,next)
  await inSeason(db,next,()=>saveAthletePhoto({name:'João da Silva',dataUrl:image}))
  assert.equal((await inSeason(db,old,()=>sql`SELECT * FROM athlete_photos`)).rows.length,0)
  await inSeason(db,next,()=>saveAthletePhoto({name:'JOAO DA SILVA',dataUrl:image}))
  const rows=(await inSeason(db,next,()=>sql`SELECT * FROM athlete_photos`)).rows
  assert.equal(rows.length,1);assert.equal(rows[0].data_url,image)
  await prepareSeason(db,next)
  assert.equal((await inSeason(db,next,()=>sql`SELECT * FROM athlete_photos`)).rows.length,1)
 }finally{await db.close()}
})
