# 🎯 Slot Administrator System - Data Integrity Principles

## Core Principle: Single Source of Truth

**All users interact with THE SAME data, not separate copies.**

---

## ✅ How Data Flows

### Example 1: Slot Period
```
Database (SINGLE SOURCE):
┌─────────────────────────────────┐
│ doctor_profiles                 │
│ ├─ userId: 123 (Dr. Amit)      │
│ ├─ slotPeriodMinutes: 15       │ ← ONLY ONE VALUE
│ └─ slotPeriodUpdatedAt: ...    │
└─────────────────────────────────┘

Who Can Read:
✓ Dr. Amit (owner)
✓ Staff with SLOT_VIEW permission
✓ Hospital admin (if applicable)
✓ Patients (indirectly through slot availability)

Who Can Update:
✓ Dr. Amit (owner)
✓ Staff with SLOT_PERIOD_UPDATE permission

Result:
Everyone sees the SAME value: 15 minutes
If anyone changes it to 20, everyone immediately sees 20
```

### Example 2: Working Hours
```
Database (SINGLE SOURCE):
┌──────────────────────────────────────┐
│ doctor_working_hours                 │
│ ├─ doctorProfileId: 123             │
│ ├─ dayOfWeek: 1 (Monday)            │
│ ├─ startTime: "09:00"               │ ← ONLY ONE RECORD
│ └─ endTime: "17:00"                 │
└──────────────────────────────────────┘

Who Can Read:
✓ Dr. Amit
✓ Staff with WORKING_HOURS_VIEW permission
✓ Patients (booking interface)

Who Can Update:
✓ Dr. Amit
✓ Staff with WORKING_HOURS_UPDATE permission

Result:
If staff changes Monday hours to 10:00-18:00:
- Doctor sees: 10:00-18:00
- Staff sees: 10:00-18:00
- Patients can book: 10:00-18:00 slots
```

### Example 3: Appointments
```
Database (SINGLE SOURCE):
┌──────────────────────────────────────┐
│ appointments                         │
│ ├─ id: 456                           │
│ ├─ doctorId: 123 (Dr. Amit)         │
│ ├─ patientId: 789                   │
│ ├─ date: 2026-11-20                 │
│ ├─ time: "14:30"                    │
│ └─ status: "CONFIRMED"              │ ← ONLY ONE STATUS
└──────────────────────────────────────┘

Who Can Read:
✓ Dr. Amit (his appointment)
✓ Patient 789 (their appointment)
✓ Staff with APPOINTMENT_VIEW permission

Who Can Update Status:
✓ Dr. Amit
✓ Staff with APPOINTMENT_MANAGE permission

Result:
If staff cancels the appointment:
- Doctor sees: CANCELLED
- Patient sees: CANCELLED
- No one can book that slot again (it's gone)
```

---

## 🔒 Permission-Based Access Control

**Permissions control ACTIONS, not DATA COPIES**

```typescript
// Staff Assignment Example
{
  staff: "Rahul Verma (HLT-STA-72B491)",
  doctor: "Dr. Amit (HLT-DOC-8F29A1)",
  permissions: [
    { permission: "APPOINTMENT_VIEW", granted: true },
    { permission: "APPOINTMENT_MANAGE", granted: true },
    { permission: "SLOT_MANAGE", granted: true },
    { permission: "SLOT_PERIOD_UPDATE", granted: true },
    { permission: "WORKING_HOURS_UPDATE", granted: true },
    { permission: "WALKIN_CREATE", granted: true },
    { permission: "TOKEN_MANAGE", granted: true },
    { permission: "PATIENT_MEDICAL_RECORDS_VIEW", granted: false }
  ]
}
```

### What These Permissions Mean:

1. **APPOINTMENT_VIEW = true**
   - Staff can call: `GET /api/my-appointments` (filtered to Dr. Amit)
   - Returns: SAME appointments from `appointments` table
   - Not a copy, the actual records

2. **SLOT_PERIOD_UPDATE = true**
   - Staff can call: `PATCH /api/doctor/slot-period`
   - Updates: `doctor_profiles.slotPeriodMinutes` directly
   - Change is immediate and permanent

3. **WORKING_HOURS_UPDATE = true**
   - Staff can call: `PUT /api/doctor/working-hours`
   - Updates: `doctor_working_hours` table records
   - Everyone sees new hours immediately

---

## 🚫 What We're NOT Doing

### ❌ Bad Approach: Separate User Data
```sql
-- DON'T DO THIS:
CREATE TABLE doctor_user_settings (
  userId INT,
  slotPeriodMinutes INT
);

CREATE TABLE staff_user_settings (
  userId INT,
  slotPeriodMinutes INT
);

-- This would create inconsistency!
```

### ❌ Bad Approach: Session-Based Overrides
```javascript
// DON'T DO THIS:
if (user.role === 'SLOT_ADMIN') {
  slotPeriod = 20; // Staff's preference
} else {
  slotPeriod = 15; // Doctor's setting
}
// This creates different views of reality!
```

### ✅ Good Approach: Centralized Truth
```javascript
// DO THIS:
const slotPeriod = await prisma.doctorProfile.findUnique({
  where: { userId: doctorId },
  select: { slotPeriodMinutes: true }
});
// ONE value, everyone sees the same thing
```

