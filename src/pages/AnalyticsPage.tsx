import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { BarChart2, Loader2 } from 'lucide-react'
import { AnalyticsCharts } from '../components/ui/AnalyticsCharts'
import { taskService } from '../services/taskService'
import { type Task } from '../supabase'
import type { AppContext } from '../components/layout/AppLayout'

export function AnalyticsPage() {
  const { session, viewMode } = useOutletContext<AppContext>()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await taskService.fetchAllTasks(session, viewMode, 'all')
      setTasks((data as Task[]) || [])
      setLoading(false)
    }
    load()
  }, [session, viewMode])

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart2 size={22} color="var(--primary)" /> Analytics
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Visual breakdown of task status, priority, trends, and workload.
        </p>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}>
          <Loader2 size={28} color="var(--primary)" className="animate-spin" />
        </div>
      ) : (
        <AnalyticsCharts tasks={tasks} />
      )}
    </div>
  )
}
