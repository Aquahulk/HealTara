# 🏥 DocProc - Healthcare Appointment Booking System

A modern, secure healthcare appointment booking system built with Next.js, Node.js, and SQLite. Features role-based access control, doctor microsites, and a secure admin panel.

## ✨ Features

- **🔐 Secure Authentication**: JWT-based auth with role-based access control
- **👥 Multi-Role System**: PATIENT, DOCTOR, and ADMIN roles
- **🏥 Doctor Microsites**: Custom URLs for each doctor's practice
- **📅 Appointment Booking**: Easy scheduling system for patients
- **🔒 Secure Admin Panel**: Hidden admin interface with complex URL
- **📊 Dashboard**: Role-specific dashboards for all user types
- **📱 Responsive Design**: Mobile-first approach with Tailwind CSS

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed
- Git installed

### 1. Clone the Repository
```bash
git clone https://github.com/Aquahulk/docproc.git
cd docproc
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install API dependencies
cd apps/api
npm install

# Install Web dependencies
cd ../web
npm install
```

### 3. Set Up Database
```bash
# Go to API directory
cd apps/api

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Create admin account
node cleanupAndCreateAdmin.js
```

### 4. Start Development Servers
```bash
# From project root, start both API and Web
npm run dev
```

### 5. Access the Application
- **Web App**: http://localhost:3000
- **API**: http://localhost:3002
- **Admin Panel**: http://localhost:3000/admin-secure-panel-7x9y2z-2024/login

## 🔐 Admin Access

**Default Admin Credentials:**
- **Email**: `zinny461@gmail.com`
- **Password**: `Monusinghamit10`

## 🛠️ Development Commands

### API Commands
```bash
cd apps/api

# Start API server
npm run dev

# Database operations
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Run migrations
npx prisma generate        # Generate Prisma client
```

### Web Commands
```bash
cd apps/web

# Start web server
npm run dev

# Build for production
npm run build
npm start
```

## 📁 Project Structure

```
docproc/
├── apps/
│   ├── api/                    # Express.js API server
│   │   ├── src/
│   │   │   ├── index.ts        # Main API server
│   │   │   ├── middleware/     # Auth middleware
│   │   │   └── routes/         # API routes
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Database schema
│   │   │   └── migrations/     # Database migrations
│   │   └── dev.db             # SQLite database file
│   └── web/                    # Next.js web application
│       ├── app/               # Next.js 13+ app directory
│       ├── components/        # React components
│       ├── lib/              # Utility functions
│       └── context/          # React context providers
├── package.json              # Root package.json
└── README.md                 # This file
```

## 🗄️ Database Schema

### Users Table
- `id`: Primary key
- `email`: Unique email address
- `password`: Hashed password
- `role`: PATIENT, DOCTOR, or ADMIN
- `createdAt`, `updatedAt`: Timestamps

### DoctorProfile Table
- `id`: Primary key
- `userId`: Foreign key to Users
- `slug`: Unique URL slug for doctor microsite
- `specialization`: Medical specialization
- `qualifications`: Medical qualifications
- `experience`: Years of experience
- `clinicName`: Name of clinic
- `clinicAddress`: Clinic address
- `city`, `state`: Location details
- `phone`: Contact number
- `consultationFee`: Fee for consultation

### Appointment Table
- `id`: Primary key
- `patientId`: Foreign key to Users (patient)
- `doctorId`: Foreign key to Users (doctor)
- `date`: Appointment date
- `time`: Appointment time
- `status`: PENDING, CONFIRMED, CANCELLED
- `notes`: Additional notes
- `createdAt`, `updatedAt`: Timestamps

## 🔧 Environment Variables

Create a `.env` file in the root directory:

```env
# JWT Configuration
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"

# API Configuration
PORT=3002
NODE_ENV=development

# Web App Configuration
NEXT_PUBLIC_API_URL="http://localhost:3002"

# Admin Panel Configuration
ADMIN_PANEL_SECRET_PATH="7x9y2z-2024"
```

## 🚀 Deployment

### Production Build
```bash
# Build web application
cd apps/web
npm run build

# Start production server
npm start
```

### Database Backup
```bash
# Backup SQLite database
cp apps/api/prisma/dev.db backup-$(date +%Y%m%d).db
```

## 🐛 Troubleshooting

### Common Issues

1. **Port Conflicts**
   - API runs on port 3002, Web on port 3000
   - Check if ports are available: `netstat -an | findstr :3000`

2. **Database Issues**
   - Delete `apps/api/prisma/dev.db` and run migrations again
   - Run `npx prisma generate` to regenerate client

3. **Admin Access Issues**
   - Run `node cleanupAndCreateAdmin.js` to recreate admin account
   - Check admin credentials in the script

4. **Authentication Errors**
   - Clear browser localStorage
   - Check JWT_SECRET in environment variables

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

### Appointments
- `POST /api/appointments` - Book appointment
- `GET /api/appointments` - Get user appointments

### Admin
- `GET /api/admin/users` - Get all users
- `GET /api/admin/doctors` - Get all doctors
- `GET /api/admin/appointments` - Get all appointments

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section above
- Review the API documentation

---

**Made with ❤️ for better healthcare access**