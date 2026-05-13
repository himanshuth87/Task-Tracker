import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials missing. Please check your .env file.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

export type Task = {
  id: string;
  title: string;
  description: string | null;
  status: 'pending' | 'completed';
  priority: 'low' | 'medium' | 'high';
  category: string;
  created_at: string;
  user_id: string;
  user_email?: string;
  assigned_to_email: string | null;
  task_giver: string;
  deadline: string | null;
  start_date: string | null;
  remarks: string | null;
  outlook_link: string | null;
  team_name?: string;
};

export type StageName = 'ecommerce' | 'design' | 'sampling' | 'costing' | 'planning' | 'production';

export type ProductStage = {
  id: string;
  product_id: string;
  stage_name: StageName;
  stage_order: number;
  status: 'pending' | 'active' | 'completed' | 'on_hold';
  assigned_to_email: string | null;
  assigned_to_name: string | null;
  started_at: string | null;
  completed_at: string | null;
  sla_days: number;
  notes: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  name: string;
  style_code: string | null;
  category: string;
  season: string | null;
  description: string | null;
  current_stage: StageName | 'completed';
  status: 'active' | 'on_hold' | 'completed' | 'cancelled';
  created_by: string;
  created_by_email: string | null;
  created_by_name: string | null;
  team_name: string | null;
  created_at: string;
  updated_at: string;
  stages?: ProductStage[];
};
