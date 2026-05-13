export function formatDate(dateStr: string | null) {
  if (!dateStr) return 'N/A'
  try {
    const parts = dateStr.split('-')
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`
    }
    return dateStr
  } catch (e) {
    return dateStr
  }
}

export function getDaysRemaining(deadline: string | null) {
  if (!deadline) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadlineDate = new Date(deadline)
  const diffTime = deadlineDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
