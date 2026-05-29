import { useNavigate, useOutletContext } from 'react-router-dom'
import { motion } from 'framer-motion'
import { TaskForm } from '../components/tasks/TaskForm'
import { type AppContext } from '../components/layout/AppLayout'

export function NewTaskPage() {
  const navigate = useNavigate()
  const { session } = useOutletContext<AppContext>()
  const user = session.user
  const fullName = user.user_metadata.full_name || 'User'
  const userEmail = user.email || ''

  return (
    <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto', height: '100%' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }} className="gradient-text">Create New Task</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>Assign a task to yourself or a team member.</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <TaskForm
          onTaskAdded={() => navigate('/tasks')}
          userId={user.id}
          userEmail={userEmail}
          fullName={fullName}
          teamName={user.user_metadata.team_name}
          onCancel={() => navigate('/tasks')}
        />
      </motion.div>
    </div>
  )
}
