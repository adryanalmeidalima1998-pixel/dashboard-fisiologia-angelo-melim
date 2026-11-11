import { redirect } from 'next/navigation'
import { getOwnerSession } from '@/lib/auth'
import SeasonWorkspace from '@/components/SeasonWorkspace'
export default async function PrintLayout({ children }) {
  if (!(await getOwnerSession())) redirect('/login')
  return <SeasonWorkspace>{children}</SeasonWorkspace>
}
