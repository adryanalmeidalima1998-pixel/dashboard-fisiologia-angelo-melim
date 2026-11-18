async function fontData(path){
 const response=await fetch(path,{signal:AbortSignal.timeout(15000)})
 if(!response.ok)throw new Error('Não foi possível carregar as fontes do PDF. Tente novamente.')
 const bytes=new Uint8Array(await response.arrayBuffer());let binary=''
 for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192))
 return btoa(binary)
}
export async function pdfImage(source){
 if(!source||typeof source!=='string'||(!source.startsWith('/')&&!source.startsWith('data:image/')))return null
 if(source.startsWith('data:image/jpeg'))return source
 return new Promise(resolve=>{const img=new Image(),timer=setTimeout(()=>resolve(null),8000),finish=value=>{clearTimeout(timer);resolve(value)};img.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);finish(canvas.toDataURL('image/png'))}catch{finish(null)}};img.onerror=()=>finish(null);img.src=source})
}
export async function loadPdfAssets(season,photoSources={}){
 const [regular,bold,club,brand,photos]=await Promise.all([fontData('/fonts/dashboard-sans.ttf'),fontData('/fonts/dashboard-sans-bold.ttf'),pdfImage(season.logo),pdfImage('/brand/athraven-symbol-transparent.webp'),Promise.all(Object.entries(photoSources).map(async([name,source])=>[name,await pdfImage(source)]))])
 return {fonts:{regular,bold},assets:{club,brand},photos:Object.fromEntries(photos)}
}
