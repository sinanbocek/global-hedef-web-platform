-- ==========================================
-- FINANCIAL MANAGEMENT SYSTEM - DATABASE SCHEMA
-- ==========================================

-- 1. PARTNERS TABLE
-- Stores company partners with their basic information
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tc_vkn TEXT UNIQUE, -- Turkish ID or Tax ID
  email TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PARTNER SHARES TABLE
-- Tracks historical partnership percentages over time
CREATE TABLE IF NOT EXISTS public.partner_shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  share_percentage NUMERIC(5,2) NOT NULL CHECK (share_percentage >= 0 AND share_percentage <= 100),
  effective_from DATE NOT NULL,
  effective_until DATE, -- NULL = currently active
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. COMMISSION DISTRIBUTIONS TABLE
-- Records how each policy's commission is split
CREATE TABLE IF NOT EXISTS public.commission_distributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  policy_id UUID REFERENCES public.policies(id) ON DELETE CASCADE,
  total_commission NUMERIC(12,2) NOT NULL,
  
  -- Salesperson Share (default 30%)
  salesperson_id TEXT, -- Changed from UUID REFERENCES to just TEXT
  salesperson_amount NUMERIC(12,2) DEFAULT 0,
  salesperson_percentage NUMERIC(5,2) DEFAULT 30.00,
  
  -- Partners Pool (default 30%)
  partners_pool_amount NUMERIC(12,2) DEFAULT 0,
  partners_percentage NUMERIC(5,2) DEFAULT 30.00,
  
  -- Company Treasury (default 40%)
  company_pool_amount NUMERIC(12,2) DEFAULT 0,
  company_percentage NUMERIC(5,2) DEFAULT 40.00,
  
  distribution_date DATE DEFAULT CURRENT_DATE,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PARTNER COMMISSION ALLOCATIONS TABLE
