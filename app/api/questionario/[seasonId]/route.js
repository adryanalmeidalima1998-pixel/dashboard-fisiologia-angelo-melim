import {runSeasonDatabase} from '@/lib/season-server'
import {createHistoryHandlers} from '@/lib/athlete-history-handler.mjs'
export const runtime='nodejs'
export const{GET,POST}=createHistoryHandlers({runDatabase:runSeasonDatabase,secret:()=>process.env.NEXTAUTH_SECRET,canonicalOrigin:()=>process.env.NEXTAUTH_URL?new URL(process.env.NEXTAUTH_URL).origin:null})
