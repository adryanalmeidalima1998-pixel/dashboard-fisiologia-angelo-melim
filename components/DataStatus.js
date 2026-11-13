'use client'
import { useData } from '@/app/context/DataContext'
import { useSeason } from '@/app/context/SeasonContext'
export default function DataStatus() {
  const { gpsError, bemEstarError, bemEstarConfigured } = useData()
  const { href } = useSeason()
  if (gpsError) return <div role="alert" className="workspace-notice">Não foi possível carregar o banco desta temporada. Os indicadores podem estar incompletos.</div>
  if (bemEstarError) return <div role="alert" className="workspace-notice">{bemEstarError}<a href={href('/fisiologia/configuracoes')}>Conferir coletas</a></div>
  if (bemEstarConfigured === false) return <div className="workspace-notice">Coleta de bem-estar ainda não configurada para esta temporada.<a href={href('/fisiologia/configuracoes')}>Configurar formulário</a></div>
  return null
}
