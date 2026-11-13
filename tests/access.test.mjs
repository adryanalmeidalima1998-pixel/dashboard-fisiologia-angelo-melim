import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { createSeasonHandler } from '../lib/season-handler.mjs'
function fixture(authenticated) {
  const calls=[]
  const wrap=createSeasonHandler({getSession:async()=>authenticated?{user:{id:'angelo-melim'}}:null,canonicalOrigin:()=> 'https://dashboard.example',runDatabase:async(s,fn)=>{calls.push(s.id);return fn()}})
  const route=wrap(async(req,{season})=>Response.json({season:season.id}))
  const request=(season,origin='https://dashboard.example')=>new Request('https://dashboard.example/api/athletes',{method:'POST',headers:{...(season?{'X-Season-Id':season}:{}),Origin:origin}})
  return {route,request,calls}
}
test('unauthenticated requests never reach the data handler',async()=>{
  const {route,request,calls}=fixture(false)
  assert.equal((await route(request('2027-americano'))).status,401);assert.deepEqual(calls,[])
})
test('missing or forged seasons cannot silently read the legacy schema',async()=>{
  const {route,request,calls}=fixture(true)
  for(const id of [null,'public','2026','2027-americano; DROP SCHEMA public'])assert.equal((await route(request(id))).status,400)
  assert.deepEqual(calls,[])
})
test('cross-origin writes are rejected before any database operation',async()=>{
  const {route,request,calls}=fixture(true)
  assert.equal((await route(request('2027-americano','https://other.example'))).status,403);assert.deepEqual(calls,[])
})
test('authenticated calls pass the selected season and cannot be shared-cached',async()=>{
  const {route,request,calls}=fixture(true)
  const response=await route(request('2027-americano'))
  assert.deepEqual(await response.json(),{season:'2027-americano'})
  assert.deepEqual(calls,['2027-americano']);assert.equal(response.headers.get('Cache-Control'),'private, no-store')
  assert.equal(response.headers.get('Vary'),'Cookie, X-Season-Id')
})
test('every application data route uses the authentication and season boundary',()=>{
  function files(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(`${dir}/${e.name}`):[`${dir}/${e.name}`])}
  for(const file of files('app/api').filter(f=>f.endsWith('/route.js')&&!f.includes('/auth/'))){
    const text=readFileSync(file,'utf8')
    if(file==='app/api/coleta/[seasonId]/route.js'){assert.match(text,/createCollectionHandlers\(/);assert.match(text,/runDatabase:runSeasonDatabase/);assert.match(text,/secret:\(\)=>process\.env\.NEXTAUTH_SECRET/);continue}
    const methods=[...text.matchAll(/export const (GET|POST|PUT|PATCH|DELETE)\s*=\s*([^\n]+)/g)]
    assert.ok(methods.length,file)
    for(const method of methods)assert.match(method[2],/^withSeason\(/,`${file} ${method[1]}`)
    assert.doesNotMatch(text,/export async function (GET|POST|PUT|PATCH|DELETE)/,file)
  }
})
