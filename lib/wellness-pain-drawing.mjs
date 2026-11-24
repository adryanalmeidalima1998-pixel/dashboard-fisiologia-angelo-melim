// Original mirrored Bézier outline. Coordinates are local to each view;
// all PDF marks remain vector shapes, including in the downloaded file.
const outline=[
 [52,22,54,22,55,21],[54,26,56,29,61,30],[66,32,73,32,76,37],
 [80,42,79,47,80,51],[81,56,82,62,83,66],[86,72,86,81,89,88],
 [90,90,92,94,92,97],[93,103,90,107,88,106],[86,105,85,101,85,98],
 [83,102,81,100,82,97],[83,94,84,91,83,89],[80,82,77,76,76,70],
 [74,65,71,58,69,53],[67,61,63,70,65,79],[66,84,69,89,68,96],
 [69,104,67,116,65,124],[63,131,64,137,64,142],[64,148,67,154,65,163],
 [63,173,61,180,62,185],[62,189,65,192,66,195],[64,198,58,197,56,196],
 [54,194,55,189,54,185],[54,178,53,171,53,166],[52,158,54,150,55,143],
 [55,136,52,129,52,121],[51,114,51,106,50,102]
]
function body(doc,ox,oy,s,view){
 const X=x=>ox+x*s,Y=y=>oy+y*s
 const stroke=(coords,fill=false)=>{
  doc.moveTo(X(coords[0][0]),Y(coords[0][1]))
  for(const [a,b,c,d,e,f] of coords.slice(1))doc.curveTo(X(a),Y(b),X(c),Y(d),X(e),Y(f))
  if(fill){doc.close();doc.fillStroke()}else doc.stroke()
 }
 doc.setDrawColor(149,170,183);doc.setLineWidth(.23);doc.setFillColor(219,229,235)
 const half=[[50,22],...outline],full=[...half]
 for(let i=half.length-1;i>0;i--){const p=half[i],prev=half[i-1];full.push([100-p[2],p[3],100-p[0],p[1],100-prev.at(-2),prev.at(-1)])}
 stroke(full,true)
 stroke([[50,3],[58,3,60,7,59,14],[59,19,56,23,53,25],[51,26,49,26,47,25],[44,23,41,19,41,14],[40,7,42,3,50,3]],true)
 doc.setDrawColor(177,195,205);doc.setLineWidth(.19)
 const marks=view==='front'?[
 [[31,43],[36,47,44,49,49,47]],[[33,87],[39,88,45,94,49,99]],
 [[35,139],[37,142,41,143,44,139]],[[38,151],[40,158,40,168,40,175]],
 [[33,38],[38,34,44,34,49,36]]
 ]:[
 [[30,40],[32,51,38,57,42,56]],[[35,88],[40,84,47,85,50,89]],
 [[33,96],[38,101,46,101,50,96]],[[35,141],[38,139,41,139,44,141]],
 [[35,151],[37,150,41,152,43,159]]
 ]
 for(const line of marks)for(const flip of [false,true])stroke(line.map(v=>v.map((n,i)=>flip&&i%2===0?100-n:n)))
 if(view==='back')stroke([[50,31],[50,45,50,61,50,76]])
}
export function drawWellnessMap(doc,text,x,y,sites){
 doc.setDrawColor(222,229,236);doc.setFillColor(247,250,251);doc.roundedRect(x,y,77,75,2,2,'FD')
 text('MAPA DE DOR',x+3,y+6,7,true,[33,62,81])
 doc.setFillColor(185,36,57);doc.circle(x+46,y+5.2,.9,'F')
 text('Local relatado',x+48,y+6,6,false,[82,99,113])
 for(const [i,view] of ['front','back'].entries()){
  const s=.267,cx=x+20+i*37,ox=cx-50*s,oy=y+13
  text(view==='front'?'FRENTE':'COSTAS',cx,y+12,6,true,[64,82,97],{align:'center'})
  text(view==='front'?'D':'E',cx-11,y+24,5,false,[103,124,139],{align:'center'})
  text(view==='front'?'E':'D',cx+11,y+24,5,false,[103,124,139],{align:'center'})
  body(doc,ox,oy,s,view)
  for(const r of sites.filter(p=>p.view===view)){
   const px=ox+r.x*s,py=oy+r.y*s
   doc.setFillColor(255,237,240);doc.setDrawColor(166,30,50);doc.setLineWidth(.26);doc.circle(px,py,1.54,'FD')
   doc.setFillColor(183,32,56);doc.circle(px,py,.95,'F')
  }
 }
 text('Intensidade por local: não coletada.',x+38.5,y+71,6,false,[82,99,113],{align:'center'})
}
