'use client'
import AthravenBrand from '@/components/AthravenBrand'
import { useSeason } from '@/app/context/SeasonContext'
import { OWNER } from '@/lib/seasons.mjs'

export default function WorkspaceFooter() {
  const { season } = useSeason()
  return <footer className="workspace-footer">
    <div className="workspace-footer__owner"><strong>{OWNER.name}</strong><span>{season.shortName} · Temporada {season.year}</span></div>
    <AthravenBrand license />
  </footer>
}
