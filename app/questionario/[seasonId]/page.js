import { notFound } from 'next/navigation'
import { findSeason } from '@/lib/seasons.mjs'
import AthleteHistoryQuestionnaire from '@/components/AthleteHistoryQuestionnaire'
export const metadata = { title: 'Questionário de histórico de atleta', robots: { index: false, follow: false }, referrer: 'no-referrer' }
export default async function QuestionnairePage({ params }) {
  const { seasonId } = await params, season = findSeason(seasonId)
  if (!season) notFound()
  return <AthleteHistoryQuestionnaire season={season}/>
}
