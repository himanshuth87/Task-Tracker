-- Fix status check constraint to include all valid statuses
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE public.tasks ADD CONSTRAINT tasks_status_check
  CHECK (status = ANY (ARRAY['pending','in_progress','blocked','completed']));

-- Create Saif Merchant + Lokesh Bachhav accounts and import 20 tasks (Management team)

DO $$
DECLARE
  saif_id   UUID;
  lokesh_id UUID;
BEGIN

  -- ── Create Saif Merchant ─────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'saif.merchant@hscvpl.com') THEN
    saif_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      saif_id, 'authenticated', 'authenticated',
      'saif.merchant@hscvpl.com',
      crypt('Hscvpl@2026', gen_salt('bf')),
      now(),
      '{"full_name": "Saif Merchant", "team_name": "Management"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO public.profiles (id, email, full_name, team_name, role)
    VALUES (saif_id, 'saif.merchant@hscvpl.com', 'Saif Merchant', 'Management', 'manager');
  ELSE
    SELECT id INTO saif_id FROM auth.users WHERE email = 'saif.merchant@hscvpl.com';
  END IF;

  -- ── Create Lokesh Bachhav ────────────────────────────────────────
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'lokesh.bachhav@hscvpl.com') THEN
    lokesh_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      lokesh_id, 'authenticated', 'authenticated',
      'lokesh.bachhav@hscvpl.com',
      crypt('Hscvpl@2026', gen_salt('bf')),
      now(),
      '{"full_name": "Lokesh Bachhav", "team_name": "Management"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO public.profiles (id, email, full_name, team_name, role)
    VALUES (lokesh_id, 'lokesh.bachhav@hscvpl.com', 'Lokesh Bachhav', 'Management', 'member');
  ELSE
    SELECT id INTO lokesh_id FROM auth.users WHERE email = 'lokesh.bachhav@hscvpl.com';
  END IF;

  -- ── Insert 20 tasks assigned to Lokesh by Saif ──────────────────
  INSERT INTO public.tasks (
    title, task_giver, user_id, user_email,
    assigned_to_email, team_name, status, priority,
    remarks, deadline, start_date, recurrence, position, created_at
  ) VALUES

  ('Preparation of Vietnam',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'high',
   'Data is ready. Yet to be mailed to Company. Needs Saif''s Help.',
   '2026-06-11', '2026-06-12', 'none', 1, now()),

  ('Development of Yarn',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   'Sample handover to Mahavir on 11-06-2026. Mahavir will develop Yarn and submit by 16-06-2026.',
   '2026-06-16', '2026-06-12', 'none', 2, now()),

  ('Examine Qadar bhai Fabric — Get Price & Get sample approved from Qadar',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   '2026-06-24', '2026-06-12', 'none', 3, now()),

  ('3x3 Fabric (Mahavir Impex) — Take approval from Halool leather',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   NULL, '2026-06-12', 'none', 4, now()),

  ('Airmesh work from Panipat',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   'Work going on.',
   '2026-06-17', '2026-06-12', 'none', 5, now()),

  ('Get the price of Saturn Twill — Mahavir Impex',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   NULL, '2026-06-12', 'none', 6, now()),

  ('Check potential for Printing and Coating for Saturn Twill',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   '2026-06-17', '2026-06-12', 'none', 7, now()),

  ('Shell development of Laptop Bag (Samsonite)',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   '2026-06-20', '2026-06-12', 'none', 8, now()),

  ('Masterbatch 2%',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'high',
   '10 Colors developed from Choroplast, 5 Colors from Ajit Kumar. Testing to be done by Akash — Lokesh to coordinate and close by 30th June.',
   '2026-06-30', '2026-06-12', 'none', 9, now()),

  ('Second Grid PP',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   'Can only be done once Masterbatch is developed.',
   NULL, '2026-06-12', 'none', 10, now()),

  ('Mould development — School Bag for First Cry',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'blocked', 'medium',
   'Scope of work yet to be cleared by Amrita.',
   NULL, '2026-06-12', 'none', 11, now()),

  ('Webbing development — Gradient',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   NULL, '2026-06-12', 'none', 12, now()),

  ('Indian Navy — Ayyappan Bag testing',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'blocked', 'high',
   'Quotation under review, will be sent by 12-06-2026. Once Quotation approved by MD and sample given — testing will be done.',
   NULL, '2026-06-12', 'none', 13, now()),

  ('Digital Print on 3x3 Fabric (Whitener)',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   '2026-06-17', '2026-06-12', 'none', 14, now()),

  ('PVC Hinge bidding — Nobel Luggage Rajkot',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   'Supplier coming on 13-06-2026. Rate: 9 Rs per Mtr.',
   NULL, '2026-06-12', 'none', 15, now()),

  ('Trolley — Costing and how to make inhouse',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   '2026-06-22', '2026-06-12', 'none', 16, now()),

  ('LL — Costing and how to make inhouse',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   '2026-06-22', '2026-06-12', 'none', 17, now()),

  ('Butterfly Task',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   '70% Completed.',
   '2026-06-17', '2026-06-12', 'none', 18, now()),

  ('Piping made from Fabric — Surat',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   'Visit to Surat — task will be completed within 5 days from Surat.',
   '2026-06-22', '2026-06-12', 'none', 19, now()),

  ('Embroidery sampling — like Super Dry style',
   'Saif Merchant', saif_id, 'saif.merchant@hscvpl.com',
   'lokesh.bachhav@hscvpl.com', 'Management', 'in_progress', 'medium',
   NULL,
   '2026-06-17', '2026-06-12', 'none', 20, now());

END;
$$;
