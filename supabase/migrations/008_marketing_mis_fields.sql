-- Migration 008: Marketing MIS fields
-- Adds per-task marketing + productivity (MIS) columns used by the marketing team
-- and the head-level MIS dashboard. All columns are nullable so other teams are
-- unaffected. Computed metrics (rejection rate, delivery delay, productivity %,
-- status) are derived in the app, not stored.

-- ── Marketing core ───────────────────────────────────────────────
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS channel TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS task_type TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS num_products INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS num_creatives INTEGER;

-- ── Role discriminator (drives which MIS fields apply) ───────────
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS mis_role TEXT DEFAULT 'none';
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_mis_role_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_mis_role_check
  CHECK (mis_role = ANY (ARRAY['none','designer','photographer']));

-- ── Graphic-designer MIS (expected delivery reuses existing deadline) ─
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS total_designs INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS approved_input INTEGER;     -- 0 / 1
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS rejected_inputs INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS quality_score INTEGER;      -- 1..5
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS actual_delivery DATE;

-- ── Photographer MIS ─────────────────────────────────────────────
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS shoot_units INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS num_angles INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS edit_units INTEGER;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS shoot_hours NUMERIC(6,2);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS edit_hours NUMERIC(6,2);
