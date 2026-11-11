import { redirect } from 'next/navigation'
import { getOwnerSession } from '@/lib/auth'
import SeasonPicker from '@/components/SeasonPicker'
export default async function SeasonsPage() {
  if (!(await getOwnerSession())) redirect('/login')
  return <SeasonPicker />
}
