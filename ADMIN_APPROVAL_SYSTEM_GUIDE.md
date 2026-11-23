# 🔐 Admin Approval System - Complete Guide

## Overview
The admin approval system ensures that only verified doctors and hospitals can be active on the platform. When doctors and hospitals register, they must wait for admin approval before their profiles become visible and functional.

---

## 🔑 Admin Access

### Admin Login Credentials
- **Email**: `zinny461@gmail.com`
- **Password**: `admin123`
- **Admin Panel URL**: http://localhost:3000/admin-secure-panel-7x9y2z-2024/login

### Reset Admin Password
If you forget the password, run:
```bash
cd apps/api
node reset-admin-password.js
```

---

## 📋 How the Approval System Works

### 1. **Doctor Registration Flow**
1. Doctor registers at `/login` (creates account with role `DOCTOR`)
2. Doctor fills out their profile (specialization, qualifications, clinic details, etc.)
3. Doctor submits verification details (registration number, documents)
4. Doctor's status becomes `PENDING` and `verificationStatus = 'PENDING'`
5. **Doctor is blocked from dashboard until approved**
6. Admin reviews and approves/rejects
7. If approved:
   - `user.status` → `ACTIVE`
   - `doctorProfile.verificationStatus` → `APPROVED`
   - Doctor profile appears on homepage `/doctors` page
   - Doctor can access full dashboard functionality

### 2. **Hospital Registration Flow**
1. Hospital admin registers at `/login` (creates account with role `HOSPITAL_ADMIN`)
2. Hospital admin creates hospital profile (name, address, facilities, etc.)
3. Hospital admin submits verification details (registration number, documents)
4. Hospital's `verificationStatus` becomes `PENDING`
5. **Hospital admin is blocked from dashboard until approved**
6. Admin reviews and approves/rejects
7. If approved:
   - `hospital.status` → `ACTIVE`
   - `hospital.verificationStatus` → `APPROVED`
   - Hospital appears on homepage `/hospitals` page
   - Hospital admin can access full dashboard functionality

---

## 🎯 Admin Panel Features

### Navigation Tabs
1. **📊 Dashboard** - Overview and statistics
2. **👨‍⚕️ Doctors** - Manage all doctors (approve, suspend, review)
3. **🏥 Hospitals** - Manage all hospitals (approve, suspend, review)
4. **🛡️ Pending Verifications** - Quick approval interface for pending submissions
5. **📝 Audit Logs** - Track all admin actions
6. **⚙️ Settings** - System configuration

### Pending Verifications Tab
- **Shows**: All doctors and hospitals waiting for approval
- **Actions**:
  - ✅ **Approve** - Activates the account and makes it publicly visible
  - ❌ **Reject** - Marks as rejected, account remains inactive
- **Doctor Info Shown**: Name, email, specialization, qualifications, registration number
- **Hospital Info Shown**: Name, address, type, registration number

### Doctor Management Tab
- **View All Doctors**: Lists all registered doctors (pending, approved, suspended)
- **Filter Options**: All, Pending, Active, Suspended
- **Actions Per Doctor**:
  - View full profile details
  - Approve (if pending)
  - Reject (if pending)
  - Suspend (if active)
  - Reactivate (if suspended)
  - Upload profile photo
  - Edit profile details

### Hospital Management Tab
- **View All Hospitals**: Lists all registered hospitals
- **Filter Options**: All, Pending, Active, Suspended
- **Actions Per Hospital**:
  - View full details
  - Approve (if pending)
  - Reject (if pending)
  - Suspend (if active)
  - Reactivate (if suspended)
  - Upload logo
  - Edit hospital profile

---

## 🔒 What Gets Blocked Until Approval

### For Doctors (verificationStatus !== 'APPROVED'):
❌ **Blocked**:
- Dashboard access (shows verification pending screen)
- Appointment management
- Slot management
- Patient management
- Profile customization
- All doctor dashboard features

✅ **Allowed**:
- Login to account
- View verification status
- Submit verification details (if not yet submitted)

### For Hospitals (verificationStatus !== 'APPROVED'):
❌ **Blocked**:
- Dashboard access (shows verification pending screen)
- Hospital appointment management
- Doctor assignment
- Department management
- All hospital admin features

✅ **Allowed**:
- Login to account
- View verification status
- Submit verification details (if not yet submitted)

---

## 📍 Public Visibility

### Homepage Doctor List (`/doctors`)
**Only shows doctors where**:
- `user.status === 'ACTIVE'`
- `doctorProfile.verificationStatus === 'APPROVED'`

### Homepage Hospital List (`/hospitals`)
**Only shows hospitals where**:
- `hospital.status === 'ACTIVE'`
- `hospital.verificationStatus === 'APPROVED'`

### Search Results
Same filtering applies - only approved and active profiles appear in search results.

---

## 🚀 API Endpoints

