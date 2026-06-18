import { useState, useEffect, useMemo } from 'react'
import { useOutletContext, Navigate } from 'react-router-dom'
import { BarChart3, Loader2, ShieldAlert } from 'lucide-react'
import { taskService } from '../services/taskService'
import { supabase, type Task } from '../supabase'
import type { AppContext } from '../components/layout/AppLayout'
import { MISCharts } from '../components/ui/MISCharts'
import {
  summarizeByPerson, dailyRollup, STATUS_COLORS, pct, type PersonSummary,
} from '../utils/misUtils'

type RoleState = 'loading' | 'allowed' | 'denied'

export function MISDashboardPage() {
  const { session } = useOutletContext<AppContext>()
  const [roleState, setRoleState] = useState<RoleState>('loading')
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [personFilter, setPersonFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Gate: only managers/admins (the head) may view this page.
  useEffect(() => {
    let active = true
    supabase.from('profiles').select('role').eq('id', session.user.id).single().then(({ data }) => {
      if (!active) return
      const role = data?.role || session.user.user_metadata?.role
      setRoleState(role === 'manager' || role === 'admin' ? 'allowed' : 'denied')
    })
    return () => { active = false }
  }, [session.user.id])

  useEffect(() => {
    if (roleState !== 'allowed') return
    const load = async () => {
      setLoading(true)
      const { data } = await taskService.fetchAllTasks(session, 'team', 'all')
      setTasks(((data as Task[]) || []).filter(t => t.mis_role && t.mis_role !== 'none'))
      setLoading(false)
    }
    load()
  }, [session, roleState])

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (personFilter !== 'all' && (t.assigned_to_email || t.user_email) !== personFilter) return false
      const d = (t.start_date || t.created_at || '').slice(0, 10)
      if (fromDate && d < fromDate) return false
      if (toDate && d > toDate) return false
      return true
    })
  }, [tasks, personFilter, fromDate, toDate])

  const people = useMemo(() => summarizeByPerson(filtered), [filtered])
  const days = useMemo(() => dailyRollup(filtered), [filtered])
  const personOptions = useMemo(() => {
    const set = new Set<string>()
    tasks.forEach(t => set.add(t.assigned_to_email || t.user_email || 'Unassigned'))
    return Array.from(set).sort()
  }, [tasks])

  if (roleState === 'loading') {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 size={28} color="var(--primary)" className="animate-spin" /></div>
  }
  if (roleState === 'denied') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <BarChart3 size={22} color="var(--primary)" /> MIS Dashboard
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldAlert size={14} /> Head-only view — marketing team productivity & delivery metrics.
        </p>
      </div>

      {/* Filters */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <FilterField label="Team Member">
          <select value={personFilter} onChange={e => setPersonFilter(e.target.value)}>
            <option value="all">All members</option>
            {personOptions.map(p => <option key={p} value={p}>{p.split('@')[0]}</option>)}
          </select>
        </FilterField>
        <FilterField label="From">
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        </FilterField>
        <FilterField label="To">
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
        </FilterField>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '80px' }}><Loader2 size={28} color="var(--primary)" className="animate-spin" /></div>
      ) : people.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
          No marketing MIS tasks found for this filter. Tasks created with a Designer or Photographer MIS role will appear here.
        </div>
      ) : (
        <>
          {/* Per-person summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {people.map(p => <PersonCard key={p.person} p={p} />)}
          </div>

          {/* Charts */}
          <div style={{ marginBottom: '24px' }}>
            <MISCharts tasks={filtered} />
          </div>

          {/* Daily rollup table */}
          {days.length > 0 && (
            <div className="glass-card" style={{ padding: '20px' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px' }}>Daily Review Summary (Photography)</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                      {['Date', 'Shoot Units', 'Edit Units', 'Shoot Hrs', 'Edit Hrs', 'Total Hrs', 'Productivity', 'Status'].map(h => (
                        <th key={h} style={{ padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {days.map(d => (
                      <tr key={d.date}>
                        <td style={cell}>{d.date}</td>
                        <td style={cell}>{d.shootUnits}</td>
                        <td style={cell}>{d.editUnits}</td>
                        <td style={cell}>{d.shootHours}</td>
                        <td style={cell}>{d.editHours}</td>
                        <td style={cell}>{d.totalHours}</td>
                        <td style={cell}>{pct(d.productivity)}</td>
                        <td style={cell}><StatusChip status={d.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

const cell: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--glass-border)', whiteSpace: 'nowrap' }

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '0.72rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </div>
  )
}

function StatusChip({ status }: { status: PersonSummary['status'] }) {
  const color = STATUS_COLORS[status]
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, color, background: `${color}1f`, padding: '2px 10px', borderRadius: '12px' }}>{status}</span>
  )
}

function Metric({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <p style={{ fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</p>
      <p style={{ fontSize: '1.05rem', fontWeight: 700, color: color || 'var(--text-main)' }}>{value}</p>
    </div>
  )
}

function PersonCard({ p }: { p: PersonSummary }) {
  return (
    <div className="glass-card" style={{ padding: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div>
          <p style={{ fontWeight: 700, fontSize: '1rem' }}>{p.person.split('@')[0]}</p>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {p.designerTasks > 0 && `${p.designerTasks} design`}
            {p.designerTasks > 0 && p.photographerTasks > 0 && ' · '}
            {p.photographerTasks > 0 && `${p.photographerTasks} shoot`} tasks
          </p>
        </div>
        <StatusChip status={p.status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
        {p.photographerTasks > 0 && <Metric label="Productivity" value={pct(p.productivity)} color="var(--primary)" />}
        {p.designerTasks > 0 && <Metric label="Approval" value={pct(p.approvalRate)} color="#10b981" />}
        {p.designerTasks > 0 && <Metric label="Rejection" value={pct(p.rejectionRate)} color="#f43f5e" />}
        <Metric label="On-time" value={pct(p.onTimeRate)} />
        {p.designerTasks > 0 && <Metric label="Avg Quality" value={`${p.avgQuality.toFixed(1)}/5`} />}
        <Metric label="Total Hrs" value={`${p.totalHours}h`} />
        {p.totalCreatives > 0 && <Metric label="Creatives" value={`${p.totalCreatives}`} />}
        {p.totalShootUnits > 0 && <Metric label="Shoot Units" value={`${p.totalShootUnits}`} />}
        {p.totalEditUnits > 0 && <Metric label="Edit Units" value={`${p.totalEditUnits}`} />}
      </div>
    </div>
  )
}
