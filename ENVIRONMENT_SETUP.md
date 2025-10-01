# Environment Variables Setup

## Required Environment Variables

You need to add these environment variables to your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_PROJECT_URL=https://carqvkbmbnqofizbbkjt.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
VITE_SUPABASE_URL=postgresql://postgres.carqvkbmbnqofizbbkjt:[YOUR-PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

## How to Get Your Supabase Keys

### Step 1: Go to Supabase Dashboard
1. Visit [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project

### Step 2: Get Your Keys
1. Go to **Settings** → **API**
2. Copy the **Project URL** (should be `https://carqvkbmbnqofizbbkjt.supabase.co`)
3. Copy the **anon/public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
4. Copy the **service_role key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

### Step 3: Update Your .env File
Replace the placeholder values in your `.env` file:

```env
VITE_SUPABASE_PROJECT_URL=https://carqvkbmbnqofizbbkjt.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcnF2a2JtYm5xb2ZpemJia2p0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ5NzI4MDAsImV4cCI6MjA1MDU0ODgwMH0.abc123...
VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcnF2a2JtYm5xb2ZpemJia2p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNDk3MjgwMCwiZXhwIjoyMDUwNTQ4ODAwfQ.xyz789...
```

## After Setting Environment Variables

1. **Restart your development server**:
   ```bash
   npm run dev
   ```

2. **Check the console** for the environment check logs:
   ```
   🔍 [SUPABASE] Environment check: {
     hasSupabaseUrl: true,
     hasAnonKey: true,
     supabaseUrl: "https://carqvkbmbnqofizbbkjt...",
     anonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

## Troubleshooting

### If you see "supabaseUrl is required" error:
- Check that your `.env` file is in the project root
- Make sure the variable names start with `VITE_`
- Restart your development server after adding variables

### If you see "VITE_SUPABASE_PROJECT_URL is not set":
- Double-check the variable name (case-sensitive)
- Make sure there are no spaces around the `=` sign
- Restart your development server

### If you see "VITE_SUPABASE_ANON_KEY is not set":
- Copy the key exactly from Supabase dashboard
- Make sure it's the anon/public key, not the service role key
- Check for any extra spaces or characters
