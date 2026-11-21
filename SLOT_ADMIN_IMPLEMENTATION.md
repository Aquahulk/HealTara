# 🏥 Healtara Slot Administrator System - Implementation Spec

## Executive Summary
Building a multi-tenant staff management system where identity is permanent and access is assignment-based.

---

## System Architecture

### Three Independent Entities

```
┌─────────────────────┐
│  Doctor Identity    │  HLT-DOC-8F29A1
│  (Permanent)        │  Never changes workplace
└─────────────────────┘

┌─────────────────────┐
│  Hospital Identity  │  HLT-HOS-4C82B1
│  (Permanent)        │  Organization identity
└─────────────────────┘

┌─────────────────────┐
│  Staff Identity     │  HLT-STA-72B491
│  (Permanent)        │  Professional identity
└─────────────────────┘
```

### Assignment Scopes

1. **DOCTOR** - Manage one doctor across all contexts
2. **HOSPITAL** - Hospital-level staff (not tied to specific doctor)
3. **DOCTOR_HOSPITAL** - Manage specific doctor at specific hospital only

---

## Database Schema

### New Tables

#### 1. staff_profiles
```sql
CREATE TABLE staff_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  staff_code VARCHAR(20) NOT NULL UNIQUE,  -- HLT-STA-XXXXXX
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. staff_assignment_requests
```sql
CREATE TABLE staff_assignment_requests (
  id SERIAL PRIMARY KEY,
  staff_id INTEGER NOT NULL REFERENCES staff_profiles(id),
  doctor_id INTEGER REFERENCES users(id),
  hospital_id INTEGER REFERENCES hospitals(id),
  
  scope VARCHAR(30) NOT NULL,  -- DOCTOR | HOSPITAL | DOCTOR_HOSPITAL
  initiated_by INTEGER NOT NULL REFERENCES users(id),
  
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  doctor_approved_at TIMESTAMP,
  doctor_approved_by INTEGER REFERENCES users(id),
  
  hospital_approved_at TIMESTAMP,
  hospital_approved_by INTEGER REFERENCES users(id),
  
  staff_accepted_at TIMESTAMP,
  
  rejection_reason TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. staff_assignments
```sql
CREATE TABLE staff_assignments (
  id SERIAL PRIMARY KEY,
  request_id INTEGER REFERENCES staff_assignment_requests(id),
  
  staff_id INTEGER NOT NULL REFERENCES staff_profiles(id),
  doctor_id INTEGER REFERENCES users(id),
  hospital_id INTEGER REFERENCES hospitals(id),
  
  scope VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  
  activated_at TIMESTAMP DEFAULT NOW(),
  revoked_at TIMESTAMP,
  revoked_by INTEGER REFERENCES users(id),
  revocation_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(staff_id, doctor_id, hospital_id, scope) WHERE status = 'ACTIVE'
);
```

#### 4. staff_assignment_permissions
```sql
CREATE TABLE staff_assignment_permissions (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER NOT NULL REFERENCES staff_assignments(id),
  permission VARCHAR(60) NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT FALSE,
  
  UNIQUE(assignment_id, permission)
);
```

#### 5. staff_assignment_audit_logs
```sql
CREATE TABLE staff_assignment_audit_logs (
  id SERIAL PRIMARY KEY,
  assignment_id INTEGER REFERENCES staff_assignments(id),
  request_id INTEGER REFERENCES staff_assignment_requests(id),
  
  action VARCHAR(50) NOT NULL,
  actor_id INTEGER NOT NULL REFERENCES users(id),
  details JSONB,
  
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Updates to Existing Tables

#### users table
```sql
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS doctor_code VARCHAR(20) UNIQUE,
  ADD COLUMN IF NOT EXISTS staff_code VARCHAR(20) UNIQUE;
```

#### hospitals table
```sql
ALTER TABLE hospitals 
  ADD COLUMN IF NOT EXISTS hospital_code VARCHAR(20) UNIQUE;
```

---

## Permission Types

```typescript
const PERMISSIONS = {
  APPOINTMENT_VIEW: 'View appointments',
  APPOINTMENT_MANAGE: 'Manage appointments',
  APPOINTMENT_CANCEL: 'Cancel appointments',
  
  SLOT_VIEW: 'View slots',
  SLOT_MANAGE: 'Create/delete slots',
  SLOT_PERIOD_UPDATE: 'Update slot period',
  
  WALKIN_CREATE: 'Register walk-ins',
  WALKIN_MANAGE: 'Manage walk-in queue',
  
  TOKEN_MANAGE: 'Manage token queue',
  TOKEN_VIEW: 'View token queue',
  
  PATIENT_BASIC_INFO_VIEW: 'View patient basic info',
  
  WORKING_HOURS_UPDATE: 'Update working hours',
  
  STATS_VIEW: 'View statistics'
};
```

---

## API Endpoints

### Staff Management
```
POST   /api/staff/register              - Register new staff account
GET    /api/staff/profile               - Get own profile
PATCH  /api/staff/profile               - Update profile
GET    /api/staff/search                - Search staff by ID/name
```

### Assignment Requests
```
POST   /api/staff/assignments/request   - Create assignment request
GET    /api/staff/assignments/pending   - List pending requests
GET    /api/staff/assignments/my-invitations - Staff pending invitations

POST   /api/staff/assignments/:id/doctor-approve   - Doctor approves
POST   /api/staff/assignments/:id/hospital-approve - Hospital approves
POST   /api/staff/assignments/:id/accept           - Staff accepts
POST   /api/staff/assignments/:id/reject           - Reject request
```

### Active Assignments
```
GET    /api/staff/assignments           - List active assignments
GET    /api/staff/assignments/history   - Assignment history
POST   /api/staff/assignments/:id/revoke - Revoke assignment
PATCH  /api/staff/assignments/:id/permissions - Update permissions
```

### Staff Dashboard Operations
```
GET    /api/staff/dashboard             - Dashboard overview
GET    /api/staff/appointments          - Appointments I manage
GET    /api/staff/slots                 - Slots I manage
POST   /api/staff/walkin                - Create walk-in
GET    /api/staff/token-queue           - Token queues I manage
```

---

## Workflow Examples

### Scenario A: Doctor Initiates Assignment

```
1. Doctor Dashboard → Staff Management → "Add Staff Member"

2. Doctor searches: "HLT-STA-72B491" or "Rahul Verma"

3. Doctor selects:
   - Staff: Rahul Verma
   - Scope: DOCTOR_HOSPITAL (City Hospital only)
   - Permissions: [APPOINTMENT_VIEW, SLOT_MANAGE, WALKIN_CREATE]

4. System creates request with status: PENDING_HOSPITAL_APPROVAL

5. City Hospital admin receives notification

6. Hospital admin approves → status: PENDING_STAFF_ACCEPTANCE

7. Rahul receives invitation notification

8. Rahul accepts → Assignment ACTIVATED

9. Rahul can now manage Dr. Amit's appointments at City Hospital
```

### Scenario B: Hospital Initiates Assignment

```
1. Hospital Admin → Staff Management → "Assign Staff to Doctors"

2. Admin searches staff: "Rahul Verma"

3. Admin selects:
   - Staff: Rahul
   - Doctors: [Dr. Amit, Dr. Neha, Dr. Priya]
   - Scope: DOCTOR_HOSPITAL for each
   - Permissions: Standard hospital staff permissions

4. System creates 3 separate requests (one per doctor)

5. Each doctor receives approval request

6. Dr. Amit approves → status: PENDING_STAFF_ACCEPTANCE
7. Dr. Neha approves → status: PENDING_STAFF_ACCEPTANCE
8. Dr. Priya approves → status: PENDING_STAFF_ACCEPTANCE

9. Rahul sees 3 invitations, accepts all

10. 3 assignments activated, Rahul manages all 3 doctors at this hospital
```

### Scenario C: Doctor Changes Hospital

```
Old Hospital: City Hospital
New Hospital: Care Hospital

1. Dr. Amit's profile updated with new hospital affiliation

2. Old assignments at City Hospital reviewed:
   - Rahul (DOCTOR_HOSPITAL scope) → Ends automatically
   - Priya (DOCTOR scope) → Remains active (follows doctor)

3. New hospital requests assignment:
   - Care Hospital → "Assign existing staff to Dr. Amit?"
   - Or Dr. Amit initiates new assignment request

4. Approval flow: Doctor + Hospital + Staff

5. New assignment activated at Care Hospital

6. Historical records preserved for audit
```

---

## Security Rules

### Access Control
```typescript
// Middleware: Verify staff has permission for operation
async function verifyStaffPermission(
  staffUserId: number,
  doctorId: number,
  hospitalId: number,
  requiredPermission: string
): Promise<boolean> {
  
  // 1. Get active assignment
  const assignment = await prisma.staff_assignments.findFirst({
    where: {
      staff: { user_id: staffUserId },
      doctor_id: doctorId,
      hospital_id: hospitalId,
      status: 'ACTIVE'
    },
    include: { permissions: true }
  });
  
  if (!assignment) return false;
  
  // 2. Check if permission is granted
  const hasPermission = assignment.permissions.some(
    p => p.permission === requiredPermission && p.granted === true
  );
  
  return hasPermission;
}
```

### Authentication Flow
```
User logs in with SLOT_ADMIN role
  ↓
Fetch active assignments
  ↓
User selects which doctor/hospital to manage
  ↓
Backend validates assignment exists and is ACTIVE
  ↓
Backend checks specific permission for each action
  ↓
Action allowed or denied
```

---

## Real-time Notifications

### Socket Events
```typescript
// Assignment lifecycle events
'staff:assignment_requested'   // New request created
'staff:assignment_approved'    // Approval received
'staff:assignment_rejected'    // Request rejected
'staff:assignment_accepted'    // Staff accepted
'staff:assignment_activated'   // Assignment now active
'staff:assignment_revoked'     // Access revoked
'staff:permissions_updated'    // Permissions changed
```

### Notification Recipients
```
Event: assignment_requested
  → Doctor (if hospital initiated)
  → Hospital admin (if doctor initiated)
  
Event: assignment_approved
  → Staff member (invitation ready)
  → Initiator (progress update)
  
Event: assignment_activated
  → All parties (doctor, hospital, staff)
  
Event: assignment_revoked
  → Staff member (access removed)
  → Audit system
```

---

## Implementation Phases

### Phase 1: Identity Foundation ✅ STARTING NOW
- [ ] Create database migrations
- [ ] Generate permanent IDs for existing doctors
- [ ] Add SLOT_ADMIN role to users table
- [ ] Create staff registration API
- [ ] ID generation utilities

### Phase 2: Assignment Request Engine
- [ ] Request creation API
- [ ] Approval workflow APIs
- [ ] Permission selection UI
- [ ] Notification system integration

### Phase 3: Assignment Activation
- [ ] Active assignment table
- [ ] Permission enforcement middleware
- [ ] Assignment lifecycle management
- [ ] Audit logging

### Phase 4: Staff Dashboard
- [ ] Staff portal UI
- [ ] My Assignments view
- [ ] Pending Invitations view
- [ ] Doctor/Hospital selection
- [ ] Appointment management interface

### Phase 5: Doctor/Hospital Staff Management
- [ ] Doctor dashboard staff management UI
- [ ] Hospital dashboard staff management UI
- [ ] Assignment creation flows
- [ ] Permission management UI

### Phase 6: Advanced Features
- [ ] Assignment transfer
- [ ] Bulk assignment operations
- [ ] Historical reports
- [ ] Access analytics

---

## Success Metrics

- Staff can work with multiple doctors/hospitals simultaneously
- Assignment changes don't delete historical records
- Permissions are enforced at API level, not just UI
- All authorization changes are audited
- System scales to 500+ hospitals without redesign

---

## Next: Start Phase 1 Implementation
Creating Prisma schema and migrations...
