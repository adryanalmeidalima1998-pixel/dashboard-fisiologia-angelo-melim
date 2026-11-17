import Papa from 'papaparse'
export const historyNameKey = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
const columns = [
  ['timestamp','carimbo de data hora'],['athleteName','nome completo'],['birthDate','data de nascimento'],['origin','cidade estado de origem'],['heightCm','altura'],['weightKg','peso'],['position','posicao que atua'],['dominantFoot','pe dominante'],
  ['clubs','quais clubes voce ja defendeu'],['officialCompetition','participou de alguma competicao oficial'],['gamesSixMonths','numero aproximado de jogos'],['minutesSixMonths','numero aproximado de minutos'],
  ['significantInjury','ja sofreu alguma lesao'],['injuryDetails','se a resposta acima foi sim descreva quais lesao'],['surgery','ja passou por cirurgia'],['surgeryDetails','caso tenha passado por cirug'],
  ['extraWork','realiza algum trabalho fisico complementar'],['extraWorkDetails','caso a resposta acima seja sim descreva qual trabalho'],['sleep','costuma dormir quantas horas'],['alcohol','faz uso de beb'],['nutrition','possui acompanhamento nutricional'],['supplements','utiliza alguns suple'],['supplementDetails','caso utilize algum suplemento'],['psychology','possui acompanhamento psicologico'],['medication','utiliza algum tipo medicamento'],
]
export function validHistoryGoogleUrl(value) {
  try { const url=new URL(value);return url.protocol==='https:'&&url.hostname==='docs.google.com'&&!url.port&&!url.username&&!url.password&&/^\/spreadsheets\/d\/e\/[A-Za-z0-9_-]+\/pub$/.test(url.pathname)&&url.searchParams.get('output')==='csv' } catch {return false}
}
export function googleHistoryDate(value, timestamp=false) {
  const text=String(value||'').trim(),match=text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/)
  if(!match)return null
  const [,d,m,y,h='00',min='00',s='00']=match,day=`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`
  const parsed=new Date(day+'T00:00:00Z')
  if(!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==day||Number(h)>23||Number(min)>59||Number(s)>59)return null
  return timestamp?`${day}T${h.padStart(2,'0')}:${min}:${s}-03:00`:day
}
function measurement(value,kind) {
  const raw=String(value||'').trim(),match=raw.match(/^(\d+(?:[.,]\d+)?)\s*(kg|kgs|quilo(?:s)?|cm|m|metros?|centimetros?)?\s*$/i)
  if(!match)return raw||null
  let number=Number(match[1].replace(',','.'))
  if(kind==='height'&&number<3)number*=100
  const min=kind==='height'?100:20,max=250
  return number>=min&&number<=max?Math.round(number*100)/100:raw
}
function choice(value) {
  const raw=String(value||'').trim(),key=historyNameKey(raw)
  if(key==='sim')return 'Sim'
  if(['nao','nenhum','nenhuma','nao uso','nao utilizo','nao faz uso'].includes(key))return 'Não'
  return raw||null
}
const positions={'goleiro':'GK','lateral direito':'LD','lateral esquerdo':'LE','zagueiro':'ZAG','meio campista defensivo':'VOL','meio campista ofensivo':'MEI','atacante':'ATA','extremo':'EXT'}
export function parseHistoryCsv(csv) {
  if(typeof csv!=='string'||csv.length>2000000||csv.trimStart().startsWith('<'))throw new Error('A fonte não retornou um CSV válido de histórico de atletas.')
  const parsed=Papa.parse(csv.replace(/^\uFEFF/,''),{skipEmptyLines:'greedy'})
  if(parsed.errors.length)throw new Error('O CSV do histórico contém linhas inválidas. A última sincronização foi preservada.')
  const [headers,...rows]=parsed.data,fields={}
  if(!headers?.length)throw new Error('A planilha está vazia.')
  const keys=headers.map(historyNameKey)
  for(const [key,prefix]of columns){const index=keys.findIndex(h=>h===prefix||h.startsWith(prefix));if(index>=0)fields[key]=index}
  if(fields.surgeryDetails==null)fields.surgeryDetails=keys.findIndex(h=>h.startsWith('caso tenha passado por cirurg'))
  const required=columns.map(([key])=>key)
  if(required.some(key=>fields[key]==null||fields[key]<0))throw new Error('As colunas da planilha não correspondem ao questionário de histórico de atletas.')
  const records=[],issues=[]
  for(let i=0;i<rows.length;i++){
    const row=rows[i]
    if(row.length!==headers.length){issues.push({row:i+2,reason:'Quantidade de colunas inválida'});continue}
    const value=key=>String(row[fields[key]]??'').trim(),name=value('athleteName'),at=googleHistoryDate(value('timestamp'),true)
    if(!name||!at){issues.push({row:i+2,reason:'Nome ou data de resposta inválidos'});continue}
    const answers={_source:'google',birthDate:googleHistoryDate(value('birthDate'))||value('birthDate')||null,origin:value('origin')||null,heightCm:measurement(value('heightCm'),'height'),weightKg:measurement(value('weightKg'),'weight'),position:positions[historyNameKey(value('position'))]||value('position')||null,dominantFoot:({'destro':'Destro','canhoto':'Canhoto'})[historyNameKey(value('dominantFoot'))]||value('dominantFoot')||null,notes:''}
    for(const key of['clubs','injuryDetails','surgeryDetails','extraWorkDetails','supplementDetails','sleep'])answers[key]=value(key)||null
    for(const key of['officialCompetition','significantInjury','surgery','extraWork','alcohol','nutrition','supplements','psychology','medication'])answers[key]=choice(value(key))
    for(const key of['gamesSixMonths','minutesSixMonths'])answers[key]=/^\d+$/.test(value(key))?Number(value(key)):value(key)||null
    answers.medicationDetails=null
    answers._warnings=[]
    for(const [key,label] of [['heightCm','Altura'],['weightKg','Peso']])if(answers[key]!=null&&typeof answers[key]!=='number')answers._warnings.push(`${label}: confira o valor original “${answers[key]}” na planilha.`)
    records.push({athleteName:name,createdAt:at,answers,raw:Object.fromEntries(headers.map((header,j)=>[header,String(row[j]??'')]))})
  }
  return {records,issues,totalRows:rows.length}
}
export function matchHistoryAthlete(name,athletes) {
  const matches=athletes.filter(a=>historyNameKey(a.name)===historyNameKey(name))
  return matches.length===1?matches[0]:null
}
