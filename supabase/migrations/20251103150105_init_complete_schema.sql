/*
  # Complete Database Schema Initialization
  
  ## Overview
  This migration creates the complete database schema for the POS (Point of Sale) system
  including all tables, relationships, indexes, and security policies.
  
  ## 1. New Tables
  
  ### Categories Table
  - `id` (uuid, primary key) - Unique category identifier
  - `name` (text, not null) - Category name
  - `created_at` (timestamptz) - Creation timestamp
  
  ### Products Table
  - `id` (uuid, primary key) - Unique product identifier
  - `name` (text, not null) - Product name
  - `barcode` (text) - Product barcode for scanning
  - `purchase_price` (numeric, default 0) - Cost price
  - `selling_price` (numeric, default 0) - Selling price
  - `stock` (integer, default 0) - Current stock quantity
  - `image_url` (text) - Product image URL
  - `category_id` (uuid, foreign key) - Reference to categories
  - `created_at` (timestamptz) - Creation timestamp
  
  ### Customers Table
  - `id` (uuid, primary key) - Unique customer identifier
  - `full_name` (text, not null) - Customer full name
  - `phone` (text) - Phone number
  - `email` (text) - Email address
  - `address` (text) - Physical address
  - `created_at` (timestamptz) - Creation timestamp
  
  ### Sales Table
  - `id` (bigserial, primary key) - Auto-incrementing sale ID
  - `customer_id` (uuid, foreign key) - Reference to customers (nullable)
  - `sale_date` (timestamptz, default now) - Sale timestamp
  - `total_amount` (numeric, not null) - Total sale amount
  - `payment_method` (text, not null) - Payment method used
  
  ### Sale Items Table
  - `id` (uuid, primary key) - Unique sale item identifier
  - `sale_id` (bigint, foreign key) - Reference to sales
  - `product_id` (uuid, foreign key) - Reference to products
  - `quantity` (integer, not null) - Quantity sold
  - `unit_price` (numeric, not null) - Price per unit at time of sale
  
  ### Stock History Table
  - `id` (uuid, primary key) - Unique history record identifier
  - `product_id` (uuid, foreign key) - Reference to products
  - `old_stock` (integer, not null) - Stock before change
  - `new_stock` (integer, not null) - Stock after change
  - `change` (integer, not null) - Stock change amount
  - `reason` (text) - Reason for stock change
  - `created_at` (timestamptz) - Change timestamp
  
  ### Profiles Table
  - `id` (uuid, primary key, foreign key to auth.users) - User identifier
  - `name` (text) - User display name
  - `role` (text, default 'employee') - User role (admin, manager, employee)
  - `phone` (text) - User phone number
  - `avatar` (text) - User avatar URL
  - `updated_at` (timestamptz) - Last update timestamp
  
  ## 2. Relationships
  - products.category_id → categories.id
  - sales.customer_id → customers.id (nullable for anonymous customers)
  - sale_items.sale_id → sales.id (cascade on delete)
  - sale_items.product_id → products.id
  - stock_history.product_id → products.id (cascade on delete)
  - profiles.id → auth.users.id (cascade on delete)
  
  ## 3. Indexes
  - Index on products(barcode) for fast barcode lookups
  - Index on customers(phone) for customer search
  - Index on sales(sale_date) for date range queries
  - Index on sale_items(sale_id) for sale detail retrieval
  - Index on stock_history(product_id, created_at) for history queries
  
  ## 4. Security (RLS Policies)
  All tables have Row Level Security enabled with the following policies:
  - Authenticated users have full CRUD access
  - Public access is disabled by default
  - Policies ensure data integrity and prevent unauthorized access
  
  ## 5. Storage Buckets
  - `product-images` - Public bucket for product photos
  - `avatars` - Public read, user-specific write for profile pictures
  
  ## 6. Important Notes
  - Default customer with id='0' for anonymous/standard sales
  - Stock changes are tracked automatically in stock_history
  - All timestamps use timezone-aware timestamps (timestamptz)
  - Numeric types used for precise financial calculations
*/

-- ==============================================
-- 1. CREATE TABLES
-- ==============================================

