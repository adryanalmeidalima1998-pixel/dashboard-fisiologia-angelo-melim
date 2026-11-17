// Canonical GPS values consumed by every dashboard and PDF report.
export function weightedGpsRate(rows,key='distanceRelative') {
 const valid=rows.filter(r=>Number.isFinite(r[key])&&Number.isFinite(r.durationMin)&&r.durationMin>0)
 const minutes=valid.reduce((sum,r)=>sum+r.durationMin,0)
 if(minutes)return valid.reduce((sum,r)=>sum+r[key]*r.durationMin,0)/minutes
 const values=rows.map(r=>r[key]).filter(Number.isFinite)
 return values.length?values.reduce((a,b)=>a+b,0)/values.length:null
}
export function gpsDateKey(value){return value?.includes('/')?value.split('/').reverse().join('-'):value||''}
export function sortGpsSessions(sessions){return [...sessions].sort((a,b)=>gpsDateKey(a.date).localeCompare(gpsDateKey(b.date))||(a.metadata?.gpsImport?.unixStartTime||0)-(b.metadata?.gpsImport?.unixStartTime||0)||String(a.name).localeCompare(String(b.name),'pt-BR',{numeric:true}))}
export const GPS_EXPORT_NOTE='HSR e sprint seguem as zonas configuradas no GPS de origem. O CSV em inglês não informa os limites dessas zonas.'

export function buildGpsPositions(sessions,athletes){
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' '),byName=new Map(),result={}
 for(const a of athletes)if(a.position){byName.set(normalize(a.name),a.position);if(a.full_name)byName.set(normalize(a.full_name),a.position);result[a.name]=a.position}
 for(const s of sessions)for(const r of s.rows){const position=byName.get(normalize(r.playerName))||r.positionName;if(position)result[r.playerName]=position}
 return result
}
