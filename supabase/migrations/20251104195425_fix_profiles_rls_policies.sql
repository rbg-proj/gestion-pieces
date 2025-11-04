/*
  # Fix Profiles RLS Policies
  
  ## Problem
  - Duplicate RLS policies on profiles table
  - Policies are too restrictive and preventing auth queries
  - Missing profiles for new users cause "Database error querying schema"
  
  ## Solution
  - Remove all existing policies
  - Create clean, simple policies that allow auth system to function
  - Allow the app to create profiles on first login if needed
*/

-- Drop all existing policies on profiles
DROP POLICY IF EXISTS "Authenticated users can create their profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "System can create profiles" ON profiles;

-- Create clean, simple policies
-- Allow anyone to read all profiles (for app functionality)
CREATE POLICY "Anyone can read profiles"
  ON profiles FOR SELECT
  USING (true);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Authenticated can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to update their own profile
CREATE POLICY "Authenticated can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow authenticated users to delete their own profile
CREATE POLICY "Authenticated can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);
