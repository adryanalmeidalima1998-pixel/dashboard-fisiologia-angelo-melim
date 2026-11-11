'use client'
import { SessionProvider } from 'next-auth/react'
import { SeasonProvider } from './context/SeasonContext'
export function Providers({ children }) {
  return <SessionProvider refetchInterval={60} refetchOnWindowFocus><SeasonProvider>{children}</SeasonProvider></SessionProvider>
}
