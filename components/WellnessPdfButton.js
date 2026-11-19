'use client'
import {useState} from 'react'
import {Download,LoaderCircle} from 'lucide-react'
import {useSeason} from '@/app/context/SeasonContext'
import {loadSeasonPhotos,getCustomPhoto,getStaticPhoto} from '@/app/utils/athletePhotos'
export default function WellnessPdfButton({records,from,to,subtitle='',label='Baixar PDF'}){
 const {season,apiFetch}=useSeason(),[busy,setBusy]=useState(false),[error,setError]=useState('')
 async function download(){setBusy(true);setError('');try{await loadSeasonPhotos(apiFetch,season.id).catch(()=>{});const names=[...new Set(records.map(r=>r.playerName))],photoSources=Object.fromEntries(names.map(name=>[name,getCustomPhoto(name,season.id)||getStaticPhoto(name,season.id)])),{downloadWellnessPdf}=await import('@/lib/wellness-pdf');await downloadWellnessPdf({season,records,from,to,subtitle,photoSources})}catch(e){setError(e.message||'Não foi possível gerar o PDF.')}finally{setBusy(false)}}
 return <div data-pdf-hide className="flex flex-col items-end gap-1"><button disabled={busy||!records.length||!from||!to} onClick={download} className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy?<LoaderCircle size={15} className="animate-spin"/>:<Download size={15}/>}<span aria-live="polite">{busy?'Gerando PDF…':label}</span></button>{error&&<p role="alert" className="text-xs text-red-700 max-w-xs">{error}</p>}</div>
}
