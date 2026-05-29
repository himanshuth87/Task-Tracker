interface StatItemProps {
  label: string;
  value: number;
  color: string;
}

export function StatItem({ label, value, color }: StatItemProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.02em', fontWeight: 600 }}>{label}</span>
      <span style={{ fontWeight: 800, color, fontSize: '1.1rem' }}>{value}</span>
    </div>
  )
}
