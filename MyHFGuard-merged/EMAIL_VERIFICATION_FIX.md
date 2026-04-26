# Email Verification Fix Guide

## Problem
When clicking the email verification link, you get:
```
http://localhost:5173/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired
```

## Root Causes
1. **Wrong Redirect URL**: Supabase is configured to redirect to `localhost:5173` (web dev server) instead of your app
2. **Link Expired**: Email verification links expire after a certain time (usually 1 hour)
3. **No Deep Link Setup**: Android app doesn't have deep link handling for verification

## Solutions

### Solution 1: Configure Supabase Redirect URLs (Recommended)

**Steps:**
1. Go to **Supabase Dashboard** → Your Project → **Authentication** → **URL Configuration**
2. Find **"Redirect URLs"** section
3. Add these URLs:
   ```
   myhfguard://verify
   https://your-web-app-url.com/auth/callback
   ```
4. For **Site URL**, set it to your web app URL or use:
   ```
   https://your-web-app-url.com
   ```
5. **Save** the changes

**Note**: The `myhfguard://verify` is a deep link scheme. You'll need to configure it in AndroidManifest.xml (see Solution 2).

---

### Solution 2: Add Deep Link Support to Android App

**Steps:**
1. Open `vitalink-connect/app/src/main/AndroidManifest.xml`
2. Add this inside the `<activity>` tag for `EmailVerificationActivity`:

```xml
<intent-filter>
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="myhfguard" android:host="verify" />
</intent-filter>
```

3. Update `EmailVerificationActivity.kt` to handle the deep link and extract the verification token

---

### Solution 3: Use In-App Verification (Current Implementation)

**How it works:**
- User registers → Email is sent
- User clicks link in email → Opens browser (may show error, but verification happens)
- App periodically checks if email is verified → Shows "Go to Login" button when verified

**To verify manually:**
1. Click the email link (even if it shows an error page)
2. The verification happens on Supabase's side
3. Go back to the app
4. The app will detect verification within 3 seconds
5. Click "Go to Login" button

---

### Solution 4: Disable Email Verification (For Testing Only)

**⚠️ WARNING: Only for development/testing!**

**Steps:**
1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Find **"Enable email confirmations"**
3. **Disable** it temporarily
4. Users can login immediately without verification

**Remember to re-enable for production!**

---

### Solution 5: Use Email OTP Instead of Magic Links

**Steps:**
1. In Supabase Dashboard → **Authentication** → **Settings**
2. Enable **"Email OTP"** instead of magic links
3. Update the app to use OTP verification flow

---

## Quick Fix: Resend Email

I've added a **"Resend Email"** button that will:
- Send a new verification email
- Use the correct configuration
- Give you a fresh link (not expired)

**To use:**
1. Click **"Resend Email"** button in the app
2. Check your email inbox
3. Click the new link (it will be fresh, not expired)
4. Even if the browser shows an error, verification happens
5. Go back to app → It will detect verification

---

## Recommended Configuration

### Supabase Dashboard Settings:

1. **Authentication → URL Configuration:**
   - **Site URL**: `https://your-web-app.com` (or your actual web URL)
   - **Redirect URLs**: 
     ```
     myhfguard://verify
     https://your-web-app.com/auth/callback
     http://localhost:5173/auth/callback
     ```

2. **Authentication → Email Templates:**
   - Edit the **"Confirm signup"** template
   - The redirect URL in the email will use the **Site URL** + `/auth/callback`
   - Or use: `{{ .ConfirmationURL }}` which will use the redirect URL

3. **Authentication → Settings:**
   - **Enable email confirmations**: ✅ Enabled
   - **Secure email change**: ✅ Enabled (recommended)

---

## Testing the Fix

1. **Register a new user**
2. **Check email** for verification link
3. **Click the link** (even if browser shows error)
4. **Go back to app** - it should detect verification within 3 seconds
5. **Click "Go to Login"** button
6. **Login** with your credentials

---

## If Link Still Expires

1. **Click "Resend Email"** button in the app
2. **Check email immediately** (don't wait)
3. **Click the new link** within 5 minutes
4. Links typically expire after **1 hour**, but can be shorter

---

## Alternative: Manual Verification via Supabase Dashboard

If nothing works:
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Find your user by email
3. Click on the user
4. Click **"Confirm email"** button
5. User is now verified

---

## Code Changes Made

✅ Added `resend()` function to resend verification emails
✅ Improved error handling
✅ The app now checks verification status every 3 seconds

The verification will work even if the redirect URL shows an error - Supabase verifies the email when the link is clicked, regardless of where it redirects.

