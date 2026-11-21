# 📚 Healtara Slot Administrator API Reference

Complete API documentation for the staff management and assignment system.

---

## 🎯 Overview

The Slot Administrator system provides multi-tenant staff management where:
- **Identity is permanent** - Staff get `HLT-STA-XXXXXX` IDs that never change
- **Access is assignment-based** - Staff can work for multiple doctors/hospitals
- **Single source of truth** - All changes are shared, no per-user copies
- **Multi-party approval** - Doctor + Hospital + Staff all must approve assignments

---

## 🔑 Authentication

All protected endpoints require a JWT token in the `Authorization` header:

```
Authorization: Bearer <your_jwt_token>
```

**Roles:**
- `SLOT_ADMIN` - Staff members (slot administrators)
- `DOCTOR` - Doctors who can hire staff
- `HOSPITAL_ADMIN` - Hospital administrators who can hire staff
- `ADMIN` - System administrators

---

## 📝 Staff Management Endpoints

### 1. Register Staff Account

**POST** `/api/staff/register`

Create a new staff account with automatic ID generation.

**Request Body:**
```json
{
  "email": "staff@example.com",
  "password": "securepassword123",
  "name": "John Doe",
  "phone": "+1234567890" // optional
}
```

**Response (201):**
```json
{
  "message": "Staff account created successfully",
  "user": {
    "id": 123,
    "email": "staff@example.com",
    "role": "SLOT_ADMIN",
    "staffCode": "HLT-STA-8F29A1"
  },
  "profile": {
    "id": 456,
    "name": "John Doe",
    "phone": "+1234567890",
    "staffCode": "HLT-STA-8F29A1"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### 2. Get Staff Profile

**GET** `/api/staff/profile`

**Authentication Required:** Yes (SLOT_ADMIN role)

Get the authenticated staff member's profile.

**Response (200):**
```json
{
  "profile": {
    "id": 456,
    "userId": 123,
    "staffCode": "HLT-STA-8F29A1",
    "name": "John Doe",
    "phone": "+1234567890",
    "status": "ACTIVE",
    "createdAt": "2024-11-18T10:00:00Z",
    "updatedAt": "2024-11-18T10:00:00Z",
    "user": {
      "id": 123,
      "email": "staff@example.com",
      "role": "SLOT_ADMIN",
      "staffCode": "HLT-STA-8F29A1",
      "status": "ACTIVE",
      "createdAt": "2024-11-18T10:00:00Z"
    }
  }
}
```

---

### 3. Update Staff Profile

**PATCH** `/api/staff/profile`

**Authentication Required:** Yes (SLOT_ADMIN role)

Update staff member's profile information.

**Request Body:**
```json
{
  "name": "John Updated Doe",
  "phone": "+1987654321"
}
```

**Response (200):**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": 456,
    "name": "John Updated Doe",
    "phone": "+1987654321",
    "staffCode": "HLT-STA-8F29A1",
    "updatedAt": "2024-11-18T11:00:00Z"
  }
}
```

---

### 4. Search Staff

**GET** `/api/staff/search?query=HLT-STA-8F29A1`

**Authentication Required:** Yes

Search for staff members by code or name.

**Query Parameters:**
- `query` (required) - Search term (staff code or name)

**Response (200):**
```json
{
  "results": [
    {
      "id": 456,
      "staffCode": "HLT-STA-8F29A1",
      "name": "John Doe",
      "phone": "+1234567890",
      "status": "ACTIVE",
      "user": {
        "id": 123,
        "email": "staff@example.com",
        "staffCode": "HLT-STA-8F29A1",
        "status": "ACTIVE"
      }
    }
  ],
  "count": 1
}
```

---

### 5. Get Staff by Code

**GET** `/api/staff/code/:staffCode`

**Authentication Required:** Yes

Get specific staff member by their permanent staff code.

**URL Parameters:**
- `staffCode` - The staff member's unique code (e.g., `HLT-STA-8F29A1`)

