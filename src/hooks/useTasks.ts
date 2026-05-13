import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { taskService } from '../services/taskService'
import { type Session } from '@supabase/supabase-js'

export function useTasks(session: Session | null, viewMode: 'personal' | 'team', filter: string) {
  const queryClient = useQueryClient()
  const [isLive, setIsLive] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  // Professional data fetching with TanStack Query
  const { data: tasks = [], isLoading: loading, refetch } = useQuery({
    queryKey: ['tasks', viewMode, filter, session?.user?.id],
    queryFn: async () => {
      if (!session) return []
      const { data, error } = await taskService.fetchTasks(session, viewMode, filter)
      if (error) throw error
      return data || []
    },
    enabled: !!session,
  })

  useEffect(() => {
    if (!session) return

    // Real-time subscription
    const channel = taskService.subscribeToTasks((payload: any) => {
      // Invalidate query to trigger refetch
      queryClient.invalidateQueries({ queryKey: ['tasks'] })

      if (payload.eventType === 'INSERT' && payload.new.assigned_to_email === session.user.email) {
        setUnreadCount(prev => prev + 1)
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("New Task Assigned!", {
            body: `Task: ${payload.new.title}\nAssigned by: ${payload.new.task_giver}`,
            icon: '/vite.svg'
          });
        }
      }
    })

    setIsLive(true)

    return () => {
      channel.unsubscribe()
    }
  }, [session, queryClient])

  return { 
    tasks, 
    loading, 
    isLive, 
    unreadCount, 
    setUnreadCount, 
    fetchTasks: refetch 
  }
}
