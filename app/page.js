import { redirect } from 'next/navigation'
import { getOwnerSession } from '@/lib/auth'
export default async function RootPage() { redirect((await getOwnerSession()) ? '/temporadas' : '/login') }
