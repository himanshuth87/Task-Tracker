import { useState, useEffect, useRef } from 'react'
import { Paperclip, Upload, Trash2, Download, FileText, Image, File } from 'lucide-react'
import { toast } from 'sonner'
import { type TaskAttachment } from '../../supabase'
import { attachmentService } from '../../services/attachmentService'

interface FileAttachmentsProps {
  taskId: string
  currentUserEmail: string
}

function FileIcon({ mime }: { mime: string | null }) {
  if (mime?.startsWith('image/')) return <Image size={14} color="#a855f7" />
  if (mime === 'application/pdf') return <FileText size={14} color="#f43f5e" />
  return <File size={14} color="var(--text-muted)" />
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FileAttachments({ taskId, currentUserEmail }: FileAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await attachmentService.fetchAttachments(taskId)
    setAttachments(data)
    setLoading(false)
  }

  useEffect(() => { load() }, [taskId])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('File too large (max 20MB)'); return }
    setUploading(true)
    const { data, error } = await attachmentService.uploadFile(taskId, file, currentUserEmail)
    if (error) {
      toast.error('Upload failed. Ensure the task-attachments storage bucket exists in Supabase.')
    } else if (data) {
      setAttachments(prev => [...prev, data])
      toast.success('File attached')
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDownload = async (att: TaskAttachment) => {
    const url = await attachmentService.getSignedUrl(att.file_path)
    if (!url) { toast.error('Failed to get download link'); return }
    const a = document.createElement('a')
    a.href = url
    a.download = att.file_name
    a.target = '_blank'
    a.click()
  }

  const handleDelete = async (att: TaskAttachment) => {
    if (!confirm(`Remove "${att.file_name}"?`)) return
    setAttachments(prev => prev.filter(a => a.id !== att.id))
    const { error } = await attachmentService.deleteAttachment(att.id, att.file_path)
    if (error) { toast.error('Delete failed'); load() }
    else toast.success('Removed')
  }

  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Attachments
          </span>
          {attachments.length > 0 && (
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{attachments.length}</span>
          )}
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{ background: 'transparent', color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
        >
          <Upload size={13} />
          {uploading ? 'Uploading...' : 'Attach'}
        </button>
        <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={handleUpload} accept="*/*" />
      </div>

      {loading ? (
        <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Loading...</p>
      ) : attachments.length === 0 ? (
        <div
          onClick={() => inputRef.current?.click()}
          style={{ padding: '16px', textAlign: 'center', borderRadius: '10px', border: '2px dashed rgba(255,255,255,0.08)', cursor: 'pointer' }}
        >
          <Paperclip size={18} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 6px' }} />
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}>Drop files or click to attach</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {attachments.map(att => (
            <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
              <FileIcon mime={att.mime_type} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.file_name}</p>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatBytes(att.file_size)}</p>
              </div>
              <button onClick={() => handleDownload(att)} style={{ background: 'transparent', color: 'var(--primary)', padding: '4px' }}>
                <Download size={14} />
              </button>
              {att.uploaded_by === currentUserEmail && (
                <button onClick={() => handleDelete(att)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', padding: '4px' }}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
