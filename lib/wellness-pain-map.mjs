// Positions use the athlete's right/left, not the reader's. Both views use
// the same 100 × 200 coordinate system as the original vector below.
import {PAIN_REGIONS} from './collection-rules.mjs'
const points={}
function pair(view,right,left,leftX,y){
 const rightX=view==='front'?leftX:100-leftX
 points[right]={view,x:rightX,y}; points[left]={view,x:100-rightX,y}
}
pair('front','1','2',38,118); pair('front','3','4',45,107)
pair('front','5','6',39,165); pair('back','7','8',39,116)
pair('back','9','10',39,159); pair('back','12','11',40,93)
pair('front','13','14',38,90); pair('front','15','16',40,46)
pair('back','18','17',39,48); pair('front','19','20',24,58)
pair('back','22','21',24,58); pair('front','B','C',39,141)
pair('front','D','E',40,185); pair('back','H','G',39,141)
pair('back','J','I',40,181); pair('front','L','M',28,40)
pair('front','N','O',14,90); pair('back','R','Q',21,69)
points.A={view:'front',x:50,y:75};points.F={view:'back',x:50,y:76};points.P={view:'back',x:50,y:27}
export const mapRegions=new Map(PAIN_REGIONS.map(([code,label])=>[code,{code,label,...points[code]}]))
const key=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(direita|esquerda)\b/g,m=>m.slice(0,-1)+'o').replace(/\b(d[aeo])\b/g,' ').replace(/\s+/g,' ').trim()
const labels=new Map([...mapRegions.values()].map(r=>[key(r.label),r]))
function regionOf(token){
 const m=token.match(/^(\d{1,2}|[a-r])(?:\s*[-–—:.)]\s*(.*))?$/i)
 if(!m)return labels.get(key(token))
 const region=mapRegions.get(m[1].toUpperCase())
 if(!region||!m[2])return region
 // An explicit conflicting label/side is never plotted from its code alone.
 const label=key(m[2]),expected=key(region.label)
 return label===expected?region:undefined
}
export function collectPainMap(rows){
 const sites=new Map(),unknown=new Map()
 for(const row of rows){
  if(row.type!=='pre'||row.temDor!==true)continue
  const seen=new Set()
  const raw=String(row.dorLocalizada??'').trim()
  const tokens=raw.split(/[,;\n|]+/).map(t=>t.trim()).filter(t=>t&&!/^(?:0\s*[-–:]?\s*)?(?:sem dor|nenhum[a]?)$|^0$/i.test(t))
  for(const token of tokens.length?tokens:[raw?'0 - Sem dor (marcação conflitante)':'Local não informado']){
   const region=regionOf(token),id=region?region.code:'?'+token.toLocaleLowerCase('pt-BR'),dest=region?sites:unknown
   if(seen.has(id))continue
   seen.add(id)
   const entry=dest.get(id)||{...(region||{label:token}),count:0}
   entry.count++;dest.set(id,entry)
  }
 }
 return {sites:[...sites.values()].sort((a,b)=>b.count-a.count||a.code.localeCompare(b.code,'pt-BR',{numeric:true})),unknown:[...unknown.values()]}
}
