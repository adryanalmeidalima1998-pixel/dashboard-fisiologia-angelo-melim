'use client'
import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { ArrowUpRight, ArrowRight, LogOut } from 'lucide-react'
import { OWNER, SEASONS, seasonHref } from '@/lib/seasons.mjs'
import AthravenBrand from '@/components/AthravenBrand'
export default function SeasonPicker() {
  const [opening, setOpening] = useState(null)
  function open(season) {
    setOpening(season.id)
    window.location.assign(seasonHref('/fisiologia', season.id))
  }
  return <div className="personal-shell">
    <header className="personal-topbar"><div className="personal-wordmark"><span className="am-mark">AM<span>·</span></span><div><strong>{OWNER.name}</strong><small>FISIOLOGIA & PERFORMANCE</small></div></div><button className="quiet-button" onClick={() => { try { sessionStorage.removeItem('angelo:season') } catch {} signOut({ callbackUrl: '/login' }) }}><LogOut size={16} /> Sair</button></header>
    <main className="seasons-main">
      <div className="season-intro"><div><h1>Temporadas</h1><p>Selecione o clube e a temporada para consultar os dados.</p></div><div className="season-counter"><strong>{String(SEASONS.length).padStart(2, '0')}</strong><span>TEMPORADAS<br />DISPONÍVEIS</span></div></div>
      <div className="season-cards">{SEASONS.map(s => <button key={s.id} onClick={() => open(s)} disabled={!!opening} className={`season-card ${s.theme}`} aria-label={`Abrir ${s.year} ${s.shortName}`}>
        <div className="season-card-top"><span>{s.label}</span><ArrowUpRight size={23} /></div>
        <div className="season-card-visual"><div className="season-year-watermark">{s.year}</div><img src={s.logo} alt={`Escudo do ${s.shortName}`} /></div>
        <div className="season-card-copy"><div><span className="season-year-label">TEMPORADA {s.year}</span><h2>{s.shortName}</h2><p>{s.location}</p></div><span className="season-enter"><ArrowRight size={23} /></span></div>
        <div className="season-card-bottom">{opening === s.id ? 'Abrindo temporada…' : 'Acessar dashboard'}<span>Fisiologia & performance</span></div>
      </button>)}</div>
    </main><footer className="personal-footer"><div className="personal-footer__owner"><strong>{OWNER.name}</strong><span>{OWNER.role}</span></div><AthravenBrand license /></footer>
  </div>
}
