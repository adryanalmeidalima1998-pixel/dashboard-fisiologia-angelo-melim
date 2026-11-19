import Papa from 'papaparse'
export function normalizeName(name) {
  if (!name) return ''
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

const headerKey=value=>String(value||'').replace(/^\uFEFF/,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')
function csvNumber(value,min,max,integer=false){if(value==null||String(value).trim()==='')return null;const text=String(value).trim().replace(',','.');if(!/^[+-]?\d+(?:\.\d+)?$/.test(text))return null;const n=Number(text);return Number.isFinite(n)&&n>=min&&n<=max&&(!integer||Number.isInteger(n))?n:null}
function googleTimestamp(value){
 const text=String(value||'').trim(),m=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/)
 if(!m)return null
 const [,d,mo,y,h,mi,se='00']=m,iso=`${y}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`,check=new Date(iso+'T12:00:00Z')
 if(check.getUTCFullYear()!==Number(y)||check.getUTCMonth()+1!==Number(mo)||check.getUTCDate()!==Number(d)||Number(h)>23||Number(mi)>59||Number(se)>59)return null
 return {date:iso,timestamp:new Date(`${iso}T${h.padStart(2,'0')}:${mi}:${se}-03:00`)}
}
export function parseWellnessCSV(csvText,{scaleMode='legacy-mixed'}={}){
 const parsed=Papa.parse(String(csvText).replace(/^\uFEFF/,''),{header:true,skipEmptyLines:'greedy',transformHeader:h=>h.trim()}),headers=parsed.meta.fields||[],known=new Map(headers.map(h=>[headerKey(h),h]))
 for(const h of ['Carimbo de data/hora','Atleta:','Atividade:'])if(!known.has(headerKey(h)))throw new Error(`Coluna de bem-estar ausente: ${h}. Confira o CSV publicado.`)
 if(parsed.errors.some(e=>e.type==='Quotes'||e.code==='TooManyFields'))throw new Error('O CSV de bem-estar contém linhas inválidas.')
 const records=[],warnings=[],hasWeightField=headers.some(h=>['peso','pesokg','pesocorporal','pesocorporalkg'].includes(headerKey(h)));let invalidRows=0,incompleteRows=0
 for(const row of parsed.data){
  const get=(...keys)=>{for(const key of keys){const h=known.get(headerKey(key));if(h!==undefined)return row[h]}return ''},stamp=googleTimestamp(get('Carimbo de data/hora')),playerName=String(get('Atleta:')).trim(),activity=headerKey(get('Atividade:')),type=activity.startsWith('pre')?'pre':activity.startsWith('pos')?'post':null
  if(!stamp||!playerName||!type){invalidRows++;continue}
  const rawScores=Object.fromEntries([['fadiga','Fadiga'],['sono','Qualidade do Sono'],['doms','Dor Muscular Geral'],['estresse','Nível de Estresse'],['humor','Humor']].map(([key,h])=>[key,type==='pre'?csvNumber(get(h),1,5,true):null]))
  const favorable=scaleMode==='favorable-1-5',scores={...rawScores}
  if(favorable)for(const key of ['fadiga','doms','estresse'])scores[key]=rawScores[key]==null?null:6-rawScores[key]
  const favorableScores=[scores.fadiga==null?null:6-scores.fadiga,scores.sono,scores.doms==null?null:6-scores.doms,scores.estresse==null?null:6-scores.estresse,scores.humor].filter(Number.isFinite)
  const wellnessScore=type==='pre'&&favorableScores.length&&(favorableScores.length===5||!favorable)?favorableScores.reduce((a,b)=>a+b,0)/favorableScores.length:null
  if(type==='pre'&&favorableScores.length!==5)incompleteRows++
  const srpe=type==='post'?csvNumber(get('Percepção Subjetiva de Esforço:'),0,10,true):null,duracaoSessao=type==='post'?csvNumber(get('Tempo da Sessão em minutos (somente números)'),1,1440):null
  if(type==='post'&&(srpe==null||duracaoSessao==null))incompleteRows++
  const pain=headerKey(get('Está sentindo dor localizada em um dos pontos acima?')),temDor=type==='pre'?(pain==='sim'?true:pain==='nao'?false:null):null
  records.push({...stamp,playerName,_normalizedName:normalizeName(playerName),type,...scores,rawScores,corUrina:type==='pre'?csvNumber(get('Cor da Urina'),1,8,true):null,temDor,dorLocalizada:temDor?String(get('Dor Localizada:')).trim():'',srpe,duracaoSessao,srpeLoad:srpe!==null&&duracaoSessao!==null?srpe*duracaoSessao:null,source:'google',sessionSlot:csvNumber(get('Atividade do dia','Número da atividade'),1,3,true)||1,weightKg:csvNumber(get('Peso (kg)','Peso','Peso corporal','Peso corporal (kg)'),20,250),wellnessScore,scaleMode})
 }
 if(invalidRows)warnings.push(`${invalidRows} resposta(s) com data, atleta ou atividade inválida não entraram nos indicadores.`)
 if(incompleteRows)warnings.push(`${incompleteRows} resposta(s) incompleta(s): indicadores sem medição ficaram em branco.`)
 if(parsed.data.length&&!records.length)throw new Error('Nenhuma resposta válida encontrada no CSV. Os últimos dados sincronizados foram mantidos.')
 return {records,warnings,hasWeightField,invalidRows,incompleteRows}
}
export function parseBemEstarCSV(csvText,options){return parseWellnessCSV(csvText,options).records}
export function latestWellnessRecords(records){
 const latest=new Map();for(const row of records){const key=keyOf(row),previous=latest.get(key);if(!previous||new Date(row.timestamp)>=new Date(previous.timestamp))latest.set(key,row)}return [...latest.values()].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp))
}
export function mergeGoogleWellness(google,other){const current=latestWellnessRecords(google),keys=new Set(current.map(keyOf));return latestWellnessRecords([...other.filter(r=>!keys.has(keyOf(r))),...current])}


function keyOf(row){return `${normalizeName(row.playerName)}|${row.date}|${row.type}|${row.sessionSlot||1}`}
export function mergeWellnessRecords(legacy,native){const keys=new Set(native.map(keyOf)),seen=new Set();return [...legacy.filter(row=>{if(keys.has(keyOf(row)))return false;const key=`${keyOf(row)}|${new Date(row.timestamp).toISOString()}`;if(seen.has(key))return false;seen.add(key);return true}),...native].sort((a,b)=>new Date(a.timestamp)-new Date(b.timestamp))}
