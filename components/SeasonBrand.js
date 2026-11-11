'use client'
import { useSeason } from '@/app/context/SeasonContext'
export function SeasonLogo(props) {
  const { season } = useSeason()
  return <img {...props} src={season.logo} alt={`Escudo do ${season.shortName}`} />
}
export function SeasonClub({ short = false }) {
  const { season } = useSeason()
  return <>{short ? season.shortName : season.club}</>
}
