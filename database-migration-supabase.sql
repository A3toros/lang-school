-- Supabase Integration Migration
-- Add Supabase columns to existing shared_files table

-- Add Supabase-specific columns to existing shared_files table
ALTER TABLE shared_files 
ADD COLUMN supabase_path TEXT,
ADD COLUMN supabase_bucket TEXT DEFAULT 'files',
ADD COLUMN content_type TEXT;

-- Make cloudinary columns nullable for hybrid storage support
ALTER TABLE shared_files 
ALTER COLUMN cloudinary_public_id DROP NOT NULL,
ALTER COLUMN cloudinary_url DROP NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN shared_files.supabase_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN shared_files.supabase_bucket IS 'Supabase Storage bucket name';
COMMENT ON COLUMN shared_files.content_type IS 'MIME type of the file';

-- Create index for Supabase path lookups
CREATE INDEX IF NOT EXISTS idx_shared_files_supabase_path ON shared_files(supabase_path);

-- Create index for content type filtering
CREATE INDEX IF NOT EXISTS idx_shared_files_content_type ON shared_files(content_type);