**Response (200):**
```json
{
  "staff": {
    "id": 456,
    "staffCode": "HLT-STA-8F29A1",
    "name": "John Doe",
    "phone": "+1234567890",
    "status": "ACTIVE",
    "user": {
      "id": 123,
      "email": "staff@example.com",
      "staffCode": "HLT-STA-8F29A1",
      "status": "ACTIVE",
      "createdAt": "2024-11-18T10:00:00Z"
    }
  }
}
```

---

### 6. Staff Dashboard

**GET** `/api/staff/dashboard`

**Authentication Required:** Yes (SLOT_ADMIN role)

Get comprehensive dashboard overview for staff member.

**Response (200):**
```json
{
  "profile": {
    "id": 456,
    "staffCode": "HLT-STA-8F29A1",
    "name": "John Doe",
    "status": "ACTIVE"
  },
  "activeAssignments": {
    "count": 2,
    "assignments": [
      {
        "id": 789,
        "scope": "DOCTOR_HOSPITAL",
        "status": "ACTIVE",
        "activatedAt": "2024-11-10T09:00:00Z",
        "doctor": {
          "id": 10,
          "email": "doctor@example.com",
          "doctorCode": "HLT-DOC-ABC123",
          "doctorProfile": {
            "specialization": "Cardiologist",
            "clinicName": "Heart Clinic",
            "city": "New York"
          }
        },
        "hospital": {
          "id": 5,
          "name": "City Hospital",
          "hospitalCode": "HLT-HOS-XYZ789",
          "city": "New York"
        },
        "permissions": [
          { "permission": "APPOINTMENT_VIEW", "granted": true },
          { "permission": "APPOINTMENT_MANAGE", "granted": true },
          { "permission": "SLOT_MANAGE", "granted": true }
        ]
      }
    ]
  },
  "pendingInvitations": {
    "count": 1,
    "invitations": [
      {
        "id": 123,
        "scope": "DOCTOR",
        "status": "PENDING_STAFF_ACCEPTANCE",
        "expiresAt": "2024-11-25T10:00:00Z",
        "doctor": {
          "id": 15,
          "email": "newdoctor@example.com",
          "doctorCode": "HLT-DOC-DEF456",
          "doctorProfile": {
            "specialization": "Dentist",
            "clinicName": "Smile Dental"
          }
        },
        "initiator": {
          "id": 15,
          "email": "newdoctor@example.com",
          "role": "DOCTOR"
        }
      }
    ]
  }
}
```

---

## ✅ Assignment Request & Approval Endpoints

### 7. Create Assignment Request

**POST** `/api/staff/assignments/request`

**Authentication Required:** Yes (DOCTOR or HOSPITAL_ADMIN role)

Doctor or hospital initiates an assignment request to invite staff.

**Request Body:**
```json
{
  "staffCode": "HLT-STA-8F29A1",
  "doctorId": 10,
  "hospitalId": 5,
  "scope": "DOCTOR_HOSPITAL",
  "permissions": [
    { "permission": "APPOINTMENT_VIEW", "granted": true },
    { "permission": "APPOINTMENT_MANAGE", "granted": true },
    { "permission": "SLOT_MANAGE", "granted": true },
    { "permission": "WALKIN_CREATE", "granted": true },
    { "permission": "TOKEN_MANAGE", "granted": true }
  ]
}
```

**Scope Options:**
- `DOCTOR` - Staff manages doctor across all contexts (requires `doctorId`)
- `HOSPITAL` - Hospital-level staff, not tied to specific doctor (requires `hospitalId`)
- `DOCTOR_HOSPITAL` - Staff manages specific doctor at specific hospital only (requires both `doctorId` and `hospitalId`)

**Response (201):**
```json
{
  "message": "Assignment request created successfully",
  "request": {
    "id": 123,
    "staffId": 456,
    "doctorId": 10,
    "hospitalId": 5,
    "scope": "DOCTOR_HOSPITAL",
    "status": "PENDING_HOSPITAL_APPROVAL",
    "initiatedBy": 10,
    "doctorApprovedAt": "2024-11-18T10:00:00Z",
    "doctorApprovedBy": 10,
    "expiresAt": "2024-11-25T10:00:00Z",
    "staff": { ... },
    "doctor": { ... },
    "hospital": { ... }
  }
}
```

