import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@hscvpl.in'
const appUrl = 'https://tasktracker.hscvpl.in'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { invited_email, invited_by_name, team_name } = await req.json()

    if (!invited_email || !team_name) {
      return new Response(JSON.stringify({ skipped: 'missing fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await resend.emails.send({
      from: `${invited_by_name} via TaskTracker <${fromEmail}>`,
      to: [invited_email],
      subject: `${invited_by_name} invited you to join ${team_name} on TaskTracker`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 36px;">
            <p style="margin: 0 0 6px 0; font-size: 0.8rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.08em;">Team Invitation</p>
            <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #ffffff; line-height: 1.3;">You're invited to join ${team_name}</h1>
          </div>

          <!-- Body -->
          <div style="padding: 32px 36px;">
            <p style="margin: 0 0 24px 0; font-size: 1rem; color: #374151; line-height: 1.6;">
              Hey, <strong>${invited_by_name}</strong> has invited you to join the <strong>${team_name}</strong> team on TaskTracker.
            </p>

            <div style="background: #f9fafb; border-radius: 12px; padding: 20px 24px; margin-bottom: 28px; border: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px 0; font-size: 0.78rem; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.06em;">To join, sign up with:</p>
              <p style="margin: 0 0 4px 0; font-size: 0.95rem; color: #111827;"><strong>Email:</strong> ${invited_email}</p>
              <p style="margin: 0; font-size: 0.95rem; color: #111827;"><strong>Team name:</strong> ${team_name}</p>
            </div>

            <div style="text-align: center;">
              <a href="${appUrl}?invite=true&team=${encodeURIComponent(team_name)}&email=${encodeURIComponent(invited_email)}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem; letter-spacing: 0.02em;">
                Join TaskTracker →
              </a>
            </div>
          </div>

          <!-- Footer -->
          <div style="padding: 20px 36px; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 0.78rem; color: #9ca3af;">
              Sent via <strong>TaskTracker</strong> · <a href="${appUrl}" style="color: #6366f1; text-decoration: none;">tasktracker.hscvpl.in</a>
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
