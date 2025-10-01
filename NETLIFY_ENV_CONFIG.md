# Netlify Environment Variables Configuration

## The Problem
Vite environment variables (prefixed with `VITE_`) need to be available at **build time**, not just runtime. Netlify needs to be configured to pass these variables to the build process.

## Solution: Configure Netlify Build Settings

### Method 1: Netlify Dashboard (Recommended)

1. **Go to your Netlify site dashboard**
2. **Navigate to**: Site settings → Environment variables
3. **Add these variables**:
   ```
   VITE_SUPABASE_PROJECT_URL = https://carqvkbmbnqofizbbkjt.supabase.co
   VITE_SUPABASE_ANON_KEY = [your-anon-key]
   VITE_SUPABASE_SERVICE_ROLE_KEY = [your-service-role-key]
   VITE_SUPABASE_URL = postgresql://postgres.carqvkbmbnqofizbbkjt:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
   ```

### Method 2: netlify.toml Configuration

Create or update `netlify.toml` in your project root:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  VITE_SUPABASE_PROJECT_URL = "https://carqvkbmbnqofizbbkjt.supabase.co"
  VITE_SUPABASE_ANON_KEY = "your-anon-key-here"
  VITE_SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here"
  VITE_SUPABASE_URL = "postgresql://postgres.carqvkbmbnqofizbbkjt:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"

# For backend functions (no VITE_ prefix)
[build.environment]
  SUPABASE_PROJECT_URL = "https://carqvkbmbnqofizbbkjt.supabase.co"
  SUPABASE_SERVICE_ROLE_KEY = "your-service-role-key-here"
```

### Method 3: .env File (Not Recommended for Production)

Create `.env.production` in your project root:

```env
VITE_SUPABASE_PROJECT_URL=https://carqvkbmbnqofizbbkjt.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
VITE_SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
VITE_SUPABASE_URL=postgresql://postgres.carqvkbmbnqofizbbkjt:[PASSWORD]@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres
```

## Backend Functions Environment Variables

For Netlify Functions (backend), use variables **without** the `VITE_` prefix:

```env
SUPABASE_PROJECT_URL=https://carqvkbmbnqofizbbkjt.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Verification Steps

1. **Set the environment variables** in Netlify dashboard
2. **Trigger a new build** (redeploy)
3. **Check the build logs** for environment variable loading
4. **Test the application** to ensure Supabase connection works

## Expected Result

After proper configuration:
- ✅ Environment variables load at build time
- ✅ No hardcoded secrets in code
- ✅ Secure deployment
- ✅ Supabase connection works

## Security Notes

- **Never commit** `.env` files with secrets to git
- **Use Netlify dashboard** for production secrets
- **Rotate keys** if they were previously exposed
- **Use different keys** for different environments