---

### 8. Doctor Approves Assignment

**POST** `/api/staff/assignments/:requestId/doctor-approve`

**Authentication Required:** Yes (DOCTOR role)

Doctor approves an assignment request.

**URL Parameters:**
- `requestId` - The assignment request ID

**Response (200):**
```json
{
  "message": "Assignment request approved by doctor",
  "request": {
    "id": 123,
    "status": "PENDING_HOSPITAL_APPROVAL",
    "doctorApprovedAt": "2024-11-18T10:30:00Z",
    "doctorApprovedBy": 10
  }
}
```

---

### 9. Hospital Approves Assignment

**POST** `/api/staff/assignments/:requestId/hospital-approve`

**Authentication Required:** Yes (HOSPITAL_ADMIN role)

Hospital administrator approves an assignment request.

**URL Parameters:**
- `requestId` - The assignment request ID

**Response (200):**
```json
{
  "message": "Assignment request approved by hospital",
  "request": {
    "id": 123,
    "status": "PENDING_STAFF_ACCEPTANCE",
    "hospitalApprovedAt": "2024-11-18T11:00:00Z",
    "hospitalApprovedBy": 20
  }
}
```

---

### 10. Staff Accepts Assignment

**POST** `/api/staff/assignments/:requestId/accept`

**Authentication Required:** Yes (SLOT_ADMIN role)

Staff member accepts the assignment request, activating the assignment.

**URL Parameters:**
- `requestId` - The assignment request ID

**Request Body (Optional):**
```json
{
  "permissions": [
    { "permission": "APPOINTMENT_VIEW", "granted": true },
    { "permission": "SLOT_MANAGE", "granted": true }
  ]
}
```

**Response (201):**
```json
{
  "message": "Assignment accepted and activated",
  "assignment": {
    "id": 789,
    "requestId": 123,
    "staffId": 456,
    "doctorId": 10,
    "hospitalId": 5,
    "scope": "DOCTOR_HOSPITAL",
    "status": "ACTIVE",
    "activatedAt": "2024-11-18T12:00:00Z",
    "staff": { ... },
    "doctor": { ... },
    "hospital": { ... },
    "permissions": [
      { "id": 1, "permission": "APPOINTMENT_VIEW", "granted": true },
      { "id": 2, "permission": "APPOINTMENT_MANAGE", "granted": true },
      { "id": 3, "permission": "SLOT_MANAGE", "granted": true },
      { "id": 4, "permission": "WALKIN_CREATE", "granted": true },
      { "id": 5, "permission": "TOKEN_VIEW", "granted": true },
      { "id": 6, "permission": "TOKEN_MANAGE", "granted": true },
      { "id": 7, "permission": "PATIENT_BASIC_INFO_VIEW", "granted": true }
    ]
  }
}
```

---

### 11. Reject Assignment Request

**POST** `/api/staff/assignments/:requestId/reject`

**Authentication Required:** Yes (DOCTOR, HOSPITAL_ADMIN, or SLOT_ADMIN role)

Any party can reject an assignment request.

**URL Parameters:**
- `requestId` - The assignment request ID

**Request Body:**
```json
{
  "reason": "Not available at this time"
}
```

**Response (200):**
```json
{
  "message": "Assignment request rejected",
  "request": {
    "id": 123,
    "status": "REJECTED",
    "rejectionReason": "Not available at this time",
    "rejectionBy": 456,
    "rejectedAt": "2024-11-18T12:30:00Z"
  }
}
```

---

### 12. Revoke Active Assignment

**POST** `/api/staff/assignments/:assignmentId/revoke`

**Authentication Required:** Yes (DOCTOR, HOSPITAL_ADMIN, SLOT_ADMIN, or ADMIN role)

Revoke an active assignment.

**URL Parameters:**
- `assignmentId` - The active assignment ID

**Request Body:**
```json
{
  "reason": "Staff member moving to different city"
}
```

