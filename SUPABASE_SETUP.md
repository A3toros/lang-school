# Supabase File System Setup Guide

## 1. Environment Variables

Add these environment variables to your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=postgresql://postgres.carqvkbmbnqofizbbkjt:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
VITE_SUPABASE_PROJECT_URL=https://carqvkbmbnqofizbbkjt.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 2. Get Your Supabase Keys

### Step 1: Go to Supabase Dashboard
1. Visit [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project (or create a new one)

### Step 2: Navigate to Settings
1. Click on the **Settings** icon (gear icon) in the left sidebar
2. Go to **API** section

### Step 3: Find Your Keys
You'll see two keys:

#### **Project URL:**
```
https://carqvkbmbnqofizbbkjt.supabase.co
```

#### **anon/public key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcnF2a2JtYm5xb2ZpemJia2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4MDAsImV4cCI6MjA1MDU0ODgwMH0.abc123...
```

#### **service_role key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcnF2a2JtYm5xb2ZpemJia2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3MjgwMCwiZXhwIjoyMDUwNTQ4ODAwfQ.xyz789...
```

## 3. Database Migration

Run the database migration to add Supabase columns:

```sql
-- Add Supabase-specific columns to existing shared_files table
ALTER TABLE shared_files 
ADD COLUMN supabase_path TEXT,
ADD COLUMN supabase_bucket TEXT DEFAULT 'files',
ADD COLUMN content_type TEXT;

-- Make cloudinary columns nullable for hybrid storage support
ALTER TABLE shared_files 
ALTER COLUMN cloudinary_public_id DROP NOT NULL,
ALTER COLUMN cloudinary_url DROP NOT NULL;
```

## 4. Supabase Storage Setup

### Create Storage Bucket
1. Go to **Storage** in your Supabase dashboard
2. Create a new bucket named `files`
3. Set it as **Private** (not public)
4. Configure file size limits and allowed MIME types

### Storage Policies
Set up Row Level Security (RLS) policies for secure file access:

```sql
-- Enable RLS on shared_files table
ALTER TABLE shared_files ENABLE ROW LEVEL SECURITY;

-- Policy for file access
CREATE POLICY "Users can access files they have permission for" ON shared_files
FOR SELECT USING (
  uploaded_by = auth.uid() OR
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'teacher')
  )
);
```

## 5. Test the Integration

### Test File Upload
1. Use the `SupabaseFileUpload` component
2. Upload a test file
3. Check that it appears in Supabase Storage
4. Verify database record is created

### Test File Viewing
1. Use the `UniversalFileViewer` component
2. Test PDF viewing with `react-pdf`
3. Test Word document viewing with Google Docs Viewer
4. Test image and audio file viewing

### Test File Download
1. Use the download functionality
2. Verify signed URLs are generated correctly
3. Check download tracking in database

## 6. Migration Strategy

### Phase 1: Deploy New System
- Deploy Supabase integration alongside existing Cloudinary
- New uploads go to Supabase
- Existing files remain in Cloudinary

### Phase 2: Migrate Existing Files
- Use the migration script to move files from Cloudinary to Supabase
- Update database records with Supabase paths
- Test all file operations

### Phase 3: Complete Migration
- Update all components to use Supabase
- Remove Cloudinary dependencies
- Monitor system performance

## 7. Troubleshooting

### Common Issues

#### File Upload Fails
- Check Supabase credentials
- Verify storage bucket permissions
- Check file size limits

#### File Viewing Issues
- Ensure `react-pdf` is properly installed
- Check CORS settings for Google Docs Viewer
- Verify signed URL generation

#### Database Errors
- Run the migration script
- Check column constraints
- Verify foreign key relationships

### Debug Mode
Enable debug logging by setting:
```env
VITE_DEBUG_MODE=true
```

## 8. Performance Optimization

### CDN Configuration
- Configure Supabase CDN for faster file delivery
- Set appropriate cache headers
- Optimize image transformations

### Database Indexing
- Add indexes for Supabase path lookups
- Optimize queries for file filtering
- Monitor query performance

## 9. Security Considerations

### Access Control
- Implement proper RLS policies
- Use signed URLs for secure access
- Monitor file access patterns

### File Validation
- Validate file types and sizes
- Scan for malicious content
- Implement virus scanning

## 10. Monitoring

### Metrics to Track
- File upload success rate
- File download performance
- Storage usage
- Error rates

### Alerts
- Set up alerts for failed uploads
- Monitor storage quota usage
- Track unusual access patterns
