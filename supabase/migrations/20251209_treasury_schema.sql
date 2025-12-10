-- Treasury Module Database Schema
-- Phase 1: Create all required tables

-- 1. Main transactions table
CREATE TABLE IF NOT EXISTS treasury_transactions (
  -- Core Fields
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_date DATE NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
  category TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  
  -- Payment Method
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank')),
  bank_account_id UUID REFERENCES settings_bank_accounts(id),
  
  -- Relations (NULLABLE - only if auto-generated from commission)
  related_commission_distribution_id UUID REFERENCES commission_distributions(id),
  related_policy_id UUID REFERENCES policies(id),
  
  -- Metadata
  created_by UUID REFERENCES settings_users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Soft delete
  is_deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_treasury_date ON treasury_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_treasury_type ON treasury_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_treasury_category ON treasury_transactions(category);
CREATE INDEX IF NOT EXISTS idx_treasury_commission ON treasury_transactions(related_commission_distribution_id) 
  WHERE related_commission_distribution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_treasury_not_deleted ON treasury_transactions(is_deleted) 
  WHERE is_deleted = FALSE;

-- 2. Categories table
CREATE TABLE IF NOT EXISTS treasury_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  icon TEXT, -- Lucide icon name
  color TEXT, -- Hex color
  is_active BOOLEAN DEFAULT TRUE,
  display_order INT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Balance cache for performance
CREATE TABLE IF NOT EXISTS treasury_balance_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  balance_date DATE NOT NULL UNIQUE,
  
  -- Opening balances
  opening_cash DECIMAL(15,2) DEFAULT 0,
  opening_bank DECIMAL(15,2) DEFAULT 0,
  
  -- Daily movements
  daily_income DECIMAL(15,2) DEFAULT 0,
  daily_expense DECIMAL(15,2) DEFAULT 0,
  
  -- Closing balances
  closing_cash DECIMAL(15,2) DEFAULT 0,
  closing_bank DECIMAL(15,2) DEFAULT 0,
  closing_total DECIMAL(15,2) DEFAULT 0,
  
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Seed data for categories
INSERT INTO treasury_categories (name, type, icon, color, display_order) VALUES
  ('Komisyon Geliri', 'income', 'TrendingUp', '#10b981', 1),
  ('Diğer Gelir', 'income', 'Plus', '#3b82f6', 2),
  ('Kira', 'expense', 'Home', '#ef4444', 1),
  ('Personel Maaş', 'expense', 'Users', '#f59e0b', 2),
  ('Elektrik', 'expense', 'Zap', '#8b5cf6', 3),
  ('Su', 'expense', 'Droplet', '#06b6d4', 4),
  ('İnternet', 'expense', 'Wifi', '#6366f1', 5),
  ('GSM', 'expense', 'Phone', '#ec4899', 6),
  ('Reklam & Pazarlama', 'expense', 'Megaphone', '#f97316', 7),
  ('Ofis Malzemeleri', 'expense', 'Package', '#84cc16', 8),
  ('Diğer Gider', 'expense', 'DollarSign', '#64748b', 9)
ON CONFLICT (name) DO NOTHING;

-- 4. Trigger for commission auto-sync
CREATE OR REPLACE FUNCTION auto_create_treasury_from_commission()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create treasury entry for company's share of commission
  -- And only if status is approved or payment exists
  IF (NEW.status = 'approved' OR NEW.payment_id IS NOT NULL) THEN
    
    -- Check if this commission already has a treasury entry
    IF NOT EXISTS (
      SELECT 1 FROM treasury_transactions 
      WHERE related_commission_distribution_id = NEW.id
    ) THEN
      
      INSERT INTO treasury_transactions (
        transaction_date,
        transaction_type,
        category,
        amount,
        description,
        payment_method,
        bank_account_id,
        related_commission_distribution_id,
        related_policy_id,
        created_by
      ) VALUES (
        NEW.distribution_date,
        'income',
        'Komisyon Geliri',
        NEW.company_pool_amount, -- Company's share
        CONCAT('Komisyon - Poliçe No: ', COALESCE((SELECT policy_no FROM policies WHERE id = NEW.policy_id), 'N/A')),
        'bank', -- Default to bank
        (SELECT id FROM settings_bank_accounts WHERE is_active = TRUE ORDER BY created_at LIMIT 1),
        NEW.id,
        NEW.policy_id,
        COALESCE(NEW.created_by, (SELECT id FROM settings_users WHERE is_active = TRUE LIMIT 1))
      );
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_commission_to_treasury ON commission_distributions;

-- Create trigger
CREATE TRIGGER trigger_commission_to_treasury
  AFTER INSERT OR UPDATE ON commission_distributions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_treasury_from_commission();

-- Enable RLS (Row Level Security) - Optional but recommended
ALTER TABLE treasury_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE treasury_balance_cache ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Allow authenticated users to read treasury" ON treasury_transactions
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to insert treasury" ON treasury_transactions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to update treasury" ON treasury_transactions
  FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to delete treasury" ON treasury_transactions
  FOR DELETE USING (auth.role() = 'authenticated');

-- Categories policies
CREATE POLICY "Allow all to read categories" ON treasury_categories
  FOR SELECT USING (true);

-- Balance cache policies
CREATE POLICY "Allow authenticated to read balance cache" ON treasury_balance_cache
  FOR SELECT USING (auth.role() = 'authenticated');
