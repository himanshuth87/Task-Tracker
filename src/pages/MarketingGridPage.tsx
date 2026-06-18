import { useState, useEffect, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Table2, Plus, Trash2, Save, Loader2, PencilRuler, Camera } from 'lucide-react'
import { taskService } from '../services/taskService'
import { supabase, type Task, type MisRole, MARKETING_CHANNELS, MARKETING_TASK_TYPES } from '../supabase'
import type { AppContext } from '../components/layout/AppLayout'

type GridRow = {
  localId: number
  start_date: string
  channel: string
  task_type: string
  title: string
  num_products: string
  num_creatives: string
  deadline: string
  actual_delivery: string
  // designer
  total_designs: string
  // photographer
  shoot_units: string
  num_angles: string
  edit_units: string
  shoot_hours: string
  edit_hours: string
}

const emptyRow = (id: number): GridRow => ({
  localId: id, start_date: '', channel: '', task_type: '', title: '',
  num_products: '', num_creatives: '', deadline: '', actual_delivery: '',
  total_designs: '', shoot_units: '', num_angles: '', edit_units: '', shoot_hours: '', edit_hours: '',
})

const numOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v))

const cellInput: React.CSSProperties = { width: '100%', padding: '6px 8px', fontSize: '0.82rem', borderRadius: '6px' }
const th: React.CSSProperties = { padding: '8px 10px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--text-muted)', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--glass-border)' }
const td: React.CSSProperties = { padding: '4px 6px', borderBottom: '1px solid var(--glass-border)', verticalAlign: 'middle' }

