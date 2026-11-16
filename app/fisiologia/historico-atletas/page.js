'use client'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, RefreshCw, ClipboardList } from 'lucide-react'
import { useSeason } from '@/app/context/SeasonContext'
import { SeasonLogo } from '@/components/SeasonBrand'
import HistoryFormLink from '@/components/HistoryFormLink'
import { HISTORY_SECTIONS, historyValue, visibleHistoryField } from '@/lib/athlete-history-rules.mjs'
const dateLabel = value => new Date(value).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' })

export default function AthleteHistoryPage() {
  const { apiFetch, season, href } = useSeason()
  const [data, setData] = useState({ athletes: [], responses: [] }), [loading, setLoading] = useState(true), [error, setError] = useState('')
  const [selected, setSelected] = useState(''), [version, setVersion] = useState(''), [search, setSearch] = useState(''), [status, setStatus] = useState('all')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState('')
  const load = useCallback(async () => {
    try { const r = await apiFetch('/api/athlete-history'), body = await r.json(); if (!r.ok) throw new Error(body.error); setData(body); setError('') }
    catch (e) { setError(e.message || 'Não foi possível carregar os históricos.') } finally { setLoading(false) }
  }, [apiFetch])
  useEffect(() => {
    load()
    const refresh = () => { if (document.visibilityState === 'visible') load() }
    const interval = setInterval(refresh, 30000)
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
  const answered = data.athletes.filter(a => current.some(r => r.athlete_id === a.id)).length
  const filtered = roster.filter(a => a.name.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')) && (status === 'all' || (status === 'archived' ? a.archived : !a.archived && (status === 'answered' ? current.some(r => r.athlete_id === a.id) : !current.some(r => r.athlete_id === a.id)))))
  async function pdf(individual) {
    setBusy(true); setError('')
    try { const { downloadHistoryPdf } = await import('@/lib/athlete-history-pdf'); await downloadHistoryPdf({ season, athletes: individual ? [athlete] : data.athletes, responses: individual ? [response] : current, individual }) }
    catch { setError('Não foi possível gerar o PDF. Tente novamente.') } finally { setBusy(false) }
  }
  async function reopen() {
    if (!confirm(`Liberar uma nova resposta para ${athlete.name}? O atleta usará o mesmo link e a versão anterior será preservada.`)) return
    setBusy(true); setError(''); setMessage('')
    try { const r = await apiFetch('/api/athlete-history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'reopen', athleteId: athlete.id }) }), body = await r.json(); if (!r.ok) throw new Error(body.error); await load(); setMessage('Nova resposta liberada. Envie ao atleta o mesmo link do questionário.') }
    catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  return <div className="history-workspace">
    <header className="history-page-heading"><div className="flex items-center gap-4"><SeasonLogo className="h-14 w-auto"/><div><h1>Histórico de atletas</h1><p>{season.shortName} · Temporada {season.year}</p></div></div><div className="flex flex-wrap gap-2"><button disabled={loading || busy} onClick={load} className="history-button"><RefreshCw size={15}/>Atualizar</button><button disabled={loading || busy || !data.athletes.length} onClick={() => pdf(false)} className="history-button history-button-primary"><Download size={15}/>{busy ? 'Processando…' : 'PDF geral do elenco'}</button></div></header>
    <p className="text-sm text-zinc-500 mt-5 leading-relaxed">Questionários preenchidos pelos atletas. As respostas recebidas aparecem automaticamente; os registros anteriores são mantidos para consulta.</p>
    <div className="history-metrics"><div><span>Atletas no elenco</span><strong>{loading ? '—' : data.athletes.length}</strong></div><div><span>Respondidos</span><strong>{loading ? '—' : answered}</strong></div><div><span>Pendentes</span><strong>{loading ? '—' : data.athletes.length - answered}</strong></div></div>
    <HistoryFormLink athleteCount={data.athletes.length}/>
    {error && <p className="collection-error mt-5" role="alert">{error}</p>}{message && <p className="text-sm text-emerald-700 mt-5" role="status">{message}</p>}
    <div className="history-layout">
      <section className="history-roster"><h2>Atletas</h2><label className="sr-only" htmlFor="history-search">Buscar atleta</label><input id="history-search" placeholder="Buscar atleta…" value={search} onChange={e => setSearch(e.target.value)}/><label className="sr-only" htmlFor="history-status">Filtrar por situação</label><select id="history-status" value={status} onChange={e => setStatus(e.target.value)}><option value="all">Todos os atletas</option><option value="answered">Respondidos</option><option value="pending">Pendentes</option><option value="archived">Fora do elenco</option></select>
        {loading ? <p className="text-sm text-zinc-500 mt-4" role="status">Carregando…</p> : !filtered.length ? <p className="text-sm text-zinc-500 mt-4">Nenhum atleta nesta seleção. {!roster.length && <a className="underline" href={href('/fisiologia/atletas')}>Cadastrar elenco</a>}</p> : <div className="history-athlete-list">{filtered.map(a => { const r = current.find(r => r.athlete_id === a.id); return <button key={a.id} onClick={() => { setSelected(String(a.id)); setVersion(''); setMessage('') }} className={selected === String(a.id) ? 'selected' : ''} aria-pressed={selected === String(a.id)}><strong>{a.name}</strong><span>{a.archived ? 'Fora do elenco · histórico preservado' : !r ? 'Pendente' : r.allows_update ? 'Respondido · nova resposta liberada' : 'Respondido'}</span></button> })}</div>}
      </section>
      <section className="history-detail">
        {!athlete ? <div className="history-empty"><ClipboardList size={30}/><h2>Selecione um atleta</h2><p>Consulte o questionário e gere o relatório individual.</p></div> : <>
          <header className="history-detail-heading"><div><h2>{athlete.name}</h2><p>{athlete.archived ? 'Histórico preservado · fora do elenco' : 'Questionário individual'}</p></div>{response && <button disabled={busy} onClick={() => pdf(true)} className="history-button"><Download size={15}/>PDF individual</button>}</header>
          {!response ? <div className="history-empty"><p>Este atleta ainda não respondeu. Compartilhe o link do questionário disponível acima.</p></div> : <>
            <div className="history-version"><label htmlFor="history-version">Resposta consultada</label><select id="history-version" value={response.id} onChange={e => setVersion(e.target.value)}>{versions.map((r, i) => <option key={r.id} value={r.id}>{dateLabel(r.created_at)} · {r.is_current ? 'Atual' : `Anterior (${versions.length - i})`}</option>)}</select><p>Informações autodeclaradas pelo atleta. Os registros de lesões feitos pela comissão continuam no cadastro.</p>
              {!athlete.archived && <button disabled={busy || current.find(r => r.athlete_id === athlete.id)?.allows_update} className="history-button mt-3" onClick={reopen}>{current.find(r => r.athlete_id === athlete.id)?.allows_update ? 'Nova resposta já liberada' : 'Liberar nova resposta'}</button>}
            </div>
            {HISTORY_SECTIONS.map(section => <section className="history-answer-section" key={section.title}><h3>{section.title}</h3><dl>{section.fields.filter(field => visibleHistoryField(field, response.answers)).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{historyValue(field, response.answers[field.key])}</dd></div>)}</dl></section>)}
          </>}
        </>}
      </section>
    </div>
  </div>
}
