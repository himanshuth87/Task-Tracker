import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell,
} from 'recharts'
import { type Task } from '../../supabase'
import { dailyRollup, summarizeByPerson, STATUS_COLORS } from '../../utils/misUtils'

interface MISChartsProps {
  tasks: Task[]
}

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

const cardStyle: React.CSSProperties = { padding: '20px' }
const titleStyle: React.CSSProperties = { fontSize: '0.95rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-main)' }

export function MISCharts({ tasks }: MISChartsProps) {
  const people = summarizeByPerson(tasks)
  const days = dailyRollup(tasks)

  // Productivity % per day (photographers)
  const prodTrend = days.map(d => ({ date: d.date.slice(5), Productivity: Math.round(d.productivity * 100) }))

  // Approved vs rejected per person (designers)
  const approval = people
    .filter(p => p.designerTasks > 0)
    .map(p => ({
      name: p.person.split('@')[0],
      'Approval %': Math.round(p.approvalRate * 100),
      'Rejection %': Math.round(p.rejectionRate * 100),
    }))

  // On-time delivery per person
  const onTime = people.map(p => ({
    name: p.person.split('@')[0],
    'On-time %': Math.round(p.onTimeRate * 100),
  }))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      <div className="glass-card" style={cardStyle}>
        <h3 style={titleStyle}>Daily Productivity % (Photography)</h3>
        {prodTrend.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={prodTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="Productivity" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass-card" style={cardStyle}>
        <h3 style={titleStyle}>Approval vs Rejection (Design)</h3>
        {approval.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={approval}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="Approval %" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Rejection %" fill="#f43f5e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="glass-card" style={cardStyle}>
        <h3 style={titleStyle}>On-time Delivery %</h3>
        {onTime.length === 0 ? <Empty /> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={onTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--glass-border)" />
              <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} />
              <YAxis stroke="var(--text-muted)" fontSize={11} unit="%" />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="On-time %" radius={[4, 4, 0, 0]}>
                {onTime.map((o, i) => (
                  <Cell key={i} fill={o['On-time %'] >= 80 ? STATUS_COLORS.Excellent : o['On-time %'] >= 60 ? STATUS_COLORS.Average : STATUS_COLORS.Low} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}

function Empty() {
  return <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '60px 0' }}>No data yet.</p>
}
