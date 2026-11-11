import { redirect } from 'next/navigation'
import { getOwnerSession } from '@/lib/auth'
import DataStatus from '@/components/DataStatus'
import Sidebar from '@/components/Sidebar'
import SeasonWorkspace from '@/components/SeasonWorkspace'
export default async function FisiologiaLayout({ children }) {
  if (!(await getOwnerSession())) redirect('/login')
  return <SeasonWorkspace><div className="flex min-h-screen bg-white"><Sidebar /><main className="flex-1 min-w-0 overflow-x-hidden"><DataStatus />{children}</main></div></SeasonWorkspace>
}
