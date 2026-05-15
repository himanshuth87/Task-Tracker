

interface AvatarProps {
  name?: string
  email?: string
  size?: number
  className?: string
}

export function Avatar({ name, email, size = 32, className = '' }: AvatarProps) {
  const displayString = name && name.trim() !== '' ? name : (email || 'Unknown')
  
  // Get initials (up to 2 letters)
  const getInitials = (str: string) => {
    const parts = str.split(/[\s._-]/).filter(Boolean)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return str.substring(0, 2).toUpperCase()
  }

  const initials = getInitials(displayString)

  // Generate a consistent background color based on string hash
  const getBgColor = (str: string) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const hue = Math.abs(hash % 360)
    return `hsl(${hue}, 65%, 45%)`
  }

  const bgColor = getBgColor(displayString)

  return (
    <div 
      className={`avatar ${className}`}
      title={displayString}
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        backgroundColor: bgColor,
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        border: '2px solid var(--glass-border)',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
      }}
    >
      {initials}
    </div>
  )
}
