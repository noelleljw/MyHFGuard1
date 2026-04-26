# Testing Checklist - New Supabase Setup

## ✅ Pre-Testing Setup Complete
- [x] Supabase schema created
- [x] Render server updated with new Supabase credentials
- [x] Web app GitHub Secrets configured
- [x] Mobile app server URL updated

---

## 🔍 Connection Tests

### 1. Server Health Check
- [ ] **Test**: Visit `https://myhfguard.onrender.com/health`
- [ ] **Expected**: Should return `"ok"`
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### 2. Web App Connection
- [ ] **Test**: Visit your GitHub Pages URL
- [ ] **Expected**: Web app loads without errors
- [ ] **Check Console**: No Supabase connection errors
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### 3. Mobile App Server Connection
- [ ] **Test**: Open mobile app → Click "Collect Health Data"
- [ ] **Expected**: App connects to server (no "login required" error)
- [ ] **Check**: App should check `/health` endpoint automatically
- [ ] **Status**: ⬜ Pass / ⬜ Fail

---

## 📱 Mobile App Testing

### Prerequisites
⚠️ **IMPORTANT**: Mobile app requires a `patientId` to send data. Since authentication was removed, you need to:

**Option A**: Create a patient via web app first
1. Register/login on web app
2. Get the patient UUID from Supabase dashboard
3. Manually set it in mobile app (see Settings)

**Option B**: Use admin endpoint to create patient
- Use `/admin/ensure-patient` endpoint with a test UUID

### Test 1: Health Connect Permissions
- [ ] **Test**: Grant Health Connect permissions
- [ ] **Expected**: "Permissions Granted" message appears
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### Test 2: Read Health Data
- [ ] **Test**: Click "Read Steps" or "Collect Health Data"
- [ ] **Expected**: App reads data from Health Connect
- [ ] **Check**: Data appears in the app UI
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### Test 3: Send Data to Server
- [ ] **Test**: Click "Collect Health Data" (with patientId set)
- [ ] **Expected**: Data syncs to server successfully
- [ ] **Check**: No error messages in app
- [ ] **Endpoints tested**:
  - [ ] `/ingest/steps-events`
  - [ ] `/ingest/distance-events`
  - [ ] `/ingest/hr-samples`
  - [ ] `/ingest/spo2-samples`
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### Test 4: Verify Data in Supabase
- [ ] **Test**: Check Supabase dashboard → Table Editor
- [ ] **Check tables**:
  - [ ] `steps_event` - has new rows
  - [ ] `distance_event` - has new rows
  - [ ] `hr_sample` - has new rows
  - [ ] `spo2_sample` - has new rows
- [ ] **Status**: ⬜ Pass / ⬜ Fail

---

## 🌐 Web App Testing

### Test 1: User Registration
- [ ] **Test**: Register a new user
- [ ] **Expected**: Account created successfully
- [ ] **Check**: User appears in Supabase Auth
- [ ] **Check**: Patient record created in `patients` table
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### Test 2: User Login
- [ ] **Test**: Login with registered credentials
- [ ] **Expected**: Login successful, redirected to dashboard
- [ ] **Check**: Session persists on page refresh
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### Test 3: Dashboard Data Display
- [ ] **Test**: View dashboard after login
- [ ] **Expected**: Patient summary loads
- [ ] **Check**: Vitals data displays (if available)
- [ ] **Check**: No console errors
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### Test 4: Vitals Tracker
- [ ] **Test**: Navigate to Vitals page
- [ ] **Expected**: Charts/graphs load
- [ ] **Check**: Data from mobile app appears
- [ ] **Status**: ⬜ Pass / ⬜ Fail

### Test 5: Admin Login
- [ ] **Test**: Login as admin at `/admin/login`
- [ ] **Expected**: Admin dashboard loads
- [ ] **Check**: Patient list displays
- [ ] **Status**: ⬜ Pass / ⬜ Fail

---

## 🔧 Troubleshooting

### If Mobile App Shows "login required"
1. Create a patient via web app registration
2. Get patient UUID from Supabase
3. Set it manually in mobile app (may need to add Settings option)

### If Server Returns Errors
- Check Render logs for errors
- Verify Supabase environment variables are correct
- Check Supabase dashboard for connection issues

### If Web App Can't Connect
- Check browser console for errors
- Verify GitHub Secrets are set correctly
- Check if GitHub Pages deployment succeeded

---

## 📝 Notes
- Date: _______________
- Tester: _______________
- Issues Found: _______________

