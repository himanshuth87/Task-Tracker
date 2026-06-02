import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import { supabase } from './supabase'
import { Auth } from './Auth'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import type { Session } from '@supabase/supabase-js'

function SetNewPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) { toast.error('Passwords do not match'); return }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Password updated successfully!')
      onDone()
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card" style={{ padding: '40px', width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 700 }}>Set New Password</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Enter and confirm your new password</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Lock size={14} /> New Password
            </label>
            <div style={{ position: 'relative' }}>
              <input required type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" minLength={6} style={{ width: '100%', paddingRight: '44px' }} />
              <button type="button" onClick={() => setShow(v => !v)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(128,128,128,0.12)', border: '1px solid var(--glass-border)', borderRadius: '6px', color: 'var(--text-muted)', padding: '4px 6px', display: 'flex', alignItems: 'center' }}>
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Lock size={14} /> Confirm Password
            </label>
            <input required type={show ? 'text' : 'password'} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" minLength={6} style={{ width: '100%' }} />
          </div>
          <button type="submit" disabled={loading} className="primary-gradient" style={{ marginTop: '12px', height: '48px', borderRadius: '12px', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
            Update Password
          </button>
        </form>
      </motion.div>
    </div>
  )
}

import { AppLayout } from './components/layout/AppLayout'
import { DashboardPage } from './pages/DashboardPage'
import { TasksPage } from './pages/TasksPage'
import { NewTaskPage } from './pages/NewTaskPage'
import { AnalyticsPage } from './pages/AnalyticsPage'
import { CalendarPage } from './pages/CalendarPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [isRecovery, setIsRecovery] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') setIsRecovery(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (authLoading) return null
  if (!session) return <Auth />
  if (isRecovery) return <SetNewPassword onDone={() => setIsRecovery(false)} />

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout session={session} />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="tasks/new" element={<NewTaskPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
