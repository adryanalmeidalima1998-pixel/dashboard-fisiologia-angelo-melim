export const PAIN_REGIONS=[['1','Anterior da coxa direita'],['2','Anterior da coxa esquerda'],['3','Adutor da coxa direita'],['4','Adutor da coxa esquerda'],['5','Tibial anterior direito'],['6','Tibial anterior esquerdo'],['7','Posterior da coxa direita'],['8','Posterior da coxa esquerda'],['9','Panturrilha direita'],['10','Panturrilha esquerda'],['11','Glúteo esquerdo'],['12','Glúteo direito'],['13','Flexores do quadril direito'],['14','Flexores do quadril esquerdo'],['15','Peitoral direito'],['16','Peitoral esquerdo'],['17','Dorso esquerdo'],['18','Dorso direito'],['19','Bíceps direito'],['20','Bíceps esquerdo'],['21','Tríceps esquerdo'],['22','Tríceps direito'],['A','Abdome'],['B','Joelho anterior direito'],['C','Joelho anterior esquerdo'],['D','Tornozelo direito'],['E','Tornozelo esquerdo'],['F','Lombar'],['G','Joelho posterior esquerdo'],['H','Joelho posterior direito'],['I','Tendão calcâneo esquerdo'],['J','Tendão calcâneo direito'],['L','Deltoide direito'],['M','Deltoide esquerdo'],['N','Punho direito'],['O','Punho esquerdo'],['P','Cervical'],['Q','Cotovelo esquerdo'],['R','Cotovelo direito']]
export const READINESS=[
 {key:'fadiga',label:'Fadiga',options:['Sempre cansado','Mais cansado que o normal','Normal','Descansado','Muito descansado']},
 {key:'sono',label:'Qualidade do sono',options:['Insônia','Sono inquieto','Dificuldade para adormecer','Bom','Muito tranquilo']},
 {key:'doms',label:'Dor muscular geral',options:['Muito dolorido','Aumento das dores musculares','Normal','Sentindo-me bem','Sentindo-me ótimo']},
 {key:'estresse',label:'Nível de estresse',options:['Altamente estressado','Sentindo-me estressado','Normal','Relaxado','Muito relaxado']},
 {key:'humor',label:'Humor',options:['Muito aborrecido, irritado ou triste','Menos interessado que o normal','Normal','Bom humor em geral','Muito bom humor']},
]
export function collectionDate(now=new Date()) {const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now),p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`}
export class CollectionError extends Error {constructor(message,status=400){super(message);this.status=status}}
function number(value,label,min,max,integer=false){if(value==null||String(value).trim()==='')throw new CollectionError(`Preencha ${label}.`);const n=Number(String(value).trim().replace(',','.'));if(!Number.isFinite(n)||n<min||n>max||(integer&&!Number.isInteger(n)))throw new CollectionError(`Confira ${label}: use um valor entre ${min} e ${max}.`);return n}
export function validateCollection(body,today=collectionDate()){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new CollectionError('Resposta inválida.')
 if(typeof body.submissionId!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.submissionId))throw new CollectionError('Reabra o formulário e tente novamente.')
 if(body.date!==today)throw new CollectionError('A data mudou. Reabra o formulário para responder a coleta de hoje.')
 if(!['pre','post'].includes(body.type))throw new CollectionError('Selecione pré ou pós-atividade.')
 const p={submissionId:body.submissionId,date:today,type:body.type,athleteId:number(body.athleteId,'o atleta',1,2147483647,true),sessionSlot:number(body.sessionSlot??1,'a atividade',1,3,true)}
 p.weightKg=body.weightKg!=null&&String(body.weightKg).trim()!==''?Math.round(number(body.weightKg,'o peso em kg',20,250)*100)/100:null
 if(p.type==='pre'){
  if(p.weightKg===null)throw new CollectionError('Informe o peso antes da atividade.')
  for(const item of READINESS)p[item.key]=number(body[item.key],item.label.toLowerCase(),1,5,true)
  p.corUrina=number(body.corUrina,'a cor da urina',1,8,true)
  if(typeof body.temDor!=='boolean')throw new CollectionError('Informe se está sentindo dor localizada.')
  p.temDor=body.temDor
  if(!Array.isArray(body.dorRegioes)||body.dorRegioes.length>PAIN_REGIONS.length)throw new CollectionError('Confira os locais de dor.')
  const known=new Set(PAIN_REGIONS.map(([id])=>id));if(body.dorRegioes.some(id=>typeof id!=='string'||!known.has(id)))throw new CollectionError('Local de dor inválido.')
  p.dorRegioes=[...new Set(body.dorRegioes)]
  if(p.temDor&&!p.dorRegioes.length)throw new CollectionError('Marque pelo menos um local de dor.')
  if(!p.temDor&&p.dorRegioes.length)throw new CollectionError('Desmarque os locais de dor ou selecione Sim.')
 }else{p.srpe=number(body.srpe,'a percepção de esforço',0,10,true);p.duracaoSessao=number(body.duracaoSessao,'o tempo da sessão em minutos',1,360,true)}
 return p
}
export function collectionToRecord(row){const p=typeof row.response==='string'?JSON.parse(row.response):row.response,pre=p.type==='pre';return{id:`native:${row.id}`,source:'internal',timestamp:new Date(row.created_at).toISOString(),date:p.date,playerName:row.athlete_name,type:p.type,sessionSlot:p.sessionSlot,weightKg:p.weightKg,
 // Athlete scale 5=best; the existing dashboard stores severity for fatigue, soreness and stress.
 fadiga:pre?6-p.fadiga:null,sono:pre?p.sono:null,doms:pre?6-p.doms:null,estresse:pre?6-p.estresse:null,humor:pre?p.humor:null,corUrina:pre?p.corUrina:null,temDor:pre?p.temDor:false,dorLocalizada:pre?p.dorRegioes.map(code=>`${code} - ${PAIN_REGIONS.find(([id])=>id===code)[1]}`).join(', '):'',srpe:pre?null:p.srpe,duracaoSessao:pre?null:p.duracaoSessao,srpeLoad:pre?null:p.srpe*p.duracaoSessao,wellnessScore:pre?(p.fadiga+p.sono+p.doms+p.estresse+p.humor)/5:null}}
