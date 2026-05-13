import { useState } from 'react'
import { toast } from 'sonner'
import { productService } from '../../services/productService'

interface NewProductFormProps {
  onProductAdded: () => void
  userId: string
  userEmail: string
  fullName: string
  teamName: string
}

export function NewProductForm({ onProductAdded, userId, userEmail, fullName, teamName }: NewProductFormProps) {
  const [name, setName] = useState('')
  const [styleCode, setStyleCode] = useState('')
  const [category, setCategory] = useState('bag')
  const [season, setSeason] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await productService.addProduct({
      name,
      style_code: styleCode || undefined,
      category,
      season: season || undefined,
      description: description || undefined,
      created_by: userId,
      created_by_email: userEmail,
      created_by_name: fullName,
      team_name: teamName,
    })

    if (error) {
      toast.error('Error creating product: ' + error.message)
    } else {
      toast.success(`"${name}" added to pipeline!`)
      setName('')
      setStyleCode('')
      setCategory('bag')
      setSeason('')
      setDescription('')
      onProductAdded()
    }
    setLoading(false)
  }

  return (
    <form className="glass-card" style={{ padding: '32px' }} onSubmit={handleSubmit}>
      <h3 style={{ marginBottom: '24px', color: 'white', fontWeight: 600, fontSize: '1.1rem' }}>
        New Product / Style
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Product Name *
          </label>
          <input
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Travel Backpack 24L"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Style Code
          </label>
          <input
            value={styleCode}
            onChange={e => setStyleCode(e.target.value)}
            placeholder="e.g. BAG-2025-001"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Category
          </label>
          <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%' }}>
            <option value="bag">Bag</option>
            <option value="backpack">Backpack</option>
            <option value="trolley">Trolley / Luggage</option>
            <option value="handbag">Handbag</option>
            <option value="wallet">Wallet</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Season
          </label>
          <input
            value={season}
            onChange={e => setSeason(e.target.value)}
            placeholder="e.g. SS26, AW25"
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Initiated By
          </label>
          <input
            value={fullName}
            disabled
            style={{ width: '100%', opacity: 0.5 }}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Description / Brief
          </label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the product concept..."
            style={{
              width: '100%', height: '80px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid var(--glass-border)',
              borderRadius: '12px', padding: '12px',
              color: 'white', fontFamily: 'inherit', fontSize: '0.95rem', resize: 'vertical'
            }}
          />
        </div>
        <div style={{ gridColumn: 'span 2' }}>
          <button
            type="submit"
            disabled={loading}
            className="primary-gradient"
            style={{ width: '100%', height: '48px', borderRadius: '12px', color: 'white', fontWeight: 600 }}
          >
            {loading ? 'Creating...' : 'Launch Product Pipeline'}
          </button>
        </div>
      </div>
    </form>
  )
}
