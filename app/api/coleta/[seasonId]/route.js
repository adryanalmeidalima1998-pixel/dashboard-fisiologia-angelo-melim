import {runSeasonDatabase} from '@/lib/season-server'
import {createCollectionHandlers} from '@/lib/collection-handler.mjs'
export const runtime='nodejs'
export const{GET,POST}=createCollectionHandlers({runDatabase:runSeasonDatabase,secret:()=>process.env.NEXTAUTH_SECRET,canonicalOrigin:()=>process.env.NEXTAUTH_URL?new URL(process.env.NEXTAUTH_URL).origin:null})
