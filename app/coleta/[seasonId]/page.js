import {notFound} from 'next/navigation'
import {findSeason} from '@/lib/seasons.mjs'
import AthleteCollection from '@/components/AthleteCollection'
export const metadata={title:'Coleta de bem-estar e esforço',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function CollectionPage({params}){const{seasonId}=await params,season=findSeason(seasonId);if(!season)notFound();return <AthleteCollection season={season}/>}
