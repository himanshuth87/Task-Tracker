import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, Clock, Circle, ChevronRight, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import type { Product, StageName } from '../../supabase'
import {
  productService,
  STAGE_META,
  STAGE_ORDER_LIST,
  getStageDaysElapsed,
  getStageSLAStatus,
} from '../../services/productService'

interface StageDetailModalProps {
  product: Product
  currentUserEmail: string
  currentUserName: string
  onClose: () => void
  onUpdate: () => void
}

export function StageDetailModal({ product, currentUserEmail, currentUserName, onClose, onUpdate }: StageDetailModalProps) {
  const [handoffNotes, setHandoffNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const stages = (product.stages || []).sort((a, b) => a.stage_order - b.stage_order)
  const activeStage = stages.find(s => s.status === 'active')

  const handleCompleteStage = async () => {
    if (!activeStage) return
    setLoading(true)
    const { error } = await productService.completeStage(
      product.id,
      activeStage.id,
      activeStage.stage_name as StageName,
      handoffNotes,
      currentUserEmail,
      currentUserName
    )
    if (error) {
      toast.error('Failed to complete stage: ' + error.message)
    } else {
      const nextIndex = STAGE_ORDER_LIST.indexOf(activeStage.stage_name as StageName) + 1
      const nextStage = nextIndex < STAGE_ORDER_LIST.length ? STAGE_META[STAGE_ORDER_LIST[nextIndex]].label : null
      toast.success(nextStage ? `Handed off to ${nextStage} team!` : 'Product completed!')
      setHandoffNotes('')
      onUpdate()
      onClose()
    }
    setLoading(false)
  }

  const slaColor = {
    ok: '#10b981',
    warning: '#f59e0b',
    overdue: '#f43f5e',
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}
        onClick={e => { if (e.target === e.currentTarget) onClose() }}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="glass-card"
          style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}
        >
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
            <div>
              <h2 style={{ color: 'white', fontWeight: 700, fontSize: '1.3rem', marginBottom: '4px' }}>{product.name}</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {product.style_code && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: '20px' }}>
                    {product.style_code}
                  </span>
                )}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.06)', padding: '2px 10px', borderRadius: '20px' }}>
                  {product.category}
                </span>
                {product.season && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--primary)', background: 'rgba(99,102,241,0.12)', padding: '2px 10px', borderRadius: '20px' }}>
                    {product.season}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '10px', padding: '8px', color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Stage Timeline */}
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
            Production Timeline
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {stages.map((stage, idx) => {
              const meta = STAGE_META[stage.stage_name as StageName]
              const elapsed = getStageDaysElapsed(stage)
              const slaStatus = getStageSLAStatus(stage)
              const isActive = stage.status === 'active'
              const isDone = stage.status === 'completed'
              const isLast = idx === stages.length - 1

              return (
                <div key={stage.id} style={{ display: 'flex', gap: '16px' }}>
                  {/* Connector line */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '28px', flexShrink: 0 }}>
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: isDone ? meta.color : isActive ? meta.bg : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${isDone || isActive ? meta.color : 'rgba(255,255,255,0.1)'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, marginTop: '2px'
                    }}>
                      {isDone ? <CheckCircle size={14} color="white" /> : isActive ? <Clock size={12} color={meta.color} /> : <Circle size={10} color="rgba(255,255,255,0.2)" />}
                    </div>
                    {!isLast && (
                      <div style={{ width: '2px', flex: 1, background: isDone ? meta.color : 'rgba(255,255,255,0.07)', minHeight: '24px' }} />
                    )}
                  </div>

                  {/* Stage info */}
                  <div style={{ flex: 1, paddingBottom: isLast ? 0 : '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: isActive || isDone ? 'white' : 'var(--text-muted)', fontSize: '0.95rem' }}>
                        {meta.label}
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {isActive && (
                          <span style={{ fontSize: '0.72rem', color: slaColor[slaStatus], background: `${slaColor[slaStatus]}20`, padding: '2px 8px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {slaStatus === 'overdue' && <AlertTriangle size={10} />}
                            {elapsed !== null ? `${elapsed}/${stage.sla_days}d` : `SLA: ${stage.sla_days}d`}
                          </span>
                        )}
                        {isDone && elapsed !== null && (
                          <span style={{ fontSize: '0.72rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
                            {elapsed}d
                          </span>
                        )}
                      </div>
                    </div>
                    {stage.assigned_to_name && (
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                        {stage.assigned_to_name} · {stage.assigned_to_email}
                      </p>
                    )}
                    {stage.notes && (
                      <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px', fontStyle: 'italic' }}>
                        "{stage.notes}"
                      </p>
                    )}
                    {isDone && stage.completed_at && (
                      <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                        Completed {new Date(stage.completed_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Handoff section for active stage */}
          {activeStage && product.status === 'active' && (
            <div style={{ marginTop: '28px', padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid var(--glass-border)' }}>
              <h4 style={{ color: 'white', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ChevronRight size={16} color={STAGE_META[activeStage.stage_name as StageName].color} />
                Complete "{STAGE_META[activeStage.stage_name as StageName].label}" Stage
              </h4>
              <textarea
                value={handoffNotes}
                onChange={e => setHandoffNotes(e.target.value)}
                placeholder="Add handoff notes (optional)..."
                style={{
                  width: '100%', height: '72px', marginBottom: '12px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)',
                  borderRadius: '10px', padding: '10px 14px', color: 'white',
                  fontFamily: 'inherit', fontSize: '0.9rem', resize: 'none'
                }}
              />
              <button
                onClick={handleCompleteStage}
                disabled={loading}
                style={{
                  width: '100%', height: '44px', borderRadius: '12px',
                  background: `linear-gradient(135deg, ${STAGE_META[activeStage.stage_name as StageName].color}, #a855f7)`,
                  color: 'white', fontWeight: 600, fontSize: '0.95rem'
                }}
              >
                {loading ? 'Processing...' : `Mark Complete & Hand Off →`}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
