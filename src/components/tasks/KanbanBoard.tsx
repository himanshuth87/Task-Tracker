import { useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Clock, Loader2, AlertCircle, Check } from 'lucide-react'
import { type Task, type TaskStatus } from '../../supabase'
import { taskService } from '../../services/taskService'
import { toast } from 'sonner'
import { formatDate, getDaysRemaining } from '../../utils/dateUtils'

interface KanbanBoardProps {
  tasks: Task[]
  onUpdate: () => void
}

const COLUMNS: { id: TaskStatus; label: string; color: string; bg: string; icon: React.ReactNode }[] = [
  { id: 'pending',     label: 'Pending',     color: 'rgba(255,255,255,0.4)', bg: 'rgba(255,255,255,0.04)', icon: <Clock size={14} /> },
  { id: 'in_progress', label: 'In Progress', color: '#3b82f6',               bg: 'rgba(59,130,246,0.08)',  icon: <Loader2 size={14} /> },
  { id: 'blocked',     label: 'Blocked',     color: '#f43f5e',               bg: 'rgba(244,63,94,0.08)',   icon: <AlertCircle size={14} /> },
  { id: 'completed',   label: 'Done',        color: '#10b981',               bg: 'rgba(16,185,129,0.08)',  icon: <Check size={14} /> },
]

function KanbanCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  const daysLeft = getDaysRemaining(task.deadline)
  const isOverdue = task.status !== 'completed' && daysLeft !== null && daysLeft < 0

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="glass-card"
      style={{
        ...style,
        padding: '14px 16px',
        cursor: 'grab',
        marginBottom: '8px',
        borderRadius: '14px',
        border: isOverdue ? '1px solid rgba(244,63,94,0.4)' : '1px solid var(--glass-border)',
        userSelect: 'none',
      }}
    >
      <p style={{ fontSize: '0.9rem', fontWeight: 600, color: task.status === 'completed' ? 'var(--text-muted)' : 'white', textDecoration: task.status === 'completed' ? 'line-through' : 'none', lineHeight: 1.4 }}>
        {task.title}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
        <span className={`priority-badge ${task.priority}`}>{task.priority}</span>
        {task.assigned_to_email && (
          <span style={{ fontSize: '0.7rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '1px 7px', borderRadius: '10px' }}>
            {task.assigned_to_email.split('@')[0]}
          </span>
        )}
        {daysLeft !== null && (
          <span style={{ fontSize: '0.7rem', color: isOverdue ? '#f43f5e' : daysLeft <= 2 ? '#f59e0b' : 'var(--text-muted)' }}>
            {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Due today' : `${daysLeft}d left`}
          </span>
        )}
      </div>
      {task.deadline && (
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '6px' }}>{formatDate(task.deadline)}</p>
      )}
    </div>
  )
}

export function KanbanBoard({ tasks, onUpdate }: KanbanBoardProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const tasksByStatus = useMemo(() => {
    const map: Record<TaskStatus, Task[]> = { pending: [], in_progress: [], blocked: [], completed: [] }
    tasks.forEach(t => { map[t.status]?.push(t) })
    return map
  }, [tasks])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const draggedTask = tasks.find(t => t.id === active.id)
    const targetColumn = COLUMNS.find(c => c.id === over.id)

    if (!draggedTask || !targetColumn) return
    if (draggedTask.status === targetColumn.id) return

    const { error } = await taskService.updateTask(draggedTask.id, { status: targetColumn.id })
    if (error) {
      toast.error('Failed to move task')
    } else {
      toast.success(`Moved to ${targetColumn.label}`)
      onUpdate()
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', overflowX: 'auto', minWidth: '700px' }}>
        {COLUMNS.map(col => (
          <div key={col.id} style={{ background: col.bg, borderRadius: '18px', padding: '16px', minHeight: '400px', border: `1px solid ${col.color}20` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                <span style={{ color: col.color }}>{col.icon}</span>
                <span style={{ fontWeight: 700, color: col.color, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {col.label}
                </span>
              </div>
              <span style={{ background: `${col.color}20`, color: col.color, fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: '10px' }}>
                {tasksByStatus[col.id].length}
              </span>
            </div>
            <SortableContext items={tasksByStatus[col.id].map(t => t.id)} strategy={verticalListSortingStrategy}>
              {tasksByStatus[col.id].map(task => (
                <KanbanCard key={task.id} task={task} />
              ))}
            </SortableContext>
            {tasksByStatus[col.id].length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', borderRadius: '12px', border: `2px dashed ${col.color}20` }}>
                <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.2)' }}>Drop tasks here</p>
              </div>
            )}
          </div>
        ))}
      </div>
      <DragOverlay>
        {null}
      </DragOverlay>
    </DndContext>
  )
}
