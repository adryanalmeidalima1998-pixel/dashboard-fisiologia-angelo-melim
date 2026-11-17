import {jsPDF} from 'jspdf'
import {answerLabel,historyAge,recentParticipation,historyClubs,HISTORY_ROUTINE,historySquadSummary} from './athlete-history-view.mjs'
export const historyDateLabel=value=>new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'})
const INK=[28,45,61],MUTED=[124,139,156],LINE=[226,232,239],SOFT=[246,248,250],BLUE=[59,86,109]
const initials=name=>String(name||'').split(' ').filter(Boolean).slice(0,2).map(p=>p[0]).join('').toUpperCase()
const clean=value=>String(value??'').replace(/[\u2010-\u2015]/g,'-').replace(/\u00a0/g,' ')
export function buildHistoryPdf({season,athletes,responses,individual=false,photos={},fonts,assets={},generatedAt=new Date()}){
 const doc=new jsPDF({unit:'mm',format:'a4',compress:true}),W=180,LEFT=15,BOTTOM=275
 let y=0,activeName='',sectionName=''
 if(fonts?.regular&&fonts?.bold){doc.addFileToVFS('Dashboard-Regular.ttf',fonts.regular);doc.addFont('Dashboard-Regular.ttf','Dashboard','normal');doc.addFileToVFS('Dashboard-Bold.ttf',fonts.bold);doc.addFont('Dashboard-Bold.ttf','Dashboard','bold')}
 const family=fonts?.regular?'Dashboard':'helvetica'
 doc.setProperties({title:individual?`Histórico de atleta - ${athletes[0]?.name}`:'Histórico do elenco',author:'Ângelo Melim',subject:`${season.shortName} ${season.year}`})
 function font(size=10,bold=false,color=INK){doc.setFont(family,bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color)}
 function text(value,x,top,size=10,bold=false,color=INK,options){font(size,bold,color);doc.text(Array.isArray(value)?value.map(clean):clean(value),x,top,options)}
 function wrap(value,width,size=10,bold=false){font(size,bold);return doc.splitTextToSize(clean(value),width)}
 function panel(x,top,width,height,fill=[255,255,255]){doc.setFillColor(...fill);doc.setDrawColor(...LINE);doc.setLineWidth(.2);doc.roundedRect(x,top,width,height,3,3,'FD')}
 function image(data,x,top,width,height,alias){if(data){try{doc.addImage(data,data.startsWith('data:image/jpeg')?'JPEG':'PNG',x,top,width,height,alias, 'FAST')}catch{}}}
 function page(section,continuation=false){if(doc.getNumberOfPages()>1||y>0)doc.addPage();sectionName=section;doc.setFillColor(...INK);doc.rect(0,0,210,2.5,'F');image(assets.club,15,5.5,7,8.5,'club-logo');text(`${season.shortName}  /  ${season.year}`,assets.club?25:15,12,8,true,BLUE);text('ÂNGELO MELIM',195,12,7,true,MUTED,{align:'right'});doc.setDrawColor(...LINE);doc.line(15,16,195,16);y=27;if(continuation){text(activeName||'Histórico do elenco',15,y,15,true);y+=8;text(section,15,y,8,false,MUTED);y+=12}}
 function ensure(height){if(y+height>BOTTOM)page(sectionName,true)}
 function section(title,subtitle){ensure(20);text(title,15,y,13,true);y+=6;if(subtitle){text(subtitle,15,y,8,false,MUTED);y+=6}y+=5}
 function photo(athlete,x,top,size){panel(x,top,size,size,SOFT);const data=photos[athlete.name]||photos[athlete.id];if(data){doc.saveGraphicsState();doc.roundedRect(x+1,top+1,size-2,size-2,2.5,2.5,null);doc.clip();doc.discardPath();image(data,x+1,top+1,size-2,size-2,`athlete-${athlete.id}`);doc.restoreGraphicsState()}else{text(initials(athlete.name),x+size/2,top+size*.58,size>30?23:10,true,[162,175,189],{align:'center'})}}
 function metricRow(items){const gap=4,width=(W-gap*(items.length-1))/items.length,prepared=items.map(item=>({...item,lines:wrap(item.value,width-10,13,true)})),height=Math.max(27,...prepared.map(item=>14+item.lines.length*5.5+(item.note?6:0)));if(height>220){for(const item of items)flowCard(item.label,[item.value,item.note].filter(Boolean).join('\n'));return}ensure(height);prepared.forEach((item,i)=>{const x=15+i*(width+gap);panel(x,y,width,height);text(item.label,x+5,y+7,7,false,MUTED);text(item.lines,x+5,y+16,13,true,INK,{lineHeightFactor:1.1});if(item.note)text(item.note,x+5,y+18+item.lines.length*5.5,6.5,false,MUTED)});y+=height+8}
 function flowCard(title,body){let lines=wrap(body||'Não informado',W-12,9),first=true;while(lines.length){if(BOTTOM-y<28)page(sectionName,true);const count=Math.max(1,Math.floor((BOTTOM-y-18)/4.5)),chunk=lines.splice(0,count),height=18+chunk.length*4.5;panel(15,y,W,height);text(first?title:`${title} (continuação)`,21,y+8,8,true,BLUE);font(9);doc.text(chunk,21,y+16,{lineHeightFactor:1.42});y+=height+7;first=false;if(lines.length)page(sectionName,true)}}
 function cardGrid(items,columns=3){const gap=5,width=(W-gap*(columns-1))/columns
  for(let start=0;start<items.length;start+=columns){const row=items.slice(start,start+columns).map(item=>({...item,titleLines:wrap(item.title,width-12,7),valueLines:wrap(item.value||'Não informado',width-12,12,true),detailLines:item.detail?wrap(item.detail,width-12,8):[]}));const height=Math.max(38,...row.map(item=>13+item.titleLines.length*3.4+item.valueLines.length*5.2+(item.detailLines.length?5+item.detailLines.length*4:0)))
   if(height>220){for(const item of row)flowCard(item.title,[item.value,item.detail].filter(Boolean).join('\n'));continue}
   ensure(height);row.forEach((item,index)=>{const x=15+index*(width+gap);panel(x,y,width,height);text(item.titleLines,x+6,y+8,7,false,MUTED,{lineHeightFactor:1.35});const valueY=y+12+item.titleLines.length*3.4;text(item.valueLines,x+6,valueY,12,true,INK,{lineHeightFactor:1.2});if(item.detailLines.length)text(item.detailLines,x+6,valueY+item.valueLines.length*5.2+4,8,false,BLUE,{lineHeightFactor:1.4})});y+=height+6
  }
 }
 function athleteReport(athlete,response){const a=response.answers||{},age=historyAge(a.birthDate,generatedAt),recent=recentParticipation(a);activeName=athlete.name;page('Perfil esportivo')
  text('HISTÓRICO INDIVIDUAL',15,y,8,true,MUTED);y+=8
  const heroY=y,nameLines=wrap(athlete.name,118,23,true),heroHeight=Math.max(57,26+nameLines.length*9);panel(15,heroY,W,heroHeight)
  photo(athlete,21,heroY+7,39);text(photos[athlete.name]||photos[athlete.id]?'Foto do atleta':'Foto não cadastrada',40.5,heroY+51,6,false,MUTED,{align:'center'})
  text(answerLabel(a,'position').toUpperCase(),68,heroY+12,7.5,true,BLUE);text(nameLines,68,heroY+23,23,true,INK,{lineHeightFactor:1.1});const identityY=heroY+27+nameLines.length*8.5;text(wrap(answerLabel(a,'origin'),118,8),68,identityY,8,false,MUTED);y=heroY+heroHeight+9
  metricRow([{label:'IDADE',value:age==null?'Não informado':`${age} anos`,note:answerLabel(a,'birthDate')},{label:'ALTURA',value:typeof a.heightCm==='number'?`${(a.heightCm/100).toLocaleString('pt-BR',{minimumFractionDigits:2})} m`:answerLabel(a,'heightCm')},{label:'PESO INFORMADO',value:typeof a.weightKg==='number'?`${a.weightKg.toLocaleString('pt-BR')} kg`:answerLabel(a,'weightKg')},{label:'PÉ DOMINANTE',value:answerLabel(a,'dominantFoot')}])
  section('Participação recente','Valores aproximados informados pelo atleta - últimos 6 meses')
  metricRow([{label:'JOGOS DISPUTADOS',value:answerLabel(a,'gamesSixMonths')},{label:'MINUTOS JOGADOS',value:answerLabel(a,'minutesSixMonths')},{label:'MINUTOS POR JOGO',value:recent.average==null?'Não disponível':recent.average.toLocaleString('pt-BR'),note:'Minutos divididos pelos jogos'}])
  text(`Competição oficial nos últimos 12 meses: ${answerLabel(a,'officialCompetition')}`,15,y,8,false,BLUE);y+=13
  section('Clubes e experiência','Clubes, categorias e anos declarados no questionário')
  const clubs=historyClubs(a.clubs);flowCard('CLUBES INFORMADOS',clubs.length?clubs.map((club,i)=>`${String(i+1).padStart(2,'0')}   ${club}`).join('\n'):'Não informado')
  activeName=athlete.name;page('Histórico e rotina');text(athlete.name,15,y,16,true);y+=8;text('Histórico e rotina',15,y,9,false,MUTED);y+=13
  section('Lesões e cirurgias','Histórico declarado pelo atleta')
  cardGrid([{title:'Lesão muscular ou óssea significativa',value:answerLabel(a,'significantInjury'),detail:a.injuryDetails},{title:'Cirurgia anterior',value:answerLabel(a,'surgery'),detail:a.surgeryDetails}],2)
  y+=3;section('Rotina e acompanhamento')
  cardGrid(HISTORY_ROUTINE.map(item=>({title:item.label,value:answerLabel(a,item.key),detail:item.details?a[item.details]:null})),3)
  if(a.notes){y+=3;flowCard('Observações adicionais',a.notes)}
  if(a._warnings?.length){y+=3;flowCard('Informações para conferir',a._warnings.join('\n'))}
  ensure(18);text(`Resposta: ${historyDateLabel(response.created_at)} - ${response.source==='google'?'Google Formulários':'Formulário interno'}${response.is_current===false?' - versão anterior':''}`,15,y+4,7,false,MUTED);text('Informações autodeclaradas. Registros de lesões da comissão permanecem separados.',15,y+9,6.5,false,MUTED)
 }
 if(!individual){activeName='Histórico do elenco';page('Visão geral');text('HISTÓRICO DE ATLETAS',15,y,8,true,MUTED);y+=11;text('Visão do elenco',15,y,27,true);y+=10;text(`${season.shortName} - Temporada ${season.year}`,15,y,10,false,BLUE);image(assets.club,177,23,18,22,'club-logo');y+=14
  const summary=historySquadSummary(athletes,responses);metricRow([{label:'ATLETAS NO ELENCO',value:String(summary.total)},{label:'QUESTIONÁRIOS RECEBIDOS',value:String(summary.answered),note:`${summary.percent}% do elenco`},{label:'AGUARDANDO RESPOSTA',value:String(summary.pending)}]);section('Distribuição dos questionários','Base: atletas com resposta disponível nesta temporada')
  const chartTop=y,chartHeight=Math.max(68,summary.positions.length*9+21);ensure(chartHeight);panel(15,y,110,chartHeight);panel(130,y,65,chartHeight);text('POSIÇÕES INFORMADAS',21,y+9,7,true,BLUE);text('PÉ DOMINANTE',136,y+9,7,true,BLUE)
  summary.positions.forEach((item,i)=>{const top=chartTop+19+i*9;const label=wrap(item.label,47,6.7);text(label,21,top,6.7,false,MUTED,{lineHeightFactor:1.1});doc.setFillColor(237,241,246);doc.roundedRect(73,top-2,37,2.7,1,1,'F');doc.setFillColor(...BLUE);doc.roundedRect(73,top-2,37*item.value/Math.max(1,...summary.positions.map(p=>p.value)),2.7,1,1,'F');text(item.value,118,top,7,true,BLUE,{align:'right'})})
  summary.feet.forEach((item,i)=>{text(item.value,136,chartTop+22+i*17,17,true,BLUE);text(item.label,150,chartTop+22+i*17,7,false,MUTED)});y=chartTop+chartHeight+12
  section('Situação dos atletas')
  const gap=5,cardWidth=(W-gap)/2;for(let i=0;i<athletes.length;i+=2){ensure(24);athletes.slice(i,i+2).forEach((athlete,j)=>{const x=15+j*(cardWidth+gap),response=responses.find(r=>r.athlete_id===athlete.id);panel(x,y,cardWidth,22);photo(athlete,x+3,y+3,16);const name=wrap(athlete.name,cardWidth-26,7.5,true);text(name.slice(0,2),x+23,y+7,7.5,true,INK,{lineHeightFactor:1.25});text(response?'Respondido':'Pendente',x+23,y+18,6.5,false,response?BLUE:MUTED)});y+=26}
 }
 for(const athlete of athletes){const response=responses.find(r=>r.athlete_id===athlete.id);if(response)athleteReport(athlete,response)}
 const pages=doc.getNumberOfPages();for(let number=1;number<=pages;number++){doc.setPage(number);doc.setDrawColor(...LINE);doc.line(15,281,195,281);text('Ângelo Melim',15,286,7,true,BLUE);text(`${season.shortName} - ${season.year}  |  ${generatedAt.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})}`,15,291,6,false,MUTED);image(assets.brand,144,283,12,8,'athraven-brand');text('Powered by ATHRAVEN',159,286,6,true,BLUE);text(`Licenciado a Ângelo Melim  |  ${number} / ${pages}`,159,291,5.1,false,MUTED)}
 return doc
}
async function imageForPdf(source){
 if(!source)return null
 if(source.startsWith('data:image/jpeg'))return source
 if(!source.startsWith('/')&&!source.startsWith('data:image/'))return null
 return new Promise(resolve=>{const image=new Image();image.onload=()=>{const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;canvas.getContext('2d').drawImage(image,0,0);resolve(canvas.toDataURL('image/png'))};image.onerror=()=>resolve(null);image.src=source})
}
async function pdfFont(path){const r=await fetch(path);if(!r.ok)throw new Error('Não foi possível carregar a fonte do relatório.');const bytes=new Uint8Array(await r.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(binary)}
export async function downloadHistoryPdf(options){
 const [regular,bold,club,brand,photoEntries]=await Promise.all([pdfFont('/fonts/dashboard-sans.ttf'),pdfFont('/fonts/dashboard-sans-bold.ttf'),imageForPdf(options.season.logo),imageForPdf('/brand/athraven-symbol-transparent.webp'),Promise.all(Object.entries(options.photoSources||{}).map(async([name,source])=>[name,await imageForPdf(source)]))])
 const doc=buildHistoryPdf({...options,fonts:{regular,bold},photos:Object.fromEntries(photoEntries),assets:{club,brand}})
 const name=options.individual?options.athletes[0].name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase():'elenco'
 doc.save(`historico-${name}-${options.season.year}.pdf`)
}
