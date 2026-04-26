# Troubleshooting Checklist: Database DOB Error

## Issue
Error: `patient upsert failed: null value in column "dob" of relation "patients" violates not-null constraint`

## What I Fixed in Code
✅ Added `dateOfBirth` to ALL data payloads (steps, distance, HR, SpO2)
✅ Made backend always provide a default DOB if missing
✅ Added dateOfBirth to the 24h HR fallback data

## Manual Checks You Need to Do

### 1. **Check Supabase Database Table Structure**

**Steps:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Table Editor** → **patients** table
4. Click on the **"dob"** column

**What to Verify:**
- ✅ Column name is exactly `dob` (lowercase, not `dcb` or `DOB`)
- ✅ Column type is `date` or `timestamp`
- ✅ Column has `NOT NULL` constraint (this is correct, we just need to always provide a value)
- ✅ Check if there are any existing rows with NULL dob values

**If you find NULL values:**
```sql
-- Run this in Supabase SQL Editor to fix existing NULL values
UPDATE patients 
SET dob = '1970-01-01' 
WHERE dob IS NULL;
```

---

### 2. **Check Render Server Logs**

**Steps:**
1. Go to https://render.com/dashboard
2. Find your service (likely named "MyHFGuard" or similar)
3. Click on it → Go to **Logs** tab
4. Look for recent errors when data sync happens

**What to Look For:**
- ✅ Check if server is receiving requests (you should see POST requests to `/ingest/hr-samples`, `/ingest/steps-events`, etc.)
- ✅ Check for any Supabase connection errors
- ✅ Check if `ensurePatient` function is being called
- ✅ Look for the exact error message about "dob" column

**Expected Log Pattern:**
```
POST /ingest/hr-samples
ensurePatient error: [error message]
```

---

### 3. **Check Supabase Connection from Server**

**Steps:**
1. In Render dashboard, go to your service → **Environment** tab
2. Verify these environment variables exist:
   - `SUPABASE_URL` - Should be your Supabase project URL
   - `SUPABASE_SERVICE_ROLE_KEY` - Should be your service role key (not anon key)

**How to Get Supabase Credentials:**
1. Go to Supabase Dashboard → **Settings** → **API**
2. Copy:
   - **Project URL** → This is `SUPABASE_URL`
   - **service_role** key (NOT anon key) → This is `SUPABASE_SERVICE_ROLE_KEY`

**Verify Connection:**
- Check Render logs for any Supabase connection errors
- The server should be able to query/insert into Supabase

---

### 4. **Check App Can Reach Server**

**Steps:**
1. In your Android app, check the server URL in `strings.xml`:
   - File: `vitalink-connect/app/src/main/res/values/strings.xml`
   - Look for `server_base_url`
   - Should be: `https://myhfguard.onrender.com` (or your Render URL)

2. Test server health endpoint:
   - Open browser or use curl:
   ```bash
   curl https://myhfguard.onrender.com/health
   ```
   - Should return: `ok`

3. Check if server is awake:
   - Render free tier services "sleep" after inactivity
   - First request after sleep takes ~30 seconds
   - This might cause timeouts

---

### 5. **Check Patient Data in Supabase**

**Steps:**
1. Go to Supabase Dashboard → **Table Editor** → **patients**
2. Find your patient record (search by `patient_id` which is your user UUID)

**What to Check:**
- ✅ Does the patient record exist?
- ✅ Does it have a `dob` value? (Should be a date like `2003-03-08` or `1970-01-01`)
- ✅ Is `dob` NULL? (This would cause the error)

**If patient exists but dob is NULL:**
```sql
-- Fix it manually
UPDATE patients 
SET dob = '1970-01-01' 
WHERE patient_id = 'YOUR_PATIENT_ID_HERE';
```

---

### 6. **Check App SharedPreferences**

**Steps:**
1. In Android Studio, use **Device File Explorer**
2. Navigate to: `/data/data/com.vitalink.connect/shared_prefs/vitalink.xml`
3. Check if `dateOfBirth` key exists

**What to Look For:**
- ✅ `dateOfBirth` key should exist
- ✅ Value should be in format: `YYYY-MM-DD` (e.g., `2003-03-08`)
- ✅ If missing, the app will use default `1970-01-01`

**How to Check in Code:**
- The app stores dateOfBirth during registration
- Check `RegisterActivity.kt` - it should save dateOfBirth to SharedPreferences

---

### 7. **Test Server Endpoint Manually**

**Steps:**
1. Use Postman or curl to test `/admin/ensure-patient` endpoint:

```bash
curl -X POST https://myhfguard.onrender.com/admin/ensure-patient \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "test-patient-id-123",
    "firstName": "Test",
    "lastName": "User",
    "dateOfBirth": "1990-01-01"
  }'
```

**Expected Response:**
```json
{"ok": true}
```

**If Error:**
- Check the error message
- Verify Supabase connection
- Check server logs

---

### 8. **Check Server Code Deployment**

**Steps:**
1. Verify the latest `server.js` is deployed to Render
2. Check Render **Deploy** tab - should show recent deployment
3. Verify the `ensurePatient` function has the DOB fallback logic

**What to Verify in server.js:**
- Line ~95: `const finalDob = dob || existingDob || '1970-01-01'`
- Line ~101: `dob: finalDob` in the row object
- This ensures dob is NEVER null

---

## Quick Fixes to Try

### Fix 1: Update Existing NULL Records in Database
```sql
-- Run in Supabase SQL Editor
UPDATE patients 
SET dob = '1970-01-01' 
WHERE dob IS NULL;
```

### Fix 2: Restart Render Service
1. Go to Render Dashboard
2. Click on your service
3. Click **Manual Deploy** → **Clear build cache & deploy**

### Fix 3: Clear App Data and Re-register
1. Uninstall app from device
2. Reinstall
3. Register again (this will save dateOfBirth properly)

---

## What I've Fixed in the Code

✅ **MainActivity.kt:**
- Added `dateOfBirth` to steps payload
- Added `dateOfBirth` to distance payload  
- Added `dateOfBirth` to HR payload (both today and 24h fallback)
- Added `dateOfBirth` to SpO2 payload
- All payloads now include: `"dateOfBirth": "1970-01-01"` as fallback

✅ **server.js:**
- `ensurePatient` function always provides a default DOB
- Validates date format before inserting
- Better error logging

---

## Next Steps After Checking

1. **If Supabase table is correct** → Check server logs
2. **If server logs show connection errors** → Check Render environment variables
3. **If server is unreachable** → Check Render service status
4. **If patient record has NULL dob** → Run the SQL update query
5. **If app doesn't have dateOfBirth** → Re-register user

---

## Still Having Issues?

Check these in order:
1. ✅ Supabase table structure (column name, type, constraints)
2. ✅ Render server logs (connection errors, request logs)
3. ✅ Supabase connection (environment variables)
4. ✅ Existing patient records (NULL dob values)
5. ✅ App SharedPreferences (dateOfBirth key exists)
6. ✅ Server endpoint test (manual curl/Postman test)

