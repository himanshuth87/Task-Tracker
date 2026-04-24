import { useState } from 'react'
import { supabase } from './supabase'
import { motion } from 'framer-motion'
import { LogIn, UserPlus, Mail, Lock, Loader2, User, Users } from 'lucide-react'

export function Auth() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [teamName, setTeamName] = useState('General')
  const [isSignUp, setIsSignUp] = useState(false)

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    if (isSignUp) {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          data: {
            full_name: fullName,
            team_name: teamName
          }
        }
      })
      
      if (error) {
        alert(error.message)
      } else if (data.user) {
        // Create profile entry
        await supabase.from('profiles').insert([
          { 
            id: data.user.id, 
            full_name: fullName, 
            team_name: teamName 
          }
        ])
        alert('Account created! Please sign in.')
        setIsSignUp(false)
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) alert(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card" 
        style={{ padding: '40px', width: '100%', maxWidth: '420px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h2 className="gradient-text" style={{ fontSize: '2rem', fontWeight: 700 }}>
            {isSignUp ? 'Join the Team' : 'Welcome Back'}
          </h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {isSignUp ? 'Create your professional profile' : 'Sign in to access your dashboard'}
          </p>
        </div>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {isSignUp && (
            <>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <User size={16} /> Full Name
                </label>
                <input 
                  required 
                  value={fullName} 
                  onChange={e => setFullName(e.target.value)} 
                  placeholder="John Doe"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Users size={16} /> Select Team
                </label>
                <select 
                  required 
                  value={teamName} 
                  onChange={e => setTeamName(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="General">General</option>
                  <option value="Marketing">Marketing</option>
                  <option value="Sales">Sales</option>
                  <option value="Operations">Operations</option>
                  <option value="IT/Tech">IT / Tech</option>
                  <option value="HR">HR</option>
                  <option value="Management">Management</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Mail size={16} /> Email Address
            </label>
            <input 
              required 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="name@company.com"
              style={{ width: '100%' }}
            />
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <Lock size={16} /> Password
            </label>
            <input 
              required 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              style={{ width: '100%' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="primary-gradient" 
            style={{ 
              marginTop: '12px',
              height: '48px', 
              borderRadius: '12px', 
              color: 'white', 
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : (isSignUp ? <UserPlus size={20} /> : <LogIn size={20} />)}
            {isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.9rem' }}
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
