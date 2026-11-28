# 🧪 How to Test Phase 3: Hospital-Doctor Integration

## Quick Start Testing Guide

This guide will help you test all Phase 3 features step by step.

---

## 🚀 Setup

### 1. Start Development Servers

**Terminal 1 - API Server**:
```bash
cd apps/api
npm run dev
```
Wait for: `Server running on http://localhost:3001`

**Terminal 2 - Web App**:
```bash
cd apps/web
npm run dev
```
Wait for: `Ready on http://localhost:3000`

---

## 🧪 Test Scenarios

### Scenario 1: Hospital Admin Dashboard - "Our Doctors" Tab

#### Step 1: Login as Hospital Admin
1. Open browser: `http://localhost:3000/login`
2. Login with DocProc hospital admin credentials
3. You should be redirected to dashboard

#### Step 2: Navigate to Hospital Admin Profile
1. Go to: `http://localhost:3000/hospital-admin/profile`
2. You should see the hospital dashboard with 5 tabs:
   - 🏢 General Info
   - 📖 About Us
   - 🏥 Departments
   - 👨‍⚕️ Doctors
   - **📊 Our Doctors** ← NEW!

#### Step 3: Click "Our Doctors" Tab
1. Click on the **"📊 Our Doctors"** tab
2. **Expected Result**: You should see:
   
   **Statistics Cards Row**:
   ```
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │   5         │ │   5         │ │   0         │ │   2         │
   │ Total Drs   │ │ Active      │ │ Inactive    │ │ Departments │
   └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
   ```
   
   **Filter Buttons**:
   ```
   [All (5)] [Active (5)] [Inactive (0)]
   ```
   
   **Doctor Cards Grid** (if doctors exist):
   ```
   ┌─────────────────────────────────┐
   │ 👨‍⚕️ Dr. John Doe                 │
   │ Cardiology                       │
   │ ✓ Active                         │
   │ ⭐⭐⭐⭐⭐ • 15yr exp • ₹500      │
   │ 📍 Mumbai, Maharashtra           │
   │ [View Profile]  [⋯]             │
   └─────────────────────────────────┘
   ```

#### Step 4: Test Filtering
1. Click **"Active (5)"** button
   - Should show only active doctors
   - Button should turn blue
2. Click **"Inactive (0)"** button
   - Should show empty state: "No inactive doctors found"
3. Click **"All (5)"** button
   - Should show all doctors again

#### Step 5: Test Doctor Actions
1. Click **"View Profile"** on any doctor card
   - Should open doctor profile in new tab
   - URL should be like: `/doctor-site/[slug]`
2. Hover over cards
   - Should see hover effect (shadow increase)

---

### Scenario 2: Public Hospital Profile - "Our Doctors" Section

#### Step 1: Navigate to Hospital Microsite
Open browser:
- By ID: `http://localhost:3000/hospital-site/2`
- By Slug: `http://localhost:3000/hospital-site/docproc`

#### Step 2: Scroll to "Our Doctors" Section
1. Scroll down past the hero section
2. Look for the **"Our Doctors"** section
3. Should see heading: "Our Doctors - Book directly with our medical team"

#### Step 3: Test Department Filtering
1. **Initial State**: Should see "All (5)" button selected (blue)
2. Click on a department button (e.g., **"Cardiology (2)"**)
   - Should filter to show only Cardiology doctors
   - Button should turn blue
   - URL should update: `?dept=Cardiology`
3. Refresh the page
   - Filter should persist (Cardiology still selected)
4. Click **"All (5)"**
   - Should show all doctors again
   - URL should clear the query parameter

#### Step 4: Test Doctor Cards
1. **Check Card Content**:
   - Profile image or 👨‍⚕️ emoji
   - Doctor name (e.g., "Dr. John Doe")
   - Specialization (e.g., "Cardiology")
   - Department name (e.g., "Cardiology Department")
   - Experience (e.g., "15yr exp")
   - Consultation fee (e.g., "₹500")
   - Rating display (stars)

2. **Test Booking CTA**:
   - Click **"Book Appointment"** button
   - Should navigate to appointment booking flow

---

### Scenario 3: API Endpoint Testing

#### Using cURL (Command Line)

```bash
curl http://localhost:3001/api/hospitals/2/doctors
```

**Expected Response**:
```json
{
  "success": true,
  "hospital": {
    "id": 2,
    "name": "DocProc"
  },
  "doctors": [
    {
      "doctor": {
        "id": 104,
        "email": "dr.john@docproc.4567",
        "status": "ACTIVE",
        "doctorProfile": {
          "slug": "dr-john-doe",
          "specialization": "Cardiology",
          "qualifications": "MBBS, MD",
          "experience": 15,
          "clinicName": "Dr. John's Clinic",
          "consultationFee": 500,
          "profileImage": null,
          "city": "Mumbai",
          "state": "Maharashtra",
          "phone": "+91..."
        }
      },
      "department": {
        "id": 1,
        "name": "Cardiology",
        "description": "Heart and cardiovascular care"
      }
    }
  ],
  "count": 5
}
```

#### Using Browser

1. Open: `http://localhost:3001/api/hospitals/2/doctors`
2. Should see JSON response
3. Check:
   - ✓ `success: true`
   - ✓ `hospital` object present
   - ✓ `doctors` array with items
   - ✓ `count` matches array length

---

## ✅ Verification Checklist

