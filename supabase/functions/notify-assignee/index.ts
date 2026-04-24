import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { Resend } from "npm:resend"

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

serve(async (req) => {
  const { record } = await req.json()
  
  const { data, error } = await resend.emails.send({
    from: 'TaskTracker <onboarding@resend.dev>',
    to: [record.assigned_to_email],
    subject: 'New Task Assigned: ' + record.title,
    html: `<h1>New Task Assigned</h1>
           <p><strong>Title:</strong> ${record.title}</p>
           <p><strong>Assigned By:</strong> ${record.task_giver}</p>
           <p><strong>Deadline:</strong> ${record.deadline}</p>
           <p>Log in to <a href="https://tasktracker.hscvpl.in">TaskTracker</a> to view details.</p>`
  })

  return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } })
})
