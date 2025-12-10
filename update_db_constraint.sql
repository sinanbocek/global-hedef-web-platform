-- RUN THIS IN SUPABASE SQL EDITOR

-- 1. Drop the old constraint that restricts status values
ALTER TABLE public.policies DROP CONSTRAINT IF EXISTS policies_status_check;

-- 2. Add the new constraint including 'Potential'
ALTER TABLE public.policies 
ADD CONSTRAINT policies_status_check 
CHECK (status IN ('Active', 'Expired', 'Cancelled', 'Pending', 'Potential'));

-- 3. Verify the change (Optional)
-- SELECT constraint_name, check_clause 
-- FROM information_schema.check_constraints 
-- WHERE constraint_name = 'policies_status_check';
