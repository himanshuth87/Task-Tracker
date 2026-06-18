import { type Task } from '../supabase'

// Capacity benchmarks taken from the marketing MIS workbook (Sheet1):
// 50 photos/day and 30 edits/day over an 8-hour day.
export const MARKETING_BENCHMARKS = {
  photosPerDay: 50,
  editsPerDay: 30,
  hoursPerDay: 8,
}

const shootRatePerHour = MARKETING_BENCHMARKS.photosPerDay / MARKETING_BENCHMARKS.hoursPerDay
const editRatePerHour = MARKETING_BENCHMARKS.editsPerDay / MARKETING_BENCHMARKS.hoursPerDay

export type ProductivityStatus = 'Low' | 'Average' | 'Good' | 'Excellent'

const n = (v: number | null | undefined): number => (typeof v === 'number' && !isNaN(v) ? v : 0)

/** Rejected inputs / total inputs (total designs, falling back to creatives). 0..1 */
export function rejectionRate(task: Task): number {
  const rejected = n(task.rejected_inputs)
  const total = n(task.total_designs) || n(task.num_creatives)
  if (total <= 0) return 0
  return rejected / total
}

/** actual_delivery - deadline, in whole days. Negative = before time, positive = delayed. null if unknown. */
export function deliveryDelayDays(task: Task): number | null {
  if (!task.actual_delivery || !task.deadline) return null
  const actual = new Date(task.actual_delivery).getTime()
  const expected = new Date(task.deadline).getTime()
  if (isNaN(actual) || isNaN(expected)) return null
  return Math.round((actual - expected) / 86400000)
}

/** A task delivered on or before its deadline. null when delay can't be computed. */
export function isOnTime(task: Task): boolean | null {
  const delay = deliveryDelayDays(task)
  return delay === null ? null : delay <= 0
}

/** shoot_units / (capacity for the hours spent). 0..1+ */
export function shootProductivity(task: Task): number {
  const hours = n(task.shoot_hours)
  if (hours <= 0) return 0
  return n(task.shoot_units) / (shootRatePerHour * hours)
}

/** edit_units / (capacity for the hours spent). 0..1+ */
export function editProductivity(task: Task): number {
  const hours = n(task.edit_hours)
  if (hours <= 0) return 0
  return n(task.edit_units) / (editRatePerHour * hours)
}

/** Combined output / combined capacity across shoot + edit hours. 0..1+ */
export function overallProductivity(task: Task): number {
  const shootCap = shootRatePerHour * n(task.shoot_hours)
  const editCap = editRatePerHour * n(task.edit_hours)
  const cap = shootCap + editCap
  if (cap <= 0) return 0
  return (n(task.shoot_units) + n(task.edit_units)) / cap
}

/** Map a 0..1+ productivity ratio to the workbook's status rating. */
export function productivityStatus(pct: number): ProductivityStatus {
  if (pct >= 1) return 'Excellent'
  if (pct >= 0.85) return 'Good'
  if (pct >= 0.6) return 'Average'
  return 'Low'
}

export const STATUS_COLORS: Record<ProductivityStatus, string> = {
  Low: '#f43f5e',
  Average: '#f59e0b',
  Good: '#3b82f6',
  Excellent: '#10b981',
}

export type PersonSummary = {
  person: string
  designerTasks: number
  photographerTasks: number
  totalCreatives: number
  totalShootUnits: number
  totalEditUnits: number
  totalHours: number
  approvalRate: number // 0..1
  rejectionRate: number // 0..1
  onTimeRate: number // 0..1
  avgQuality: number // 0..5
  productivity: number // 0..1+
  status: ProductivityStatus
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((a, b) => a + b, 0) / values.length
}

/** Aggregate MIS tasks per person (assignee email, falling back to owner email). */
export function summarizeByPerson(tasks: Task[]): PersonSummary[] {
  const misTasks = tasks.filter(t => t.mis_role && t.mis_role !== 'none')
  const groups = new Map<string, Task[]>()
  for (const t of misTasks) {
    const key = t.assigned_to_email || t.user_email || 'Unassigned'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  return Array.from(groups.entries()).map(([person, group]) => {
    const designerTasks = group.filter(t => t.mis_role === 'designer')
    const photographerTasks = group.filter(t => t.mis_role === 'photographer')

    const totalCreatives = group.reduce((s, t) => s + n(t.num_creatives) + n(t.total_designs), 0)
    const totalShootUnits = group.reduce((s, t) => s + n(t.shoot_units), 0)
    const totalEditUnits = group.reduce((s, t) => s + n(t.edit_units), 0)
    const totalHours = group.reduce((s, t) => s + n(t.shoot_hours) + n(t.edit_hours), 0)

    const reviewed = designerTasks.filter(t => t.approved_input != null)
    const approvalRate = reviewed.length ? average(reviewed.map(t => (n(t.approved_input) >= 1 ? 1 : 0))) : 0
    const rejection = average(designerTasks.map(rejectionRate))

    const timed = group.map(isOnTime).filter((v): v is boolean => v !== null)
    const onTimeRate = timed.length ? timed.filter(Boolean).length / timed.length : 0

    const quality = designerTasks.filter(t => t.quality_score != null).map(t => n(t.quality_score))
    const avgQuality = average(quality)

    const productiveTasks = photographerTasks.filter(t => n(t.shoot_hours) + n(t.edit_hours) > 0)
    const productivity = productiveTasks.length ? average(productiveTasks.map(overallProductivity)) : 0

    return {
      person,
      designerTasks: designerTasks.length,
      photographerTasks: photographerTasks.length,
      totalCreatives,
      totalShootUnits,
      totalEditUnits,
      totalHours,
      approvalRate,
      rejectionRate: rejection,
      onTimeRate,
      avgQuality,
      productivity,
      status: productivityStatus(productivity),
    }
  }).sort((a, b) => a.person.localeCompare(b.person))
}

export type DailyRollup = {
  date: string // yyyy-mm-dd
  shootUnits: number
  editUnits: number
  shootHours: number
  editHours: number
  totalHours: number
  productivity: number // 0..1+
  status: ProductivityStatus
}

/** Daily rollup of photographer output, mirroring the workbook's "Review - Summary". */
export function dailyRollup(tasks: Task[]): DailyRollup[] {
  const photog = tasks.filter(t => t.mis_role === 'photographer')
  const groups = new Map<string, Task[]>()
  for (const t of photog) {
    const date = (t.start_date || t.created_at || '').slice(0, 10)
    if (!date) continue
    if (!groups.has(date)) groups.set(date, [])
    groups.get(date)!.push(t)
  }

  return Array.from(groups.entries()).map(([date, group]) => {
    const shootUnits = group.reduce((s, t) => s + n(t.shoot_units), 0)
    const editUnits = group.reduce((s, t) => s + n(t.edit_units), 0)
    const shootHours = group.reduce((s, t) => s + n(t.shoot_hours), 0)
    const editHours = group.reduce((s, t) => s + n(t.edit_hours), 0)
    const cap = shootRatePerHour * shootHours + editRatePerHour * editHours
    const productivity = cap > 0 ? (shootUnits + editUnits) / cap : 0
    return {
      date,
      shootUnits,
      editUnits,
      shootHours,
      editHours,
      totalHours: shootHours + editHours,
      productivity,
      status: productivityStatus(productivity),
    }
  }).sort((a, b) => a.date.localeCompare(b.date))
}

export const pct = (v: number): string => `${Math.round(v * 100)}%`
