-- Drop the existing check constraint
ALTER TABLE public.policies DROP CONSTRAINT IF EXISTS policies_status_check;

-- Add the new check constraint with 'Renewed' and 'Lost'
ALTER TABLE public.policies 
ADD CONSTRAINT policies_status_check 
CHECK (status IN ('Active', 'Expired', 'Cancelled', 'Pending', 'Potential', 'Renewed', 'Lost'));
