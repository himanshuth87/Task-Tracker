import * as XLSX from 'xlsx'
import { type Task } from '../supabase'
import { formatDate, getDaysRemaining } from './dateUtils'

export const downloadExcel = (tasks: Task[]) => {
  const dataToExport = tasks.map(t => ({
    'Task Title': t.title,
    'Status': t.status,
    'Priority': t.priority,
    'Assigned By': t.task_giver,
    'Task Owner': t.user_email?.split('@')[0] || 'Unknown',
    'Assigned To': (t as any).assigned_to_email || 'Unassigned',
    'Team': (t as any).team_name || 'General',
    'Start Date': formatDate(t.start_date),
    'Deadline': formatDate(t.deadline),
    'Pending Days': getDaysRemaining(t.deadline) ?? 'N/A',
    'Remarks': t.remarks || ''
  }))

  const ws = XLSX.utils.json_to_sheet(dataToExport)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Team Tasks')
  XLSX.writeFile(wb, `Team_Task_Report_${new Date().toISOString().split('T')[0]}.xlsx`)
}

export const addToOutlook = (task: Task) => {
  const start = task.start_date ? task.start_date.replace(/-/g, '') : new Date().toISOString().split('T')[0].replace(/-/g, '')
  const end = task.deadline ? task.deadline.replace(/-/g, '') : start
  const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const uid = `task-${task.id}@hscvpl.com`
  
  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//HSCVPL//TaskTracker//EN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `SUMMARY:${task.title}`,
    `DTSTART;VALUE=DATE:${start}`,
    `DTEND;VALUE=DATE:${end}`,
    `DESCRIPTION:${task.remarks || ''}\n\nTask Giver: ${task.task_giver}`,
    'STATUS:CONFIRMED',
    'PRIORITY:3',
    'TRANSP:OPAQUE',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n')

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' })
  const link = document.createElement('a')
  link.href = window.URL.createObjectURL(blob)
  link.setAttribute('download', `${task.title.replace(/\s+/g, '_')}.ics`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
