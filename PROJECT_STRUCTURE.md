# 🏗️ DocProc Project Structure

## 📁 **Project Overview**
DocProc is a healthcare appointment booking system with role-based access control (PATIENT, DOCTOR, ADMIN) and doctor microsites.

## 🗂️ **Directory Structure**

```
docproc/
├── apps/
│   ├── api/                          # Backend API Server
│   │   ├── src/
│   │   │   ├── index.ts             # Main API server with all endpoints
│   │   │   └── middleware/
│   │   │       └── authMiddleware.ts # JWT authentication middleware
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema definition
│   │   │   └── migrations/          # Database migration files
│   │   ├── package.json
│   │   └── cleanupAndCreateAdmin.js # One-time admin creation script
│   │
│   └── web/                          # Frontend Next.js Application
│       ├── app/                      # Next.js 13+ App Router
│       │   ├── page.tsx             # Homepage (doctor listings)
│       │   ├── layout.tsx           # Root layout with AuthProvider
│       │   ├── globals.css          # Global styles
│       │   │
│       │   ├── auth/                # Authentication pages
│       │   │   └── page.tsx         # Login/Register form
│       │   │
│       │   ├── dashboard/           # User dashboard
│       │   │   ├── page.tsx         # Main dashboard (appointments)
│       │   │   └── profile/         # Doctor profile management
│       │   │       └── page.tsx     # Profile creation/editing
│       │   │
│       │   ├── admin-secure-panel-7x9y2z-2024/ # Secure admin interface
│       │   │   ├── page.tsx         # Secure admin dashboard
│       │   │   └── login/           # Secure admin login
│       │   │       └── page.tsx     # Secure admin authentication
│       │   │
│       │   ├── site/                # Doctor microsites
│       │   │   └── [slug]/          # Dynamic doctor pages
│       │   │       └── page.tsx     # Individual doctor site
│       │   │
│       │   ├── doctors/             # Doctor-related pages
│       │   └── test-api/            # API testing page (dev only)
│       │
│       ├── components/               # Reusable UI components
│       │   ├── Header.tsx           # Navigation header
│       │   ├── DoctorCard.tsx       # Doctor listing card
│       │   ├── BookAppointmentModal.tsx # Appointment booking modal
│       │   └── ...                  # Other components
│       │
│       ├── context/                  # React Context providers
│       │   └── AuthContext.tsx      # Authentication state management
│       │
│       ├── lib/                      # Utility libraries
│       │   └── api.ts               # API client for backend communication
│       │
│       ├── package.json
│       └── tsconfig.json
│
├── package.json                      # Root package.json
└── PROJECT_STRUCTURE.md             # This file
```

## 🔐 **Authentication & Authorization**

### **User Roles**
- **PATIENT**: Can book appointments, view doctor listings
- **DOCTOR**: Can manage profile, view patient appointments
- **ADMIN**: Can manage users, appointments, system settings

### **Security Features**
- JWT-based authentication
- Role-based access control (RBAC)
- Secure admin panel access
- Audit logging for admin actions

## 🚀 **Key Features**

### **1. Patient Features**
- Browse available doctors
- Book appointments
- View appointment history
- Access doctor microsites

### **2. Doctor Features**
- Create/update professional profile
- Manage appointment schedule
- View patient appointments
- Custom microsite with unique URL

### **3. Admin Features**
- User management (activate/deactivate, role changes)
- Appointment monitoring
- System statistics dashboard
- Audit log tracking

## 🗄️ **Database Schema**

### **Core Models**
- **User**: Authentication, roles, status
- **DoctorProfile**: Professional information, clinic details
- **Appointment**: Booking details, status tracking
- **AdminAuditLog**: Administrative action history

## 🔧 **Development Setup**

### **Prerequisites**
- Node.js 18+
- PostgreSQL database
- npm or yarn

### **Installation**
```bash
# Clone repository
git clone <repository-url>
cd docproc

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database and JWT settings

# Database setup
cd apps/api
npx prisma migrate dev
npx prisma generate

# Create first admin user
node cleanupAndCreateAdmin.js

# Start development servers
npm run dev  # In api directory
npm run dev  # In web directory
```

### **Environment Variables**
```env
# API Server (.env in apps/api/)
DATABASE_URL="postgresql://..."
JWT_SECRET="your-secret-key"

# Web App (.env in apps/web/)
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

## 📱 **API Endpoints**

### **Public Endpoints**
- `GET /api/doctors` - List all doctors
- `GET /api/doctors/slug/:slug` - Get doctor by slug
- `POST /api/register` - User registration
- `POST /api/login` - User authentication

### **Protected Endpoints**
- `POST /api/doctor/profile` - Create doctor profile
- `GET /api/my-appointments` - User appointments
- `POST /api/appointments` - Book appointment

### **Admin Endpoints**
- `GET /api/admin/dashboard` - System statistics
- `GET /api/admin/users` - User management
- `PATCH /api/admin/users/:id/role` - Change user role
- `GET /api/admin/audit-logs` - Action history

## 🎨 **UI/UX Design**

### **Design System**
- **Colors**: Blue theme for admin, clean grays for main app
- **Components**: Tailwind CSS with custom components
- **Responsive**: Mobile-first design approach
- **Accessibility**: ARIA labels, keyboard navigation

### **Page Layouts**
- **Homepage**: Doctor grid with search/filter
- **Dashboard**: Role-specific content and actions
- **Admin Panel**: Tabbed interface for different functions
- **Doctor Sites**: Professional microsites with booking

## 🧪 **Testing & Development**

### **Development Tools**
- **API Testing**: `/test-api` page for endpoint testing
- **Database**: Prisma Studio for data management
- **Logging**: Console logs for debugging
- **Hot Reload**: Next.js and Express development servers

### **Code Quality**
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Consistent naming conventions

## 📋 **Team Development Guidelines**

### **File Naming**
- Use kebab-case for directories: `admin-panel/`
- Use PascalCase for components: `DoctorCard.tsx`
- Use camelCase for functions: `updateUserRole()`

### **Code Organization**
- Keep components focused and single-purpose
- Use TypeScript interfaces for data structures
- Implement proper error handling
- Add meaningful comments for complex logic

### **Git Workflow**
- Feature branches for new development
- Descriptive commit messages
- Pull request reviews before merging
- Keep commits atomic and focused

## 🚨 **Important Notes**

### **Security**
- Admin panel requires ADMIN role
- JWT tokens expire after 24 hours
- All admin actions are logged
- No public admin registration

### **Performance**
- Lazy loading for admin data
- Optimized database queries
- Client-side state management
- Efficient component rendering

### **Maintenance**
- Regular database backups
- Monitor audit logs
- Update dependencies regularly
- Test admin functionality after changes

## 📞 **Support & Contact**

For questions about the project structure or development:
- Check this documentation first
- Review existing code patterns
- Consult the team lead for architectural decisions
- Use the test-api page for debugging

---

**Last Updated**: August 14, 2025
**Version**: 2.0.0
**Maintainer**: Development Team
