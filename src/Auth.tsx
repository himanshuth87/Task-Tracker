import { useState } from 'react'
import { toast } from 'sonner'
import { supabase } from './supabase'
import { motion } from 'framer-motion'
import { LogIn, UserPlus, Mail, Lock, Loader2, User, Users, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react'

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

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (view === 'reset') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}`,
      })
      if (error) {
        toast.error(error.message)
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

      // 2. If team exists, verify invitation
      if (!isNewTeam) {
        const { data: invite, error: inviteErr } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('team_name', teamName || 'General')
          .eq('invited_email', email)
          .eq('status', 'pending')
          .single()

        if (!invite || inviteErr) {
          toast.error(`Team "${teamName || 'General'}" already exists. You need an invitation to join.`)
          setLoading(false)
          return
        }
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

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
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
                  <input required value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. Marketing, Sales, IT" style={{ width: '100%' }} />
                </div>
              </>
            )}

            <div>
              {inputLabel('Email Address', <Mail size={16} />)}
              <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@company.com" style={{ width: '100%' }} />
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
                      position: 'absolute', right: '12px', top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent', color: 'var(--text-muted)',
                      padding: '4px', display: 'flex', alignItems: 'center',
                    }}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
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
  )
}
