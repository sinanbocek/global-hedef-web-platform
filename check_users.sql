-- Check user_profiles table structure and data
SELECT id, full_name, email, is_active 
FROM user_profiles 
WHERE is_active = true
ORDER BY full_name;

-- Check if the table exists and column names
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