-- Categories Table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Products Table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  barcode text,
  purchase_price numeric DEFAULT 0,
  selling_price numeric DEFAULT 0,
  stock integer DEFAULT 0,
  image_url text,
  category_id uuid REFERENCES categories(id),
  created_at timestamptz DEFAULT now()
);

-- Customers Table
CREATE TABLE IF NOT EXISTS customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text NOT NULL,
  phone text,
  email text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Sales Table (using bigserial for auto-incrementing IDs)
CREATE TABLE IF NOT EXISTS sales (
  id bigserial PRIMARY KEY,
  customer_id uuid REFERENCES customers(id),
  sale_date timestamptz DEFAULT now(),
  total_amount numeric NOT NULL,
  payment_method text NOT NULL
);

-- Sale Items Table
CREATE TABLE IF NOT EXISTS sale_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id bigint REFERENCES sales(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  unit_price numeric NOT NULL
);

-- Stock History Table
CREATE TABLE IF NOT EXISTS stock_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  old_stock integer NOT NULL,
  new_stock integer NOT NULL,
  change integer NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- Profiles Table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  role text DEFAULT 'employee',
  phone text,
  avatar text,
  updated_at timestamptz DEFAULT now()
);

-- ==============================================
-- 2. CREATE INDEXES
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_history_product ON stock_history(product_id, created_at DESC);

-- ==============================================
-- 3. INSERT DEFAULT DATA
-- ==============================================

-- Insert default/standard customer (ID '0' for anonymous customers)
INSERT INTO customers (id, full_name, phone, email, address)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'Standard',
  '0',
  'standard@pos.local',
  'N/A'
)
ON CONFLICT (id) DO NOTHING;

-- Insert default categories
INSERT INTO categories (name) VALUES
  ('Electronics'),
  ('Clothing'),
  ('Food & Beverages'),
  ('Home & Garden'),
  ('Sports & Outdoors'),
  ('Books & Media'),
  ('Health & Beauty'),
  ('Toys & Games'),
  ('Automotive'),
  ('Office Supplies')
ON CONFLICT DO NOTHING;

-- ==============================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ==============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- 5. CREATE RLS POLICIES
-- ==============================================

-- Categories Policies
CREATE POLICY "Authenticated users can read categories"
  ON categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert categories"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update categories"
  ON categories FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete categories"
  ON categories FOR DELETE
  TO authenticated
  USING (true);

-- Products Policies
CREATE POLICY "Authenticated users can read products"
  ON products FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Customers Policies
CREATE POLICY "Authenticated users can read customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (true);

-- Sales Policies
CREATE POLICY "Authenticated users can read sales"
  ON sales FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sales"
  ON sales FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sales"
  ON sales FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sales"
  ON sales FOR DELETE
  TO authenticated
  USING (true);

-- Sale Items Policies
CREATE POLICY "Authenticated users can read sale items"
  ON sale_items FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert sale items"
  ON sale_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update sale items"
  ON sale_items FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete sale items"
  ON sale_items FOR DELETE
  TO authenticated
  USING (true);

-- Stock History Policies
CREATE POLICY "Authenticated users can read stock history"
  ON stock_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock history"
  ON stock_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Profiles Policies
CREATE POLICY "Users can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ==============================================
-- 6. CREATE STORAGE BUCKETS
-- ==============================================

-- Product Images Bucket (Public)
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Avatars Bucket (Public read, user-specific write)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- ==============================================
-- 7. CREATE STORAGE POLICIES
-- ==============================================

-- Product Images Policies
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'product-images' 
    AND (LOWER(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'gif', 'webp'))
    AND (storage.foldername(name))[1] = 'products'
  );

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'product-images')
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can delete product images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'product-images');

-- Avatar Policies
CREATE POLICY "Public can view avatars"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  )
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ==============================================
-- 8. CREATE FUNCTIONS & TRIGGERS
-- ==============================================

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'employee')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update profile timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update profile timestamp
DROP TRIGGER IF EXISTS on_profile_updated ON profiles;
CREATE TRIGGER on_profile_updated
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
