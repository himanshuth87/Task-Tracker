import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@hscvpl.in'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STAGE_COLORS: Record<string, string> = {
  ecommerce: '#6366f1',
  design:    '#a855f7',
  sampling:  '#f59e0b',
  costing:   '#3b82f6',
  planning:  '#10b981',
  production:'#f43f5e',
  completed: '#10b981',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { productName, completedStage, nextStage, completedBy, recipientEmail } = await req.json()

    if (!recipientEmail) {
      return new Response(JSON.stringify({ skipped: 'no recipient' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const nextColor = STAGE_COLORS[nextStage] || '#6366f1'
    const doneColor = STAGE_COLORS[completedStage] || '#10b981'

    const stageName = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'

    const isFinished = !nextStage || nextStage === 'completed'

    const { data, error } = await resend.emails.send({
      from: `TaskTracker Pipeline <${fromEmail}>`,
      to: [recipientEmail],
      subject: isFinished
        ? `✅ "${productName}" has completed all pipeline stages`
        : `🔁 "${productName}" is now in ${stageName(nextStage)}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <div style="background: linear-gradient(135deg, ${doneColor} 0%, ${nextColor} 100%); padding: 28px 32px;">
            <p style="margin: 0 0 4px 0; font-size: 0.78rem; color: rgba(255,255,255,0.75); text-transform: uppercase; letter-spacing: 0.08em;">Manufacturing Pipeline Update</p>
            <h1 style="margin: 0; font-size: 1.4rem; font-weight: 700; color: #ffffff;">${productName}</h1>
          </div>

          <div style="padding: 28px 32px;">
            <p style="margin: 0 0 24px 0; font-size: 0.95rem; color: #374151; line-height: 1.6;">
              ${completedBy} has completed the <strong style="color: ${doneColor};">${stageName(completedStage)}</strong> stage.
              ${isFinished
                ? 'This product has now completed all pipeline stages.'
                : `The product has moved to <strong style="color: ${nextColor};">${stageName(nextStage)}</strong>.`
              }
            </p>

            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <p style="margin: 0; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Product</p>
                  <p style="margin: 4px 0 0 0; font-size: 0.95rem; font-weight: 600; color: #111827;">${productName}</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <p style="margin: 0; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Stage Completed</p>
                  <p style="margin: 4px 0 0 0; font-size: 0.95rem; color: ${doneColor}; font-weight: 600;">✓ ${stageName(completedStage)}</p>
                </td>
              </tr>
              ${!isFinished ? `
              <tr>
                <td style="padding: 10px 0; border-bottom: 1px solid #f3f4f6;">
                  <p style="margin: 0; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Now Active</p>
                  <p style="margin: 4px 0 0 0; font-size: 0.95rem; color: ${nextColor}; font-weight: 600;">→ ${stageName(nextStage)}</p>
                </td>
              </tr>` : ''}
              <tr>
                <td style="padding: 10px 0;">
                  <p style="margin: 0; font-size: 0.75rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">Handed Off By</p>
                  <p style="margin: 4px 0 0 0; font-size: 0.95rem; color: #111827;">${completedBy}</p>
                </td>
              </tr>
            </table>

            <div style="margin-top: 28px; text-align: center;">
              <a href="https://tasktracker.hscvpl.in" style="display: inline-block; background: linear-gradient(135deg, ${doneColor}, ${nextColor}); color: white; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.9rem;">
                View Pipeline →
              </a>
            </div>
          </div>

          <div style="padding: 16px 32px; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 0.75rem; color: #9ca3af;">
              Sent via <strong>TaskTracker</strong> · <a href="https://tasktracker.hscvpl.in" style="color: #6366f1; text-decoration: none;">tasktracker.hscvpl.in</a>
            </p>
          </div>
        </div>
      `,
    })

    if (error) {
      console.error('Resend error:', error)
      return new Response(JSON.stringify({ error }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ success: true, id: data?.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Function error:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
