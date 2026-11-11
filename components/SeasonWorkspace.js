'use client'
import { DataProvider } from '@/app/context/DataContext'
import { useSeason } from '@/app/context/SeasonContext'
export default function SeasonWorkspace({ children }) {
  const { season } = useSeason()
  return <DataProvider key={season.id}>{children}</DataProvider>
}
