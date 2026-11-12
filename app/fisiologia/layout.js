import { redirect } from 'next/navigation'
import { getOwnerSession } from '@/lib/auth'
import DataStatus from '@/components/DataStatus'
import Sidebar from '@/components/Sidebar'
import SeasonWorkspace from '@/components/SeasonWorkspace'
import WorkspaceFooter from '@/components/WorkspaceFooter'
export default async function FisiologiaLayout({ children }) {
  if (!(await getOwnerSession())) redirect('/login')
  return <SeasonWorkspace><div className="flex min-h-screen bg-white"><Sidebar /><main className="workspace-main flex-1 min-w-0 overflow-x-hidden"><div className="workspace-content"><DataStatus />{children}</div><WorkspaceFooter /></main></div></SeasonWorkspace>
}
