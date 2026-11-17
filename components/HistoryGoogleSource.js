'use client'
import {useEffect,useState} from 'react'
import {Database} from 'lucide-react'
import {useSeason} from '@/app/context/SeasonContext'
export default function HistoryGoogleSource({sync,onData}){
 const{apiFetch}=useSeason(),[url,setUrl]=useState(''),[dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('')
 useEffect(()=>{if(!dirty)setUrl(sync?.sourceUrl||'')},[sync?.sourceUrl,dirty])
 async function connect(event){event.preventDefault();setBusy(true);setError('');try{const r=await apiFetch('/api/athlete-history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'connectGoogle',url:url.trim()})}),data=await r.json();if(!r.ok)throw new Error(data.error);setDirty(false);onData(data)}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <section className="history-link-panel"><div className="flex items-center gap-3"><Database size={20}/><h2>Respostas do Google Formulários</h2></div><p>{sync?.connected?'Planilha conectada a esta temporada. Novas respostas são consultadas automaticamente enquanto esta aba está aberta e ao acessar os cadastros.':'Conecte a planilha de respostas publicada em CSV para consultar os históricos e gerar os relatórios.'}</p>
 {sync?.lastSuccessAt&&<p className="history-small">Última sincronização: {new Date(sync.lastSuccessAt).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · {sync.rowCount??0} respostas na planilha · {sync.matchedCount??0} vinculadas ao elenco</p>}
 {sync?.warning&&<p role="status" className="text-amber-800">{sync.warning} Os históricos já salvos continuam disponíveis.</p>}
 {!!sync?.unmatched?.length&&<p className="text-amber-800">Confira os nomes destas respostas no cadastro do elenco: {sync.unmatched.join('; ')}. Elas foram preservadas, mas ainda não foram vinculadas a um atleta.</p>}
 {!!sync?.reviewCount&&<p className="text-amber-800">{sync.reviewCount} resposta(s) com peso ou altura para conferir. O valor original está preservado e sinalizado no histórico individual.</p>}
 <details className="mt-4"><summary className="text-xs font-semibold cursor-pointer">{sync?.connected?'Alterar planilha de respostas':'Configurar planilha'}</summary><form onSubmit={connect}><label className="block text-xs font-semibold mt-4 mb-2" htmlFor="history-google-url">Link publicado em CSV do Google Planilhas</label><div className="flex flex-wrap gap-2"><input id="history-google-url" type="url" required value={url} onChange={e=>{setDirty(true);setUrl(e.target.value)}} className="flex-1 min-w-0 border rounded-lg p-3 text-xs" placeholder="https://docs.google.com/spreadsheets/d/e/…/pub?output=csv"/><button disabled={busy} className="history-button history-button-primary">{busy?'Conectando…':'Conectar planilha'}</button></div></form></details>
 <p className="history-small">A consulta automática ocorre a cada minuto. O botão “Atualizar” consulta a fonte novamente. A publicação das novas respostas também depende da atualização da planilha pelo Google.</p>
 {error&&<p role="alert" className="text-red-700">{error}</p>}
 </section>
}
