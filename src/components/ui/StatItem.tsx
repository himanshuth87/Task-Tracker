interface StatItemProps {
  label: string;
  value: number;
  color: string;
}

export function StatItem({ label, value, color }: StatItemProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{label}</span>
      <span style={{ fontWeight: 700, color, fontSize: '1.1rem' }}>{value}</span>
    </div>
  )
}
