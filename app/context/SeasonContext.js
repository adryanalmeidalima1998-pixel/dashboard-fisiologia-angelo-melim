'use client'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { findSeason, seasonHref, seasonStorage } from '@/lib/seasons.mjs'
const SeasonContext = createContext(null)
export function SeasonProvider({ children }) {
  const [season, setSeason] = useState(null)
  const [ready, setReady] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    let stored = null
    try { stored = sessionStorage.getItem('angelo:season') } catch {}
    const id = params.has('temporada') ? params.get('temporada') : stored
    const selected = findSeason(id)
    if (selected) { try { sessionStorage.setItem('angelo:season', selected.id) } catch {} }
    setSeason(selected); setReady(true)
  }, [pathname])
  const value = useMemo(() => ({
    season, ready,
    apiFetch: (url, options = {}) => {
      if (!season) throw new Error('Selecione uma temporada.')
      const headers = new Headers(options.headers)
      headers.set('X-Season-Id', season.id)
      return fetch(url, { ...options, headers, cache: 'no-store' }).then(response => {
        if (response.status === 401) router.replace('/login')
        return response
      })
    },
    storage: typeof window !== 'undefined' && season ? seasonStorage(window.localStorage, season.id) : null,
    href: path => seasonHref(path, season.id),
  }), [season, ready, router])
  const workspace = pathname.startsWith('/fisiologia') || pathname.startsWith('/print')
  useEffect(() => {
    if (!workspace) return
    if (status === 'unauthenticated' || (status === 'authenticated' && !session?.user)) router.replace('/login')
    else if (ready && !season) router.replace('/temporadas')
    if (season) {
      document.documentElement.dataset.club = season.theme
      document.title = `${season.shortName} ${season.year} · Ângelo Melim`
    }
    return () => { delete document.documentElement.dataset.club }
  }, [workspace, ready, season, status, session, router])
  if (workspace && (!ready || !season || !session?.user)) return <div className="gate-loading">Abrindo sua temporada…</div>
  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>
}
export function useSeason() {
  const context = useContext(SeasonContext)
  if (!context) throw new Error('Use SeasonProvider.')
  return context
}
