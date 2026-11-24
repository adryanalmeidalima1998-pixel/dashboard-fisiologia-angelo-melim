import {latestWellnessRecords} from './wellness-data.mjs'
const avg=values=>{const valid=values.filter(Number.isFinite);return valid.length?valid.reduce((a,b)=>a+b,0)/valid.length:null}
export const WELLNESS_DOMAINS=[['fadiga','Fadiga'],['sono','Sono'],['doms','Dor muscular'],['estresse','Estresse'],['humor','Humor']]
export function favorableWellnessValue(row,key){const v=row?.[key];return Number.isFinite(v)?(['fadiga','doms','estresse'].includes(key)?6-v:v):null}
// Keep the athlete's own location labels and laterality; never infer a site
// from the general soreness score. Repeated locations need only one card entry.
export function wellnessPainLocations(records){
 const seen=new Set(),locations=[]
 for(const row of records){
  if(row.type!=='pre'||row.temDor!==true)continue
  const label=String(row.dorLocalizada||'').trim()||'Local não informado',key=label.replace(/\s+/g,' ').toLocaleLowerCase('pt-BR')
  if(!seen.has(key)){seen.add(key);locations.push(label)}
 }
 return locations
}
export function wellnessReportModel({records,from,to}){
 const selected=latestWellnessRecords(records.filter(r=>r.date>=from&&r.date<=to)),names=[...new Set(selected.map(r=>r.playerName))].sort((a,b)=>a.localeCompare(b,'pt-BR'))
 if(!selected.length)throw new Error('Não há coletas neste período para gerar o PDF.')
 const pre=selected.filter(r=>r.type==='pre'),post=selected.filter(r=>r.type==='post'),pain=pre.filter(r=>r.temDor===true),loads=post.map(r=>r.srpeLoad).filter(Number.isFinite)
 const athletes=names.map((name,index)=>{const all=selected.filter(r=>r.playerName===name),before=all.filter(r=>r.type==='pre'),after=all.filter(r=>r.type==='post'),painRows=before.filter(r=>r.temDor),weights=all.filter(r=>Number.isFinite(r.weightKg)),lastPre=before.at(-1),aLoads=after.map(r=>r.srpeLoad).filter(Number.isFinite),minutes=after.map(r=>r.duracaoSessao).filter(Number.isFinite);return {name,number:String(index+1).padStart(2,'0'),pre:before,post:after,pain:painRows,painLocations:wellnessPainLocations(painRows),score:avg(before.map(r=>r.wellnessScore)),domains:WELLNESS_DOMAINS.map(([key,label])=>({key,label,value:avg(before.map(r=>favorableWellnessValue(r,key)))})),pse:avg(after.map(r=>r.srpe)),load:aLoads.length?aLoads.reduce((a,b)=>a+b,0):null,minutes:minutes.length?minutes.reduce((a,b)=>a+b,0):null,urine:lastPre?.corUrina??null,weight:weights.at(-1)?.weightKg??null}})
 const dates=[...new Set(selected.map(r=>r.date))].sort(),trend=dates.map(date=>{const day=selected.filter(r=>r.date===date),p=day.filter(r=>r.type==='pre'),a=day.filter(r=>r.type==='post'),dailyLoads=a.map(r=>r.srpeLoad).filter(Number.isFinite);return {date,score:avg(p.map(r=>r.wellnessScore)),load:dailyLoads.length?dailyLoads.reduce((a,b)=>a+b,0):null}})
 return {selected,pre,post,athletes,trend,painAthletes:new Set(pain.map(r=>r.playerName)).size,meanWellness:avg(pre.map(r=>r.wellnessScore)),meanPse:avg(post.map(r=>r.srpe)),totalLoad:loads.length?loads.reduce((a,b)=>a+b,0):null,google:selected.filter(r=>r.source==='google').length}
}
