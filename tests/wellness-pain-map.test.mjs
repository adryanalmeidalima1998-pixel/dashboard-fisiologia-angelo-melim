import test from 'node:test'
import assert from 'node:assert/strict'
import {collectPainMap,mapRegions} from '../lib/wellness-pain-map.mjs'
import {wellnessReportModel} from '../lib/wellness-report.mjs'
import {buildWellnessPdf} from '../lib/wellness-pdf.js'
const day='2026-11-24', row=(location,overrides={})=>({date:day,timestamp:day+'T11:00:00Z',playerName:'Exemplo',type:'pre',temDor:true,dorLocalizada:location,...overrides})
test('all 39 Forms options land on the specified view and anatomical side, zero is never marked',()=>{
 const groups=[
 ['front','1 3 5 13 15 19 B D L N','2 4 6 14 16 20 C E M O','A'],
 ['back','7 9 12 18 22 H J R','8 10 11 17 21 G I Q','F P']]
 assert.equal(mapRegions.size,39)
 for(const [view,right,left,mid] of groups)for(const [side,codes] of [[1,right],[-1,left],[0,mid]])for(const id of codes.split(' ')){
  const r=mapRegions.get(id)
  assert.equal(r.view,view);assert.equal(Math.sign(r.x-50),side===0?0:view==='front'?-side:side)
  assert.ok(r.y>0&&r.y<200)
 }
 const response=[...mapRegions.values()].map(r=>r.code+' - '+r.label.replace('da coxa','de Coxa').replace('direita','Direito').replace('esquerda','Esquerdo')).join(', ')
 assert.equal(collectPainMap([row(response+', 0 - Sem dor')]).sites.length,39)
 assert.equal(collectPainMap([row('0 - Sem dor')]).sites.length,0)
})
test('counts responses per region, not duplicated checkboxes, revisions, other athletes or general soreness',()=>{
 const records=[row('F',{timestamp:day+'T10:00:00Z'}),row('1 - Anterior de Coxa Direito, 1, F - Lombar'),row('F',{sessionSlot:2}),row('0 - Sem dor',{temDor:false,sessionSlot:3,doms:5}),row('9',{type:'post'}),row('4',{playerName:'Outro'}),row('9',{date:'2026-11-23'})]
 const a=wellnessReportModel({records,from:day,to:day}).athletes[0]
 assert.deepEqual(a.painMap.sites.map(r=>[r.code,r.count]),[['F',2],['1',1]])
 const unknown=collectPainMap([row('9 - Panturrilha esquerda; Coxa'),row('')])
 assert.equal(unknown.sites.length,0);assert.deepEqual(unknown.unknown.map(r=>r.label),['9 - Panturrilha esquerda','Coxa','Local não informado'])
 const doc=buildWellnessPdf({season:{shortName:'Teste',year:2027},records,from:day,to:day})
 const main=doc.internal.pages[2].join('\n')
 assert.match(main,/MAPA DE DOR/);assert.match(main,/FRENTE/);assert.match(main,/COSTAS/);assert.match(main,/2 coletas/)
})
