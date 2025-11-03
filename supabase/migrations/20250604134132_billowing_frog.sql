/*
  # Configure storage policies for avatars

  1. Changes
    - Create storage bucket for avatars if it doesn't exist
    - Set up RLS policies for avatar access and management
    
  2. Security
    - Allow public read access to avatars
    - Restrict write operations to authenticated users
    - Ensure users can only manage their own avatars
*/

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
VALUES ('avatars', 'avatars')
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for the avatars bucket
BEGIN;
  -- Policy to allow public read access to avatars
  CREATE POLICY "Avatar public read access"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'avatars' );

  -- Policy to allow users to upload their own avatar
  CREATE POLICY "Avatar upload access"
  ON storage.objects FOR INSERT 
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Policy to allow users to update their own avatar
  CREATE POLICY "Avatar update access"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

  -- Policy to allow users to delete their own avatar
  CREATE POLICY "Avatar delete access"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
COMMIT;