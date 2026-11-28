# 🏥 Hospital-Doctor Integration System - Complete Design

## Overview
When a doctor gets linked/registered under a hospital, their functionality should seamlessly integrate with the hospital's ecosystem while maintaining their individual identity.

---

## 🎯 Core Principles

### 1. **Dual Identity System**
- Doctors maintain their **individual profile** (DoctorProfile)
- Doctors gain **hospital affiliation** (HospitalDoctor relationship)
- Both identities coexist and serve different purposes

### 2. **Feature Inheritance & Override**
- Hospital-linked doctors **inherit** hospital features
- Hospital features can **override** doctor features
- Doctors can have **additional** features beyond hospital scope

### 3. **Unified Patient Experience**
- Patients see hospital branding for hospital-linked doctors
- Appointment flow routes through hospital system
- Reviews/ratings contribute to both doctor AND hospital reputation

---

## 🏗️ Database Architecture (Already Exists)

### Key Tables:
1. **`hospital_doctors`** - Links doctors to hospitals with optional department
2. **`users`** - Doctor accounts with role='DOCTOR'
3. **`doctor_profiles`** - Individual doctor information
4. **`hospitals`** - Hospital master data
5. **`departments`** - Hospital departments
6. **`appointments`** - Patient bookings (linked to doctor, not hospital)

### Current Gaps to Fill:
✅ No gaps - schema is well-designed for integration

---

## 🔄 Integration Workflows

### A. Doctor Linking Process

```
┌─────────────────────────────────────────────────────────────┐
│  PHASE 1: DOCTOR REGISTRATION (Independent)                 │
├─────────────────────────────────────────────────────────────┤
│  1. Doctor signs up → creates User + DoctorProfile          │
│  2. Gets doctorCode (HLT-DOC-XXXXXX)                       │
│  3. Status: PENDING → Admin approves → APPROVED            │
│  4. Doctor has independent profile & microsite             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 2: HOSPITAL LINKING                                  │
├─────────────────────────────────────────────────────────────┤
│  Option A: Hospital Admin Links Doctor                      │
│  - Hospital admin enters doctorCode in dashboard            │
│  - Selects department (optional)                            │
│  - Creates HospitalDoctor record                            │
│                                                              │
│  Option B: Doctor Requests Joining                          │
│  - Doctor finds hospital in directory                       │
│  - Sends join request with hospitalCode                     │
│  - Hospital admin approves/rejects                          │
│  - Creates HospitalDoctor record on approval                │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│  PHASE 3: INTEGRATION EFFECTS                               │
├─────────────────────────────────────────────────────────────┤
│  ✓ Doctor appears in hospital's doctor list                │
│  ✓ Homepage displays hospital badge on doctor card         │
│  ✓ Doctor profile shows "Part of [Hospital Name]"         │
│  ✓ Appointments route through hospital context             │
│  ✓ Hospital admin can manage doctor's slots               │
│  ✓ Analytics merged into hospital dashboard               │
│  ✓ Reviews contribute to hospital ratings                 │
└─────────────────────────────────────────────────────────────┘
```

### B. Feature Integration Matrix

| Feature | Independent Doctor | Hospital-Linked Doctor | Behavior |
|---------|-------------------|------------------------|----------|
| **Profile Visibility** | Own microsite | Hospital site + Own site | Both accessible |
| **Appointment Booking** | Direct booking | Hospital-branded booking | Same backend, different UI |
| **Slot Management** | Self-managed | Hospital admin + Self | Hospital admin can override |
| **Reviews & Ratings** | Own reviews | Contributes to both | Dual attribution |
| **Analytics** | Own dashboard | Hospital dashboard + Own | Hospital sees aggregated |
| **Working Hours** | Self-defined | Must align with hospital | Validation on save |
| **Consultation Fee** | Self-set | Hospital can suggest | Doctor has final say |
| **Department** | None/Self-defined | Hospital department | Required for hospital context |

---

## 🎨 Frontend Implementation Plan

### 1. **Homepage Doctor Cards** ✅ DONE
```tsx
// Show hospital badge for linked doctors
{doctor.hospital && (
  <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md">
    🏥 {doctor.hospital.name}
  </span>
)}

// Button redirects to hospital profile instead of doctor microsite
{doctor.hospital ? (
  <Link href={`/hospital-site/${doctor.hospital.id}`}>
    View at {doctor.hospital.name}
  </Link>
) : (
  <Link href={`/doctor-site/${doctor.slug}`}>
    View Profile
  </Link>
)}
```

