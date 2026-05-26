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
  // Parse as local date to avoid UTC midnight vs local midnight off-by-one
  const [year, month, day] = deadline.split('-').map(Number)
  const deadlineDate = new Date(year, month - 1, day)
  const diffTime = deadlineDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