**Response (200):**
```json
{
  "message": "Assignment revoked successfully",
  "assignment": {
    "id": 789,
    "status": "REVOKED",
    "revokedAt": "2024-11-18T13:00:00Z",
    "revokedBy": 10,
    "revocationReason": "Staff member moving to different city"
  }
}
```

---

### 13. List Assignments

**GET** `/api/staff/assignments/`

**Authentication Required:** Yes

List all active assignments (filtered by role).

**Response varies by role:**

**For SLOT_ADMIN:**
```json
{
  "count": 2,
  "assignments": [
    {
      "id": 789,
      "scope": "DOCTOR_HOSPITAL",
      "status": "ACTIVE",
      "doctor": { ... },
      "hospital": { ... },
      "permissions": [ ... ]
    }
  ]
}
```

**For DOCTOR:**
```json
{
  "count": 1,
  "assignments": [
    {
      "id": 789,
      "scope": "DOCTOR_HOSPITAL",
      "status": "ACTIVE",
      "staff": {
        "id": 456,
        "name": "John Doe",
        "staffCode": "HLT-STA-8F29A1",
        "user": { ... }
      },
      "hospital": { ... },
      "permissions": [ ... ]
    }
  ]
}
```

**For HOSPITAL_ADMIN:**
```json
{
  "count": 3,
  "assignments": [
    {
      "id": 789,
      "scope": "DOCTOR_HOSPITAL",
      "status": "ACTIVE",
      "staff": { ... },
      "doctor": { ... },
      "permissions": [ ... ]
    }
  ]
}
```

---

## 🔐 Available Permissions

Staff assignments can have the following granular permissions:

### Appointment Permissions
- `APPOINTMENT_VIEW` - View appointments
- `APPOINTMENT_MANAGE` - Create, update appointments
- `APPOINTMENT_CANCEL` - Cancel appointments

### Slot Permissions
- `SLOT_VIEW` - View slot configuration
- `SLOT_MANAGE` - Manage slot availability
- `SLOT_PERIOD_UPDATE` - Update slot period (e.g., 8 patients per hour)

### Walk-in Permissions
- `WALKIN_CREATE` - Create walk-in appointments
- `WALKIN_MANAGE` - Manage walk-in queue

### Token Queue Permissions
- `TOKEN_VIEW` - View token queue
- `TOKEN_MANAGE` - Manage token queue (call next, skip, etc.)

### Patient Info Permissions
- `PATIENT_BASIC_INFO_VIEW` - View patient basic information

### Working Hours Permissions
- `WORKING_HOURS_VIEW` - View working hours
- `WORKING_HOURS_UPDATE` - Update working hours

### Statistics Permissions
- `STATS_VIEW` - View analytics and statistics

---

## 🔄 Assignment Status Flow

```
PENDING
  ↓
PENDING_DOCTOR_APPROVAL (if doctor didn't initiate)
  ↓
PENDING_HOSPITAL_APPROVAL (if hospital didn't initiate)
  ↓
PENDING_STAFF_ACCEPTANCE
  ↓
APPROVED → ACTIVE (when staff accepts)

OR

REJECTED (any party can reject at any stage)
```

**Active assignments can be:**
- `ACTIVE` - Currently working
- `REVOKED` - Terminated by any party

---

## 🎯 Assignment Scopes Explained

### 1. DOCTOR Scope
Staff manages this doctor across ALL contexts (all hospitals, clinic, etc.)

**Use case:** Personal assistant who travels with the doctor

**Example:**
```json
{
  "scope": "DOCTOR",
  "doctorId": 10,
  "hospitalId": null
}
```

### 2. HOSPITAL Scope
Staff works at hospital level, not tied to specific doctor

**Use case:** Hospital receptionist who manages all doctors in the hospital

**Example:**
```json
{
  "scope": "HOSPITAL",
  "doctorId": null,
  "hospitalId": 5
}
```

### 3. DOCTOR_HOSPITAL Scope
Staff manages specific doctor ONLY at specific hospital

**Use case:** Doctor has different staff at different hospital locations

**Example:**
```json
{
  "scope": "DOCTOR_HOSPITAL",
  "doctorId": 10,
  "hospitalId": 5
}
```

