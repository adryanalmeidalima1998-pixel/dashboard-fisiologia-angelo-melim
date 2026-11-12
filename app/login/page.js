'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { ArrowRight, Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { OWNER } from '@/lib/seasons.mjs'
import AthravenBrand from '@/components/AthravenBrand'
export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function submit(event) {
    event.preventDefault(); setLoading(true); setError('')
    try {
      const result = await signIn('credentials', { username, password, redirect: false })
      if (!result || result.error) { setError('Não foi possível entrar. Confira seu usuário e sua senha.'); return }
      try { sessionStorage.removeItem('angelo:season') } catch {}
      window.location.assign('/temporadas')
    } catch { setError('Falha de conexão. Tente novamente.') }
    finally { setLoading(false) }
  }
  return <div className="login-shell">
    <section className="login-editorial"><div className="personal-wordmark"><span className="am-mark">AM<span>·</span></span><div><strong>{OWNER.name}</strong><small>FISIOLOGIA & PERFORMANCE</small></div></div><div className="login-story"><div className="eyebrow">PREPARAÇÃO FÍSICA E FISIOLOGIA</div><h1>Central de<br /><span>fisiologia</span></h1><p>Atletas, sessões, avaliações físicas<br />e relatórios por temporada.</p><div className="login-track" aria-hidden="true"><i /><i /><i /></div></div><div className="login-signature"><strong>{OWNER.name}</strong><span>{OWNER.role}</span></div></section>
    <main className="login-form-side"><form className="login-form" onSubmit={submit}><span className="login-lock"><LockKeyhole size={21} /></span><p className="eyebrow">ACESSO PESSOAL</p><h2>Acesso ao sistema</h2><p className="login-help">Informe seu usuário e sua senha.</p><label htmlFor="username">Usuário</label><input id="username" name="username" autoComplete="username" placeholder="Seu usuário" value={username} onChange={e=>setUsername(e.target.value)} required autoCapitalize="none" spellCheck={false} /><label htmlFor="password">Senha</label><div className="password-field"><input id="password" name="password" autoComplete="current-password" type={show?'text':'password'} placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} required /><button type="button" aria-label={show?'Ocultar senha':'Mostrar senha'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{error&&<p role="alert" className="login-error">{error}</p>}<button className="login-submit" disabled={loading}>{loading?'Entrando…':'Entrar no dashboard'}<ArrowRight size={19}/></button></form></main>
    <footer className="login-brand-footer"><AthravenBrand license /></footer>
  </div>
}
