import { useState, useEffect } from 'react'
import { Link2, X, Search } from 'lucide-react'
import { toast } from 'sonner'
import { supabase, type Task } from '../../supabase'

interface TaskDependenciesProps {
  taskId: string
  teamName: string
}

type DepRow = { id: string; depends_on_task_id: string; depends_on: Task }

export function TaskDependencies({ taskId, teamName }: TaskDependenciesProps) {
  const [deps, setDeps] = useState<DepRow[]>([])
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<Task[]>([])
  const [showSearch, setShowSearch] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('task_dependencies')
      .select('*, depends_on:depends_on_task_id(id, title, status, priority)')
      .eq('task_id', taskId)
    setDeps((data as DepRow[]) || [])
  }

  useEffect(() => { load() }, [taskId])

  useEffect(() => {
    if (!search.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from('tasks')
        .select('id, title, status, priority, team_name')
        .eq('team_name', teamName)
        .ilike('title', `%${search}%`)
        .neq('id', taskId)
        .limit(8)
      setResults((data as Task[]) || [])
    }, 300)
    return () => clearTimeout(t)
  }, [search, teamName, taskId])

  const addDep = async (dep: Task) => {
    if (deps.find(d => d.depends_on_task_id === dep.id)) {
      toast.error('Already added')
      return
    }
    const { error } = await supabase
      .from('task_dependencies')
      .insert([{ task_id: taskId, depends_on_task_id: dep.id }])
    if (error) {
      toast.error('Failed to add dependency')
    } else {
      toast.success('Dependency added')
      setSearch('')
      setResults([])
      setShowSearch(false)
      await load()
    }
  }

  const removeDep = async (depId: string) => {
    setDeps(prev => prev.filter(d => d.id !== depId))
    await supabase.from('task_dependencies').delete().eq('id', depId)
  }

  const STATUS_COLOR: Record<string, string> = {
    pending: 'rgba(255,255,255,0.4)', in_progress: '#3b82f6', blocked: '#f43f5e', completed: '#10b981'
  }

  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Dependencies
        </span>
        <button
          onClick={() => setShowSearch(v => !v)}
          style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Link2 size={13} /> Link Task
        </button>
      </div>

      {deps.length === 0 && !showSearch && (
        <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.2)', marginBottom: '8px' }}>No dependencies. This task can start independently.</p>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '8px' }}>
        {deps.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLOR[d.depends_on?.status] || 'gray', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: '0.82rem', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {d.depends_on?.title || 'Unknown task'}
            </span>
            <span style={{ fontSize: '0.7rem', color: STATUS_COLOR[d.depends_on?.status] }}>
              {d.depends_on?.status?.replace('_', ' ')}
            </span>
            <button onClick={() => removeDep(d.id)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', padding: '2px' }}>
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      {showSearch && (
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '8px 12px' }}>
            <Search size={13} color="var(--text-muted)" />
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks to link..."
              style={{ flex: 1, background: 'transparent', border: 'none', fontSize: '0.85rem', padding: 0, outline: 'none', color: 'var(--text-main)' }}
            />
          </div>
          {results.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '12px', overflow: 'hidden', zIndex: 50 }}>
              {results.map(t => (
                <button
                  key={t.id}
                  onClick={() => addDep(t)}
                  style={{ width: '100%', padding: '10px 14px', background: 'transparent', color: 'var(--text-main)', fontSize: '0.85rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: STATUS_COLOR[t.status], flexShrink: 0 }} />
                    {t.title}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
