import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { supabase } from './supabase'
import { motion } from 'framer-motion'
import { LogIn, UserPlus, Mail, Lock, Loader2, User, Users, KeyRound, ArrowLeft, Eye, EyeOff, Trash2, CheckSquare } from 'lucide-react'

type AuthView = 'signin' | 'signup' | 'reset'

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [view, setView] = useState<AuthView>('signin')
  const [resetSent, setResetSent] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [lockedEmail, setLockedEmail] = useState(false)
  const [lockedTeam, setLockedTeam] = useState(false)

  const [taskAssignedPrompt, setTaskAssignedPrompt] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('invite') === 'true') {
      const inviteEmail = params.get('email') || ''
      const inviteTeam = params.get('team') || ''
      if (inviteEmail) { setEmail(inviteEmail); setLockedEmail(true) }
      if (inviteTeam) { setTeamName(inviteTeam); setLockedTeam(true) }
      setView('signup')
      window.history.replaceState({}, '', window.location.pathname)
    } else if (params.get('view') === 'assigned_to_me') {
      setTaskAssignedPrompt(true)
      setView('signup')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (view === 'reset') {
      const { data, error } = await supabase.functions.invoke('reset-password', {
        body: { email },
      })
      if (error || data?.error) {
        toast.error('No account found with that email address.')
      } else {
        setResetSent(true)
        toast.success('Password reset email sent!')
      }
      setLoading(false)
      return
    }

    if (view === 'signup') {
      // 1. Check if the team already exists
      const { count, error: teamCheckErr } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('team_name', teamName || 'General')

      let isNewTeam = false
      if (teamCheckErr) {
        console.error('Error checking team:', teamCheckErr)
      } else if (count === 0) {
        isNewTeam = true
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, team_name: teamName || 'General' }
        }
      })
      
      if (error) {
        toast.error(error.message)
      } else if (data.user) {
        // Insert profile
        await supabase.from('profiles').insert([{
          id: data.user.id,
          full_name: fullName,
          email,
          team_name: teamName || 'General',
          role: isNewTeam ? 'admin' : 'member',
        }])

        // If joined via invite, update invitation status
        if (!isNewTeam) {
          await supabase
            .from('team_invitations')
            .update({ status: 'accepted' })
            .eq('team_name', teamName || 'General')
            .eq('invited_email', email)
        }

        toast.success(isNewTeam ? 'Account created! You are the team admin.' : 'Account created! Please sign in.')
        setView('signin')
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        toast.error(error.message)
      } else {
        toast.success('Welcome back!')
      }
    }
    setLoading(false)
  }

  const inputLabel = (text: string, icon: React.ReactNode) => (
    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
      {icon} {text}
    </label>
  )

  const clearForm = () => { setEmail(''); setPassword(''); setFullName(''); setTeamName('') }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top navbar */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 28px', borderBottom: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
        <h1 className="gradient-text" style={{ fontSize: '1.4rem', fontWeight: 700 }}>TaskTracker</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setView('signin')}
            title="Sign In"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: view === 'signin' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)', color: view === 'signin' ? '#a5b4fc' : '#94a3b8', border: `1px solid ${view === 'signin' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}`, fontSize: '0.82rem', fontWeight: 600 }}
          >
            <LogIn size={15} /> Sign In
          </button>
          <button
            onClick={() => setView('signup')}
            title="Create account"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', borderRadius: '10px', background: view === 'signup' ? 'rgba(99,102,241,0.25)' : 'rgba(255,255,255,0.08)', color: view === 'signup' ? '#a5b4fc' : '#94a3b8', border: `1px solid ${view === 'signup' ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.12)'}`, fontSize: '0.82rem', fontWeight: 600 }}
          >
            <User size={15} /> Register
          </button>
          <button
            onClick={clearForm}
            title="Clear form"
            style={{ display: 'flex', alignItems: 'center', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.08)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <Trash2 size={15} />
          </button>
        </div>
      </nav>

      {/* Auth card */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' }}>
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
        style={{ padding: '40px', width: '100%', maxWidth: '420px' }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {view !== 'signin' && (
            <button onClick={() => { setView('signin'); setResetSent(false) }} style={{ background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
              <ArrowLeft size={15} /> Back to Sign In
            </button>
          )}
          {taskAssignedPrompt && view === 'signup' && (
            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckSquare size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: '0.85rem', color: 'var(--primary)', textAlign: 'left', margin: 0 }}>
                You have tasks assigned to you! Create an account to view them.
              </p>
            </div>
          )}
          <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 700 }}>
            {view === 'signup' ? 'Join the Team' : view === 'reset' ? 'Reset Password' : 'Welcome Back'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {view === 'signup' ? 'Create your professional profile' : view === 'reset' ? 'Enter your email to receive a reset link' : 'Sign in to access your dashboard'}
          </p>
        </div>

        {/* Reset confirmation */}
        {view === 'reset' && resetSent ? (
          <div style={{ textAlign: 'center', padding: '20px', background: 'rgba(16,185,129,0.08)', borderRadius: '16px', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Mail size={32} color="#10b981" style={{ margin: '0 auto 12px' }} />
            <p style={{ color: '#10b981', fontWeight: 600 }}>Check your inbox</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>We sent a password reset link to <strong style={{ color: 'white' }}>{email}</strong></p>
            <button onClick={() => { setView('signin'); setResetSent(false) }} style={{ background: 'transparent', color: 'var(--primary)', marginTop: '16px', fontSize: '0.85rem' }}>
              Back to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {view === 'signup' && (
              <>
                <div>
                  {inputLabel('Full Name', <User size={16} />)}
                  <input required value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Himanshu Thakur" style={{ width: '100%' }} />
                </div>
                <div>
                  {inputLabel('Team Name', <Users size={16} />)}
                  <input required value={teamName} onChange={e => !lockedTeam && setTeamName(e.target.value)} placeholder="e.g. Marketing, Sales, IT" style={{ width: '100%', opacity: lockedTeam ? 0.6 : 1, cursor: lockedTeam ? 'not-allowed' : 'text' }} readOnly={lockedTeam} />
                </div>
              </>
            )}

            <div>
              {inputLabel('Email Address', <Mail size={16} />)}
              <input required type="email" value={email} onChange={e => !lockedEmail && setEmail(e.target.value)} placeholder="name@company.com" style={{ width: '100%', opacity: lockedEmail ? 0.6 : 1, cursor: lockedEmail ? 'not-allowed' : 'text' }} readOnly={lockedEmail} />
            </div>

            {view !== 'reset' && (
              <div>
                {inputLabel('Password', <Lock size={16} />)}
                <div style={{ position: 'relative' }}>
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={6}
                    style={{ width: '100%', paddingRight: '44px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    style={{
                      position: 'absolute', right: '10px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'rgba(128,128,128,0.12)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: '6px',
                      color: 'var(--text-muted)',
                      padding: '4px 6px',
                      display: 'flex', alignItems: 'center',
                      zIndex: 2, cursor: 'pointer',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="primary-gradient"
              style={{ marginTop: '12px', height: '48px', borderRadius: '12px', color: 'white', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : (
                view === 'signup' ? <UserPlus size={20} /> : view === 'reset' ? <KeyRound size={20} /> : <LogIn size={20} />
              )}
              {view === 'signup' ? 'Create Account' : view === 'reset' ? 'Send Reset Link' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Footer links */}
        {!resetSent && (
          <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {view === 'signin' && (
              <>
                <button onClick={() => setView('signup')} style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.9rem' }}>
                  Don't have an account? Sign Up
                </button>
                <button onClick={() => setView('reset')} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  Forgot password?
                </button>
              </>
            )}
            {view === 'signup' && (
              <button onClick={() => setView('signin')} style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.9rem' }}>
                Already have an account? Sign In
              </button>
            )}
          </div>
        )}
      </motion.div>
      </div>
    </div>
  )
}
