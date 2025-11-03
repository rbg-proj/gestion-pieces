/*
  # Add image URL to products table and enable RLS

  1. Changes
    - Add image_url column to products table
    - Enable RLS
    - Add policies for authenticated users

  2. Security
    - Enable RLS on products table
    - Add policies for CRUD operations
    - Ensure policies are created before enabling RLS
*/

-- Add image_url if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'products' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE products ADD COLUMN image_url text;
  END IF;
END $$;

-- Create policies first (before enabling RLS)
DO $$ 
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON products;
  DROP POLICY IF EXISTS "Allow insert access to authenticated users" ON products;
  DROP POLICY IF EXISTS "Allow update access to authenticated users" ON products;
  DROP POLICY IF EXISTS "Allow delete access to authenticated users" ON products;
END $$;

-- Create new policies
CREATE POLICY "Allow read access to all authenticated users"
  ON products
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access to authenticated users"
  ON products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow update access to authenticated users"
  ON products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow delete access to authenticated users"
  ON products
  FOR DELETE
  TO authenticated
  USING (true);

-- Enable RLS after policies are in place
ALTER TABLE products ENABLE ROW LEVEL SECURITY;