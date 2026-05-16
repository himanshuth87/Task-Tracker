import { useOutletContext, useNavigate } from 'react-router-dom'
import { DashboardView } from '../components/dashboard/DashboardView'
import type { AppContext } from '../components/layout/AppLayout'

export function DashboardPage() {
  const { session, viewMode } = useOutletContext<AppContext>()
  const navigate = useNavigate()

  return (
    <DashboardView
      session={session}
      viewMode={viewMode}
      onNavigateToTasks={() => navigate('/tasks')}
    />
  )
}
