-- ============================================================
-- Manufacturing Pipeline Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Products table: each "bag" or style being developed
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  style_code TEXT,
  category TEXT DEFAULT 'bag',
  season TEXT,
  description TEXT,
  current_stage TEXT NOT NULL DEFAULT 'ecommerce',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_email TEXT,
  created_by_name TEXT,
  team_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product stages: one row per stage per product (6 rows created automatically)
CREATE TABLE product_stages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  stage_name TEXT NOT NULL CHECK (stage_name IN ('ecommerce','design','sampling','costing','planning','production')),
  stage_order INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','completed','on_hold')),
  assigned_to_email TEXT,
  assigned_to_name TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  sla_days INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create all 6 stage rows when a product is inserted
CREATE OR REPLACE FUNCTION create_product_stages()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO product_stages (product_id, stage_name, stage_order, status, sla_days, started_at) VALUES
    (NEW.id, 'ecommerce',  1, 'active',  1, NOW()),
    (NEW.id, 'design',     2, 'pending', 3, NULL),
    (NEW.id, 'sampling',   3, 'pending', 2, NULL),
    (NEW.id, 'costing',    4, 'pending', 2, NULL),
    (NEW.id, 'planning',   5, 'pending', 3, NULL),
    (NEW.id, 'production', 6, 'pending', 7, NULL);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_product_insert
  AFTER INSERT ON products
  FOR EACH ROW EXECUTE FUNCTION create_product_stages();

-- Indexes
CREATE INDEX idx_products_team ON products(team_name);
CREATE INDEX idx_products_stage ON products(current_stage);
CREATE INDEX idx_product_stages_product ON product_stages(product_id);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_stages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: all authenticated users in same team can see products
CREATE POLICY "team_products_select" ON products
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "team_products_insert" ON products
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "team_products_update" ON products
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "team_stages_select" ON product_stages
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "team_stages_update" ON product_stages
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Enable real-time on products
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE product_stages;