### Hospital Admin Dashboard
- [ ] "Our Doctors" tab appears in navigation
- [ ] Statistics cards display correct counts
- [ ] Filter buttons work (All, Active, Inactive)
- [ ] Filter counts are accurate
- [ ] Doctor cards render with all information
- [ ] Status badges show correct status
- [ ] "View Profile" button works
- [ ] Loading state appears briefly on mount
- [ ] Empty state shows when no doctors match filter
- [ ] Responsive design works on mobile/tablet/desktop

### Public Hospital Profile
- [ ] "Our Doctors" section appears on page
- [ ] Department filter buttons render
- [ ] Department counts are accurate
- [ ] Filtering works correctly
- [ ] URL updates with filter parameter
- [ ] Filter persists on page refresh
- [ ] Doctor cards show complete information
- [ ] "Book Appointment" button works
- [ ] Rating display appears
- [ ] Empty state shows for no doctors
- [ ] Responsive grid layout works

### API Endpoint
- [ ] Endpoint returns 200 status
- [ ] Response includes `success: true`
- [ ] Hospital object is present
- [ ] Doctors array contains items
- [ ] Each doctor has complete profile data
- [ ] Department information is included
- [ ] Only active doctors are returned
- [ ] Count matches array length

---

## 🐛 Troubleshooting

### Issue: "Our Doctors" tab doesn't appear
**Solution**:
1. Clear browser cache
2. Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
3. Check if logged in as HOSPITAL_ADMIN role
4. Verify hospital is created (hospitalId exists)

### Issue: No doctors showing
**Solution**:
1. Check if doctors are linked to hospital in database
2. Verify doctors have ACTIVE status
3. Check API response in browser dev tools (Network tab)
4. Test API endpoint directly: `http://localhost:3001/api/hospitals/2/doctors`

### Issue: Statistics show 0
**Solution**:
1. Link some doctors using the "Doctors" tab
2. Use the "Link Existing Doctor by Code" feature
3. Create new doctors via "Add New Doctor" form
4. Ensure doctors are made "bookable" (have doctorId)

### Issue: Filtering doesn't work
**Solution**:
1. Check browser console for errors
2. Verify component is client-side (`"use client"` directive)
3. Clear browser storage (localStorage/sessionStorage)
4. Restart development servers

### Issue: Profile images not showing
**Solution**:
1. This is expected if doctors don't have profile images
2. Should show 👨‍⚕️ emoji as fallback
3. Check if profileImage URL is valid
4. Verify CORS settings if images are external

---

## 📊 Expected Data

### Test Hospital: DocProc
- **Hospital ID**: 2
- **Hospital Slug**: "docproc"
- **Linked Doctors**: IDs 104, 105
- **Departments**: Cardiology, Neurology (example)

### Sample Doctor Data
```javascript
{
  id: 104,
  email: "dr.john@docproc.4567",
  status: "ACTIVE",
  doctorProfile: {
    slug: "dr-john-doe",
    specialization: "Cardiology",
    experience: 15,
    consultationFee: 500,
    city: "Mumbai",
    state: "Maharashtra"
  },
  department: {
    id: 1,
    name: "Cardiology"
  }
}
```

---

## 🎯 Success Criteria

Phase 3 is successfully implemented if:

1. ✅ Hospital admin can see "Our Doctors" tab
2. ✅ Statistics cards show accurate data
3. ✅ Filtering works correctly
4. ✅ Doctor cards display complete information
5. ✅ Public hospital profile shows doctors section
6. ✅ Department filtering works on public page
7. ✅ API endpoint returns correct data
8. ✅ No console errors
9. ✅ Responsive design works on all devices
10. ✅ All links and buttons are functional

---

## 🎬 Demo Flow

### Complete User Journey

1. **Hospital Admin Reviews Doctors**:
   - Login → Dashboard → Our Doctors Tab
   - See 5 doctors, 5 active, 2 departments
   - Filter to see only active doctors
   - Click "View Profile" on Dr. John
   - See Dr. John's full profile

2. **Patient Finds Doctor**:
   - Visit hospital website: `/hospital-site/docproc`
   - Scroll to "Our Doctors" section
   - See department filter: Cardiology, Neurology
   - Click "Cardiology" filter
   - See 2 cardiologists
   - Click "Book Appointment" on Dr. John
   - Complete booking flow

3. **System Integration**:
   - API serves data consistently
   - Public profile and admin dashboard show same doctors
   - Filtering works in both interfaces
   - Data updates reflect immediately

---

## 📝 Notes

- **Performance**: First load may be slow as it fetches from database
- **Caching**: Not implemented yet, each request hits database
- **Real-time Updates**: Not implemented, requires page refresh
- **Mobile**: Fully responsive, test on actual devices
- **Browser Compatibility**: Tested on Chrome, Firefox, Safari

---

## 🚀 Next Steps After Testing

If all tests pass:
1. ✅ Mark Phase 3 as complete
2. 📝 Document any bugs found
3. 🎯 Plan Phase 3+ features:
   - Doctor join request system
   - Unlink doctor functionality
   - Advanced analytics
   - Bulk operations

If issues found:
1. 🐛 Document the issue
2. 🔍 Check browser console
3. 📊 Verify API response
4. 🛠️ Fix and re-test

---

**Testing Guide Version**: 1.0  
**Last Updated**: November 23, 2026  
**Status**: Ready for Testing
