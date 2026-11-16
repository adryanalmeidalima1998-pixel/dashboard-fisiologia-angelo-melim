'use client'
import { useEffect, useRef, useState } from 'react'
import { Copy, ExternalLink, Link2 } from 'lucide-react'
import { useSeason } from '@/app/context/SeasonContext'
export default function HistoryFormLink({ athleteCount }) {
  const { apiFetch, href } = useSeason(), [info, setInfo] = useState(null), [busy, setBusy] = useState(false)
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [origin, setOrigin] = useState(''), input = useRef(null)
  useEffect(() => {
    let active = true; setOrigin(window.location.origin)
    apiFetch('/api/athlete-history-form').then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); if (active) setInfo(data) }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [apiFetch])
  async function act(action) {
    if (action === 'rotate' && !confirm('Substituir o link do questionário? O anterior deixará de funcionar. Todas as respostas serão preservadas.')) return
    setBusy(true); setError(''); setMessage('')
    try {
      const r = await apiFetch('/api/athlete-history-form', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) })
      const data = await r.json(); if (!r.ok) throw new Error(data.error); setInfo(data)
      setMessage(action === 'disable' ? 'Questionário desativado. As respostas foram preservadas.' : 'Link ativo. Compartilhe o endereço completo com o elenco.')
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }
  const link = info?.path ? (info.origin || origin) + info.path : ''
  async function copy() { try { await navigator.clipboard.writeText(link); setMessage('Link copiado.') } catch { input.current?.select(); setMessage('Copie o endereço completo selecionado.') } }
  return <section className="history-link-panel"><div className="flex items-center gap-3"><Link2 size={20}/><h2>Link do questionário</h2></div><p>O atleta seleciona seu nome e responde pelo celular. O mesmo link atende todo o elenco desta temporada.</p>
    {athleteCount === 0 && <p className="text-amber-800">Cadastre o elenco antes de compartilhar. <a className="underline font-semibold" href={href('/fisiologia/atletas')}>Abrir cadastro de atletas</a></p>}
    {!info && !error && <p>Carregando configuração…</p>}
    {info?.enabled ? <><label className="block text-xs font-semibold mt-4 mb-2" htmlFor="history-public-link">Endereço completo para compartilhar</label><div className="flex flex-wrap gap-2"><input id="history-public-link" ref={input} readOnly value={link} onFocus={e => e.target.select()} className="flex-1 min-w-0 border rounded-lg px-3 py-2.5 text-xs bg-zinc-50"/><button disabled={busy} onClick={copy} className="history-button"><Copy size={15}/>Copiar link</button><a href={link} target="_blank" rel="noreferrer" className="history-button"><ExternalLink size={15}/>Abrir</a></div><div className="flex flex-wrap gap-4 mt-4 text-xs text-zinc-500"><button disabled={busy} onClick={() => act('rotate')} className="underline">Substituir link</button><button disabled={busy} onClick={() => act('disable')} className="underline">Desativar questionário</button></div></> : info && <button disabled={busy} onClick={() => act('enable')} className="history-button history-button-primary mt-4">{busy ? 'Configurando…' : info.configured ? 'Reativar o mesmo link' : 'Gerar link do questionário'}</button>}
    <p className="history-small">Compartilhe apenas com o elenco. Este link permite enviar respostas; a consulta dos históricos e dos relatórios exige acesso ao dashboard.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}{message && <p role="status" className="text-emerald-700">{message}</p>}
  </section>
}
