import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Layers } from 'lucide-react'
import { type AppContext } from '../components/layout/AppLayout'
import { taskService } from '../services/taskService'
import { type Task } from '../supabase'
import { getCalendarDays } from '../utils/dateUtils'
import { TaskItem } from '../components/tasks/TaskItem'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function CalendarPage() {
  const { session, viewMode, setViewMode } = useOutletContext<AppContext>()
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  const loadTasks = async () => {
    const { data } = await taskService.fetchAllTasks(session, viewMode, 'all')
    setTasks((data as Task[]) || [])
  }

  useEffect(() => {
    loadTasks()
  }, [viewMode])

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
  }

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
  }

  const calendarDays = useMemo(() => getCalendarDays(year, month), [year, month])

  // Group tasks by their deadline
  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>()
    tasks.forEach(task => {
      if (task.deadline) {
        const existing = map.get(task.deadline) || []
        map.set(task.deadline, [...existing, task])
      }
    })
    return map
  }, [tasks])

  const selectedDateTasks = selectedDate ? (tasksByDate.get(selectedDate) || []) : []

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
            <CalendarIcon size={20} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }} className="gradient-text">Calendar View</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', margin: '2px 0 0 0' }}>Plotting tasks by deadline</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="glass-card" style={{ display: 'flex', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setViewMode('personal')}
              style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                background: viewMode === 'personal' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: viewMode === 'personal' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              My Tasks
            </button>
            <button
              onClick={() => setViewMode('team')}
              style={{
                padding: '6px 12px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
                background: viewMode === 'team' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: viewMode === 'team' ? 'var(--text-main)' : 'var(--text-muted)'
              }}
            >
              Team Tasks
            </button>
          </div>

          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', padding: '4px', borderRadius: '10px' }}>
            <button onClick={prevMonth} className="action-btn" style={{ padding: '6px', borderRadius: '8px' }}>
              <ChevronLeft size={18} />
            </button>
            <div style={{ padding: '0 16px', fontWeight: 600, minWidth: '130px', textAlign: 'center', color: 'var(--text-main)' }}>
              {MONTHS[month]} {year}
            </div>
            <button onClick={nextMonth} className="action-btn" style={{ padding: '6px', borderRadius: '8px' }}>
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="glass-card" style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '12px' }}>
          {WEEKDAYS.map(day => (
            <div key={day} style={{ textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem', padding: '8px 0' }}>
              {day}
            </div>
          ))}
        </div>

        <div className="calendar-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', flex: 1 }}>
          {calendarDays.map((cDay, idx) => {
            const dayTasks = tasksByDate.get(cDay.date) || []
            const isToday = cDay.date === new Date().toISOString().split('T')[0]
            const isSelected = selectedDate === cDay.date

            return (
              <button
                key={`${cDay.date}-${idx}`}
                onClick={() => setSelectedDate(cDay.date)}
                style={{
                  background: isSelected ? 'rgba(99,102,241,0.15)' : cDay.isCurrentMonth ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.01)',
                  border: isSelected ? '1px solid var(--primary)' : isToday ? '1px solid rgba(16,185,129,0.5)' : '1px solid var(--glass-border)',
                  borderRadius: '12px',
                  padding: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  minHeight: '100px',
                  opacity: cDay.isCurrentMonth ? 1 : 0.4,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  position: 'relative'
                }}
                className="hover-bg-glass"
              >
                <div style={{ 
                  width: '24px', height: '24px', borderRadius: '50%', 
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: isToday ? '#10b981' : 'transparent',
                  color: isToday ? 'white' : 'var(--text-main)',
                  fontWeight: isToday ? 700 : 500,
                  fontSize: '0.85rem'
                }}>
                  {cDay.day}
                </div>
                
                {dayTasks.length > 0 && (
                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}>
                    {dayTasks.slice(0, 3).map((t) => (
                      <div key={t.id} style={{ 
                        fontSize: '0.7rem', 
                        padding: '2px 6px', 
                        borderRadius: '4px', 
                        background: t.status === 'completed' ? 'rgba(16,185,129,0.2)' : 'rgba(99,102,241,0.2)',
                        color: t.status === 'completed' ? '#10b981' : '#a5b4fc',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        textAlign: 'left'
                      }}>
                        {t.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textAlign: 'left', paddingLeft: '4px' }}>
                        +{dayTasks.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Side Panel for Selected Date Tasks */}
      <AnimatePresence>
        {selectedDate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDate(null)}
              className="sidebar-overlay open"
              style={{ zIndex: 100 }}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="glass-card"
              style={{
                position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: '450px',
                zIndex: 101, borderRadius: '24px 0 0 24px', borderRight: 'none',
                display: 'flex', flexDirection: 'column', overflow: 'hidden'
              }}
            >
              <div style={{ padding: '24px', borderBottom: '1px solid var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                    {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0 0' }}>
                    {selectedDateTasks.length} task{selectedDateTasks.length !== 1 ? 's' : ''} due
                  </p>
                </div>
                <button onClick={() => setSelectedDate(null)} className="action-btn" style={{ padding: '8px', borderRadius: '50%' }}>
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {selectedDateTasks.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: '40px' }}>
                    <Layers size={40} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <p>No tasks due on this date.</p>
                  </div>
                ) : (
                  selectedDateTasks.map(task => (
                    <TaskItem 
                      key={task.id} 
                      task={task} 
                      onUpdate={loadTasks}
                      currentUserId={session.user.id}
                      currentUserEmail={session.user.email || ''}
                      currentUserName={session.user.user_metadata?.full_name || ''}
                    />
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  )
}
