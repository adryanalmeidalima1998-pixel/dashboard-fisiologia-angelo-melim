import {HISTORY_SECTIONS,historyValue} from './athlete-history-rules.mjs'
const fields=Object.fromEntries(HISTORY_SECTIONS.flatMap(s=>s.fields).map(f=>[f.key,f]))
export const answerLabel=(answers,key)=>historyValue(fields[key]||{type:'text'},answers?.[key])
export function historyAge(birthDate,at=new Date()){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate||''))return null
 const birth=new Date(`${birthDate}T12:00:00Z`);if(!Number.isFinite(birth.getTime()))return null
 let age=at.getUTCFullYear()-birth.getUTCFullYear();if(at.getUTCMonth()<birth.getUTCMonth()||at.getUTCMonth()===birth.getUTCMonth()&&at.getUTCDate()<birth.getUTCDate())age--
 return age>=0&&age<=110?age:null
}
export function historyNumber(value){
 if(typeof value==='number')return Number.isFinite(value)&&value>=0?value:null
 const text=String(value??'').trim();return /^\d+(?:[.,]\d+)?$/.test(text)?Number(text.replace(',','.')):null
}
export function recentParticipation(answers){
 const integer=value=>{const number=historyNumber(value);return Number.isInteger(number)?number:null},games=integer(answers?.gamesSixMonths),minutes=integer(answers?.minutesSixMonths)
 return {games,minutes,average:games>0&&minutes!=null?Math.round(minutes/games*10)/10:null}
}
export function historyClubs(value){
 const raw=String(value||'').trim();if(!raw)return []
 let depth=0,chunk='',rows=[]
 for(const char of raw){if(char==='(')depth++;if(char===')')depth=Math.max(0,depth-1);if(depth===0&&['\n',',',';'].includes(char)){if(chunk.trim())rows.push(chunk.trim());chunk=''}else chunk+=char}
 if(chunk.trim())rows.push(chunk.trim());return rows
}
export const HISTORY_ROUTINE=[
 {key:'sleep',label:'Sono',icon:'moon'},
 {key:'extraWork',label:'Trabalho complementar',details:'extraWorkDetails',icon:'activity'},
 {key:'nutrition',label:'Acompanhamento nutricional',icon:'nutrition'},
 {key:'supplements',label:'Suplementos',details:'supplementDetails',icon:'supplement'},
 {key:'psychology',label:'Acompanhamento psicológico',icon:'psychology'},
 {key:'medication',label:'Medicamentos',details:'medicationDetails',icon:'medicine'},
 {key:'alcohol',label:'Bebidas alcoólicas',icon:'glass'},
]
export function historySquadSummary(athletes,responses){
 const latest=new Map();for(const r of responses)if((r.is_current!==false)&&!latest.has(r.athlete_id))latest.set(r.athlete_id,r)
 const positions=new Map(),feet=new Map();let answered=0
 for(const athlete of athletes){const r=latest.get(athlete.id);if(!r)continue;answered++;const position=answerLabel(r.answers,'position'),foot=answerLabel(r.answers,'dominantFoot');positions.set(position,(positions.get(position)||0)+1);feet.set(foot,(feet.get(foot)||0)+1)}
 const groups=map=>[...map].map(([label,value])=>({label,value})).sort((a,b)=>b.value-a.value||a.label.localeCompare(b.label,'pt-BR'))
 return {total:athletes.length,answered,pending:athletes.length-answered,percent:athletes.length?Math.round(answered/athletes.length*100):0,positions:groups(positions),feet:groups(feet)}
}
