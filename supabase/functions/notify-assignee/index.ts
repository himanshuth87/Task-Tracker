import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { Buffer } from "node:buffer"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@hscvpl.in'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const priorityColor: Record<string, string> = {
  high: '#dc2626',
  medium: '#d97706',
  low: '#16a34a',
}

const priorityLabel: Record<string, string> = {
  high: '🔴 High',
  medium: '🟡 Medium',
  low: '🟢 Low',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const task = body.record ?? body

    if (!task.assigned_to_email) {
      return new Response(JSON.stringify({ skipped: 'no assignee email' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (task.assigned_to_email === task.user_email) {
      return new Response(JSON.stringify({ skipped: 'self-assigned' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const giver = task.task_giver || 'A colleague'
    const priority = task.priority || 'medium'
    const pColor = priorityColor[priority] || '#6b7280'
    const pLabel = priorityLabel[priority] || priority

    // Fetch attachments if any
    let emailAttachments: any[] = []
    if (body.attachments && Array.isArray(body.attachments) && body.attachments.length > 0) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      for (const att of body.attachments) {
        if (!att.file_path || !att.file_name) continue
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('task-attachments')
          .download(att.file_path)
          
        if (fileData) {
          const arrayBuffer = await fileData.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          emailAttachments.push({
            filename: att.file_name,
            content: buffer
          })
        } else {
          console.error('Failed to download attachment for email:', downloadError)
        }
      }
    }

    const { data, error } = await resend.emails.send({
      from: `${giver} via TaskTracker <${fromEmail}>`,
      to: [task.assigned_to_email],
      subject: `${giver} assigned you a task: ${task.title}`,
      attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 36px;">
            <p style="margin: 0 0 6px 0; font-size: 0.8rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.08em;">Task Assignment</p>
            <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #ffffff; line-height: 1.3;">${task.title}</h1>
          </div>

          <!-- Body -->
          <div style="padding: 32px 36px;">
            <p style="margin: 0 0 24px 0; font-size: 1rem; color: #374151; line-height: 1.6;">
              Hey, <strong>${giver}</strong> has assigned you a task and is counting on you to get it done. Here are the details:
            </p>

            <!-- Task detail cards -->
            <table style="width: 100%; border-collapse: separate; border-spacing: 0 10px;">
              <tr>
                <td style="width: 36px; vertical-align: top; padding-top: 2px;">
                  <span style="font-size: 1.1rem;">📌</span>
                </td>
                <td>
                  <p style="margin: 0; font-size: 0.78rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Task</p>
                  <p style="margin: 2px 0 0 0; font-size: 1rem; font-weight: 600; color: #111827;">${task.title}</p>
                </td>
              </tr>
              <tr>
                <td style="vertical-align: top; padding-top: 2px;">
                  <span style="font-size: 1.1rem;">👤</span>
                </td>
                <td>
                  <p style="margin: 0; font-size: 0.78rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Assigned By</p>
                  <p style="margin: 2px 0 0 0; font-size: 1rem; color: #111827;">${giver}</p>
                </td>
              </tr>
              <tr>
                <td style="vertical-align: top; padding-top: 2px;">
                  <span style="font-size: 1.1rem;">⚡</span>
                </td>
                <td>
                  <p style="margin: 0; font-size: 0.78rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Priority</p>
                  <p style="margin: 2px 0 0 0; font-size: 1rem; font-weight: 600; color: ${pColor};">${pLabel}</p>
                </td>
              </tr>
              <tr>
                <td style="vertical-align: top; padding-top: 2px;">
                  <span style="font-size: 1.1rem;">📅</span>
                </td>
                <td>
                  <p style="margin: 0; font-size: 0.78rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Deadline</p>
                  <p style="margin: 2px 0 0 0; font-size: 1rem; font-weight: 700; color: #dc2626;">${task.deadline || '—'}</p>
                </td>
              </tr>
              ${task.remarks ? `
              <tr>
                <td style="vertical-align: top; padding-top: 2px;">
                  <span style="font-size: 1.1rem;">💬</span>
                </td>
                <td>
                  <p style="margin: 0; font-size: 0.78rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Notes from ${giver}</p>
                  <p style="margin: 6px 0 0 0; font-size: 0.95rem; color: #374151; background: #f9fafb; border-left: 3px solid #6366f1; padding: 10px 14px; border-radius: 0 8px 8px 0; font-style: italic;">"${task.remarks}"</p>
                </td>
              </tr>
              ` : ''}
            </table>

            <!-- CTA -->
            <div style="margin-top: 32px; text-align: center;">
              <a href="https://tasktracker.hscvpl.in" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem; letter-spacing: 0.02em;">
                Open Task Tracker →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 36px; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 0.78rem; color: #9ca3af;">
              Sent via <strong>TaskTracker</strong> · <a href="https://tasktracker.hscvpl.in" style="color: #6366f1; text-decoration: none;">tasktracker.hscvpl.in</a>
            </p>
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
