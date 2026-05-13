import { ChevronRight } from 'lucide-react'

interface FilterBtnProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}

export function FilterBtn({ active, onClick, label, icon }: FilterBtnProps) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        textAlign: 'left',
        padding: '12px 16px',
        borderRadius: '12px',
        background: active ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontWeight: active ? 600 : 400
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {icon}
        {label}
      </div>
      {active && <ChevronRight size={16} />}
    </button>
  )
}
