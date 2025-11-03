/*
  # Create sales and sale items tables

  1. New Tables
    - `sales`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, foreign key to customers)
      - `sale_date` (timestamp)
      - `total_amount` (numeric)
      - `payment_method` (text)
    - `sale_items`
      - `id` (uuid, primary key)
      - `sale_id` (uuid, foreign key to sales)
      - `product_id` (uuid, foreign key to products)
      - `quantity` (integer)
      - `unit_price` (numeric)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users
*/

-- Create sales table
CREATE TABLE IF NOT EXISTS sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  sale_date timestamp without time zone DEFAULT now(),
  total_amount numeric,
  payment_method text
);

-- Create sale_items table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id uuid REFERENCES sales(id),
  product_id uuid REFERENCES products(id),
  quantity integer,
  unit_price numeric
);

-- Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Create policies for sales
CREATE POLICY "Allow read access to authenticated users for sales"
  ON sales
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access to authenticated users for sales"
  ON sales
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policies for sale_items
CREATE POLICY "Allow read access to authenticated users for sale_items"
  ON sale_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow insert access to authenticated users for sale_items"
  ON sale_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);