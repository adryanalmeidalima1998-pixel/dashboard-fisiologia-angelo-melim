'use client'
import {useState} from 'react'
import {Download,LoaderCircle} from 'lucide-react'
export default function SessionPdfButton({season,session,athletes,filterPosition='',loadPhotos}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('')
 async function download(){
  setBusy(true);setError('')
  try{
   let photoSources={};try{photoSources=await loadPhotos?.()||{}}catch{}
   const {downloadSessionPdf}=await import('@/lib/session-pdf')
   await downloadSessionPdf({season,session,athletes,filterPosition,photoSources})
  }catch(e){setError(e.message||'Não foi possível gerar o PDF. Tente novamente.')}finally{setBusy(false)}
 }
 return <div data-pdf-hide className="flex flex-col items-end gap-1"><button onClick={download} disabled={busy||!session||!athletes?.length} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-wait" title="Baixar relatório da sessão com os atletas do filtro atual">{busy?<LoaderCircle size={15} className="animate-spin"/>:<Download size={15}/>}<span aria-live="polite">{busy?'Gerando PDF…':'Baixar PDF da sessão'}</span></button>{error&&<p role="alert" className="max-w-xs text-xs text-red-700">{error}</p>}</div>
}
