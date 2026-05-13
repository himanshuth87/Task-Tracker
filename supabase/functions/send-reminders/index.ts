import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

Deno.serve(async (_req) => {
  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + 2)
  const dateString = targetDate.toISOString().split('T')[0]

  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('title, deadline, remarks, profiles(email)')
    .eq('deadline', dateString)
    .eq('status', 'pending')

  if (error) return new Response(JSON.stringify(error), { status: 500 })

  for (const task of tasks) {
    const userEmail = (task.profiles as any)?.email
    if (!userEmail) continue

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'TaskTracker <onboarding@resend.dev>',
        to: [userEmail],
        subject: `Reminder: Task "${task.title}" is due in 2 days!`,
        html: `<strong>Hi!</strong><p>Your task <b>${task.title}</b> is due on ${task.deadline}.</p><p>Remarks: ${task.remarks || 'None'}</p>`,
      }),
    })
  }

  return new Response(JSON.stringify({ sent: tasks.length }), { status: 200 })
})
