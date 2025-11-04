/*
  # Remove Auth Trigger Causing Schema Query Errors
  
  ## Problem
  The trigger on auth.users is causing "Database error querying schema" during login.
  This is a known issue where triggers on auth tables can interfere with authentication.
  
  ## Solution
  Remove the trigger completely. Profiles can be created manually or through the app logic.
*/

-- Drop the problematic trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Update RLS policies on profiles to allow authenticated users to create their own
DROP POLICY IF EXISTS "System can create profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;

-- Create a simpler policy that allows authenticated users to insert
CREATE POLICY "Authenticated users can create their profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Ensure users can read all profiles
CREATE POLICY "Authenticated users can read profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