---

## 🔄 Update Flow with Audit Trail

When staff makes a change, we track WHO made it, but the data remains centralized:

```sql
1. Staff updates slot period:
   UPDATE doctor_profiles 
   SET slotPeriodMinutes = 20,
       slotPeriodUpdatedAt = NOW()
   WHERE userId = 123;

2. We log WHO made the change:
   INSERT INTO staff_assignment_audit_logs 
   (action, actor_id, details)
   VALUES 
   ('SLOT_PERIOD_UPDATED', 
    456,  -- Rahul's user ID
    '{"doctorId": 123, "oldValue": 15, "newValue": 20}');

3. Result:
   - Data updated: doctor_profiles.slotPeriodMinutes = 20
   - Audit recorded: Staff member 456 made this change
   - Everyone sees: 20 minutes
```

---

## 🎯 API Implementation Rules

### Rule 1: Validate Permission, Then Update Central Data
```typescript
// Example: Update slot period API
async updateSlotPeriod(req, res) {
  const staffUserId = req.user.userId;
  const doctorId = req.body.doctorId;
  const newMinutes = req.body.minutes;
  
  // Step 1: Check if staff has permission
  const hasPermission = await checkStaffPermission(
    staffUserId,
    doctorId,
    'SLOT_PERIOD_UPDATE'
  );
  
  if (!hasPermission) {
    return res.status(403).json({ message: 'Permission denied' });
  }
  
  // Step 2: Update THE ACTUAL doctor profile (not a copy)
  await prisma.doctorProfile.update({
    where: { userId: doctorId },
    data: { 
      slotPeriodMinutes: newMinutes,
      slotPeriodUpdatedAt: new Date()
    }
  });
  
  // Step 3: Log the change
  await logAudit({
    action: 'SLOT_PERIOD_UPDATED',
    actorId: staffUserId,
    details: { doctorId, newMinutes }
  });
  
  // Step 4: Return success
  return res.json({ success: true, slotPeriodMinutes: newMinutes });
}
```

### Rule 2: Read from Central Data, Filter by Permission
```typescript
// Example: Get appointments API
async getAppointments(req, res) {
  const staffUserId = req.user.userId;
  
  // Step 1: Get staff's active assignments
  const assignments = await prisma.staffAssignment.findMany({
    where: {
      staff: { userId: staffUserId },
      status: 'ACTIVE'
    },
    include: { doctor: true, permissions: true }
  });
  
  // Step 2: Filter to doctors staff can view
  const doctorIds = assignments
    .filter(a => a.permissions.some(
      p => p.permission === 'APPOINTMENT_VIEW' && p.granted
    ))
    .map(a => a.doctorId);
  
  // Step 3: Query THE ACTUAL appointments (not copies)
  const appointments = await prisma.appointment.findMany({
    where: { doctorId: { in: doctorIds } },
    include: { doctor: true, patient: true }
  });
  
  return res.json({ appointments });
}
```

---

## 📱 Real-Time Synchronization

Since everyone uses the same data, updates are automatically synchronized:

```typescript
// When staff updates slot period
socket.emit('doctor:slot_period_updated', {
  doctorId: 123,
  newPeriod: 20
});

// All connected clients listening to this doctor:
// - Doctor's dashboard
// - Staff's dashboard  
// - Hospital admin dashboard
// - Patient booking interface
// All receive the same update and refresh from database
```

---

## ✅ Verification Checklist

Before deploying any new feature, verify:

- [ ] Does the feature update a single source of truth?
- [ ] Are permissions checked before allowing updates?
- [ ] Are changes audited with WHO made them?
- [ ] Do all users see the same data after updates?
- [ ] Is data NOT duplicated per user/role?
- [ ] Are real-time updates broadcast to all viewers?

---

## 🎓 Examples of Correct vs Incorrect

### ✅ Correct: Shared Patient Capacity
```typescript
// Doctor sets: "I can see 8 patients per hour"
await updateSlotPeriod(doctorId, 7.5); // 60/8 = 7.5 min slots

// Staff member sees:
const profile = await getDoctorProfile(doctorId);
console.log(profile.slotPeriodMinutes); // 7.5 ✅

// Patient booking system:
const slots = await getAvailableSlots(doctorId, date);
// Slots every 7.5 minutes ✅

// Hospital admin:
const stats = await getHospitalStats();
// Shows doctor's capacity based on 7.5 min slots ✅
```

### ❌ Incorrect: Per-User Preferences
```typescript
// DON'T DO THIS:
const slotPeriod = await getUserPreference(userId, 'slotPeriod');
// This would give different values per user!
```

---

## 🔮 Future-Proof Design

This architecture scales because:

1. **Adding new staff members**: They see existing data
2. **Removing staff members**: Data remains unchanged
3. **Staff changing doctors**: Same data, different doctor
4. **Multiple staff per doctor**: All see and modify same data
5. **Doctor moves hospitals**: Data follows doctor, not duplicated

---

## Summary

**Single Source of Truth = Data Integrity**

- ✅ One database record = one reality
- ✅ Permissions control WHO can change it
- ✅ Audit logs track WHO changed it
- ✅ Everyone sees the same current state
- ✅ No synchronization problems
- ✅ No conflicting versions
- ✅ Healthcare compliance ready

