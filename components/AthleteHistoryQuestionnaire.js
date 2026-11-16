'use client'
import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import AthravenBrand from '@/components/AthravenBrand'
import { HISTORY_SECTIONS, historyOptions, historyValue, visibleHistoryField, validateHistorySection, validateHistory } from '@/lib/athlete-history-rules.mjs'

export default function AthleteHistoryQuestionnaire({ season }) {
  const [info, setInfo] = useState(null), [token, setToken] = useState(''), [athleteId, setAthleteId] = useState('')
  const [answers, setAnswers] = useState({}), [step, setStep] = useState(0), [error, setError] = useState('')
  const [loading, setLoading] = useState(true), [sending, setSending] = useState(false), [saved, setSaved] = useState(false)
  const [submissionId, setSubmissionId] = useState(''), alert = useRef(null), heading = useRef(null)
  const review = step === HISTORY_SECTIONS.length, section = HISTORY_SECTIONS[step]
  const athlete = info?.athletes.find(a => String(a.id) === athleteId)
  useEffect(() => {
    let active = true
    const access = new URLSearchParams(window.location.hash.slice(1)).get('acesso') || ''
    setToken(access); setSubmissionId(crypto.randomUUID())
    if (!access) { setError('Link incompleto. Solicite o link do questionário à comissão técnica.'); setLoading(false); return }
    fetch(`/api/questionario/${season.id}`, { headers: { Authorization: `Bearer ${access}` }, credentials: 'omit', cache: 'no-store' })
      .then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.error); if (active) setInfo(data) })
      .catch(e => { if (active) setError(e.message) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [season.id])
  useEffect(() => { if (error) alert.current?.focus() }, [error])
  function move(next) { setStep(next); setError(''); window.scrollTo({ top: 0, behavior: 'smooth' }); setTimeout(() => heading.current?.focus(), 0) }
  function update(field, value) {
    setAnswers(previous => {
      const next = { ...previous, [field.key]: value }
      for (const s of HISTORY_SECTIONS) for (const child of s.fields) if (child.when?.[0] === field.key && child.when[1] !== value) delete next[child.key]
      return next
    }); setError('')
  }
  async function submit(event) {
    event.preventDefault(); setError('')
    if (!athlete) { setError('Selecione seu nome na lista do elenco.'); return }
    if (!review) {
      try { validateHistorySection(section, answers); move(step + 1) } catch (e) { setError(e.message) }
      return
    }
    let payload
    try { payload = validateHistory({ submissionId, athleteId, answers }) } catch (e) { setError(e.message); return }
    setSending(true)
    try {
      const r = await fetch(`/api/questionario/${season.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, credentials: 'omit', body: JSON.stringify(payload) })
      const data = await r.json(); if (!r.ok) throw new Error(data.error)
      setSaved(true); window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) { setError(e.message || 'Falha de conexão. Tente novamente.') } finally { setSending(false) }
  }
  return <main className="athlete-collection history-questionnaire" data-club={season.theme}><div className="collection-shell">
    <header className="collection-header"><img src={season.logo} alt={`Escudo do ${season.shortName}`} width="64" height="78"/><div><p>{season.shortName} · {season.year}</p><h1>Histórico de atleta</h1><span>Questionário individual</span></div></header>
    {loading ? <section className="collection-card" role="status">Carregando questionário…</section> : !info ? <section className="collection-card"><h2>Link indisponível</h2><p role="alert">{error}</p></section> : saved ? <section className="collection-card collection-success" role="status"><CheckCircle2 size={44}/><h2>Questionário registrado</h2><p>{athlete?.name}</p><p>A comissão técnica já pode consultar suas respostas. Você pode fechar esta página.</p><p>Se precisar corrigir ou atualizar alguma informação, solicite uma nova resposta à comissão técnica.</p></section> : !info.athletes.length ? <section className="collection-card"><h2>Elenco ainda não cadastrado</h2><p>Solicite o cadastro do seu nome à comissão técnica.</p></section> : <>
      <div className="collection-progress"><span>Etapa {step + 1} de {HISTORY_SECTIONS.length + 1} · {review ? 'Conferência e envio' : section.title}</span><div><i style={{ width: `${(step + 1) / (HISTORY_SECTIONS.length + 1) * 100}%` }}/></div></div>
      <form onSubmit={submit} noValidate>
        <section className="collection-card">
          <h2 ref={heading} tabIndex={-1}>{review ? 'Confira antes de enviar' : section.title}</h2>
          {step === 0 && <><p>Selecione seu nome e preencha seus dados. Responda com atenção; as informações serão enviadas à comissão técnica.</p><label htmlFor="history-athlete">Atleta *</label><select id="history-athlete" value={athleteId} onChange={e => { const id = e.target.value; setAthleteId(id); setAnswers({}); setError('') }}><option value="">Selecione seu nome</option>{info.athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}</select><p className="collection-hint">Seu nome não está na lista? Solicite o cadastro à comissão técnica.</p></>}
          {!review && section.fields.filter(field => visibleHistoryField(field, answers)).map(field => <div className="history-field" key={field.key}>
            <label htmlFor={`history-${field.key}`}>{field.label}{field.optional ? ' (opcional)' : ' *'}</label>
            {field.type === 'select' ? <select id={`history-${field.key}`} value={answers[field.key] ?? ''} onChange={e => update(field, e.target.value)} required={!field.optional}><option value="">Selecionar</option>{historyOptions(field).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
              : field.type === 'textarea' ? <textarea id={`history-${field.key}`} rows={4} maxLength={field.max} value={answers[field.key] ?? ''} onChange={e => update(field, e.target.value)} required={!field.optional}/>
                : <input id={`history-${field.key}`} type={field.type === 'date' ? 'date' : 'text'} inputMode={field.type === 'integer' ? 'numeric' : field.type === 'decimal' ? 'decimal' : undefined} maxLength={field.max || (field.type === 'text' ? 255 : undefined)} autoComplete="off" value={answers[field.key] ?? ''} onChange={e => update(field, e.target.value)} required={!field.optional} placeholder={field.key === 'heightCm' ? 'Ex.: 181' : field.key === 'weightKg' ? 'Ex.: 78,5' : undefined}/>}
          </div>)}
          {review && <><p>Atleta selecionado: <strong>{athlete?.name}</strong>. Use “Voltar” para corrigir antes de enviar.</p>{HISTORY_SECTIONS.map((s, index) => <div className="history-review-section" key={s.title}><div className="flex justify-between items-center gap-3"><h3>{s.title}</h3><button type="button" onClick={() => move(index)} className="text-xs underline">Editar</button></div><dl>{s.fields.filter(field => visibleHistoryField(field, answers)).map(field => <div key={field.key}><dt>{field.label}</dt><dd>{historyValue(field, answers[field.key])}</dd></div>)}</dl></div>)}</>}
        </section>
        {error && <div ref={alert} tabIndex={-1} role="alert" className="collection-error">{error}</div>}
        <div className="collection-actions">{step > 0 && <button type="button" className="collection-back" disabled={sending} onClick={() => move(step - 1)}><ArrowLeft size={17}/>Voltar</button>}<button type="submit" className="collection-primary" disabled={sending}>{sending ? 'Enviando…' : review ? 'Enviar questionário' : 'Avançar'}<ArrowRight size={17}/></button></div>
      </form>
    </>}
    <footer className="collection-footer"><p>Ângelo Melim · Preparador físico e fisiologista</p><AthravenBrand badge/></footer>
  </div></main>
}
