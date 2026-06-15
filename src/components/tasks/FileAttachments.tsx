import { useState, useEffect, useRef } from 'react'
import { Paperclip, Upload, Trash2, Download, FileText, File, X, ZoomIn } from 'lucide-react'
import { toast } from 'sonner'
import { type TaskAttachment } from '../../supabase'
import { attachmentService } from '../../services/attachmentService'
import { formatBytes } from '../../utils/dateUtils'
import { ConfirmModal } from '../ui/ConfirmModal'

interface FileAttachmentsProps {
  taskId: string
  currentUserEmail: string
}


function NonImageIcon({ mime }: { mime: string | null }) {
  if (mime === 'application/pdf') return <FileText size={15} color="#f43f5e" />
  return <File size={15} color="var(--text-muted)" />
}

export function FileAttachments({ taskId, currentUserEmail }: FileAttachmentsProps) {
  const [attachments, setAttachments] = useState<TaskAttachment[]>([])
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [lightbox, setLightbox] = useState<{ url: string; name: string } | null>(null)
  const [attachmentToDelete, setAttachmentToDelete] = useState<TaskAttachment | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    setLoading(true)
    const { data } = await attachmentService.fetchAttachments(taskId)
    setAttachments(data)
    // Fetch signed URLs for all image attachments upfront so they display as thumbnails
    const imgAtts = data.filter((a: TaskAttachment) => a.mime_type?.startsWith('image/'))
    if (imgAtts.length > 0) {
      const urls: Record<string, string> = {}
      await Promise.all(imgAtts.map(async (att: TaskAttachment) => {
        const url = await attachmentService.getSignedUrl(att.file_path)
        if (url) urls[att.id] = url
      }))
      setImageUrls(urls)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [taskId])

  // Close lightbox on Escape
  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setLightbox(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 20 * 1024 * 1024) { toast.error('File too large (max 20MB)'); return }
    setUploading(true)
    const { data, error } = await attachmentService.uploadFile(taskId, file, currentUserEmail)
    if (error) {
      toast.error('Upload failed. Ensure the task-attachments storage bucket exists in Supabase.')
    } else if (data) {
      // If image, get its URL immediately so thumbnail shows
      if (data.mime_type?.startsWith('image/')) {
        const url = await attachmentService.getSignedUrl(data.file_path)
        if (url) setImageUrls(prev => ({ ...prev, [data.id]: url }))
      }
      setAttachments(prev => [...prev, data])
      toast.success('File attached')
    }
    setUploading(false)
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDownload = async (att: TaskAttachment) => {
    // Reuse cached URL for images, fetch fresh for others
    const url = imageUrls[att.id] || await attachmentService.getSignedUrl(att.file_path)
    if (!url) { toast.error('Failed to get download link'); return }
    const a = document.createElement('a')
    a.href = url; a.download = att.file_name; a.target = '_blank'; a.click()
  }

  const performDelete = async () => {
    if (!attachmentToDelete) return
    const att = attachmentToDelete
    setAttachmentToDelete(null)
    setAttachments(prev => prev.filter(a => a.id !== att.id))
    setImageUrls(prev => { const next = { ...prev }; delete next[att.id]; return next })
    const { error } = await attachmentService.deleteAttachment(att.id, att.file_path)
    if (error) { toast.error('Delete failed'); load() }
    else toast.success('Removed')
  }

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const imageAtts = attachments.filter(a => a.mime_type?.startsWith('image/'))
  const fileAtts = attachments.filter(a => !a.mime_type?.startsWith('image/'))

  return (
    <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '14px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Paperclip size={12} /> Attachments {attachments.length > 0 && `(${attachments.length})`}
        </span>
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
          style={{ padding: '20px', textAlign: 'center', borderRadius: '10px', border: '2px dashed rgba(255,255,255,0.08)', cursor: 'pointer' }}
        >
          <Paperclip size={18} color="rgba(255,255,255,0.2)" style={{ margin: '0 auto 6px' }} />
          <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.25)' }}>Drop files or click to attach</p>
        </div>
      ) : (
        <>
          {/* Image thumbnail grid */}
          {imageAtts.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: fileAtts.length > 0 ? '10px' : 0 }}>
              {imageAtts.map(att => (
                <div
                  key={att.id}
                  onMouseEnter={() => setHoveredId(att.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--glass-border)', flexShrink: 0 }}
                >
                  {imageUrls[att.id] ? (
                    <img
                      src={imageUrls[att.id]}
                      alt={att.file_name}
                      onClick={() => setLightbox({ url: imageUrls[att.id], name: att.file_name })}
                      style={{
                        width: '120px', height: '90px',
                        objectFit: 'cover', display: 'block',
                        cursor: 'zoom-in',
                      }}
                    />
                  ) : (
                    <div style={{ width: '120px', height: '90px', background: 'rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Loading...</span>
                    </div>
                  )}

                  {/* Hover overlay with actions */}
                  <div
                    style={{
                      position: 'absolute', inset: 0,
                      background: 'linear-gradient(0deg, rgba(0,0,0,0.75) 0%, transparent 55%)',
                      display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                      padding: '6px',
                      opacity: hoveredId === att.id ? 1 : 0,
                      transition: 'opacity 0.2s',
                      pointerEvents: hoveredId === att.id ? 'auto' : 'none',
                    }}
                  >
                    <p style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '4px' }}>{att.file_name}</p>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {imageUrls[att.id] && (
                        <button
                          onClick={() => setLightbox({ url: imageUrls[att.id], name: att.file_name })}
                          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '3px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                          title="View full size"
                        >
                          <ZoomIn size={11} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDownload(att)}
                        style={{ background: 'rgba(255,255,255,0.15)', color: 'white', padding: '3px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                        title="Download"
                      >
                        <Download size={11} />
                      </button>
                      {att.uploaded_by === currentUserEmail && (
                        <button
                          onClick={() => setAttachmentToDelete(att)}
                          style={{ background: 'rgba(244,63,94,0.35)', color: '#f43f5e', padding: '3px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center' }}
                          title="Delete"
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Non-image file list */}
          {fileAtts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {fileAtts.map(att => (
                <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)' }}>
                  <NonImageIcon mime={att.mime_type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.file_name}</p>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{formatBytes(att.file_size)}</p>
                  </div>
                  <button onClick={() => handleDownload(att)} style={{ background: 'transparent', color: 'var(--primary)', padding: '4px' }} title="Download">
                    <Download size={14} />
                  </button>
                  {att.uploaded_by === currentUserEmail && (
                    <button onClick={() => setAttachmentToDelete(att)} style={{ background: 'transparent', color: 'rgba(255,255,255,0.2)', padding: '4px' }} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2000,
            background: 'rgba(0,0,0,0.88)',
            backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div onClick={e => e.stopPropagation()} style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)' }}>
            <img
              src={lightbox.url}
              alt={lightbox.name}
              style={{ display: 'block', maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain' }}
            />
            {/* Lightbox toolbar */}
            <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
              <button
                onClick={() => handleDownload(attachments.find(a => a.file_name === lightbox.name)!)}
                style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '7px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: 600 }}
              >
                <Download size={14} /> Download
              </button>
              <button
                onClick={() => setLightbox(null)}
                style={{ background: 'rgba(0,0,0,0.6)', color: 'white', padding: '7px 10px', borderRadius: '8px', display: 'flex', alignItems: 'center' }}
                title="Close (Esc)"
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '10px 14px', background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 100%)' }}>
              <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>{lightbox.name}</p>
            </div>
          </div>
        </div>
      )}

      {attachmentToDelete && (
        <ConfirmModal
          title="Remove Attachment"
          message={`Are you sure you want to remove "${attachmentToDelete.file_name}"?`}
          confirmText="Remove"
          onConfirm={performDelete}
          onCancel={() => setAttachmentToDelete(null)}
        />
      )}
    </div>
  )
}
