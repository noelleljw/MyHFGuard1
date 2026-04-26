# Complete Resetup Guide: GitHub, Render, and Supabase

## Problem
If Render is pulling from a different GitHub repository, it's running **old code** that still references `date_of_birth` instead of `dob`. This causes the PGRST204 error.

## Step-by-Step Resetup

### Part 1: Push Code to GitHub

#### 1.1 Initialize Git (if not already done)
```bash
cd C:\Users\acyp2\OneDrive\Desktop\MyHFGuard-1
git init
git add .
git commit -m "Initial commit with fixed dob column references"
```

#### 1.2 Create GitHub Repository
1. Go to **GitHub.com** → **New Repository**
2. Name it: `MyHFGuard` (or your preferred name)
3. **DO NOT** initialize with README, .gitignore, or license
4. Click **Create repository**

#### 1.3 Push Code to GitHub
```bash
# Add your GitHub repository as remote
git remote add origin https://github.com/YOUR_USERNAME/MyHFGuard.git

# Push to GitHub
git branch -M main
git push -u origin main
```

**Replace `YOUR_USERNAME` with your actual GitHub username.**

### Part 2: Configure Render Service

#### 2.1 Go to Render Dashboard
1. Go to **https://dashboard.render.com**
2. Sign in to your account

#### 2.2 Find Your Service
1. Look for your service (likely named "vitalink" or similar)
2. Click on it to open settings

#### 2.3 Update Repository Connection
1. Go to **Settings** tab
2. Scroll to **"Repository"** section
3. Click **"Connect a different repository"** or **"Change repository"**
4. Select your **correct GitHub repository** (`MyHFGuard` or whatever you named it)
5. Select the **branch** (usually `main`)
6. Set **Root Directory** to: `vitalink/server` (if your server code is in that folder)
7. Click **Save Changes**

#### 2.4 Verify Build Settings
1. Still in **Settings**, check **"Build & Deploy"**:
   - **Build Command**: Should be `npm install` or `npm ci`
   - **Start Command**: Should be `node server.js`
   - **Environment**: `Node` (version 20 or 18)

#### 2.5 Check Environment Variables
Go to **Environment** tab and verify these are set:
- `SUPABASE_URL` = `https://sqmiosfervzwrxjastdg.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` = (your service role key from Supabase)
- `SUPABASE_ANON_KEY` = (your anon key from Supabase)
- `NODE_ENV` = `production`
- Any other required variables

**Important:** If you see any variables referencing `date_of_birth`, remove or update them.

#### 2.6 Manual Deploy
1. Go to **Manual Deploy** tab
2. Click **"Deploy latest commit"**
3. Wait for deployment to complete (5-10 minutes)
4. Check logs for any errors

### Part 3: Verify Supabase Setup

#### 3.1 Check Database Schema
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Run this query:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'patients'
  AND (column_name LIKE '%birth%' OR column_name LIKE '%dob%')
ORDER BY column_name;
```

**Expected:** Should only show `dob`, NOT `date_of_birth`

#### 3.2 Check for Views
Run this query:
```sql
SELECT schemaname, viewname, definition
FROM pg_views
WHERE schemaname = 'public'
  AND definition LIKE '%date_of_birth%'
ORDER BY viewname;
```

**If you find views:**
- Note the view name
- Drop it: `DROP VIEW IF EXISTS view_name CASCADE;`
- Recreate it using `dob` instead of `date_of_birth`

#### 3.3 Refresh PostgREST Schema Cache
Run this in SQL Editor:
```sql
-- Force schema refresh
COMMENT ON COLUMN public.patients.dob IS 'Date of birth';
```

Wait 30 seconds, then try registration again.

#### 3.4 Verify Environment Variables in Supabase
1. Go to **Settings** → **API**
2. Note your:
   - **Project URL**: `https://sqmiosfervzwrxjastdg.supabase.co`
   - **anon/public key**: (for client-side)
   - **service_role key**: (for server-side - keep secret!)

### Part 4: Verify Render Deployment

#### 4.1 Check Deployment Logs
1. In Render, go to **Logs** tab
2. Look for:
   - ✅ "Server started successfully"
   - ✅ "Connected to Supabase"
   - ❌ Any errors about `date_of_birth`

#### 4.2 Test Server Endpoint
Open in browser or use curl:
```bash
curl https://myhfguard.onrender.com/health
```

**Expected response:** `ok`

#### 4.3 Test Ensure Patient Endpoint
```bash
curl -X POST https://myhfguard.onrender.com/admin/ensure-patient \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-id-123",
    "firstName": "Test",
    "lastName": "User",
    "dateOfBirth": "1990-01-01"
  }'
```

**Expected:** Should return `{"ok":true}` or an error about patient not existing (not about `date_of_birth`)

### Part 5: Update Android App (if needed)

#### 5.1 Verify Server URL
Check `vitalink-connect/app/src/main/res/values/strings.xml`:
```xml
<string name="server_base_url">https://myhfguard.onrender.com</string>
```

Make sure this matches your Render service URL.

#### 5.2 Rebuild Android App
```bash
cd vitalink-connect
./gradlew clean build
```

### Part 6: Test Complete Flow

#### 6.1 Test Registration
1. Open Android app
2. Try to register a new user
3. Check if patient row is created in Supabase

#### 6.2 Verify in Supabase
1. Go to **Supabase Dashboard** → **Table Editor** → **patients**
2. Check if new patient was created with:
   - `patient_id` (UUID)
   - `first_name`
   - `last_name`
   - `dob` (NOT `date_of_birth`)

### Part 7: Troubleshooting

#### If Render still shows old code:
1. **Clear Render cache:**
   - Go to Render service → **Settings** → **Clear build cache**
   - Redeploy

2. **Force rebuild:**
   - Go to **Manual Deploy**
   - Select **"Clear build cache & deploy"**

#### If PGRST204 error persists:
1. **Check Render logs** for the actual error
2. **Verify code in GitHub** - make sure `server.js` uses `dob`, not `date_of_birth`
3. **Check Supabase** for views/functions referencing `date_of_birth`

#### If deployment fails:
1. Check **Render logs** for build errors
2. Verify **package.json** has all dependencies
3. Check **Node version** matches (should be 18 or 20)

## Quick Checklist

- [ ] Code pushed to GitHub
- [ ] Render connected to correct GitHub repository
- [ ] Render root directory set to `vitalink/server` (or your MyHFGuard server folder)
- [ ] Render environment variables configured
- [ ] Render deployment successful
- [ ] Supabase database only has `dob` column (not `date_of_birth`)
- [ ] No views/functions reference `date_of_birth`
- [ ] PostgREST schema cache refreshed
- [ ] Android app server URL is correct
- [ ] Registration test successful

## Next Steps After Setup

1. **Monitor Render logs** for first few registrations
2. **Check Supabase** to verify patient rows are created
3. **Test complete flow**: Register → Login → Collect Data → Sync to Server

## Important Notes

- **Never commit** `.env` files or `local.properties` to GitHub
- **Keep `SUPABASE_SERVICE_ROLE_KEY` secret** - only use in Render environment variables
- **Render auto-deploys** when you push to the connected branch
- **PostgREST cache** may take 30-60 seconds to refresh after schema changes

