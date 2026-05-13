import { motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Package } from 'lucide-react'
import type { Product, StageName } from '../../supabase'
import { STAGE_META, STAGE_ORDER_LIST, getStageDaysElapsed, getStageSLAStatus } from '../../services/productService'

interface ProductCardProps {
  product: Product
  onClick: () => void
}

export function ProductCard({ product, onClick }: ProductCardProps) {
  const stages = (product.stages || []).sort((a, b) => a.stage_order - b.stage_order)
  const activeStage = stages.find(s => s.status === 'active')
  const completedCount = stages.filter(s => s.status === 'completed').length
  const isCompleted = product.status === 'completed'

  const currentMeta = isCompleted
    ? { label: 'Completed', color: '#10b981', bg: 'rgba(16,185,129,0.15)' }
    : activeStage
      ? STAGE_META[activeStage.stage_name as StageName]
      : STAGE_META.ecommerce

  const slaStatus = activeStage ? getStageSLAStatus(activeStage) : 'ok'
  const elapsed = activeStage ? getStageDaysElapsed(activeStage) : null

  const slaColor = { ok: '#10b981', warning: '#f59e0b', overdue: '#f43f5e' }

  return (
    <motion.div
      whileHover={{ y: -2, boxShadow: `0 12px 40px ${currentMeta.color}25` }}
      whileTap={{ scale: 0.98 }}
      className="glass-card"
      onClick={onClick}
      style={{ padding: '20px', cursor: 'pointer', border: `1px solid ${currentMeta.color}30` }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Package size={14} color={currentMeta.color} />
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {product.name}
            </h3>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {product.style_code && (
              <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
                {product.style_code}
              </span>
            )}
            <span style={{ fontSize: '0.73rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px' }}>
              {product.category}
            </span>
            {product.season && (
              <span style={{ fontSize: '0.73rem', color: currentMeta.color, background: currentMeta.bg, padding: '2px 8px', borderRadius: '20px' }}>
                {product.season}
              </span>
            )}
          </div>
        </div>

        {/* Stage badge */}
        <div style={{ flexShrink: 0, marginLeft: '12px', textAlign: 'right' }}>
          <span style={{
            display: 'inline-block', fontSize: '0.75rem', fontWeight: 600,
            color: currentMeta.color, background: currentMeta.bg,
            padding: '4px 12px', borderRadius: '20px'
          }}>
            {isCompleted ? <CheckCircle2 size={12} style={{ display: 'inline', marginRight: 4 }} /> : null}
            {currentMeta.label}
          </span>
          {slaStatus !== 'ok' && !isCompleted && (
            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
              <AlertTriangle size={11} color={slaColor[slaStatus]} />
              <span style={{ fontSize: '0.7rem', color: slaColor[slaStatus] }}>
                {elapsed}d / {activeStage?.sla_days}d SLA
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', gap: '3px', marginBottom: '6px' }}>
          {STAGE_ORDER_LIST.map((stageName) => {
            const stage = stages.find(s => s.stage_name === stageName)
            const isDone = stage?.status === 'completed' || isCompleted
            const isActive = stage?.status === 'active'
            const meta = STAGE_META[stageName]
            return (
              <div
                key={stageName}
                title={meta.label}
                style={{
                  flex: 1, height: '4px', borderRadius: '4px',
                  background: isDone ? meta.color : isActive ? `${meta.color}60` : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.3s'
                }}
              />
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            {completedCount} / {stages.length} stages done
          </span>
          {activeStage && elapsed !== null && (
            <span style={{ fontSize: '0.72rem', color: slaColor[slaStatus] }}>
              Day {elapsed} of {activeStage.sla_days}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
