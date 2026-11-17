'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw, ClipboardList, Settings2, ChevronDown } from 'lucide-react'
import { useSeason } from '@/app/context/SeasonContext'
import { SeasonLogo } from '@/components/SeasonBrand'
import HistoryFormLink from '@/components/HistoryFormLink'
import HistoryGoogleSource from '@/components/HistoryGoogleSource'
import HistoryAthleteProfile,{HistoryCompletion,HistoryRosterOverview} from '@/components/HistoryAthleteProfile'
import {historySquadSummary} from '@/lib/athlete-history-view.mjs'
import {AthleteAvatar,getCustomPhoto,getStaticPhoto,loadSeasonPhotos} from '@/app/utils/athletePhotos'
const dateLabel = value => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })

export default function AthleteHistoryPage() {
  const { apiFetch, season, href } = useSeason()
  const [data, setData] = useState({ athletes: [], responses: [] }), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [selected, setSelected] = useState(''), [version, setVersion] = useState(''), [search, setSearch] = useState(''), [status, setStatus] = useState('all')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const load = useCallback(async (force=false) => {
    try { const r = await apiFetch('/api/athlete-history'+(force?'?refresh=1':'')), body = await r.json(); if (!r.ok) throw new Error(body.error); setData(body); setError('') }
    catch (e) { setError(e.message || 'Não foi possível carregar os históricos.') } finally { setLoading(false) }
  }, [apiFetch])
  useEffect(() => {
    load()
    const refresh = () => { if (document.visibilityState === 'visible') load() }
    const interval = setInterval(refresh, 60000)
    window.addEventListener('focus', refresh)
    return () => { clearInterval(interval); window.removeEventListener('focus', refresh) }
  }, [load])
  const roster = useMemo(() => {
    const rows = [...data.athletes]
    for (const response of data.responses) if (!rows.some(a => a.id === response.athlete_id)) rows.push({ id: response.athlete_id, name: response.athlete_name, archived: true })
    return rows.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [data])
  const current = data.responses.filter(r => r.is_current), athlete = roster.find(a => String(a.id) === selected)
  const versions = data.responses.filter(r => String(r.athlete_id) === selected)
  const response = versions.find(r => r.id === version) || versions.find(r => r.is_current) || versions[0]
  const summary = historySquadSummary(data.athletes,current)
  const filtered = roster.filter(a => a.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) && (status === 'all' || (status === 'archived' ? a.archived : !a.archived && (status === 'answered' ? current.some(r => r.athlete_id === a.id) : !current.some(r => r.athlete_id === a.id)))))
  async function pdf(individual) {
    setBusy(true); setError('')
    try { const { downloadHistoryPdf } = await import('@/lib/athlete-history-pdf'); await loadSeasonPhotos(apiFetch,season.id).catch(()=>{}); const reportAthletes=individual?[athlete]:data.athletes; const photoSources=Object.fromEntries(reportAthletes.map(a=>[a.name,getCustomPhoto(a.name,season.id)||getStaticPhoto(a.name,season.id)])); await downloadHistoryPdf({ season, athletes: reportAthletes, responses: individual ? [response] : current, individual,photoSources }) }
    catch { setError('Não foi possível gerar o PDF. Tente novamente.') } finally { setBusy(false) }
  }
  async function reopen() {
    if (!confirm(`Liberar uma nova resposta para ${athlete.name}? O atleta usará o mesmo link e a versão anterior será preservada.`)) return
    setBusy(true); setError(''); setMessage('')
    try { const r = await apiFetch('/api/athlete-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reopen', athleteId: athlete.id }) }), body = await r.json(); if (!r.ok) throw new Error(body.error); await load(); setMessage('Nova resposta liberada. Envie ao atleta o mesmo link do questionário.') }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <div className="history-workspace history-workspace--cards">
    <header className="history-page-heading"><div className="flex items-center gap-4"><SeasonLogo className="h-12 w-auto"/><div><span className="history-eyebrow">Fisiologia e preparação física</span><h1>Histórico de atletas</h1><p>{season.shortName} · Temporada {season.year}</p></div></div><div className="flex flex-wrap gap-2"><button disabled={loading || busy} onClick={()=>load(true)} className="history-button"><RefreshCw size={15}/>Atualizar</button><button disabled={loading || busy || !data.athletes.length} onClick={() => pdf(false)} className="history-button history-button-primary"><Download size={15}/>{busy ? 'Processando…' : 'PDF do elenco'}</button></div></header>
    <HistoryCompletion summary={summary}/>
    <details className="history-source-drawer"><summary><span><Settings2 size={16}/>{data.sync?.connected?'Google Formulários conectado':'Configurar coleta de respostas'}</span><small>{data.sync?.lastSuccessAt?'Sincronizado em '+dateLabel(data.sync.lastSuccessAt):'Fontes e links'}<ChevronDown size={14}/></small></summary><div className="history-source-drawer-content"><HistoryGoogleSource sync={data.sync} onData={setData}/><details className="mt-5"><summary className="text-sm font-semibold text-zinc-600 cursor-pointer">Formulário interno (opcional)</summary><div className="mt-4"><HistoryFormLink athleteCount={data.athletes.length}/></div></details></div></details>
    {data.sync?.warning&&<p role="status" className="history-data-warning">{data.sync.warning}</p>}
    {!!data.sync?.unmatched?.length&&<p role="status" className="history-data-warning">Confira os nomes de {data.sync.unmatched.length} resposta(s) nas configurações de coleta.</p>}
    {error && <p className="collection-error mt-5" role="alert">{error}</p>}{message && <p className="text-sm text-emerald-700 mt-5" role="status">{message}</p>}
    <div className="history-layout">
      <section className="history-roster"><div className="history-roster-heading"><h2>Elenco</h2><span>{roster.length} atletas</span></div><label className="sr-only" htmlFor="history-search">Buscar atleta</label><input id="history-search" placeholder="Buscar pelo nome…" value={search} onChange={e => setSearch(e.target.value)}/><label className="sr-only" htmlFor="history-status">Filtrar por situação</label><select id="history-status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos os atletas</option><option value="answered">Respondidos</option><option value="pending">Pendentes</option><option value="archived">Fora do elenco</option></select>
        <button className="history-button mt-3 w-full justify-center" onClick={()=>{setSelected('');setVersion('')}}><ClipboardList size={15}/>Visão do elenco</button>
        {loading ? <p className="text-sm text-zinc-500 mt-4" role="status">Carregando…</p> : !filtered.length ? <p className="text-sm text-zinc-500 mt-4">Nenhum atleta nesta seleção. {!roster.length && <a className="underline" href={href('/fisiologia/atletas')}>Cadastrar elenco</a>}</p> : <div className="history-athlete-list">{filtered.map(a => { const r = current.find(r => r.athlete_id === a.id); return <button key={a.id} onClick={() => { setSelected(String(a.id)); setVersion(''); setMessage('') }} className={selected === String(a.id) ? 'selected' : ''} aria-pressed={selected === String(a.id)}><AthleteAvatar name={a.name} size="w-9 h-9" clickable={false}/><div><strong>{a.name}</strong><span><i className={r?'history-dot history-dot--answered':'history-dot'}/>{a.archived ? 'Histórico preservado' : !r ? 'Pendente' : 'Respondido'}</span></div></button> })}</div>}
      </section>
      <section className="history-detail">
        {!athlete ? <HistoryRosterOverview summary={summary}/> : !response ? <div className="history-pending-profile"><AthleteAvatar name={athlete.name} size="w-24 h-24"/><h2>{athlete.name}</h2><span className="history-answer-pill">Aguardando resposta</span><p>O histórico será exibido quando houver um questionário vinculado a este atleta.</p></div> : <>
          <div className="history-record-toolbar"><div><label htmlFor="history-version">Registro consultado</label><select id="history-version" value={response.id} onChange={e => setVersion(e.target.value)}>{versions.map((r, i) => <option key={r.id} value={r.id}>{dateLabel(r.created_at)} · {r.source==='google'?'Google':'Interno'} · {r.is_current ? 'Atual' : `Anterior (${versions.length - i})`}</option>)}</select></div><div className="flex gap-2 flex-wrap">{!athlete.archived && response.source!=='google' && <button disabled={busy || current.find(r => r.athlete_id === athlete.id)?.allows_update} className="history-button" onClick={reopen}>{current.find(r => r.athlete_id === athlete.id)?.allows_update ? 'Nova resposta liberada' : 'Liberar nova resposta'}</button>}<button disabled={busy} onClick={() => pdf(true)} className="history-button history-button-primary"><Download size={15}/>PDF individual</button></div></div>
          <HistoryAthleteProfile athlete={athlete} response={response}/>
        </>}
      </section>
    </div>
  </div>
}
