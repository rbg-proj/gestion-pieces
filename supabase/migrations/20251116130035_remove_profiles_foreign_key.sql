/*
  # Remove Foreign Key Constraint from Profiles
  
  ## Problem
  The foreign key constraint on profiles.id -> auth.users.id is interfering 
  with Supabase's authentication schema queries, causing "Database error querying schema"
  
  ## Solution
  Drop the foreign key constraint. The profiles table doesn't need a strict FK
  constraint to auth.users since:
  1. Profiles are managed by the application
  2. The FK is causing auth system failures
  3. We handle profile creation/deletion at the application level
*/

ALTER TABLE profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;
