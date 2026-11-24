import test from 'node:test'
import assert from 'node:assert/strict'
import {wellnessPainLocations,wellnessReportModel} from '../lib/wellness-report.mjs'
import {buildWellnessPdf} from '../lib/wellness-pdf.js'
const day='2026-11-23',row=(name,location,extra={})=>({date:day,timestamp:day+'T11:00:00Z',type:'pre',playerName:name,temDor:true,dorLocalizada:location,wellnessScore:3.6,...extra}),options={season:{shortName:'Americano FC',year:2027},from:day,to:day}

test('pain sites retain labels, side and unknown sites, without guessing from general soreness or mixing periods',()=>{
 const records=[row('Atleta','9 - Panturrilha direita'),row('Atleta',' 9 - Panturrilha direita ',{date:'2026-11-22'}),row('Atleta','F - Lombar',{sessionSlot:2}),row('Atleta','',{sessionSlot:3}),row('Atleta','Joelho esquerdo',{date:'2026-11-24'}),row('Sem dor','Local antigo',{temDor:false,doms:5})]
 assert.deepEqual(wellnessPainLocations(records.slice(0,4)),['9 - Panturrilha direita','F - Lombar','Local não informado'])
 const model=wellnessReportModel({records,...options});assert.deepEqual(model.athletes[0].painLocations,['9 - Panturrilha direita','F - Lombar','Local não informado']);assert.deepEqual(model.athletes[1].painLocations,[])
})

test('athlete card itself contains the pain site and fallback, before the separate dated detail section',()=>{
 const doc=buildWellnessPdf({...options,records:[row('Atleta A','9 - Panturrilha direita; F - Lombar'),row('Atleta B','')]}),cardPage=doc.internal.pages[2].join('\n')
 assert.match(cardPage,/Panturrilha direita/);assert.match(cardPage,/Lombar/);assert.match(cardPage,/Local n.o informado/)
 assert.ok(doc.getNumberOfPages()>=3)
})

test('long pain location text continues across athlete cards without losing the last site or altering load',()=>{
 const location=Array.from({length:160},(_,i)=>`Regiao ${i+1} lado direito`).join('; ')+'; ULTIMO_LOCAL',records=[row('Atleta A',location),row('Atleta B','Joelho esquerdo'),row('Atleta C','',{temDor:false}),row('Atleta D','',{type:'post',temDor:null,srpe:6,duracaoSessao:90,srpeLoad:540})],doc=buildWellnessPdf({...options,records}),pages=doc.internal.pages.slice(1).map(p=>p.join('\n')),appendix=pages.findIndex(p=>p.includes('Locais de dor relatados'))
 assert.ok(appendix>1);assert.match(pages.slice(1,appendix).join('\n'),/ULTIMO_LOCAL/);assert.match(pages.slice(1,appendix).join('\n'),/continua/)
 assert.equal(wellnessReportModel({...options,records}).totalLoad,540);assert.equal(records[0].dorLocalizada,location)
})
