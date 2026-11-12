'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
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
  return <main className="owner-login">
    <section className="owner-login-card" aria-label={`Acesso de ${OWNER.name}`}>
      <header className="owner-login-heading"><strong>{OWNER.name}</strong><span>Preparação física e fisiologia</span></header>
      <div className="owner-login-body">
        <h1>Acesso ao sistema</h1>
        <p className="owner-login-help">Informe seu usuário e sua senha.</p>
        <form className="owner-login-form" onSubmit={submit}>
          <label htmlFor="username">Usuário</label>
          <input id="username" name="username" autoComplete="username" placeholder="Seu usuário" value={username} onChange={e=>setUsername(e.target.value)} required autoCapitalize="none" spellCheck={false} />
          <label htmlFor="password">Senha</label>
          <div className="owner-password-field">
            <input id="password" name="password" autoComplete="current-password" type={show?'text':'password'} placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} required />
            <button type="button" aria-label={show?'Ocultar senha':'Mostrar senha'} onClick={()=>setShow(!show)}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button>
          </div>
          {error&&<p role="alert" className="owner-login-error">{error}</p>}
          <button className="owner-login-submit" disabled={loading}>{loading?'Entrando…':'Entrar'}<ArrowRight size={18}/></button>
        </form>
        <div className="owner-login-brand"><AthravenBrand badge license /></div>
      </div>
    </section>
  </main>
}
