import Papa from 'papaparse'
import {createHash} from 'node:crypto'
export class GpsImportError extends Error {constructor(message){super(message);this.status=422}}
export function repairGpsText(value){
 let text=String(value??'').replace(/^\uFEFF|^ï»¿/,'').trim()
 if(/[ÃÂ]/.test(text)&&[...text].every(c=>c.charCodeAt(0)<=255))try{const decoded=new TextDecoder('utf-8',{fatal:true}).decode(Uint8Array.from(text,c=>c.charCodeAt(0)));if(!/[ÃÂ]/.test(decoded))text=decoded}catch{}
 return text
}
const norm=value=>repairGpsText(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim()
export function gpsNumber(value){
 const text=String(value??'').trim().replace(/\u00a0/g,'').replace(/\s/g,'')
 if(!text)return null
 const prepared=text.includes(',')&&text.includes('.')?(text.lastIndexOf(',')>text.lastIndexOf('.')?text.replace(/\./g,'').replace(',','.'):text.replace(/,/g,'')):text.replace(',','.')
 if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(prepared))return null
 const number=Number(prepared);return Number.isFinite(number)?number:null
}
export function gpsDurationMinutes(value,{excelFraction=false}={}){
 const text=String(value??'').trim(),parts=text.split(':')
 if(parts.length===3&&parts.every(p=>/^\d+(?:[.,]\d+)?$/.test(p))){const [h,m,s]=parts.map(gpsNumber);return m<60&&s<60?(h*3600+m*60+s)/60:null}
 if(parts.length===2&&parts.every(p=>/^\d+(?:[.,]\d+)?$/.test(p))){const [m,s]=parts.map(gpsNumber);return s<60?m+s/60:null}
 const number=gpsNumber(value);return number==null||number<0?null:excelFraction&&number>0&&number<1?number*1440:number/60
}
const FIELDS={
 totalDistance:['Distance','DISTÂNCIA TOTAL (m)'],distanceRelative:['Meterage Per Minute','DISTÂNCIA RELATIVA (m/min)'],
 hsr:['High Speed Distance','DISTÂNCIA EM ALTA >20KM'],sprintDistance:['Sprint Distance','DISTÂNCIA SPRINTS >25KM'],sprintCount:['Sprint Efforts','NÚMERO DE SPRINTS >25KM'],
 playerLoad:['Player Load','TOTAL PL'],acceleration:['Acceleration Efforts','ACELERAÇÃO'],deceleration:['Deceleration Efforts','DECELERAÇÃO'],accelDecelAvg:['Accel + Decel Efforts','Acel + Decel MÉDIA'],maxVelocity:['Max Velocity','VELOCIDADE MÁXIMA km/h'],
 maxAcceleration:['Max Acceleration'],maxDeceleration:['Max Deceleration'],accelDecelPerMinute:['Accel + Decel Efforts Per Minute'],maxVelocityPercent:['Max Vel (% Max)'],playerLoadPerMinute:['Player Load Per Minute'],workRestRatio:['Work/Rest Ratio'],maxHeartRate:['Max Heart Rate'],avgHeartRate:['Avg Heart Rate'],maxHeartRatePercent:['Max HR (% Max)'],avgHeartRatePercent:['Avg HR (% Max)'],hrExertion:['HR Exertion'],redZone:['Red Zone'],energy:['Energy'],highMetabolicLoadDistance:['High Metabolic Load Distance'],standingDistance:['Standing Distance'],walkingDistance:['Walking Distance'],joggingDistance:['Jogging Distance'],runningDistance:['Running Distance'],hiDistance:['HI Distance'],sprintDistancePerMinute:['Sprint Dist Per Min'],highSpeedEfforts:['High Speed Efforts'],highSpeedDistancePerMinute:['High Speed Distance Per Minute'],impacts:['Impacts'],
}
function validDate(value){const m=String(value).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(!m)return null;const [,d,mo,y]=m,dt=new Date(`${y}-${mo}-${d}T12:00:00Z`);return dt.getUTCFullYear()===Number(y)&&dt.getUTCMonth()+1===Number(mo)&&dt.getUTCDate()===Number(d)?`${d}/${mo}/${y}`:null}
export function parseGpsCSV(input){
 const text=String(input??'').replace(/^\uFEFF/,'')
 const candidate=text.split(/\r?\n/).find(line=>/Player Name/i.test(line))
 if(!candidate)throw new GpsImportError('Formato inválido. A coluna Player Name não foi encontrada.')
 const delimiter=[',',';','\t'].sort((a,b)=>candidate.split(b).length-candidate.split(a).length)[0]
 const parsed=Papa.parse(text,{delimiter,skipEmptyLines:'greedy'})
 if(parsed.errors.length)throw new GpsImportError('O CSV tem aspas ou linhas inválidas. Exporte novamente pelo GPS.')
 const records=parsed.data,headerIndex=records.findIndex(row=>row.some(cell=>norm(cell)==='player name'))
 if(headerIndex<0)throw new GpsImportError('Cabeçalho do GPS não encontrado.')
 const headers=records[headerIndex].map(repairGpsText),index=new Map(headers.map((h,i)=>[norm(h),i]))
 if(index.size!==headers.length)throw new GpsImportError('O CSV possui colunas repetidas no cabeçalho.')
 const col=(...names)=>names.map(n=>index.get(norm(n))).find(i=>i!==undefined)
 const dateRow=records.slice(0,headerIndex).find(r=>norm(r[0]).replace(/:$/,'')==='date')
 const sessionDate=validDate(repairGpsText(dateRow?.[1]))
 if(!sessionDate)throw new GpsImportError('Data da sessão inválida ou ausente. Use Date: com dia/mês/ano.')
 const sourceFormat=col('Distance')!==undefined?'catapult-english-v1':'catapult-portuguese-v1'
 for(const names of [['Player Name'],['Period Name'],['Period Number'],FIELDS.totalDistance,['Duration','DURAÇÃO TOTAL'],FIELDS.maxVelocity])if(col(...names)===undefined)throw new GpsImportError(`Coluna obrigatória ausente: ${names[0]}.`)
 const metadata=Object.fromEntries(records.slice(0,headerIndex).map(r=>[norm(r[0]).replace(/:$/,''),r[1]]))
 const unixStartTime=gpsNumber(metadata['unix start time']),durationSec=gpsNumber(metadata.duration),warnings=[]
 const missingMetrics=Object.entries(FIELDS).filter(([key,names])=>['hsr','sprintDistance','sprintCount','playerLoad','acceleration','deceleration'].includes(key)&&col(...names)===undefined).map(([key])=>key)
 if(missingMetrics.length)warnings.push(`Métricas ausentes no arquivo: ${missingMetrics.join(', ')}. Ausência não significa zero.`)
 const rows=[],seen=new Set()
 for(let i=headerIndex+1;i<records.length;i++){
  const values=records[i],get=(...names)=>values[col(...names)],playerName=repairGpsText(get('Player Name'))
  if(!playerName)continue
  if(values.length>headers.length&&values.slice(headers.length).some(v=>String(v).trim()))throw new GpsImportError(`Linha ${i+1}: há valores além do cabeçalho. Confira o separador do CSV.`)
  const periodNumber=gpsNumber(get('Period Number')),period=repairGpsText(get('Period Name'))
  if(!Number.isInteger(periodNumber)||periodNumber<0)throw new GpsImportError(`Linha ${i+1}: número do período inválido.`)
  const row={sessionDate,playerName,period,periodNumber,positionName:repairGpsText(get('Position Name'))||null,durationMin:gpsDurationMinutes(get('Duration','DURAÇÃO TOTAL'),{excelFraction:sourceFormat==='catapult-english-v1'}),isOutlier:false}
  for(const [key,names] of Object.entries(FIELDS)){const value=get(...names);row[key]=gpsNumber(value);if(String(value??'').trim()&&row[key]==null)throw new GpsImportError(`Linha ${i+1}: valor inválido em ${names[0]}.`);if(row[key]!=null&&row[key]<0&&key!=='maxDeceleration')throw new GpsImportError(`Linha ${i+1}: ${names[0]} não pode ser negativo.`)}
  for(const key of ['sprintCount','acceleration','deceleration','highSpeedEfforts','impacts'])if(row[key]!=null&&!Number.isInteger(row[key]))throw new GpsImportError(`Linha ${i+1}: a contagem ${key} deve ser inteira.`)
  if(row.totalDistance==null||row.durationMin==null||row.durationMin<=0||row.maxVelocity==null)throw new GpsImportError(`Linha ${i+1}: distância, duração ou velocidade máxima inválida.`)
  if(row.distanceRelative==null)row.distanceRelative=row.totalDistance/row.durationMin
  if(row.accelDecelAvg==null&&row.acceleration!=null&&row.deceleration!=null)row.accelDecelAvg=row.acceleration+row.deceleration
  for(let band=1;band<=6;band++)row[`heartRateBand${band}DurationMin`]=gpsDurationMinutes(get(`Heart Rate Band ${band} Duration`),{excelFraction:sourceFormat==='catapult-english-v1'})
  row.rawValues=Object.fromEntries(headers.map((h,c)=>[h,repairGpsText(values[c])]))
  const identity=norm(playerName)+'|'+periodNumber
  if(seen.has(identity))throw new GpsImportError(`Atleta repetido no mesmo período: ${playerName}. Confira o arquivo.`)
  seen.add(identity);rows.push(row)
 }
 if(!rows.length)throw new GpsImportError('Nenhuma linha de atleta encontrada no CSV.')
 const players=[...new Set(rows.map(r=>norm(r.playerName)))];if(players.some(name=>!rows.some(r=>norm(r.playerName)===name&&r.periodNumber===0)))throw new GpsImportError('O arquivo precisa conter o total Session (Period Number 0) de cada atleta. Exporte a sessão completa com seus períodos.')
 const dists=rows.filter(r=>r.periodNumber===0).map(r=>r.totalDistance).filter(v=>v>0),mean=dists.reduce((s,v)=>s+v,0)/(dists.length||1),std=Math.sqrt(dists.reduce((s,v)=>s+(v-mean)**2,0)/(dists.length||1))
 for(const r of rows)r.isOutlier=r.totalDistance>15000||r.totalDistance>mean+3*std
 const fingerprint=unixStartTime?createHash('sha256').update(JSON.stringify({sessionDate,unixStartTime,rows:rows.map(({rawValues,...r})=>r).sort((a,b)=>norm(a.playerName).localeCompare(norm(b.playerName))||a.periodNumber-b.periodNumber)})).digest('hex'):null
 return {sessionDate,rows,warnings,importInfo:{version:1,sourceFormat,unixStartTime,durationSec,playersCount:players.length,periodsCount:new Set(rows.filter(r=>r.periodNumber>0).map(r=>r.periodNumber)).size,missingMetrics,zoneThresholds:sourceFormat==='catapult-english-v1'?null:{hsrKmh:20,sprintKmh:25},fingerprint,warnings}}
}
