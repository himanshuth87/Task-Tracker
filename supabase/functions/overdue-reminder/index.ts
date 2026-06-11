import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@hscvpl.in'
const appUrl = 'https://tasktracker.hscvpl.in'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysOverdue(deadlineStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const deadline = new Date(deadlineStr)
  deadline.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24))
}

function taskRowHtml(task: any, showAssignee = false): string {
  const overdueDays = daysOverdue(task.deadline)
  const badge = overdueDays === 1
    ? '1 day overdue'
    : `${overdueDays} days overdue`

  return `
    <tr>
      <td style="padding: 14px 16px; border-bottom: 1px solid #f3f4f6; vertical-align: top;">
        <p style="margin: 0 0 4px 0; font-size: 0.95rem; font-weight: 600; color: #111827;">${task.title}</p>
        ${showAssignee ? `<p style="margin: 0 0 4px 0; font-size: 0.82rem; color: #6b7280;">Assigned to: ${task.assigned_to_email}</p>` : ''}
        ${task.remarks ? `<p style="margin: 0 0 4px 0; font-size: 0.82rem; color: #6b7280; font-style: italic;">${task.remarks}</p>` : ''}
        <span style="display: inline-block; background: #fef2f2; color: #dc2626; font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 20px; border: 1px solid #fecaca;">
          ⚠ ${badge}
        </span>
        <span style="display: inline-block; margin-left: 6px; background: #f3f4f6; color: #6b7280; font-size: 0.72rem; font-weight: 600; padding: 2px 8px; border-radius: 20px;">
          Due: ${formatDate(task.deadline)}
        </span>
      </td>
    </tr>
  `
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const today = new Date().toISOString().split('T')[0]

    // Fetch all overdue, incomplete tasks that have an assignee
    const { data: overdueTasks, error } = await supabase
      .from('tasks')
      .select('id, title, deadline, status, remarks, assigned_to_email, task_giver, user_email, priority')
      .lt('deadline', today)
      .neq('status', 'completed')
      .not('assigned_to_email', 'is', null)
      .is('deleted_at', null)

    if (error) {
      console.error('DB query error:', error)
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!overdueTasks || overdueTasks.length === 0) {
      return new Response(JSON.stringify({ message: 'No overdue tasks today', sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // --- Group by assignee for assignee digest ---
    const byAssignee = new Map<string, typeof overdueTasks>()
    for (const task of overdueTasks) {
      const key = task.assigned_to_email!
      if (!byAssignee.has(key)) byAssignee.set(key, [])
      byAssignee.get(key)!.push(task)
    }

    // --- Group by task_giver email for manager digest ---
    const byGiver = new Map<string, typeof overdueTasks>()
    for (const task of overdueTasks) {
      if (!task.user_email) continue
      // Skip if assignee and giver are the same person
      if (task.user_email === task.assigned_to_email) continue
      if (!byGiver.has(task.user_email)) byGiver.set(task.user_email, [])
      byGiver.get(task.user_email)!.push(task)
    }

    let emailsSent = 0
    const errors: string[] = []

    // === Send digest to each ASSIGNEE ===
    for (const [assigneeEmail, tasks] of byAssignee.entries()) {
      const count = tasks.length
      const taskRows = tasks.map(t => taskRowHtml(t, false)).join('')

      const { error: sendError } = await resend.emails.send({
        from: `TaskTracker <${fromEmail}>`,
        to: [assigneeEmail],
        subject: `⚠️ ${count} task${count > 1 ? 's' : ''} past deadline — action needed`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); padding: 28px 36px;">
              <p style="margin: 0 0 6px 0; font-size: 0.8rem; color: rgba(255,255,255,0.75); text-transform: uppercase; letter-spacing: 0.08em;">Overdue Reminder</p>
              <h1 style="margin: 0; font-size: 1.4rem; font-weight: 700; color: #ffffff; line-height: 1.3;">
                You have ${count} overdue task${count > 1 ? 's' : ''}
              </h1>
            </div>

            <!-- Body -->
            <div style="padding: 28px 36px 8px;">
              <p style="margin: 0 0 20px 0; font-size: 0.95rem; color: #374151; line-height: 1.6;">
                The following task${count > 1 ? 's' : ''} assigned to you ${count > 1 ? 'have' : 'has'} passed the deadline and ${count > 1 ? 'are' : 'is'} still not marked as completed. Please update the status or reach out to your manager.
              </p>

              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                ${taskRows}
              </table>
            </div>

            <!-- CTA -->
            <div style="padding: 24px 36px; text-align: center;">
              <a href="${appUrl}/tasks?view=assigned_to_me" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem; letter-spacing: 0.02em;">
                Open My Tasks →
              </a>
            </div>

            <!-- Footer -->
            <div style="padding: 16px 36px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; font-size: 0.75rem; color: #9ca3af;">
                Sent by <strong>TaskTracker</strong> · <a href="${appUrl}" style="color: #6366f1; text-decoration: none;">tasktracker.hscvpl.in</a>
              </p>
            </div>
          </div>
        `,
      })

      if (sendError) {
        console.error(`Failed to email assignee ${assigneeEmail}:`, sendError)
        errors.push(`assignee:${assigneeEmail}`)
      } else {
        emailsSent++
        console.log(`Sent overdue digest to assignee: ${assigneeEmail} (${count} tasks)`)
      }
    }

    // === Send digest to each TASK GIVER / MANAGER ===
    for (const [giverEmail, tasks] of byGiver.entries()) {
      const count = tasks.length
      const giverName = tasks[0].task_giver || 'Manager'
      const taskRows = tasks.map(t => taskRowHtml(t, true)).join('')

      const { error: sendError } = await resend.emails.send({
        from: `TaskTracker <${fromEmail}>`,
        to: [giverEmail],
        subject: `📋 ${count} task${count > 1 ? 's' : ''} assigned by you ${count > 1 ? 'are' : 'is'} overdue`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

            <!-- Header -->
            <div style="background: linear-gradient(135deg, #d97706 0%, #b45309 100%); padding: 28px 36px;">
              <p style="margin: 0 0 6px 0; font-size: 0.8rem; color: rgba(255,255,255,0.75); text-transform: uppercase; letter-spacing: 0.08em;">Manager Review</p>
              <h1 style="margin: 0; font-size: 1.4rem; font-weight: 700; color: #ffffff; line-height: 1.3;">
                ${count} task${count > 1 ? 's' : ''} you assigned ${count > 1 ? 'are' : 'is'} overdue
              </h1>
            </div>

            <!-- Body -->
            <div style="padding: 28px 36px 8px;">
              <p style="margin: 0 0 20px 0; font-size: 0.95rem; color: #374151; line-height: 1.6;">
                Hi <strong>${giverName}</strong>, the following task${count > 1 ? 's' : ''} that you assigned ${count > 1 ? 'have' : 'has'} crossed the deadline without being completed. You may want to follow up.
              </p>

              <table style="width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
                ${taskRows}
              </table>
            </div>

            <!-- CTA -->
            <div style="padding: 24px 36px; text-align: center;">
              <a href="${appUrl}/tasks" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem; letter-spacing: 0.02em;">
                Review All Tasks →
              </a>
            </div>

            <!-- Footer -->
            <div style="padding: 16px 36px; border-top: 1px solid #f3f4f6; text-align: center;">
              <p style="margin: 0; font-size: 0.75rem; color: #9ca3af;">
                Sent by <strong>TaskTracker</strong> · <a href="${appUrl}" style="color: #6366f1; text-decoration: none;">tasktracker.hscvpl.in</a>
              </p>
            </div>
          </div>
        `,
      })

      if (sendError) {
        console.error(`Failed to email giver ${giverEmail}:`, sendError)
        errors.push(`giver:${giverEmail}`)
      } else {
        emailsSent++
        console.log(`Sent overdue review to manager: ${giverEmail} (${count} tasks)`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        overdueTasks: overdueTasks.length,
        emailsSent,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
