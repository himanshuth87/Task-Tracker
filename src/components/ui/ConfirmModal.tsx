import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  isDestructive?: boolean
}

export function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isDestructive = true
}: ConfirmModalProps) {
  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 1100 }}>
      <motion.div 
        className="glass-card modal-content"
        onClick={e => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{ width: '100%', maxWidth: '400px', padding: '24px', textAlign: 'center' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
          <div style={{ background: isDestructive ? 'rgba(244,63,94,0.1)' : 'rgba(99,102,241,0.1)', padding: '16px', borderRadius: '50%' }}>
            <AlertTriangle size={32} color={isDestructive ? '#f43f5e' : 'var(--primary)'} />
          </div>
        </div>
        
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>{title}</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '24px', lineHeight: 1.5 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={onCancel} 
            className="action-btn"
            style={{ flex: 1, padding: '12px', justifyContent: 'center', fontWeight: 600 }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className={isDestructive ? '' : 'primary-gradient'}
            style={{ 
              flex: 1, 
              padding: '12px', 
              justifyContent: 'center', 
              fontWeight: 600, 
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              color: 'white',
              background: isDestructive ? 'linear-gradient(135deg, #e11d48, #be123c)' : undefined,
              boxShadow: isDestructive ? '0 4px 15px rgba(225,29,72,0.3)' : undefined
            }}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  )
}