### 2. **Doctor Dashboard - Hospital Context Banner**
```tsx
// apps/web/app/dashboard/page.tsx
// Add banner at top when doctor is linked to hospital

{user.role === 'DOCTOR' && linkedHospital && (
  <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4 rounded-xl mb-6 shadow-lg">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Building2 className="w-6 h-6" />
        <div>
          <p className="text-sm font-semibold">You're a doctor at</p>
          <h3 className="text-xl font-black">{linkedHospital.name}</h3>
          <p className="text-xs opacity-90">{linkedHospital.department || 'General'}</p>
        </div>
      </div>
      <Link href={`/hospital-site/${linkedHospital.id}`}>
        <button className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50">
          View Hospital Profile
        </button>
      </Link>
    </div>
  </div>
)}
```

### 3. **Hospital Dashboard - Doctors Tab** ✅ DONE
```tsx
// apps/web/components/dashboard/HospitalAdminAdvanced.tsx
// Already implemented with:
// - Link Existing Doctor by Code
// - Department assignment
// - Doctor list with management actions
```

### 4. **Doctor Profile Page - Hospital Badge**
```tsx
// apps/web/app/doctor-site/[slug]/page.tsx
// Add hospital affiliation section

{doctorData.hospital && (
  <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-6 mb-6">
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
        🏥
      </div>
      <div>
        <p className="text-sm text-purple-600 font-semibold">Part of</p>
        <h3 className="text-2xl font-black text-gray-900">{doctorData.hospital.name}</h3>
        <Link href={`/hospital-site/${doctorData.hospital.id}`}>
          <span className="text-sm text-purple-600 hover:underline">View Hospital Profile →</span>
        </Link>
      </div>
    </div>
  </div>
)}
```