---

## 🛡️ Data Integrity Guarantees

### Single Source of Truth
- ✅ All users see the SAME data
- ✅ No per-user copies or settings
- ✅ Changes made by staff OR doctor update the same records
- ✅ Slot period changes (e.g., 8 patients per hour) persist for everyone

### Permanent Identity
- ✅ Staff IDs (`HLT-STA-XXXXXX`) never change
- ✅ Generated automatically on registration
- ✅ Unique and globally searchable
- ✅ Preserved even if assignments are revoked

### Audit Trail
- ✅ Every action is logged
- ✅ Who did what, when, and why
- ✅ Full history of assignment lifecycle
- ✅ Compliance-ready audit logs

---

## 🔍 Example Workflows

### Workflow 1: Doctor Invites Staff

```bash
# 1. Doctor creates request
POST /api/staff/assignments/request
{
  "staffCode": "HLT-STA-8F29A1",
  "doctorId": 10,
  "scope": "DOCTOR"
}

# Status: PENDING_STAFF_ACCEPTANCE

# 2. Staff accepts
POST /api/staff/assignments/123/accept

# Status: APPROVED → ACTIVE
```

---

### Workflow 2: Hospital Invites Staff for Doctor

```bash
# 1. Hospital admin creates request
POST /api/staff/assignments/request
{
  "staffCode": "HLT-STA-8F29A1",
  "doctorId": 10,
  "hospitalId": 5,
  "scope": "DOCTOR_HOSPITAL"
}

# Status: PENDING_DOCTOR_APPROVAL

# 2. Doctor approves
POST /api/staff/assignments/123/doctor-approve

# Status: PENDING_STAFF_ACCEPTANCE

# 3. Staff accepts
POST /api/staff/assignments/123/accept

# Status: APPROVED → ACTIVE
```

---

### Workflow 3: Staff Member Searches and Applies

This workflow is not yet implemented but can be added in Phase 4:
- Staff searches for available positions
- Staff requests to work for doctor/hospital
- Doctor/hospital reviews and approves

---

## 📊 Database Schema Reference

### Key Tables

**staff_profiles**
- Permanent staff identity and profile information
- Linked to `users` table (role: SLOT_ADMIN)

**staff_assignment_requests**
- Pending assignment invitations
- Multi-party approval workflow
- 7-day expiration

**staff_assignments**
- Active staff assignments
- Scope and permission configuration
- Can be revoked by any party

**staff_assignment_permissions**
- Granular permissions per assignment
- Boolean granted/denied flags

**staff_assignment_audit_logs**
- Complete action history
- Compliance and debugging

---

## 🎓 Best Practices

### For Doctors/Hospitals
1. **Always specify appropriate scope** - Choose DOCTOR, HOSPITAL, or DOCTOR_HOSPITAL based on your needs
2. **Set minimum required permissions** - Don't grant all permissions by default
3. **Review staff assignments regularly** - Revoke access when no longer needed
4. **Check audit logs** - Monitor what staff members are doing

### For Staff Members
1. **Accept assignments promptly** - Requests expire after 7 days
2. **Update your profile** - Keep contact information current
3. **Request appropriate permissions** - Ask for permissions you need to do your job
4. **Understand your scope** - Know which doctor/hospital contexts you can access

### For Developers
1. **Always check permissions** - Use `requireStaffPermission()` middleware
2. **Log important actions** - Use audit logs for compliance
3. **Handle multi-party approval** - Don't assume linear approval flow
4. **Test assignment scopes** - Verify DOCTOR vs HOSPITAL vs DOCTOR_HOSPITAL behavior

---

## 🚀 Next Steps

Now that Phase 2 is complete, you can:

1. **Test the APIs** using Postman/Insomnia
2. **Build UI components** for staff dashboard
3. **Implement notifications** when assignments are approved/rejected
4. **Add analytics** to track staff performance
5. **Build admin panel** for managing all staff across the platform

---

**Documentation Version:** 1.0  
**Last Updated:** November 18, 2026  
**Phase:** 2 Complete ✅