-- Individual partner's share from each distribution
CREATE TABLE IF NOT EXISTS public.partner_commission_allocations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  distribution_id UUID REFERENCES public.commission_distributions(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
  allocated_amount NUMERIC(12,2) NOT NULL,
  share_percentage NUMERIC(5,2) NOT NULL, -- Partner's share at that time
  
  -- Payment tracking
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  payment_date DATE,
  payment_method TEXT, -- 'Banka Transferi', 'Nakit', etc.
  payment_reference TEXT, -- Receipt number, transaction ID, etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Partner Shares Indexes
CREATE INDEX IF NOT EXISTS idx_partner_shares_active 
  ON public.partner_shares(partner_id, effective_from, effective_until)
  WHERE effective_until IS NULL;

CREATE INDEX IF NOT EXISTS idx_partner_shares_partner 
  ON public.partner_shares(partner_id);

-- Commission Distributions Indexes
CREATE INDEX IF NOT EXISTS idx_distributions_policy 
  ON public.commission_distributions(policy_id);

CREATE INDEX IF NOT EXISTS idx_distributions_salesperson 
  ON public.commission_distributions(salesperson_id);

CREATE INDEX IF NOT EXISTS idx_distributions_date 
  ON public.commission_distributions(distribution_date);

CREATE INDEX IF NOT EXISTS idx_distributions_status 
  ON public.commission_distributions(status);

-- Partner Commission Allocations Indexes
CREATE INDEX IF NOT EXISTS idx_allocations_partner 
  ON public.partner_commission_allocations(partner_id);

CREATE INDEX IF NOT EXISTS idx_allocations_distribution 
  ON public.partner_commission_allocations(distribution_id);

CREATE INDEX IF NOT EXISTS idx_allocations_status 
  ON public.partner_commission_allocations(payment_status);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- ==========================================

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_commission_allocations ENABLE ROW LEVEL SECURITY;

-- Policies for partners
DROP POLICY IF EXISTS "Enable read for all" ON public.partners;
CREATE POLICY "Enable read for all" ON public.partners FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON public.partners;
CREATE POLICY "Enable all for authenticated" ON public.partners FOR ALL USING (true);

-- Policies for partner_shares
DROP POLICY IF EXISTS "Enable read for all" ON public.partner_shares;
CREATE POLICY "Enable read for all" ON public.partner_shares FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable all for authenticated" ON public.partner_shares;
CREATE POLICY "Enable all for authenticated" ON public.partner_shares FOR ALL USING (true);

-- Policies for commission_distributions
DROP POLICY IF EXISTS "Enable all for all" ON public.commission_distributions;
CREATE POLICY "Enable all for all" ON public.commission_distributions FOR ALL USING (true);

-- Policies for partner_commission_allocations
DROP POLICY IF EXISTS "Enable all for all" ON public.partner_commission_allocations;
CREATE POLICY "Enable all for all" ON public.partner_commission_allocations FOR ALL USING (true);

-- ==========================================
-- COMMISSION DISTRIBUTION FUNCTION
-- ==========================================

CREATE OR REPLACE FUNCTION public.distribute_policy_commission(p_policy_id UUID)
RETURNS UUID AS $$
DECLARE
  v_distribution_id UUID;
  v_commission NUMERIC;
  v_salesperson_id TEXT; -- Changed from UUID to TEXT
  v_salesperson_amt NUMERIC;
  v_partners_amt NUMERIC;
  v_company_amt NUMERIC;
  v_partner RECORD;
  v_partner_share NUMERIC;
  v_salesperson_pct NUMERIC := 30.00;
  v_partners_pct NUMERIC := 30.00;
  v_company_pct NUMERIC := 40.00;
BEGIN
  -- Get policy details
  SELECT commission_amount, salesperson_id 
  INTO v_commission, v_salesperson_id
  FROM public.policies 
  WHERE id = p_policy_id;
  
  -- If no commission, exit
  IF v_commission IS NULL OR v_commission <= 0 THEN
    RETURN NULL;
  END IF;
  
  -- Check if distribution already exists
  IF EXISTS (SELECT 1 FROM public.commission_distributions WHERE policy_id = p_policy_id) THEN
    -- Update existing distribution instead of creating duplicate
    RETURN (SELECT id FROM public.commission_distributions WHERE policy_id = p_policy_id LIMIT 1);
  END IF;
  
  -- TODO: Get dynamic percentages from settings_brand (JSONB field)
  -- For now, using defaults: 30% salesperson, 30% partners, 40% company
  
  -- Calculate distribution
  IF v_salesperson_id IS NOT NULL AND v_salesperson_id != '' THEN
    v_salesperson_amt := v_commission * (v_salesperson_pct / 100.0);
    v_partners_amt := v_commission * (v_partners_pct / 100.0);
    v_company_amt := v_commission * (v_company_pct / 100.0);
  ELSE
    -- No salesperson = their share goes to company
    v_salesperson_amt := 0;
    v_partners_amt := v_commission * (v_partners_pct / 100.0);
    v_company_amt := v_commission * ((v_salesperson_pct + v_company_pct) / 100.0);
  END IF;
  
  -- Create distribution record
  INSERT INTO public.commission_distributions (
    policy_id, total_commission,
    salesperson_id, salesperson_amount, salesperson_percentage,
    partners_pool_amount, partners_percentage,
    company_pool_amount, company_percentage
  ) VALUES (
    p_policy_id, v_commission,
    v_salesperson_id, v_salesperson_amt, v_salesperson_pct,
    v_partners_amt, v_partners_pct,
    v_company_amt, v_company_pct
  ) RETURNING id INTO v_distribution_id;
  
  -- Distribute to active partners based on their current shares
  FOR v_partner IN 
    SELECT p.id, ps.share_percentage
    FROM public.partners p
    JOIN public.partner_shares ps ON ps.partner_id = p.id
    WHERE p.is_active = true
      AND ps.effective_from <= CURRENT_DATE
      AND (ps.effective_until IS NULL OR ps.effective_until >= CURRENT_DATE)
  LOOP
    v_partner_share := v_partners_amt * (v_partner.share_percentage / 100.0);
    
    INSERT INTO public.partner_commission_allocations (
      distribution_id, partner_id, allocated_amount, share_percentage
    ) VALUES (
      v_distribution_id, v_partner.id, v_partner_share, v_partner.share_percentage
    );
  END LOOP;
  
  RETURN v_distribution_id;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- INITIAL DATA: INSERT 3 PARTNERS
-- ==========================================

-- Insert partners
INSERT INTO public.partners (name, email, phone, is_active)
VALUES 
  ('Emel İpek', NULL, NULL, true),
  ('Onur Ünal', NULL, NULL, true),
  ('İstanbul Group Ltd.Şti.', NULL, NULL, true)
ON CONFLICT (tc_vkn) DO NOTHING;

-- Insert their current shares (effective from today)
INSERT INTO public.partner_shares (partner_id, share_percentage, effective_from, effective_until, notes)
SELECT id, 30.00, CURRENT_DATE, NULL, 'Initial share allocation'
FROM public.partners WHERE name = 'Emel İpek'
ON CONFLICT DO NOTHING;

INSERT INTO public.partner_shares (partner_id, share_percentage, effective_from, effective_until, notes)
SELECT id, 30.00, CURRENT_DATE, NULL, 'Initial share allocation'
FROM public.partners WHERE name = 'Onur Ünal'
ON CONFLICT DO NOTHING;

INSERT INTO public.partner_shares (partner_id, share_percentage, effective_from, effective_until, notes)
SELECT id, 40.00, CURRENT_DATE, NULL, 'Initial share allocation'
FROM public.partners WHERE name = 'İstanbul Group Ltd.Şti.'
ON CONFLICT DO NOTHING;

-- ==========================================
-- COMMISSION SETTINGS IN BRAND TABLE
-- ==========================================

-- Add commission_settings JSONB column to settings_brand if it doesn't exist
ALTER TABLE public.settings_brand 
ADD COLUMN IF NOT EXISTS commission_settings JSONB DEFAULT '{
  "salesperson_percentage": 30,
  "partners_percentage": 30,
  "company_percentage": 40
}'::jsonb;

-- Update existing row with default commission settings
UPDATE public.settings_brand
SET commission_settings = '{
  "salesperson_percentage": 30,
  "partners_percentage": 30,
  "company_percentage": 40
}'::jsonb
WHERE commission_settings IS NULL;
