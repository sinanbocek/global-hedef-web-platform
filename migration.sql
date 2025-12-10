-- Run this in your Supabase SQL Editor to fix the User Save error

-- 1. Add roles column if it doesn't exist
ALTER TABLE settings_users 
ADD COLUMN IF NOT EXISTS roles text[];

-- 2. Add phone column if it doesn't exist
ALTER TABLE settings_users 
ADD COLUMN IF NOT EXISTS phone text;

-- 3. Migrate existing single 'role' to new 'roles' array (Optional but recommended)
UPDATE settings_users 
SET roles = ARRAY[role] 
WHERE roles IS NULL AND role IS NOT NULL;
