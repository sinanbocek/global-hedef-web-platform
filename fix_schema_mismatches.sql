-- =====================================================
-- Database Schema Fix Migration
-- Global Hedef Sigorta Platform
-- =====================================================
-- This migration fixes 3 schema mismatches:
-- 1. settings_users: Add 'roles' column (text array) for multiple roles
-- 2. settings_users: Add 'phone' column for phone numbers
-- 3. policies: Add 'salesperson_id' column for tracking salesperson
--
-- SAFE TO RUN: This migration only adds columns and migrates data.
--              It does NOT delete or drop existing data.
-- =====================================================

-- ========================================
-- 1. FIX settings_users TABLE
-- ========================================

-- Add 'roles' column (text array) if it doesn't exist
ALTER TABLE public.settings_users 
ADD COLUMN IF NOT EXISTS roles text[];

-- Add 'phone' column if it doesn't exist
ALTER TABLE public.settings_users 
ADD COLUMN IF NOT EXISTS phone text;

-- Migrate existing single 'role' data to new 'roles' array
-- This ensures no data is lost from the old schema
UPDATE public.settings_users 
SET roles = ARRAY[role]::text[]
WHERE roles IS NULL 
  AND role IS NOT NULL 
  AND role != '';

-- For users without any role, set a default
UPDATE public.settings_users 
SET roles = ARRAY['Operasyon']::text[]
WHERE roles IS NULL OR array_length(roles, 1) IS NULL;

-- Add a helpful comment
COMMENT ON COLUMN public.settings_users.roles IS 'User roles array - supports multiple roles per user (Admin, Satışçı, Operasyon, Acente Yetkilisi)';
COMMENT ON COLUMN public.settings_users.phone IS 'User phone number';

-- ========================================
-- 2. FIX policies TABLE
-- ========================================

-- Add 'salesperson_id' column to track which salesperson created/owns the policy
ALTER TABLE public.policies 
ADD COLUMN IF NOT EXISTS salesperson_id uuid REFERENCES public.settings_users(id) ON DELETE SET NULL;

-- Add index for better query performance when filtering by salesperson
CREATE INDEX IF NOT EXISTS idx_policies_salesperson_id 
ON public.policies(salesperson_id);

-- Add helpful comment
COMMENT ON COLUMN public.policies.salesperson_id IS 'Reference to the salesperson (settings_users) who created or is responsible for this policy';

-- ========================================
-- 3. VERIFICATION QUERIES (Optional)
-- ========================================
-- Uncomment these to verify the changes after running the migration

-- Check that columns were added to settings_users
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'settings_users' 
-- AND column_name IN ('roles', 'phone')
-- ORDER BY column_name;

-- Check that salesperson_id was added to policies
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns 
-- WHERE table_name = 'policies' 
-- AND column_name = 'salesperson_id';

-- Verify roles migration worked
-- SELECT id, role, roles, full_name 
-- FROM settings_users 
-- LIMIT 10;

-- Check indexes
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'policies' 
-- AND indexname = 'idx_policies_salesperson_id';

-- =====================================================
-- MIGRATION COMPLETE ✅
-- =====================================================
-- Next steps:
-- 1. Run this SQL in your Supabase SQL Editor
-- 2. Test user creation with multiple roles and phone number
-- 3. Test policy creation with salesperson assignment
-- =====================================================
