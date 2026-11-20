import test from 'node:test'
import assert from 'node:assert/strict'
import {createAthleteNameResolver,canonicalizeAthleteRows} from '../lib/athlete-identity.mjs'
import {mergeGoogleWellness} from '../lib/wellness-data.mjs'
import {wellnessReportModel} from '../lib/wellness-report.mjs'
const roster=[{id:1,name:'Ruan de Souza Rosário'},{id:2,name:'Robert de Souza Ferreira Dias'},{id:3,name:'Robson Ferreira de Azevedo'},{id:4,name:'Michel Celestino Pires Chaves'}]
const aliases=[{gps_name:'Michael Celestino Pires Chaves',bem_name:roster[3].name},{gps_name:'Robson de Souza Ferreira Dias',bem_name:roster[2].name}]
test('GPS and Forms resolve to the registered athlete across case, accents and confirmed aliases without altering raw rows',()=>{
 const resolve=createAthleteNameResolver(roster,aliases),names=['Ruan de Souza Rosárío','Robert De Souza Ferreira Dias','Robson de Souza Ferreira Dias','Michael Celestino Pires Chaves']
 const rows=names.map(playerName=>({playerName,periodNumber:0,totalDistance:2000})),out=canonicalizeAthleteRows(rows,resolve)
 assert.deepEqual(out.map(r=>r.playerName),roster.map(r=>r.name));assert.deepEqual(rows.map(r=>r.playerName),names);assert.equal(out.reduce((s,r)=>s+r.totalDistance,0),8000)
 assert.equal(out[2]._originalName,names[2]);assert.notEqual(resolve(names[1]),resolve(names[2]));assert.equal(resolve('Juan'), 'Juan')
})
test('the same athlete has one post response and one PDF card while pre/post, dates and activity slots stay separate',()=>{
 const resolve=createAthleteNameResolver(roster,aliases),base={date:'2026-11-19',type:'post',sessionSlot:1,source:'google',srpe:5,duracaoSessao:60,srpeLoad:300}
 const raw=[{...base,playerName:aliases[0].gps_name,timestamp:'2026-11-19T15:00:00Z'},{...base,playerName:roster[3].name,timestamp:'2026-11-19T16:00:00Z',srpeLoad:360},{...base,playerName:roster[2].name,timestamp:'2026-11-19T15:00:00Z'}]
 const records=mergeGoogleWellness(canonicalizeAthleteRows(raw,resolve),[]),pdf=wellnessReportModel({records,from:base.date,to:base.date})
 assert.equal(records.length,2);assert.equal(pdf.athletes.length,2);assert.equal(pdf.totalLoad,660);assert.equal(raw.length,3)
 const phases=[raw[0],{...raw[1],type:'pre'},{...raw[1],sessionSlot:2},{...raw[1],date:'2026-11-20'}]
 assert.equal(mergeGoogleWellness(canonicalizeAthleteRows(phases,resolve),[]).length,4)
})
test('similar, ambiguous and cyclic names are not merged and resolver instances are isolated by season',()=>{
 const resolve=createAthleteNameResolver(roster,aliases)
 for(const name of ['Robert','Robson','Michel','Michael de outro clube'])assert.equal(resolve(name),name)
 const ambiguous=createAthleteNameResolver([{id:1,name:'João Silva'},{id:2,name:'Joao Silva'}]);assert.equal(ambiguous('JOAO SILVA'),'JOAO SILVA')
 const cycle=createAthleteNameResolver([],[{gps_name:'Nome A',bem_name:'Nome B'},{gps_name:'Nome B',bem_name:'Nome A'}]);assert.equal(cycle('Nome A'),'Nome A')
 assert.equal(createAthleteNameResolver([],[])(aliases[0].gps_name),aliases[0].gps_name)
})
