import {jsPDF} from 'jspdf'
import {loadPdfAssets} from './pdf-assets.js'
import {wellnessReportModel} from './wellness-report.mjs'
const INK=[23,39,52],BLUE=[39,99,143],MUTED=[108,124,140],LINE=[222,229,236],SOFT=[245,248,250]
const fmt=(v,d=1)=>Number.isFinite(v)?v.toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}):'-',date=v=>String(v||'').split('-').reverse().join('/'),clean=v=>String(v??'').replace(/[\u2010-\u2015]/g,'-')
export function buildWellnessPdf({season,records,from,to,subtitle='',photos={},fonts,assets={},generatedAt=new Date()}){
 const model=wellnessReportModel({records,from,to}),doc=new jsPDF({unit:'mm',format:'a4',compress:true})
 if(fonts?.regular&&fonts?.bold){doc.addFileToVFS('Dashboard-Regular.ttf',fonts.regular);doc.addFont('Dashboard-Regular.ttf','Dashboard','normal');doc.addFileToVFS('Dashboard-Bold.ttf',fonts.bold);doc.addFont('Dashboard-Bold.ttf','Dashboard','bold')}
 const family=fonts?.regular&&fonts?.bold?'Dashboard':'helvetica'
 doc.setProperties({title:`Bem-estar - ${season.shortName} - ${date(from)} a ${date(to)}`,author:'Ângelo Melim'})
 function text(v,x,y,size=9,bold=false,color=INK,options){doc.setFont(family,bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(Array.isArray(v)?v.map(clean):clean(v),x,y,options)}
 function wrap(v,w,size=8,bold=false){doc.setFont(family,bold?'bold':'normal');doc.setFontSize(size);return doc.splitTextToSize(clean(v),w)}
 function fit(v,w,size=9){let lines=wrap(v,w,size,true);while(lines.length>2&&size>6){size-=.5;lines=wrap(v,w,size,true)}return{lines,size}}
 function panel(x,y,w,h,fill=[255,255,255]){doc.setDrawColor(...LINE);doc.setLineWidth(.2);doc.setFillColor(...fill);doc.roundedRect(x,y,w,h,3,3,'FD')}
 function image(data,x,y,w,h,alias){if(data)try{doc.addImage(data,data.startsWith('data:image/jpeg')?'JPEG':'PNG',x,y,w,h,alias,'FAST')}catch{}}
 function portrait(a,x,y){panel(x,y,15,15,SOFT);const img=photos[a.name];if(img){doc.saveGraphicsState();doc.roundedRect(x+.5,y+.5,14,14,2,2,null);doc.clip();doc.discardPath();image(img,x+.5,y+.5,14,14,`athlete-${a.number}`);doc.restoreGraphicsState()}else text(a.name.split(' ').filter(Boolean).slice(0,2).map(v=>v[0]).join('').toUpperCase(),x+7.5,y+9,5,true,MUTED,{align:'center'})}
 function page(title,note='',first=false){if(!first)doc.addPage();doc.setFillColor(...INK);doc.rect(0,0,210,2.5,'F');image(assets.club,15,5.5,7,8.5,'club');text(`${season.shortName} / ${season.year}`,assets.club?25:15,12,8,true);text('ÂNGELO MELIM',195,12,7,true,MUTED,{align:'right'});doc.setDrawColor(...LINE);doc.line(15,17,195,17);text(title,15,29,20,true);text(note||`${date(from)}${from!==to?' a '+date(to):''}`,15,36,8,false,MUTED)}
 function metric(x,y,w,label,value,unit=''){panel(x,y,w,27);text(label,x+5,y+7,7,false,MUTED);text(value,x+5,y+18,16,true);text(unit,x+w-5,y+23,6,false,MUTED,{align:'right'})}
 function chart(x,y,w,label,key,maxValue,unit){panel(x,y,w,79);text(label,x+6,y+9,10,true);const points=model.trend,max=maxValue||Math.max(1,...points.map(p=>p[key]).filter(Number.isFinite)),left=x+11,right=x+w-8,top=y+22,bottom=y+61
  for(let step=0;step<=2;step++){const py=bottom-step*(bottom-top)/2;doc.setDrawColor(...LINE);doc.line(left,py,right,py);text(fmt(max*step/2,key==='score'?1:0),left-2,py+1,5.5,false,MUTED,{align:'right'})}
  let previous=null;points.forEach((p,i)=>{const px=points.length===1?(left+right)/2:left+i*(right-left)/(points.length-1),value=p[key];if(!Number.isFinite(value)){previous=null;return}const py=bottom-value/max*(bottom-top);doc.setDrawColor(...BLUE);doc.setLineWidth(.6);if(previous)doc.line(previous.x,previous.y,px,py);doc.setFillColor(...BLUE);doc.circle(px,py,1,'F');if(points.length<=7)text(fmt(value,key==='score'?1:0),px,py-3,6.5,true,BLUE,{align:'center'});if(i===0||i===points.length-1||points.length<=5)text(date(p.date).slice(0,5),px,bottom+6,5.5,false,MUTED,{align:'center'});previous={x:px,y:py}})
  text(unit,x+6,y+74,6,false,MUTED)
 }
 page('Bem-estar e carga interna',`${date(from)}${from!==to?' a '+date(to):''}${subtitle?' | '+subtitle:''}`,true)
 panel(15,45,180,36,INK)
 const hero=[['ATLETAS',String(model.athletes.length),'com resposta no período'],['BEM-ESTAR MÉDIO',fmt(model.meanWellness),'escala favorável de 1 a 5'],['PSE MÉDIA',fmt(model.meanPse),'esforço percebido de 0 a 10']]
 hero.forEach(([label,value,note],i)=>{const x=21+i*60;text(label,x,54,6.5,true,[174,194,208]);text(value,x,67,22,true,[255,255,255]);text(note,x,75,6,false,[174,194,208])})
 metric(15,88,42,'Coletas pré',String(model.pre.length),'respostas');metric(61,88,42,'Coletas pós',String(model.post.length),'respostas');metric(107,88,42,'Carga acumulada',fmt(model.totalLoad,0),'UA do grupo');metric(153,88,42,'Relato de dor',String(model.painAthletes),'atletas no período')
 chart(15,125,87,'Bem-estar por dia','score',5,'Média dos respondentes; 5 = mais favorável.')
 chart(108,125,87,'Carga do grupo por dia','load',null,'PSE x minutos; soma das respostas pós (UA).')
 panel(15,215,180,55,SOFT);text('SOBRE AS COLETAS',21,224,7,true,BLUE)
 const notes=[`${model.selected.length} coletas no recorte: ${model.pre.length} pré e ${model.post.length} pós.`,`${model.google} resposta(s) originada(s) do Google Formulários.`,`Os indicadores usam a última resposta por atleta, data, momento e atividade.`,`Bem-estar: média das cinco perguntas na escala favorável. Carga: PSE x duração.`,`Informações autodeclaradas pelos atletas; campos sem medição permanecem em branco.`];let ny=232
 for(const note of notes){const lines=wrap(note,168,7);text(lines,21,ny,7,false,MUTED,{lineHeightFactor:1.2});ny+=lines.length*3.1+2}
 // Cards grow with the reported sites. Very long text continues in a named
 // card on a following row/page instead of being clipped or shrunk to fit.
 const lineStep=3.3,cardWidth=87,pageTop=43,pageBottom=276,gap=6,maxCardLines=38
 const cards=[]
 for(const athlete of model.athletes){
  const lines=athlete.pain.length?wrap(athlete.painLocations.join('; '),cardWidth-10,7):[]
  cards.push({athlete,lines:lines.slice(0,maxCardLines),height:lines.length?110+(Math.min(lines.length,maxCardLines)-1)*lineStep:106})
  for(let offset=maxCardLines;offset<lines.length;offset+=maxCardLines){
   const chunk=lines.slice(offset,offset+maxCardLines)
   cards.push({athlete,lines:chunk,continuation:true,height:38+(chunk.length-1)*lineStep})
  }
 }
 function athleteCard(card,x,y){
  const a=card.athlete,w=cardWidth;panel(x,y,w,card.height);portrait(a,x+5,y+5)
  const name=fit(a.name,57);text(name.lines,x+23,y+10,name.size,true,INK,{lineHeightFactor:1.15});text(a.number,x+w-5,y+6,6,true,BLUE,{align:'right'})
  if(card.continuation){
   text('Locais de dor (continuação)',x+23,y+23,7,true,BLUE)
   text(card.lines,x+5,y+33,7,false,INK,{lineHeightFactor:lineStep/(7*25.4/72)})
   return
  }
  text(`${a.pre.length} pré | ${a.post.length} pós`,x+23,y+23,7,false,MUTED)
  a.domains.forEach((d,j)=>{const py=y+33+j*6;text(d.label,x+5,py,6.5,false,MUTED);doc.setFillColor(...SOFT);doc.roundedRect(x+32,py-2,35,2,1,1,'F');if(Number.isFinite(d.value)){doc.setFillColor(...BLUE);doc.roundedRect(x+32,py-2,35*d.value/5,2,1,1,'F')}text(fmt(d.value),x+w-5,py,7,true,BLUE,{align:'right'})})
  const stats=[['Bem-estar',fmt(a.score),'/5'],['PSE média',fmt(a.pse),'/10'],['Carga',fmt(a.load,0),'UA']]
  stats.forEach(([label,value,unit],j)=>{const sx=x+5+j*27;text(label,sx,y+68,6,false,MUTED);text(value,sx,y+75,12,true);text(unit,sx,y+80,5.5,false,MUTED)})
  doc.setDrawColor(...LINE);doc.line(x+5,y+84,x+w-5,y+84)
  text(`Urina (último pré): ${a.urine??'-'}/8`,x+5,y+90,6,false,MUTED);text(`Peso: ${a.weight==null?'não coletado':fmt(a.weight,2)+' kg'}`,x+w-5,y+90,6,false,MUTED,{align:'right'})
  text(`Dor relatada: ${a.pain.length} coleta(s)`,x+5,y+96,6,false,MUTED);text(`Minutos pós: ${fmt(a.minutes,0)}`,x+w-5,y+96,6,false,MUTED,{align:'right'})
  if(a.pain.length){
   text('LOCAL(IS) DE DOR NO PERÍODO',x+5,y+101,6,true,BLUE)
   text(card.lines,x+5,y+106,7,false,INK,{lineHeightFactor:lineStep/(7*25.4/72)})
  }else text('Dor localizada: não relatada.',x+5,y+102,6,false,MUTED)
 }
 let cardY=pageTop
 const cardPage=()=>{page('Painel dos atletas',`${date(from)}${from!==to?' a '+date(to):''} | Barras: 5 = melhor estado informado.`);cardY=pageTop}
 cardPage()
 for(let start=0;start<cards.length;start+=2){
  const row=cards.slice(start,start+2),height=Math.max(...row.map(card=>card.height))
  if(cardY+height>pageBottom)cardPage()
  row.forEach((card,i)=>athleteCard(card,15+i*93,cardY));cardY+=height+gap
 }
 const painGroups=model.athletes.filter(a=>a.pain.length)
 if(painGroups.length){page('Locais de dor relatados','Autorrelatos no período. A avaliação e a conduta cabem à comissão responsável.');let y=45
  for(const a of painGroups){const entries=a.pain.map(r=>`${date(r.date)}: ${r.dorLocalizada||'Local não informado'}`),all=wrap(entries.join('\n'),168,8);let lines=[...all],first=true
   while(lines.length){if(y>245){page('Locais de dor relatados','Continuação dos autorrelatos.');y=45}const n=Math.max(1,Math.floor((273-y-20)/4)),chunk=lines.splice(0,n),height=19+chunk.length*4;panel(15,y,180,height);text(`${a.number}  ${a.name}${first?'':' (continuação)'}`,21,y+8,8,true);text(chunk,21,y+16,8,false,MUTED,{lineHeightFactor:1.4});y+=height+6;first=false}
  }
 }
 const pages=doc.getNumberOfPages();for(let p=1;p<=pages;p++){doc.setPage(p);doc.setDrawColor(...LINE);doc.line(15,281,195,281);text('Ângelo Melim',15,286,7,true);text(`Gerado em ${generatedAt.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})} | ${p}/${pages}`,15,291,6,false,MUTED);image(assets.brand,146,283,11,8,'athraven');text('Powered by ATHRAVEN',160,286,6,true);text('Licenciado a Ângelo Melim',160,291,5.5,false,MUTED)}
 return doc
}
export async function downloadWellnessPdf(options){const assets=await loadPdfAssets(options.season,options.photoSources),doc=buildWellnessPdf({...options,...assets});doc.save(`bem-estar-${options.from}-${options.to}.pdf`);return doc}