### 5. **Hospital Profile Page - Doctors Section**
```tsx
// apps/web/app/hospital-site/[id]/page.tsx
// Add "Our Doctors" section with filterable list

<section className="py-12">
  <h2 className="text-3xl font-black mb-6">Our Doctors</h2>
  
  {/* Department Filter */}
  <div className="flex gap-2 mb-6 overflow-x-auto">
    <button onClick={() => setDeptFilter(null)} className={`px-4 py-2 rounded-lg ${!deptFilter ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>
      All Departments
    </button>
    {departments.map(dept => (
      <button key={dept.id} onClick={() => setDeptFilter(dept.id)} className={`px-4 py-2 rounded-lg whitespace-nowrap ${deptFilter === dept.id ? 'bg-purple-600 text-white' : 'bg-gray-100'}`}>
        {dept.name}
      </button>
    ))}
  </div>
  
  {/* Doctor Grid */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {filteredDoctors.map(doctor => (
      <DoctorCard key={doctor.id} doctor={doctor} hospitalContext={true} />
    ))}
  </div>
</section>
```

---

## 🔧 Backend API Enhancements

### A. New Endpoints Needed

#### 1. **Get Doctor's Hospital Context**
```typescript
GET /api/doctors/:doctorId/hospital

Response:
{
  "hospital": {
    "id": 2,
    "name": "DocProc Hospital",
    "subdomain": "hola",
    "department": "Cardiology"
  },
  "permissions": {
    "canManageOwnSlots": true,
    "hospitalCanOverride": true
  }
}
```

#### 2. **Doctor Request Hospital Join**
```typescript
POST /api/doctors/join-hospital

Body:
{
  "hospitalCode": "HLT-HSP-XXXXXX",
  "departmentName": "Cardiology",
  "message": "I'd like to join as a consulting cardiologist"
}

Response:
{
  "requestId": 123,
  "status": "PENDING",
  "message": "Join request sent to hospital admin"
}
```

#### 3. **Hospital: Manage Join Requests**
```typescript
GET /api/hospitals/:hospitalId/join-requests

Response:
{
  "requests": [
    {
      "id": 123,
      "doctor": {
        "id": 105,
        "name": "Dr. Smith",
        "specialization": "Cardiology"
      },
      "requestedDepartment": "Cardiology",
      "message": "...",
      "createdAt": "2024-11-23T..."
    }
  ]
}

POST /api/hospitals/:hospitalId/join-requests/:requestId/approve
POST /api/hospitals/:hospitalId/join-requests/:requestId/reject
```

#### 4. **Unlink Doctor from Hospital**
```typescript
DELETE /api/hospitals/:hospitalId/doctors/:doctorId

// Soft unlink - preserves history
// Doctor reverts to independent status
// Past appointments remain visible
```

### B. Modify Existing Endpoints

#### 1. **GET /api/doctors** ✅ DONE
```typescript
// Already returns hospital data via SQL subquery
// No changes needed
```

#### 2. **GET /api/doctor/:id/appointments**
```typescript
// Add hospital context to response
{
  "appointments": [...],
  "hospitalContext": {
    "id": 2,
    "name": "DocProc",
    "canManageSlots": true
  }
}
```

#### 3. **POST /api/appointments**
```typescript
// When booking hospital-linked doctor:
// - Track hospitalId in appointment metadata
// - Send notification to both doctor AND hospital admin
// - Use hospital branding in confirmation email
```

---

## 📊 Analytics Integration

### Hospital Dashboard Should Show:

1. **Aggregated Doctor Metrics**
   - Total appointments across all hospital doctors
   - Average rating of hospital doctors
   - Most popular departments
   - Busiest doctors this week/month

2. **Individual Doctor Performance**
   - Each doctor's appointment count
   - Each doctor's rating
   - Each doctor's availability utilization
   - Revenue contribution per doctor

3. **Department Analytics**
   - Appointments by department
   - Average wait time by department
   - Department-wise revenue

### Implementation:
```typescript
GET /api/hospitals/:hospitalId/analytics

Response:
{
  "overview": {
    "totalDoctors": 15,
    "totalAppointments": 450,
    "averageRating": 4.5,
    "totalRevenue": 125000
  },
  "byDepartment": [
    {
      "departmentId": 1,
      "name": "Cardiology",
      "doctors": 5,
      "appointments": 150,
      "revenue": 50000
    }
  ],
  "topDoctors": [
    {
      "doctorId": 105,
      "name": "Dr. Smith",
      "appointments": 80,
      "rating": 4.8
    }
  ]
}
```

---

## 🔐 Permissions & Access Control

### Role Matrix:

| Action | Independent Doctor | Hospital-Linked Doctor | Hospital Admin | Super Admin |
|--------|-------------------|------------------------|----------------|-------------|
| Edit own profile | ✅ | ✅ | ❌ | ✅ |
| Manage own slots | ✅ | ✅ (with limits) | ✅ | ✅ |
| View own appointments | ✅ | ✅ | ✅ (all hospital doctors) | ✅ |
| Accept/reject appointments | ✅ | ✅ | ❌ | ✅ |
| Unlink from hospital | ❌ | ⚠️ (request only) | ✅ | ✅ |
| Change department | ❌ | ❌ | ✅ | ✅ |
| Delete doctor account | ✅ | ⚠️ (must unlink first) | ❌ | ✅ |

### Implementation:
```typescript
// Middleware: Check if doctor is hospital-linked
export async function checkHospitalLinkage(req: AuthRequest, res: Response, next: NextFunction) {
  const doctorId = req.user!.userId;
  
  const hospitalLink = await prisma.hospitalDoctor.findFirst({
    where: { doctorId },
    include: { hospital: true, department: true }
  });
  
  req.hospitalContext = hospitalLink ? {
    hospitalId: hospitalLink.hospitalId,
    hospitalName: hospitalLink.hospital.name,
    departmentId: hospitalLink.departmentId,
    departmentName: hospitalLink.department?.name
  } : null;
  
  next();
}
```

---

## 🎭 User Experience Flows

### Flow 1: Patient Books Hospital-Linked Doctor

```
1. Patient browses homepage → sees doctor with hospital badge
2. Clicks "View at DocProc" → goes to hospital profile page
3. Sees doctor in hospital's doctor list
4. Clicks "Book Appointment" → opens booking modal
5. Booking UI shows:
   - Hospital branding (logo, colors)
   - Doctor details
   - "You're booking with Dr. Smith at DocProc Hospital"
6. After booking:
   - Confirmation shows hospital letterhead
   - Email cc'd to hospital admin
   - Appointment visible in both doctor & hospital dashboards
```

### Flow 2: Doctor Joins Hospital

```
Option A: Hospital Admin Initiates
1. Hospital admin goes to Dashboard → Doctors tab
2. Clicks "Link Existing Doctor by Code"
3. Enters HLT-DOC-XXXXXX and department
4. System validates doctor exists and is approved
5. Creates link immediately
6. Doctor gets notification: "You've been added to DocProc Hospital"

Option B: Doctor Initiates
1. Doctor goes to Hospitals directory
2. Finds hospital, clicks "Request to Join"
3. Enters hospitalCode and desired department
4. Request sent to hospital admin
5. Hospital admin reviews in "Join Requests" tab
6. Admin approves → link created
7. Doctor gets notification: "Welcome to DocProc Hospital!"
```

### Flow 3: Doctor Leaves Hospital

```
1. Doctor/Admin initiates unlink request
2. System checks:
   - Are there upcoming appointments?
   - What happens to past appointments?
3. Options:
   a) Immediate unlink (if no upcoming appointments)
   b) Schedule unlink (after last appointment)
   c) Transfer appointments to another doctor
