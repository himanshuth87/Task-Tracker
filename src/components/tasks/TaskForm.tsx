import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, X, Paperclip, CheckSquare, File, Image, FileText } from 'lucide-react'
import { taskService } from '../../services/taskService'
import { subtaskService } from '../../services/subtaskService'
import { attachmentService } from '../../services/attachmentService'
import { type TaskRecurrence } from '../../supabase'

interface TaskFormProps {
  onTaskAdded: () => void
  userId: string
  userEmail?: string
  fullName?: string
  teamName?: string
}

function FileIcon({ file }: { file: File }) {
  if (file.type.startsWith('image/')) return <Image size={13} color="#a855f7" />
  if (file.type === 'application/pdf') return <FileText size={13} color="#f43f5e" />
  return <File size={13} color="var(--text-muted)" />
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const label = (text: string) => (
  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: 'var(--text-muted)' }}>
    {text}
  </label>
)

export function TaskForm({ onTaskAdded, userId, userEmail, fullName, teamName }: TaskFormProps) {
  const [title, setTitle] = useState('')
  const [giver, setGiver] = useState(fullName || '')
  const [assignedTo, setAssignedTo] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [remarks, setRemarks] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [recurrence, setRecurrence] = useState<TaskRecurrence>('none')
  const [loading, setLoading] = useState(false)

  // Draft checklist items (pre-creation)
  const [checklistItems, setChecklistItems] = useState<string[]>([])
  const [checklistInput, setChecklistInput] = useState('')

  // Draft file attachments (pre-creation)
  const [draftFiles, setDraftFiles] = useState<File[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const addChecklistItem = () => {
    const t = checklistInput.trim().slice(0, 500)
    if (!t) return
    setChecklistItems(prev => [...prev, t])
    setChecklistInput('')
  }

  const removeChecklistItem = (i: number) => {
    setChecklistItems(prev => prev.filter((_, idx) => idx !== i))
  }

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('File too large (max 20 MB)'); return }
    if (draftFiles.length >= 5) { toast.error('Max 5 files per task'); return }
    setDraftFiles(prev => [...prev, file])
    if (fileRef.current) fileRef.current.value = ''
  }

  const removeFile = (i: number) => setDraftFiles(prev => prev.filter((_, idx) => idx !== i))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error, data: newTask } = await taskService.addTask({
      title,
      task_giver: giver,
      assigned_to_email: assignedTo || userEmail,
      start_date: startDate,
      deadline,
      remarks,
      priority,
      recurrence,
      status: 'pending',
      user_id: userId,
      user_email: userEmail,
      team_name: teamName || 'General',
    }, userEmail, fullName)

    if (error || !newTask) {
      toast.error('Error adding task: ' + (error?.message || 'Unknown error'))
      setLoading(false)
      return
    }

    const taskId = newTask.id

    // Flush draft checklist items
    if (checklistItems.length > 0) {
      await Promise.all(
        checklistItems.map(t => subtaskService.addSubtask(taskId, t, userEmail || ''))
      )
    }

    // Flush draft files
    if (draftFiles.length > 0) {
      const uploadResults = await Promise.all(
        draftFiles.map(f => attachmentService.uploadFile(taskId, f, userEmail || ''))
      )
      const failed = uploadResults.filter(r => r.error).length
      if (failed > 0) {
        toast.warning(`Task created, but ${failed} file(s) failed to upload. Ensure the "task-attachments" storage bucket exists in Supabase.`)
      }
    }

    const extras = []
    if (checklistItems.length > 0) extras.push(`${checklistItems.length} checklist item${checklistItems.length > 1 ? 's' : ''}`)
    if (draftFiles.length > 0) extras.push(`${draftFiles.length} file${draftFiles.length > 1 ? 's' : ''}`)

    toast.success(extras.length > 0 ? `Task created with ${extras.join(' & ')}!` : 'Task assigned successfully!')

    // Reset
    setTitle('')
    setGiver(fullName || '')
    setAssignedTo('')
    setStartDate('')
    setDeadline('')
    setRemarks('')
    setRecurrence('none')
    setChecklistItems([])
    setChecklistInput('')
    setDraftFiles([])
    setLoading(false)
    onTaskAdded()
  }

  return (
    <form className="glass-card" style={{ padding: '32px' }} onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        <div style={{ gridColumn: 'span 2' }}>
          {label('Task Title')}
          <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="What needs to be done?" style={{ width: '100%' }} maxLength={500} />
        </div>

        <div>
          {label('Assigned By')}
          <input required value={giver} onChange={e => setGiver(e.target.value)} placeholder="Your name" style={{ width: '100%' }} />
        </div>

        <div>
          {label('Assign To (Email)')}
          <input type="email" value={assignedTo} onChange={e => setAssignedTo(e.target.value)} placeholder="colleague@company.com" style={{ width: '100%' }} />
        </div>

        <div>
          {label('Priority')}
          <select value={priority} onChange={e => setPriority(e.target.value as any)} style={{ width: '100%' }}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>

        <div>
          {label('Repeats')}
          <select value={recurrence} onChange={e => setRecurrence(e.target.value as TaskRecurrence)} style={{ width: '100%' }}>
            <option value="none">Does not repeat</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>

        <div>
          {label('Start Date')}
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div>
          {label('Deadline')}
          <input required type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: '100%' }} />
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          {label('Remarks')}
          <textarea
            value={remarks}
            onChange={e => setRemarks(e.target.value)}
            placeholder="Any extra context or instructions for your colleague..."
            maxLength={1000}
            style={{ width: '100%', height: '80px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '12px', padding: '12px', color: 'white', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        {/* ── Checklist ─────────────────────────────── */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <CheckSquare size={15} color="var(--primary)" />
            {label('Checklist (optional)')}
          </div>

          {checklistItems.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
              {checklistItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', padding: '8px 12px', border: '1px solid var(--glass-border)' }}>
                  <div style={{ width: '14px', height: '14px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.25)', flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>{item}</span>
                  <button type="button" onClick={() => removeChecklistItem(i)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', padding: '2px' }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              value={checklistInput}
              onChange={e => setChecklistInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChecklistItem() } }}
              placeholder="Add a checklist item... (Enter to add)"
              maxLength={500}
              style={{ flex: 1, fontSize: '0.88rem' }}
            />
            <button
              type="button"
              onClick={addChecklistItem}
              disabled={!checklistInput.trim()}
              style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '12px', padding: '10px 14px', opacity: !checklistInput.trim() ? 0.4 : 1 }}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* ── File Attachments ──────────────────────── */}
        <div style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Paperclip size={15} color="var(--primary)" />
              {label('Attachments (optional)')}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
            >
              <Plus size={13} /> Add File
            </button>
            <input ref={fileRef} type="file" style={{ display: 'none' }} onChange={handleFileAdd} />
          </div>

          {draftFiles.length === 0 ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{ padding: '14px', textAlign: 'center', borderRadius: '12px', border: '2px dashed rgba(255,255,255,0.08)', cursor: 'pointer' }}
            >
              <Paperclip size={16} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 6px' }} />
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.25)' }}>Click to attach files (PDFs, images, docs — max 20 MB each)</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {draftFiles.map((file, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                  <FileIcon file={file} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatBytes(file.size)}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(i)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', padding: '4px' }}>
                    <X size={13} />
                  </button>
                </div>
              ))}
              {draftFiles.length < 5 && (
                <button type="button" onClick={() => fileRef.current?.click()} style={{ background: 'transparent', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '6px', display: 'flex', alignItems: 'center', gap: '5px', alignSelf: 'flex-start' }}>
                  <Plus size={13} /> Add another
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ gridColumn: 'span 2' }}>
          <button type="submit" disabled={loading} className="primary-gradient" style={{ width: '100%', height: '48px', borderRadius: '12px', color: 'white', fontWeight: 600, fontSize: '1rem' }}>
            {loading ? 'Creating...' : 'Assign Task'}
          </button>
        </div>

      </div>
    </form>
  )
}
