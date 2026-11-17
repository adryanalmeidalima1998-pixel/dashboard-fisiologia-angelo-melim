'use client'
import {usePathname} from 'next/navigation'
import {useData} from '@/app/context/DataContext'
import {GPS_EXPORT_NOTE} from '@/lib/gps-data.mjs'
export default function GpsSourceNote(){
 const {gpsData}=useData(),path=usePathname()
 if(!/^\/fisiologia(?:\/(?:diario|semanal|acwr|individual|sessao|destaques|jogos|correlacao|exposicao|relatorios|planejamento|cmj|exercicios))?$/.test(path))return null
 const imports=gpsData.filter(s=>s.metadata?.gpsImport),english=imports.some(s=>s.metadata.gpsImport.sourceFormat==='catapult-english-v1'),missing=imports.filter(s=>s.metadata.gpsImport.missingMetrics?.length)
 if(!english&&!missing.length)return null
 return <div className="mx-5 my-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-500" role="note"><strong className="text-slate-600">Fonte dos dados GPS</strong>{english&&<p className="mt-1">{GPS_EXPORT_NOTE}</p>}{!!missing.length&&<p className="mt-1">{missing.length} arquivo(s) com métricas ausentes. Confira o arquivo de origem antes de interpretar campos sem medição como zero.</p>}</div>
}