### Doctor Verification
```
POST /api/doctor/verification
- Submits doctor verification details
- Sets verificationSubmitted = true
- Sets user.status = 'PENDING'
```

```
GET /api/admin/pending-doctors
- Returns all doctors with status PENDING or verificationStatus PENDING
```

```
POST /api/admin/doctor-verification/:doctorId
Body: { decision: 'APPROVE' | 'REJECT' }
- APPROVE: Sets status=ACTIVE, verificationStatus=APPROVED
- REJECT: Sets status=SUSPENDED, verificationStatus=REJECTED
```

### Hospital Verification
```
POST /api/hospital/verification
- Submits hospital verification details
- Sets verificationSubmitted = true
```

```
GET /api/admin/pending-hospitals
- Returns all hospitals with verificationStatus PENDING
```

```
POST /api/admin/hospital-verification/:hospitalId
Body: { decision: 'APPROVE' | 'REJECT' }
- APPROVE: Sets status=ACTIVE, verificationStatus=APPROVED
- REJECT: Sets status=SUSPENDED, verificationStatus=REJECTED
```

---

## 📊 Database Schema

### DoctorProfile Table
```prisma
verificationSubmitted Boolean @default(false)
verificationStatus    String  @default("PENDING") // PENDING, APPROVED, REJECTED
registrationNumber    String?
```

### Hospital Table
```prisma
status                String  @default("ACTIVE")  // ACTIVE, SUSPENDED, PENDING
verificationSubmitted Boolean @default(false)
verificationStatus    String  @default("PENDING") // PENDING, APPROVED, REJECTED
registrationNumberGov String?
```

---

## ✅ Testing Checklist

### Test Doctor Approval:
1. [ ] Register a new doctor account
2. [ ] Login as doctor - should see "verification pending" screen
3. [ ] Submit verification details
4. [ ] Login as admin at `/admin-secure-panel-7x9y2z-2024/login`
5. [ ] Go to "Pending Verifications" tab
6. [ ] See the new doctor in pending list
7. [ ] Click "Approve" button
8. [ ] Logout and login as doctor again
9. [ ] Should now see full dashboard
10. [ ] Visit homepage `/doctors` - doctor should be visible

### Test Hospital Approval:
1. [ ] Register a new hospital admin account
2. [ ] Create hospital profile
3. [ ] Login as hospital admin - should see "verification pending" screen
4. [ ] Submit verification details
5. [ ] Login as admin
6. [ ] Go to "Pending Verifications" tab
7. [ ] See the new hospital in pending list
8. [ ] Click "Approve" button
9. [ ] Logout and login as hospital admin again
10. [ ] Should now see full dashboard
11. [ ] Visit homepage `/hospitals` - hospital should be visible

### Test Rejection:
1. [ ] Register a new doctor/hospital
2. [ ] Admin clicks "Reject" instead of "Approve"
3. [ ] Doctor/hospital should remain blocked
4. [ ] Profile should NOT appear on homepage

---

## 🐛 Troubleshooting

### Issue: Doctor/Hospital not showing after approval
**Solution**: Check if cache needs clearing. The system clears caches automatically after approval, but if issues persist:
```javascript
// Force cache refresh
cachedDoctors = null;
cachedHospitals = null;
lastDoctorsFetch = 0;
lastHospitalsFetch = 0;
```

### Issue: Admin can't see pending submissions
**Check**:
1. Doctor/hospital actually submitted verification (`verificationSubmitted = true`)
2. Check database directly:
```sql
-- Pending doctors
SELECT u.id, u.email, dp.verification_status 
FROM users u 
JOIN doctor_profiles dp ON u.id = dp.user_id 
WHERE u.role = 'DOCTOR' AND (u.status = 'PENDING' OR dp.verification_status = 'PENDING');

-- Pending hospitals
SELECT id, name, verification_status 
FROM hospitals 
WHERE verification_status = 'PENDING';
```

### Issue: Approved user still blocked
**Check**:
1. Both `user.status = 'ACTIVE'` AND `verificationStatus = 'APPROVED'`
2. User logged out and back in (token needs refresh)
3. Check browser console for errors

---

## 📝 Notes

- **Verification is required** for both doctors and hospitals to appear publicly
- **Admin approval is manual** - there's no auto-approval
- **Rejection is reversible** - admin can change status later
- **Suspension is different from rejection** - suspended users were once active
- **Cache is automatically cleared** after approval/rejection for immediate visibility

---

## 🎉 System Status

✅ **Database Schema** - verificationStatus fields exist
✅ **API Endpoints** - All approval endpoints implemented
✅ **Admin Panel UI** - Full approval interface ready
✅ **Dashboard Blocking** - Pending users can't access features
✅ **Public Filtering** - Only approved profiles show on homepage
✅ **Audit Logging** - All admin actions are logged

**System is fully functional and ready to use!** 🚀