export function MarketingGridPage() {
  const { session } = useOutletContext<AppContext>()
  const [role, setRole] = useState<Exclude<MisRole, 'none'>>('designer')
  const [mode, setMode] = useState<'entry' | 'review'>('entry')
  const [isManager, setIsManager] = useState(false)
  const [teamName, setTeamName] = useState('General')

  const [rows, setRows] = useState<GridRow[]>(() => Array.from({ length: 5 }, (_, i) => emptyRow(i)))
  const [nextId, setNextId] = useState(5)
  const [saving, setSaving] = useState(false)

  const [reviewTasks, setReviewTasks] = useState<Task[]>([])
  const [reviewLoading, setReviewLoading] = useState(false)
  const [dirty, setDirty] = useState<Record<string, Partial<Task>>>({})

  const fullName = session.user.user_metadata.full_name || 'User'
  const userEmail = session.user.email || ''

  useEffect(() => {
    supabase.from('profiles').select('role, team_name').eq('id', session.user.id).single().then(({ data }) => {
      const r = data?.role || session.user.user_metadata?.role
      setIsManager(r === 'manager' || r === 'admin')
      setTeamName(data?.team_name || session.user.user_metadata?.team_name || 'General')
    })
  }, [session.user.id])

  const loadReview = useCallback(async () => {
    setReviewLoading(true)
    const { data } = await taskService.fetchAllTasks(session, 'team', 'all')
    setReviewTasks(((data as Task[]) || []).filter(t => t.mis_role === role))
    setDirty({})
    setReviewLoading(false)
  }, [session, role])

  useEffect(() => {
    if (mode === 'review') loadReview()
  }, [mode, loadReview])

  // ── Entry helpers ──
  const updateRow = (localId: number, field: keyof GridRow, value: string) => {
    setRows(prev => prev.map(r => r.localId === localId ? { ...r, [field]: value } : r))
  }
  const addRows = (count = 1) => {
    setRows(prev => [...prev, ...Array.from({ length: count }, (_, i) => emptyRow(nextId + i))])
    setNextId(id => id + count)
  }
  const removeRow = (localId: number) => setRows(prev => prev.filter(r => r.localId !== localId))

  const saveEntry = async () => {
    const filled = rows.filter(r => r.title.trim())
    if (filled.length === 0) { toast.error('Add at least one row with a description.'); return }
    setSaving(true)
    const payloads = filled.map(r => ({
      title: r.title,
      task_giver: fullName,
      assigned_to_email: userEmail,
      user_id: session.user.id,
      user_email: userEmail,
      team_name: teamName,
      status: 'pending',
      priority: 'medium',
      recurrence: 'none',
      position: 0,
      start_date: r.start_date || null,
      deadline: r.deadline || null,
      mis_role: role,
      channel: r.channel || null,
      task_type: r.task_type || null,
      num_products: numOrNull(r.num_products),
      num_creatives: numOrNull(r.num_creatives),
      actual_delivery: r.actual_delivery || null,
      total_designs: role === 'designer' ? numOrNull(r.total_designs) : null,
      shoot_units: role === 'photographer' ? numOrNull(r.shoot_units) : null,
      num_angles: role === 'photographer' ? numOrNull(r.num_angles) : null,
      edit_units: role === 'photographer' ? numOrNull(r.edit_units) : null,
      shoot_hours: role === 'photographer' ? numOrNull(r.shoot_hours) : null,
      edit_hours: role === 'photographer' ? numOrNull(r.edit_hours) : null,
    }))
    const { error } = await taskService.bulkAddTasks(payloads, userEmail, fullName)
    setSaving(false)
    if (error) { toast.error('Save failed: ' + error.message); return }
    toast.success(`${payloads.length} task${payloads.length > 1 ? 's' : ''} added`)
    setRows(Array.from({ length: 5 }, (_, i) => emptyRow(nextId + i)))
    setNextId(id => id + 5)
  }

  // ── Review helpers ──
  const editReview = (taskId: string, field: keyof Task, value: string | number | null) => {
    setReviewTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t))
    setDirty(prev => ({ ...prev, [taskId]: { ...prev[taskId], [field]: value } }))
  }
  const saveReview = async () => {
    const ids = Object.keys(dirty)
    if (ids.length === 0) { toast.error('No changes to save.'); return }
    setSaving(true)
    const results = await Promise.all(ids.map(id => taskService.updateTask(id, dirty[id], userEmail, fullName)))
    setSaving(false)
    const failed = results.filter(r => r.error).length
    if (failed) toast.error(`${failed} update(s) failed (check permissions).`)
    else toast.success(`${ids.length} task(s) updated`)
    setDirty({})
  }

  const roleTabs = (
    <div style={{ display: 'flex', gap: '6px', background: 'var(--glass-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
      {(['designer', 'photographer'] as const).map(r => (
        <button key={r} onClick={() => setRole(r)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
            background: role === r ? 'rgba(99,102,241,0.18)' : 'transparent', color: role === r ? 'var(--primary)' : 'var(--text-muted)' }}>
          {r === 'designer' ? <PencilRuler size={14} /> : <Camera size={14} />}
          {r === 'designer' ? 'Designer' : 'Photographer'}
        </button>
      ))}
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '14px', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Table2 size={22} color="var(--primary)" /> Marketing Grid
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            Add tasks spreadsheet-style. {isManager && 'Switch to Review to score the team’s work.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {roleTabs}
          {isManager && (
            <div style={{ display: 'flex', gap: '6px', background: 'var(--glass-bg)', padding: '4px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
              {(['entry', 'review'] as const).map(m => (
                <button key={m} onClick={() => setMode(m)}
                  style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600,
                    background: mode === m ? 'rgba(99,102,241,0.18)' : 'transparent', color: mode === m ? 'var(--primary)' : 'var(--text-muted)' }}>
                  {m === 'entry' ? 'Add Tasks' : 'Review'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {mode === 'entry' ? (
        <>
          <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: role === 'designer' ? '980px' : '1100px' }}>
              <thead>
                <tr>
                  <th style={th}>Date</th>
                  <th style={th}>Channel</th>
                  <th style={th}>Task Type</th>
                  <th style={{ ...th, minWidth: '220px' }}>Description</th>
                  <th style={th}>Products</th>
                  <th style={th}>Creatives</th>
                  {role === 'designer' && <th style={th}>Total Designs</th>}
                  {role === 'photographer' && <><th style={th}>Shoot</th><th style={th}>Angles</th><th style={th}>Edits</th><th style={th}>Shoot Hrs</th><th style={th}>Edit Hrs</th></>}
                  <th style={th}>Expected Delivery</th>
                  <th style={th}>Actual Delivery</th>
                  <th style={th}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.localId}>
                    <td style={td}><input type="date" style={cellInput} value={r.start_date} onChange={e => updateRow(r.localId, 'start_date', e.target.value)} /></td>
                    <td style={td}>
                      <select style={cellInput} value={r.channel} onChange={e => updateRow(r.localId, 'channel', e.target.value)}>
                        <option value="">—</option>
                        {MARKETING_CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td style={td}>
                      <select style={cellInput} value={r.task_type} onChange={e => updateRow(r.localId, 'task_type', e.target.value)}>
                        <option value="">—</option>
                        {MARKETING_TASK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </td>
                    <td style={td}><input style={cellInput} placeholder="What was done…" value={r.title} onChange={e => updateRow(r.localId, 'title', e.target.value)} maxLength={500} /></td>
                    <td style={td}><input type="number" min={0} style={cellInput} value={r.num_products} onChange={e => updateRow(r.localId, 'num_products', e.target.value)} /></td>
                    <td style={td}><input type="number" min={0} style={cellInput} value={r.num_creatives} onChange={e => updateRow(r.localId, 'num_creatives', e.target.value)} /></td>
                    {role === 'designer' && <td style={td}><input type="number" min={0} style={cellInput} value={r.total_designs} onChange={e => updateRow(r.localId, 'total_designs', e.target.value)} /></td>}
                    {role === 'photographer' && <>
                      <td style={td}><input type="number" min={0} style={cellInput} value={r.shoot_units} onChange={e => updateRow(r.localId, 'shoot_units', e.target.value)} /></td>
                      <td style={td}><input type="number" min={0} style={cellInput} value={r.num_angles} onChange={e => updateRow(r.localId, 'num_angles', e.target.value)} /></td>
                      <td style={td}><input type="number" min={0} style={cellInput} value={r.edit_units} onChange={e => updateRow(r.localId, 'edit_units', e.target.value)} /></td>
                      <td style={td}><input type="number" min={0} step="0.25" style={cellInput} value={r.shoot_hours} onChange={e => updateRow(r.localId, 'shoot_hours', e.target.value)} /></td>
                      <td style={td}><input type="number" min={0} step="0.25" style={cellInput} value={r.edit_hours} onChange={e => updateRow(r.localId, 'edit_hours', e.target.value)} /></td>
                    </>}
                    <td style={td}><input type="date" style={cellInput} value={r.deadline} onChange={e => updateRow(r.localId, 'deadline', e.target.value)} /></td>
                    <td style={td}><input type="date" style={cellInput} value={r.actual_delivery} onChange={e => updateRow(r.localId, 'actual_delivery', e.target.value)} /></td>
                    <td style={td}>
                      <button onClick={() => removeRow(r.localId)} title="Remove row" style={{ background: 'transparent', color: 'rgba(255,255,255,0.3)', padding: '4px' }}><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button onClick={() => addRows(1)} className="hover-bg-glass" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)', padding: '10px 16px', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem' }}>
              <Plus size={16} /> Add Row
            </button>
            <button onClick={() => addRows(5)} className="hover-bg-glass" style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-muted)', padding: '10px 16px', borderRadius: '12px', fontWeight: 600, fontSize: '0.85rem' }}>
              + 5 Rows
            </button>
            <button onClick={saveEntry} disabled={saving} className="primary-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', padding: '10px 22px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem', marginLeft: 'auto' }}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save All
            </button>
          </div>
        </>
      ) : (
        <>
          {reviewLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}><Loader2 size={26} className="animate-spin" color="var(--primary)" /></div>
          ) : reviewTasks.length === 0 ? (
            <div className="glass-card" style={{ padding: '50px', textAlign: 'center', color: 'var(--text-muted)' }}>No {role} tasks to review yet.</div>
          ) : (
            <>
              <div className="glass-card" style={{ padding: '0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr>
                      <th style={th}>Member</th>
                      <th style={th}>Date</th>
                      <th style={{ ...th, minWidth: '200px' }}>Description</th>
                      {role === 'designer' ? <>
                        <th style={th}>Creatives</th>
                        <th style={th}>Approved</th>
                        <th style={th}>Rejected</th>
                        <th style={th}>Quality (1-5)</th>
                      </> : <>
                        <th style={th}>Shoot</th>
                        <th style={th}>Edits</th>
                        <th style={th}>Shoot Hrs</th>
                        <th style={th}>Edit Hrs</th>
                      </>}
                      <th style={th}>Actual Delivery</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewTasks.map(t => (
                      <tr key={t.id}>
                        <td style={{ ...td, fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(t.assigned_to_email || t.user_email || '').split('@')[0]}</td>
                        <td style={{ ...td, fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{(t.start_date || t.created_at || '').slice(0, 10)}</td>
                        <td style={{ ...td, fontSize: '0.85rem' }}>{t.title}</td>
                        {role === 'designer' ? <>
                          <td style={{ ...td, textAlign: 'center' }}>{t.num_creatives ?? '—'}</td>
                          <td style={td}>
                            <select style={cellInput} value={t.approved_input ?? ''} onChange={e => editReview(t.id, 'approved_input', e.target.value === '' ? null : Number(e.target.value))}>
                              <option value="">—</option><option value="1">Yes</option><option value="0">No</option>
                            </select>
                          </td>
                          <td style={td}><input type="number" min={0} style={cellInput} value={t.rejected_inputs ?? ''} onChange={e => editReview(t.id, 'rejected_inputs', e.target.value === '' ? null : Number(e.target.value))} /></td>
                          <td style={td}><input type="number" min={1} max={5} style={cellInput} value={t.quality_score ?? ''} onChange={e => editReview(t.id, 'quality_score', e.target.value === '' ? null : Number(e.target.value))} /></td>
                        </> : <>
                          <td style={td}><input type="number" min={0} style={cellInput} value={t.shoot_units ?? ''} onChange={e => editReview(t.id, 'shoot_units', e.target.value === '' ? null : Number(e.target.value))} /></td>
                          <td style={td}><input type="number" min={0} style={cellInput} value={t.edit_units ?? ''} onChange={e => editReview(t.id, 'edit_units', e.target.value === '' ? null : Number(e.target.value))} /></td>
                          <td style={td}><input type="number" min={0} step="0.25" style={cellInput} value={t.shoot_hours ?? ''} onChange={e => editReview(t.id, 'shoot_hours', e.target.value === '' ? null : Number(e.target.value))} /></td>
                          <td style={td}><input type="number" min={0} step="0.25" style={cellInput} value={t.edit_hours ?? ''} onChange={e => editReview(t.id, 'edit_hours', e.target.value === '' ? null : Number(e.target.value))} /></td>
                        </>}
                        <td style={td}><input type="date" style={cellInput} value={t.actual_delivery || ''} onChange={e => editReview(t.id, 'actual_delivery', e.target.value)} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'flex', marginTop: '16px' }}>
                <button onClick={saveReview} disabled={saving || Object.keys(dirty).length === 0} className="primary-gradient" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'white', padding: '10px 22px', borderRadius: '12px', fontWeight: 600, fontSize: '0.9rem', marginLeft: 'auto', opacity: Object.keys(dirty).length === 0 ? 0.5 : 1 }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Save Review ({Object.keys(dirty).length})
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
