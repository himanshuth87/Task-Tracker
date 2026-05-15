import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { type Task } from '../../supabase'
import { getDaysRemaining } from '../../utils/dateUtils'

interface AnalyticsChartsProps {
  tasks: Task[]
}

const COLORS = { pending: '#94a3b8', in_progress: '#3b82f6', blocked: '#f43f5e', completed: '#10b981' }
const PRIORITY_COLORS = { low: '#10b981', medium: '#f59e0b', high: '#f43f5e' }

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: 'var(--card-bg)', border: '1px solid var(--glass-border)', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
        <p style={{ color: 'var(--text-main)', fontSize: '0.82rem', marginBottom: '4px' }}>{label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} style={{ color: p.color, fontSize: '0.8rem' }}>{p.name}: {p.value}</p>
        ))}
      </div>
    )
  }
  return null
}

export function AnalyticsCharts({ tasks }: AnalyticsChartsProps) {
  // Status breakdown
  const statusData = [
    { name: 'Pending', value: tasks.filter(t => t.status === 'pending').length, color: COLORS.pending },
    { name: 'In Progress', value: tasks.filter(t => t.status === 'in_progress').length, color: COLORS.in_progress },
    { name: 'Blocked', value: tasks.filter(t => t.status === 'blocked').length, color: COLORS.blocked },
    { name: 'Done', value: tasks.filter(t => t.status === 'completed').length, color: COLORS.completed },
  ].filter(d => d.value > 0)

  // Priority breakdown
  const priorityData = [
    { name: 'Low', value: tasks.filter(t => t.priority === 'low').length, color: PRIORITY_COLORS.low },
    { name: 'Medium', value: tasks.filter(t => t.priority === 'medium').length, color: PRIORITY_COLORS.medium },
    { name: 'High', value: tasks.filter(t => t.priority === 'high').length, color: PRIORITY_COLORS.high },
  ]

  // Weekly completion trend (last 7 weeks)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - (6 - i) * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const created = tasks.filter(t => {
      const d = new Date(t.created_at)
      return d >= weekStart && d < weekEnd
    }).length
    const completed = tasks.filter(t => {
      if (t.status !== 'completed') return false
      const d = new Date(t.created_at)
      return d >= weekStart && d < weekEnd
    }).length
    const label = `W${i + 1}`
    return { name: label, Created: created, Completed: completed }
  })

  // Overdue by assignee
  const assigneeMap: Record<string, number> = {}
  tasks.forEach(t => {
    if (t.status !== 'completed' && getDaysRemaining(t.deadline) !== null && (getDaysRemaining(t.deadline) ?? 0) < 0) {
      const key = t.assigned_to_email?.split('@')[0] || t.task_giver?.split(' ')[0] || 'Unknown'
      assigneeMap[key] = (assigneeMap[key] || 0) + 1
    }
  })
  const overdueData = Object.entries(assigneeMap).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([name, value]) => ({ name, value }))

  const chartStyle = { padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '18px', border: '1px solid var(--glass-border)' }
  const titleStyle = { fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: '16px' }
  const tickStyle = { fontSize: 12, fill: 'var(--text-muted)' } as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Status + Priority side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        <div style={chartStyle}>
          <p style={titleStyle}>By Status</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={statusData} cx="50%" cy="45%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                {statusData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div style={chartStyle}>
          <p style={titleStyle}>By Priority</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={priorityData} barSize={40}>
              <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
              <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                {priorityData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Weekly trend — full width */}
      <div style={chartStyle}>
        <p style={titleStyle}>Weekly Trend</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} />
            <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend iconSize={8} formatter={(v) => <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v}</span>} />
            <Line type="monotone" dataKey="Created" stroke="#6366f1" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Completed" stroke="#10b981" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Overdue by person */}
      {overdueData.length > 0 && (
        <div style={chartStyle}>
          <p style={titleStyle}>Overdue Tasks by Person</p>
          <ResponsiveContainer width="100%" height={Math.max(160, overdueData.length * 36)}>
            <BarChart data={overdueData} layout="vertical" barSize={18}>
              <XAxis type="number" tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={tickStyle} axisLine={false} tickLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill="#f43f5e" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
