import {withSeason} from '@/lib/season-server'
import {readWellnessRecords} from '@/lib/wellness-history.mjs'
export const GET=withSeason(async function GET(request,{season}){return Response.json(await readWellnessRecords(season))})
