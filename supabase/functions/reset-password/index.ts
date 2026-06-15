import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"
import { Resend } from "npm:resend"
import { corsHeaders } from "../_shared/cors.ts"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@hscvpl.in'
const appUrl = Deno.env.get('APP_URL') || 'https://tasktracker.hscvpl.in'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email } = await req.json()

    if (!email || !EMAIL_RE.test(email)) {
      return jsonResponse({ error: 'Valid email is required' }, 400)
    }

    const { data, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: { redirectTo: appUrl },
    })

    if (linkError || !data?.properties?.action_link) {
      return jsonResponse({ error: 'Could not generate reset link' }, 400)
    }

    const resetLink = data.properties.action_link
    const safeEmail = escapeHtml(email)

    const { error: emailError } = await resend.emails.send({
      from: `TaskTracker <${fromEmail}>`,
      to: [email],
      subject: 'Reset your TaskTracker password',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">

          <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 36px;">
            <p style="margin: 0 0 6px 0; font-size: 0.8rem; color: rgba(255,255,255,0.7); text-transform: uppercase; letter-spacing: 0.08em;">Password Reset</p>
            <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #ffffff;">Reset your password</h1>
          </div>

          <div style="padding: 32px 36px;">
            <p style="margin: 0 0 24px 0; font-size: 1rem; color: #374151; line-height: 1.6;">
              We received a request to reset your password for <strong>${safeEmail}</strong>. Click the button below to choose a new password.
            </p>

            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 0.95rem;">
                Reset Password →
              </a>
            </div>

            <p style="margin: 0; font-size: 0.85rem; color: #9ca3af; text-align: center;">
              This link expires in 1 hour. If you didn't request this, you can safely ignore this email.
            </p>
          </div>

          <div style="padding: 20px 36px; border-top: 1px solid #f3f4f6; text-align: center;">
            <p style="margin: 0; font-size: 0.78rem; color: #9ca3af;">
              Sent via <strong>TaskTracker</strong> · <a href="${appUrl}" style="color: #6366f1; text-decoration: none;">tasktracker.hscvpl.in</a>
            </p>
          </div>

        </div>
      `,
    })

    if (emailError) {
      return jsonResponse({ error: 'Failed to send email' }, 500)
    }

    return jsonResponse({ success: true })
  } catch {
    return jsonResponse({ error: 'Internal server error' }, 500)
  }
})
