-- Enable pg_net for HTTP calls from pg_cron
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Remove any previous schedule with same name (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'overdue-reminder-daily') THEN
    PERFORM cron.unschedule('overdue-reminder-daily');
  END IF;
END;
$$;

-- Schedule daily at 08:00 AM IST (02:30 UTC)
SELECT cron.schedule(
  'overdue-reminder-daily',
  '30 2 * * *',
  'SELECT net.http_post(
    url := ''https://dpslgrukuuvgbcbhibsf.supabase.co/functions/v1/overdue-reminder'',
    headers := ''{"Content-Type": "application/json"}''::jsonb,
    body := ''{}''::jsonb
  );'
);
