import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Package, CheckCircle2, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import type { Product } from '../../supabase'
import { productService, STAGE_META, STAGE_ORDER_LIST } from '../../services/productService'
import { ProductCard } from './ProductCard'
import { NewProductForm } from './NewProductForm'
import { StageDetailModal } from './StageDetailModal'

interface PipelineViewProps {
  session: Session
}

export function PipelineView({ session }: PipelineViewProps) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [stageFilter, setStageFilter] = useState<string>('all')

  const fetchProducts = useCallback(async () => {
    setLoading(true)
    const { data, error } = await productService.fetchProducts()
    if (!error && data) setProducts(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchProducts()
    const channel = productService.subscribeToProducts(() => fetchProducts())
    return () => { channel.unsubscribe() }
  }, [fetchProducts])

  const user = session.user
  const fullName = user.user_metadata.full_name || ''
  const teamName = user.user_metadata.team_name || 'General'
  const userEmail = user.email || ''

  const filteredProducts = products.filter(p => {
    if (stageFilter === 'all') return true
    if (stageFilter === 'completed') return p.status === 'completed'
    return p.current_stage === stageFilter && p.status !== 'completed'
  })

  const stats = {
    total: products.length,
    active: products.filter(p => p.status === 'active').length,
    completed: products.filter(p => p.status === 'completed').length,
    overdue: products.filter(p => {
      if (p.status !== 'active') return false
      const activeStage = p.stages?.find(s => s.status === 'active')
      if (!activeStage || !activeStage.started_at) return false
      const elapsed = Math.floor((Date.now() - new Date(activeStage.started_at).getTime()) / 86400000)
      return elapsed > activeStage.sla_days
    }).length
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        {[
          { label: 'Total Styles', value: stats.total, icon: <Package size={16} />, color: 'var(--primary)' },
          { label: 'In Progress', value: stats.active, icon: <Clock size={16} />, color: '#f59e0b' },
          { label: 'Completed', value: stats.completed, icon: <CheckCircle2 size={16} />, color: '#10b981' },
          { label: 'SLA Overdue', value: stats.overdue, icon: <AlertTriangle size={16} />, color: '#f43f5e' },
        ].map(stat => (
          <div key={stat.label} className="glass-card" style={{ padding: '16px 20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ color: stat.color }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: '6px', flex: 1, flexWrap: 'wrap' }}>
          <StageFilterBtn active={stageFilter === 'all'} onClick={() => setStageFilter('all')} label="All" />
          {STAGE_ORDER_LIST.map(s => (
            <StageFilterBtn
              key={s}
              active={stageFilter === s}
              onClick={() => setStageFilter(s)}
              label={STAGE_META[s].label}
              color={STAGE_META[s].color}
            />
          ))}
          <StageFilterBtn active={stageFilter === 'completed'} onClick={() => setStageFilter('completed')} label="Done" color="#10b981" />
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={fetchProducts}
            className="glass-card"
            style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.85rem', borderRadius: '12px' }}
          >
            <RefreshCw size={14} />
          </button>
          <button
            onClick={() => setShowForm(!showForm)}
            className="primary-gradient"
            style={{ padding: '10px 20px', borderRadius: '12px', color: 'white', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Plus size={16} />
            {showForm ? 'Close' : 'New Style'}
          </button>
        </div>
      </div>

      {/* New product form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <NewProductForm
              onProductAdded={() => { fetchProducts(); setShowForm(false) }}
              userId={user.id}
              userEmail={userEmail}
              fullName={fullName}
              teamName={teamName}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px' }}>
          <div className="loader" />
          <p style={{ color: 'var(--text-muted)', marginTop: '20px' }}>Loading pipeline...</p>
        </div>
      ) : filteredProducts.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => setSelectedProduct(product)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-card" style={{ padding: '80px 40px', textAlign: 'center' }}>
          <Package size={40} color="rgba(255,255,255,0.1)" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>No products in this stage.</p>
          <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.9rem', marginTop: '8px' }}>
            {stageFilter === 'all' ? 'Create a new style to start the pipeline!' : 'Switch filter to see other stages.'}
          </p>
        </div>
      )}

      {/* Stage detail modal */}
      {selectedProduct && (
        <StageDetailModal
          product={selectedProduct}
          currentUserEmail={userEmail}
          currentUserName={fullName}
          onClose={() => setSelectedProduct(null)}
          onUpdate={() => { fetchProducts(); setSelectedProduct(null) }}
        />
      )}
    </div>
  )
}

function StageFilterBtn({ active, onClick, label, color }: { active: boolean; onClick: () => void; label: string; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '6px 14px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500,
        background: active ? (color ? `${color}22` : 'rgba(99,102,241,0.2)') : 'rgba(255,255,255,0.04)',
        color: active ? (color || 'var(--primary)') : 'var(--text-muted)',
        border: active ? `1px solid ${color || 'var(--primary)'}50` : '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.2s',
      }}
    >
      {label}
    </button>
  )
}
