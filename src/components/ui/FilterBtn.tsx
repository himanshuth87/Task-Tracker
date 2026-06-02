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
        padding: '6px 12px',
        borderRadius: '9px',
        background: active ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
        color: active ? 'var(--primary)' : 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '5px',
        fontWeight: active ? 600 : 400,
        fontSize: '0.82rem',
        whiteSpace: 'nowrap',
        transition: 'all 0.2s',
      }}
    >
      {icon}
      {label}
    </button>
  )
}
