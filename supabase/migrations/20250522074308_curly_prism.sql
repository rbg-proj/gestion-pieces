/*
  # Fix customers table RLS policies

  1. Security Changes
    - Enable RLS on customers table
    - Add policies for CRUD operations
    - Ensure authenticated users can access customer data

  2. Policies Added
    - Allow authenticated users to read all customers
    - Allow authenticated users to insert new customers
    - Allow authenticated users to update customer data
    - Allow authenticated users to delete customers
*/

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow read access to authenticated users" ON customers;
  DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON customers;
  DROP POLICY IF EXISTS "Allow update access to authenticated users" ON customers;
  DROP POLICY IF EXISTS "Allow delete access to authenticated users" ON customers;
END $$;

-- Create new policies
CREATE POLICY "Allow read access to authenticated users"
  ON customers
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access to authenticated users"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete access to authenticated users"
  ON customers
  FOR DELETE
  TO authenticated
  USING (true);