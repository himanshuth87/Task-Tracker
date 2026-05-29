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

export function getCalendarDays(year: number, month: number) {
  // month is 0-indexed (0 = Jan, 11 = Dec)
  const firstDayOfMonth = new Date(year, month, 1)
  const lastDayOfMonth = new Date(year, month + 1, 0)
  
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday
  const daysInMonth = lastDayOfMonth.getDate()
  
  const days = []
  
  // Previous month padding
  const prevMonthLastDay = new Date(year, month, 0).getDate()
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = prevMonthLastDay - i
    const dateStr = new Date(year, month - 1, d).toISOString().split('T')[0]
    days.push({ date: dateStr, day: d, isCurrentMonth: false })
  }
  
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    // Add timezone-safe date generation
    const date = new Date(year, month, i)
    // Adjust for timezone offset so ISO string matches local date
    const offset = date.getTimezoneOffset() * 60000
    const localDate = new Date(date.getTime() - offset)
    const dateStr = localDate.toISOString().split('T')[0]
    days.push({ date: dateStr, day: i, isCurrentMonth: true })
  }
  
  // Next month padding (to fill exactly 42 slots / 6 weeks)
  const remainingSlots = 42 - days.length
  for (let i = 1; i <= remainingSlots; i++) {
    const date = new Date(year, month + 1, i)
    const offset = date.getTimezoneOffset() * 60000
    const localDate = new Date(date.getTime() - offset)
    const dateStr = localDate.toISOString().split('T')[0]
    days.push({ date: dateStr, day: i, isCurrentMonth: false })
  }
  
  return days
}
