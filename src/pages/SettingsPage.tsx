import { useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { User, Users, Lock, Mail, Shield, Trash2, CheckCircle2, Loader2, Settings } from 'lucide-react'
import { supabase } from '../supabase'
import { toast } from 'sonner'
import type { AppContext } from '../components/layout/AppLayout'

type Tab = 'profile' | 'team'

export function SettingsPage() {
  const { session } = useOutletContext<AppContext>()
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const [profile, setProfile] = useState<any>(null)
  const [teamMembers, setTeamMembers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [updatingProfile, setUpdatingProfile] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)

  useEffect(() => { fetchData() }, [session])

  const fetchData = async () => {
    setLoading(true)
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (profData) {
      setProfile(profData)
      setFullName(profData.full_name)

      if (profData.role === 'admin' || profData.role === 'manager') {
        const { data: members } = await supabase
          .from('profiles')
          .select('*')
          .eq('team_name', profData.team_name)
          .order('role', { ascending: true })
        if (members) setTeamMembers(members)

        const { data: invites } = await supabase
          .from('team_invitations')
          .select('*')
          .eq('team_name', profData.team_name)
          .eq('status', 'pending')
        if (invites) setInvitations(invites)
      }
    }
    setLoading(false)
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingProfile(true)
    const updates: any = { data: { full_name: fullName } }
    if (password) updates.password = password
    const { error: authErr } = await supabase.auth.updateUser(updates)
    if (authErr) { toast.error(authErr.message); setUpdatingProfile(false); return }
    const { error: dbErr } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', session.user.id)
    if (dbErr) toast.error(dbErr.message)
    else { toast.success('Profile updated successfully'); if (password) setPassword('') }
    setUpdatingProfile(false)
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    setInviting(true)
    const { error } = await supabase.from('team_invitations').insert([{
      team_name: profile.team_name,
      invited_email: inviteEmail,
      invited_by: session.user.email,
      invited_by_name: profile.full_name,
      status: 'pending',
    }])
    if (error) {
      toast.error(error.message)
    } else {
      supabase.functions.invoke('invite-member', {
        body: {
          invited_email: inviteEmail,
          invited_by_name: profile.full_name,
          team_name: profile.team_name,
        },
      }).catch(console.error)
      toast.success(`Invitation sent to ${inviteEmail}`)
      setInviteEmail('')
      fetchData()
    }
    setInviting(false)
  }

  const handleChangeRole = async (memberId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', memberId)
    if (error) toast.error(error.message)
    else { toast.success('Role updated'); fetchData() }
  }

  const handleRemoveInvite = async (id: string) => {
    const { error } = await supabase.from('team_invitations').delete().eq('id', id)
    if (error) toast.error(error.message)
    else { toast.success('Invitation removed'); fetchData() }
  }

  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager'

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '14px',
    background: 'transparent',
    borderBottom: active ? '2px solid var(--primary)' : '2px solid transparent',
    color: active ? 'var(--primary)' : 'var(--text-muted)',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  })

  return (
    <div>
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings size={22} color="var(--primary)" /> Settings
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
          Manage your profile and team.
        </p>
      </div>

      <div className="glass-card" style={{ maxWidth: '680px', padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--glass-border)' }}>
          <button onClick={() => setActiveTab('profile')} style={tabStyle(activeTab === 'profile')}>
            <User size={16} /> Profile
          </button>
          {isAdminOrManager && (
            <button onClick={() => setActiveTab('team')} style={tabStyle(activeTab === 'team')}>
              <Users size={16} /> Team Management
            </button>
          )}
        </div>

        <div style={{ padding: '28px' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
              <Loader2 className="animate-spin" size={24} color="var(--primary)" />
            </div>
          ) : activeTab === 'profile' ? (
            <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <User size={14} /> Full Name
                </label>
                <input required value={fullName} onChange={e => setFullName(e.target.value)} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Mail size={14} /> Email (Cannot be changed)
                </label>
                <input value={session.user.email} disabled style={{ width: '100%', opacity: 0.6, cursor: 'not-allowed' }} />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Users size={14} /> Team
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input value={profile?.team_name || 'General'} disabled style={{ flex: 1, opacity: 0.6, cursor: 'not-allowed' }} />
                  <span style={{ padding: '6px 12px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, textTransform: 'capitalize', border: '1px solid rgba(99,102,241,0.2)' }}>
                    {profile?.role}
                  </span>
                </div>
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  <Lock size={14} /> New Password (Optional)
                </label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" minLength={6} style={{ width: '100%' }} />
              </div>
              <button type="submit" disabled={updatingProfile} className="primary-gradient action-btn" style={{ height: '44px', justifyContent: 'center' }}>
                {updatingProfile ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                Save Changes
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              <section>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Mail size={16} color="var(--primary)" /> Invite New Member
                </h3>
                <form onSubmit={handleInvite} style={{ display: 'flex', gap: '10px' }}>
                  <input required type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="colleague@company.com" style={{ flex: 1 }} />
                  <button type="submit" disabled={inviting} className="primary-gradient action-btn" style={{ whiteSpace: 'nowrap' }}>
                    {inviting ? <Loader2 className="animate-spin" size={16} /> : 'Send Invite'}
                  </button>
                </form>
              </section>

              {invitations.length > 0 && (
                <section>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', color: 'var(--text-muted)' }}>Pending Invitations</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {invitations.map(inv => (
                      <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px' }}>
                        <div>
                          <p style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-main)' }}>{inv.invited_email}</p>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invited by {inv.invited_by_name}</p>
                        </div>
                        <button onClick={() => handleRemoveInvite(inv.id)} className="action-btn" style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.2)' }} title="Revoke">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} color="var(--primary)" /> Active Members
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {teamMembers.map(member => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', borderRadius: '10px' }}>
                      <div>
                        <p style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)' }}>{member.full_name} {member.id === session.user.id && '(You)'}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{member.email}</p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {profile.role === 'admin' && member.id !== session.user.id ? (
                          <select value={member.role} onChange={e => handleChangeRole(member.id, e.target.value)} style={{ padding: '6px 10px', fontSize: '0.8rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-main)' }}>
                            <option value="member">Member</option>
                            <option value="manager">Manager</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span style={{ fontSize: '0.85rem', color: member.role === 'admin' ? 'var(--primary)' : 'var(--text-muted)', textTransform: 'capitalize', fontWeight: member.role === 'admin' ? 600 : 400 }}>
                            {member.role}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
