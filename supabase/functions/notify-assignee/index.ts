import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@hscvpl.in'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    // Support both direct call ({ title, assigned_to_email, ... }) and database webhook ({ record: { ... } })
    const task = body.record ?? body

    if (!task.assigned_to_email) {
      return new Response(JSON.stringify({ skipped: 'no assignee email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Don't email if the creator assigned it to themselves
    if (task.assigned_to_email === task.user_email) {
      return new Response(JSON.stringify({ skipped: 'self-assigned' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await resend.emails.send({
      from: `TaskTracker <${fromEmail}>`,
      to: [task.assigned_to_email],
      subject: `New Task Assigned: ${task.title}`,
      html: `
        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; background: #f9fafb; padding: 32px; border-radius: 12px;">
          <h2 style="color: #1f2937; margin-bottom: 8px;">📋 New Task Assigned to You</h2>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #6b7280; width: 120px;">Task</td><td style="padding: 8px 0; font-weight: 600; color: #111827;">${task.title}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Assigned By</td><td style="padding: 8px 0; color: #111827;">${task.task_giver || '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Priority</td><td style="padding: 8px 0; color: #111827; text-transform: capitalize;">${task.priority || '—'}</td></tr>
            <tr><td style="padding: 8px 0; color: #6b7280;">Deadline</td><td style="padding: 8px 0; color: #dc2626; font-weight: 600;">${task.deadline || '—'}</td></tr>
            ${task.remarks ? `<tr><td style="padding: 8px 0; color: #6b7280; vertical-align: top;">Remarks</td><td style="padding: 8px 0; color: #374151; font-style: italic;">${task.remarks}</td></tr>` : ''}
          </table>
          <div style="margin-top: 24px;">
            <a href="https://tasktracker.hscvpl.in" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">View in TaskTracker →</a>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return new Response(JSON.stringify({ error }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
