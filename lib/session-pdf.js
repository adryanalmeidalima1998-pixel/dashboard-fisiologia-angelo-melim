import {jsPDF} from 'jspdf'
import {GPS_EXPORT_NOTE} from './gps-data.mjs'
import {loadPdfAssets} from './pdf-assets.js'
export const SESSION_PDF_METRICS=[
 {key:'totalDistance',label:'Distância',unit:'m',dec:0},
 {key:'distanceRelative',label:'Intensidade',unit:'m/min',dec:1},
 {key:'hsr',label:'HSR',unit:'m',dec:0},
 {key:'sprintDistance',label:'Sprint',unit:'m',dec:0},
 {key:'sprintCount',label:'Sprints',unit:'ações',dec:0},
 {key:'accDecel',label:'ACC + DEC',unit:'ações',dec:0},
 {key:'playerLoad',label:'Player Load',unit:'UA',dec:1},
 {key:'maxVelocity',label:'Vel. máxima',unit:'km/h',dec:1},
]
const finite=Number.isFinite,clean=value=>String(value??'').replace(/[\u2010-\u2015]/g,'-'),format=(value,dec=0)=>finite(value)?value.toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec}):'-'
const INK=[23,39,52],BLUE=[39,99,143],MUTED=[108,124,140],LINE=[222,229,236],SOFT=[245,248,250]
const mean=(rows,key)=>{const values=rows.map(r=>r[key]).filter(finite);return values.length?values.reduce((a,b)=>a+b,0)/values.length:null}
export function sessionReportModel({session,athletes,filterPosition=''}){
 const rows=(athletes||[]).filter(r=>r.playerName&&!r.isOutlier&&r.periodNumber===0).map(r=>({...r,accDecel:finite(r.acceleration)&&finite(r.deceleration)?r.acceleration+r.deceleration:null})).sort((a,b)=>a.playerName.localeCompare(b.playerName,'pt-BR')).map((r,i)=>({...r,reportNumber:String(i+1).padStart(2,'0')}))
 if(!session||!rows.length)throw new Error('Selecione uma sessão com atletas para gerar o PDF.')
 const stats=Object.fromEntries([...SESSION_PDF_METRICS.map(m=>m.key),'durationMin','vmaxPct'].map(key=>[key,mean(rows,key)])),velocities=rows.map(r=>r.maxVelocity).filter(finite)
 stats.peakVelocity=velocities.length?Math.max(...velocities):null
 const meta=session.metadata||{},type=meta.sessionType||meta.type,period=meta.sessionPeriod||meta.period
 return {session,rows,stats,filterPosition,type:type==='jogo'?'Jogo':'Treino',period:({manha:'Manhã',tarde:'Tarde',noite:'Noite'})[period]||period||'',sources:session.sourceFiles?.length?session.sourceFiles:[{filename:session.filename||session.name}],english:meta.gpsImport?.sourceFormat==='catapult-english-v1'}
}
export function buildSessionPdf({season,session,athletes,filterPosition='',photos={},fonts,assets={},generatedAt=new Date()}){
 const model=sessionReportModel({session,athletes,filterPosition}),{rows,stats}=model,doc=new jsPDF({unit:'mm',format:'a4',compress:true})
 if(fonts?.regular&&fonts?.bold){doc.addFileToVFS('Dashboard-Regular.ttf',fonts.regular);doc.addFont('Dashboard-Regular.ttf','Dashboard','normal');doc.addFileToVFS('Dashboard-Bold.ttf',fonts.bold);doc.addFont('Dashboard-Bold.ttf','Dashboard','bold')}
 const family=fonts?.regular&&fonts?.bold?'Dashboard':'helvetica'
 doc.setProperties({title:`Sessão GPS - ${session.name}`,author:'Ângelo Melim',subject:`${season.shortName} - ${session.date}`})
 function text(value,x,y,size=9,bold=false,color=INK,options){doc.setFont(family,bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(Array.isArray(value)?value.map(clean):clean(value),x,y,options)}
 function wrap(value,width,size=9,bold=false){doc.setFont(family,bold?'bold':'normal');doc.setFontSize(size);return doc.splitTextToSize(clean(value),width)}
 function fit(value,width,size=9,min=6,bold=true){let lines=wrap(value,width,size,bold);while(lines.length>2&&size>min){size-=.5;lines=wrap(value,width,size,bold)}return {lines,size}}
 function panel(x,y,w,h,fill=[255,255,255]){doc.setFillColor(...fill);doc.setDrawColor(...LINE);doc.setLineWidth(.2);doc.roundedRect(x,y,w,h,3,3,'FD')}
 function image(data,x,y,w,h,alias){if(!data)return;try{doc.addImage(data,data.startsWith('data:image/jpeg')?'JPEG':'PNG',x,y,w,h,alias,'FAST')}catch{}}
 function portrait(row,x,y,size){panel(x,y,size,size,SOFT);const data=photos[row.playerName];if(data){doc.saveGraphicsState();doc.roundedRect(x+.5,y+.5,size-1,size-1,2,2,null);doc.clip();doc.discardPath();image(data,x+.5,y+.5,size-1,size-1,`athlete-${row.reportNumber}`);doc.restoreGraphicsState()}else{text(row.playerName.split(' ').filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase(),x+size/2,y+size*.6,size*.32,true,MUTED,{align:'center'})}}
 function page(title,subtitle,first=false){if(!first)doc.addPage();doc.setFillColor(...INK);doc.rect(0,0,210,2.5,'F');image(assets.club,15,5.5,7,8.5,'club');text(`${season.shortName} / ${season.year}`,assets.club?25:15,12,8,true);text('ÂNGELO MELIM',195,12,7,true,MUTED,{align:'right'});doc.setDrawColor(...LINE);doc.line(15,17,195,17);text(title,15,29,20,true);if(subtitle)text(subtitle,15,36,8,false,MUTED)}
 function summaryCard(x,y,w,label,value,unit){panel(x,y,w,28);text(label,x+5,y+7,7,false,MUTED);text(format(value,unit==='km/h'||unit==='UA'?1:0),x+5,y+18,16,true);text(unit,x+w-5,y+23,7,false,MUTED,{align:'right'})}
 function leader(key,label,x){const sorted=rows.filter(r=>finite(r[key])&&r[key]>0).sort((a,b)=>b[key]-a[key]),row=sorted[0];panel(x,151,57.3,47);text(label,x+5,159,6.5,true,BLUE);if(!row){text('Sem valor positivo',x+5,173,9,true);return}portrait(row,x+5,163,13);const name=fit(row.playerName,30,7.5,6);text(name.lines,x+21,168,name.size,true,INK,{lineHeightFactor:1.15});text(`${format(row[key],key==='totalDistance'?0:1)} ${key==='totalDistance'?'m':key==='distanceRelative'?'m/min':'km/h'}`,x+5,189,14,true)}
 page('Relatório de sessão','GPS | Resumo da atividade e fichas dos atletas',true)
 const title=fit(session.name,170,12,8);text(title.lines,20,48,title.size,true,INK,{lineHeightFactor:1.15});text(`${session.date}  |  ${model.type}${model.period?' - '+model.period:''}  |  ${filterPosition?'Posição: '+filterPosition:'Todas as posições'}`,20,61,8,false,MUTED)
 panel(15,69,180,36,INK)
 const hero=[['ATLETAS',String(rows.length),'no recorte'],['DISTÂNCIA MÉDIA',format(stats.totalDistance),'metros por atleta'],['INTENSIDADE MÉDIA',format(stats.distanceRelative,1),'m/min por atleta']]
 hero.forEach(([label,value,note],i)=>{const x=21+i*60;text(label,x,78,6.5,true,[174,194,208]);text(value,x,91,22,true,[255,255,255]);text(note,x,99,6.5,false,[174,194,208])})
 const metrics=[['HSR médio',stats.hsr,'m'],['Sprint médio',stats.sprintDistance,'m'],['Player Load médio',stats.playerLoad,'UA'],['Maior velocidade',stats.peakVelocity,'km/h']]
 metrics.forEach(([label,value,unit],i)=>summaryCard(15+i*46,112,42,label,value,unit))
 text('Maiores valores da sessão',15,147,11,true);leader('totalDistance','DISTÂNCIA',15);leader('distanceRelative','INTENSIDADE',76.3);leader('maxVelocity','VELOCIDADE',137.7)
 panel(15,207,180,63,SOFT);text('LEITURA DO RELATÓRIO',21,216,7,true,BLUE)
 const notes=[`Duração média registrada: ${format(stats.durationMin,1)} min por atleta.`,`${model.sources.length} arquivo(s) nesta atividade. Totais calculados apenas a partir do período Session.`,model.english?GPS_EXPORT_NOTE:'HSR e sprint seguem as zonas definidas no arquivo de origem.','% Vmax nas fichas: comparação com o maior registro histórico disponível na plataforma.']
 let ny=224;for(const note of notes){const lines=wrap(note,168,7);text(lines,21,ny,7,false,MUTED,{lineHeightFactor:1.25});ny+=lines.length*3.3+2}
 const charts=[{key:'totalDistance',label:'Distância',unit:'m',dec:0},{key:'distanceRelative',label:'Intensidade',unit:'m/min',dec:1},{key:'playerLoad',label:'Player Load',unit:'UA',dec:1},{key:'hsr',label:'Alta velocidade - HSR',unit:'m',dec:0}]
 page('Comparativo da sessão','Até 8 maiores valores em cada métrica. As fichas seguintes incluem todos os atletas.')
 charts.forEach((m,index)=>{const x=15+(index%2)*93,y=44+Math.floor(index/2)*114,w=87,h=106;panel(x,y,w,h);text(m.label,x+6,y+9,11,true);text(`Média: ${format(stats[m.key],m.dec)} ${m.unit}`,x+6,y+15,7,false,MUTED);const measured=rows.filter(r=>finite(r[m.key])),ranked=[...measured].sort((a,b)=>b[m.key]-a[m.key]).slice(0,8),max=ranked[0]?.[m.key]
  if(!measured.length){text('Sem medição disponível.',x+6,y+34,8,false,MUTED);return}
  if(max===0){text('Todos os atletas com medição',x+6,y+34,8,false,MUTED);text(`registraram 0 ${m.unit}.`,x+6,y+41,8,true);return}
  ranked.forEach((r,i)=>{const top=y+25+i*9.3,words=r.playerName.split(' '),short=words.length>2?`${words[0]} ${words.at(-1)}`:r.playerName;const label=`${r.reportNumber}  ${short}`;text(label,x+6,top,7,true);text(format(r[m.key],m.dec),x+w-6,top,7,true,BLUE,{align:'right'});doc.setFillColor(...SOFT);doc.roundedRect(x+6,top+2,w-12,2,1,1,'F');const width=(w-12)*r[m.key]/max;if(width>0){doc.setFillColor(...BLUE);doc.roundedRect(x+6,top+2,width,2,Math.min(1,width/2),1,'F')}})
 });text('Identifique cada atleta pelo número da ficha individual.',15,276,7,false,MUTED)
 for(let start=0;start<rows.length;start+=6){page('Fichas dos atletas',`${session.date} | ${filterPosition||'Todas as posições'} | ${start+1}-${Math.min(start+6,rows.length)} de ${rows.length}`)
  rows.slice(start,start+6).forEach((r,i)=>{const x=15+(i%2)*93,y=44+Math.floor(i/2)*76,w=87;panel(x,y,w,70);portrait(r,x+5,y+5,14);text(r.reportNumber,x+w-5,y+8,7,true,BLUE,{align:'right'});const name=fit(r.playerName,w-30,9,6);text(name.lines,x+23,y+9,name.size,true,INK,{lineHeightFactor:1.15});text(r.position||'Posição não informada',x+23,y+23,7,false,MUTED)
   SESSION_PDF_METRICS.forEach((m,j)=>{const mx=x+5+(j%4)*20,my=y+32+Math.floor(j/4)*16;text(m.label,mx,my,5.5,false,MUTED);text(format(r[m.key],m.dec),mx,my+6,9.5,true);text(m.unit,mx,my+10,5,false,MUTED)})
   doc.setDrawColor(...LINE);doc.line(x+5,y+61,x+w-5,y+61);text(`${format(r.durationMin,1)} min`,x+5,y+66,6,false,MUTED);text(`Vmax histórica: ${finite(r.vmaxPct)?format(r.vmaxPct)+'%':'não disponível'}`,x+w-5,y+66,6,false,MUTED,{align:'right'})
  })
 }
 const count=doc.getNumberOfPages();for(let p=1;p<=count;p++){doc.setPage(p);doc.setDrawColor(...LINE);doc.line(15,281,195,281);text('Ângelo Melim',15,286,7,true);text(`${session.date} | Gerado em ${generatedAt.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})} | ${p}/${count}`,15,291,6,false,MUTED);image(assets.brand,146,283,11,8,'athraven');text('Powered by ATHRAVEN',160,286,6,true);text('Licenciado a Ângelo Melim',160,291,5.5,false,MUTED)}
 return doc
}
export function sessionPdfFilename(session){const name=String(session.name||'sessao').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').toLowerCase().replace(/^-|-$/g,'');return `sessao-gps-${String(session.date||'').replaceAll('/','-')}-${name}.pdf`}
export async function downloadSessionPdf(options){const assets=await loadPdfAssets(options.season,options.photoSources);const doc=buildSessionPdf({...options,...assets});doc.save(sessionPdfFilename(options.session));return doc}
