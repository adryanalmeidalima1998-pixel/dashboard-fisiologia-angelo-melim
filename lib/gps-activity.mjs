import {sortGpsSessions} from './gps-data.mjs'
const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ')
const additive=['totalDistance','hsr','sprintDistance','sprintCount','playerLoad','acceleration','deceleration','accelDecelAvg','durationMin','energy','highMetabolicLoadDistance','standingDistance','walkingDistance','joggingDistance','runningDistance','hiDistance','highSpeedEfforts','impacts','hrExertion','redZone',...Array.from({length:6},(_,i)=>`heartRateBand${i+1}DurationMin`)]
const maxima=['maxVelocity','maxVelocityPercent','maxAcceleration','maxHeartRate','maxHeartRatePercent']
const mean=(rows,key)=>{const valid=rows.filter(r=>Number.isFinite(r[key])&&r.durationMin>0),minutes=valid.reduce((s,r)=>s+r.durationMin,0);return minutes?valid.reduce((s,r)=>s+r[key]*r.durationMin,0)/minutes:null}
export function consolidateGpsActivities(sessions){
 const groups=new Map(),output=[]
 for(const s of sortGpsSessions(sessions)){
  const activity=s.metadata?.gpsActivity
  if(!activity?.id||activity.confirmedDistinct!==true){output.push(s);continue}
  const key=s.date+'|'+activity.id;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s)
 }
 for(const members of groups.values()){
  members.sort((a,b)=>(a.metadata.gpsActivity.part||0)-(b.metadata.gpsActivity.part||0)||a.id-b.id)
  const first=members[0],athletes=new Map(),periodRows=[];let periodNumber=0
  for(const member of members){
   const block=member.metadata.gpsActivity.part,label=`Parte ${block}`,periods=new Map()
   for(const r of member.rows.filter(r=>r.periodNumber===0)){
    const key=normalize(r.playerName);if(!athletes.has(key))athletes.set(key,[]);athletes.get(key).push(r)
   }
   const sourcePeriods=member.rows.filter(r=>r.periodNumber>0),details=sourcePeriods.length?sourcePeriods:member.rows.filter(r=>r.periodNumber===0)
   for(const r of details){if(!periods.has(r.periodNumber))periods.set(r.periodNumber,++periodNumber);periodRows.push({...r,period:`${label} · ${r.period}`,periodNumber:periods.get(r.periodNumber),sourceSessionId:member.id,sourcePart:block})}
  }
  const totals=[...athletes.values()].map(rows=>{
   const total={...rows[0],period:'Session',periodNumber:0,rawValues:null,isOutlier:rows.some(r=>r.isOutlier),sourceBlockCount:rows.length}
   for(const key of additive)total[key]=rows.every(r=>Number.isFinite(r[key]))?rows.reduce((s,r)=>s+r[key],0):null
   for(const key of maxima){const values=rows.map(r=>r[key]).filter(Number.isFinite);total[key]=values.length?Math.max(...values):null}
   const decelerations=rows.map(r=>r.maxDeceleration).filter(Number.isFinite);total.maxDeceleration=decelerations.length?Math.min(...decelerations):null
   for(const [key,numerator] of Object.entries({distanceRelative:'totalDistance',playerLoadPerMinute:'playerLoad',sprintDistancePerMinute:'sprintDistance',highSpeedDistancePerMinute:'hsr',accelDecelPerMinute:'accelDecelAvg'}))total[key]=total.durationMin>0&&Number.isFinite(total[numerator])?total[numerator]/total.durationMin:null
   total.avgHeartRate=mean(rows,'avgHeartRate');total.avgHeartRatePercent=mean(rows,'avgHeartRatePercent');total.workRestRatio=null
   return total
  })
  const sourceSessionIds=members.map(s=>s.id),sourceFiles=members.map(s=>({id:s.id,name:s.name,filename:s.filename,part:s.metadata.gpsActivity.part})),expected=first.metadata.gpsActivity.expectedParts||members.length
  output.push({...first,name:`${first.metadata.gpsActivity.name||'Treino consolidado'} (${members.length} blocos)`,filename:members.map(s=>s.filename).join(' + '),sourceSessionIds,sourceFiles,rows:[...totals,...periodRows],metadata:{...first.metadata,gpsActivity:{...first.metadata.gpsActivity,sourceSessionIds,partsCount:members.length,complete:expected===members.length},gpsImport:{...first.metadata.gpsImport,fingerprint:null,playersCount:totals.length,periodsCount:periodNumber,durationSec:members.reduce((s,m)=>s+(m.metadata?.gpsImport?.durationSec||0),0)}}})
 }
 return sortGpsSessions(output)
}