4. After unlink:
   - Doctor reverts to independent status
   - Hospital badge removed from public profile
   - Past appointments remain in history (archived)
   - Doctor's microsite becomes primary again
```

---

## 🚀 Implementation Priority

### Phase 1: Core Integration (CURRENT) ✅
- [x] Database schema (already exists)
- [x] API endpoint: Link doctor by code
- [x] Frontend: Hospital dashboard - Doctors tab
- [x] Frontend: Homepage - Hospital badge on doctor cards

### Phase 2: Doctor Experience
- [ ] Doctor dashboard - Hospital context banner
- [ ] Doctor profile page - Hospital affiliation display
- [ ] API: Get doctor's hospital context
- [ ] API: Doctor request to join hospital

### Phase 3: Hospital Experience
- [ ] Hospital profile - "Our Doctors" section with filtering
- [ ] Hospital dashboard - Analytics for linked doctors
- [ ] API: Manage join requests (approve/reject)
- [ ] API: Unlink doctor

### Phase 4: Appointment Flow
- [ ] Hospital-branded booking modal
- [ ] Hospital context in appointment emails
- [ ] Hospital admin notification on new bookings
- [ ] Appointment history shows hospital context

### Phase 5: Advanced Features
- [ ] Working hours synchronization
- [ ] Slot management permissions
- [ ] Department-based scheduling rules
- [ ] Multi-hospital doctor support (doctor linked to 2+ hospitals)

---

## 💡 Best Practices & Considerations

### 1. **Data Integrity**
- Never hard-delete HospitalDoctor records (soft delete with deletedAt)
- Maintain appointment history even after unlink
- Audit log all link/unlink operations

### 2. **Performance**
- Cache hospital-doctor relationships in Redis
- Index hospitalId + doctorId for fast lookups
- Eager load hospital data when fetching doctors for homepage

### 3. **User Communication**
- Send email notifications on link/unlink
- Show clear banners when viewing linked doctor profiles
- Transparent about data sharing between doctor & hospital

### 4. **Scalability**
- Support doctors linked to multiple hospitals
- Support different permission levels per hospital
- Support temporary/seasonal linkages (e.g., visiting consultants)

### 5. **Edge Cases**
- Doctor pending approval trying to link → Reject
- Hospital suspended trying to link doctor → Reject
- Doctor with active appointments trying to unlink → Schedule for later
- Doctor deletes account while linked → Cascade unlink first

---

## 📝 Next Steps

1. **Implement Phase 2** (Doctor Experience)
   - Add hospital context banner to doctor dashboard
   - Display hospital affiliation on doctor profile pages
   - Create API endpoint for doctor to request hospital join

2. **Implement Phase 3** (Hospital Experience)
   - Build "Our Doctors" section on hospital profile page
   - Add department-based filtering
   - Create analytics dashboard for hospital admin

3. **Testing**
   - Test link/unlink flows
   - Test appointment booking with hospital context
   - Test permission boundaries
   - Load test with multiple hospitals & doctors

---

**Last Updated:** November 23, 2024
**Status:** Phase 1 Complete, Phase 2 In Progress
