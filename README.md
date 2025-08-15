# 🏥 DocProc - Healthcare Appointment Booking System

A modern, secure healthcare appointment booking system built with Next.js, Node.js, and PostgreSQL. Features role-based access control, doctor microsites, and a secure admin panel.

## ✨ Features

- **🔐 Secure Authentication**: JWT-based auth with role-based access control
- **👥 Multi-Role System**: PATIENT, DOCTOR, and ADMIN roles
- **🏥 Doctor Microsites**: Custom URLs for each doctor's practice
- **📅 Appointment Booking**: Easy scheduling system for patients
- **🔒 Secure Admin Panel**: Hidden admin interface with complex URL
- **📊 Dashboard**: Role-specific dashboards for all user types
- **📱 Responsive Design**: Mobile-first approach with Tailwind CSS

## 🚀 Quick Start with Docker

### Prerequisites
- Docker and Docker Compose installed
- Git installed

### 1. Clone the Repository
```bash
git clone https://github.com/Aquahulk/docproc.git
cd docproc
```

### 2. Set Up Environment Variables
```bash
# Copy environment file
cp env.example .env

# Edit the file with your configuration
nano .env
```

### 3. Start All Services
```bash
# Start all services (database, API, web app)
docker-compose up -d

# View logs
docker-compose logs -f
```

### 4. Access the Application
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **Database**: localhost:5432

## 🛠️ Development Setup

### Option 1: Docker Development (Recommended)
```bash
# Start services in development mode
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f api
docker-compose logs -f web

# Stop services
docker-compose down
```

### Option 2: Local Development
```bash
# Install dependencies
npm install

# Set up database
cd apps/api
npx prisma migrate dev
npx prisma generate

# Create admin user
node cleanupAndCreateAdmin.js

# Start API server
npm run dev

# In another terminal, start web app
cd ../web
npm run dev
```

## 🗄️ Database Setup

### Using Docker (Recommended)
```bash
# Database is automatically set up with Docker Compose
docker-compose up postgres -d

# Access database
docker exec -it docproc-postgres psql -U docproc_user -d docproc
```

### Manual Setup
```bash
# Install PostgreSQL locally
# Create database and user
createdb docproc
createuser docproc_user

# Run migrations
cd apps/api
npx prisma migrate dev
npx prisma generate
```

## 🔐 Admin Access

### First Admin User
The system comes with a pre-configured admin account:
- **Email**: `zinny461@gmail.com`
- **Password**: `Monusinghamit@10`

### Admin Panel Access
- **URL**: `/admin-secure-panel-7x9y2z-2024`
- **Login**: `/admin-secure-panel-7x9y2z-2024/login`

⚠️ **Security Note**: Keep the admin URL confidential. It's designed to be unguessable.

## 📁 Project Structure

```
docproc/
├── apps/
│   ├── api/                          # Backend API Server
│   │   ├── src/
│   │   │   ├── index.ts             # Main API server
│   │   │   └── middleware/
│   │   │       └── authMiddleware.ts # JWT authentication
│   │   ├── prisma/
│   │   │   ├── schema.prisma        # Database schema
│   │   │   └── migrations/          # Database migrations
│   │   └── Dockerfile               # API container
│   │
│   └── web/                          # Frontend Next.js App
│       ├── app/                      # Next.js App Router
│       │   ├── page.tsx             # Homepage
│       │   ├── auth/                # Authentication
│       │   ├── dashboard/           # User dashboard
│       │   ├── admin-secure-panel-7x9y2z-2024/ # Secure admin
│       │   └── site/[slug]/         # Doctor microsites
│       ├── components/               # Reusable components
│       ├── context/                  # React Context
│       ├── lib/                      # Utility libraries
│       └── Dockerfile                # Web container
│
├── docker-compose.yml                # Docker services
├── env.example                       # Environment variables
└── README.md                         # This file
```

## 🔧 Available Scripts

### Root Level
```bash
# Install all dependencies
npm install

# Run tests (if configured)
npm test

# Lint code
npm run lint
```

### API Service
```bash
cd apps/api

# Install dependencies
npm install

# Run development server
npm run dev

# Run production server
npm start

# Database operations
npx prisma migrate dev    # Run migrations
npx prisma generate      # Generate client
npx prisma studio        # Open database GUI
```

### Web Service
```bash
cd apps/web

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## 🐳 Docker Commands

### Basic Operations
```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d postgres
docker-compose up -d api
docker-compose up -d web

# View logs
docker-compose logs -f
docker-compose logs -f api
docker-compose logs -f web

# Stop services
docker-compose down

# Stop and remove volumes
docker-compose down -v
```

### Development
```bash
# Rebuild containers after code changes
docker-compose build

# Restart specific service
docker-compose restart api
docker-compose restart web

# Execute commands in running container
docker-compose exec api npx prisma migrate dev
docker-compose exec web npm run build
```

### Database Operations
```bash
# Access PostgreSQL
docker-compose exec postgres psql -U docproc_user -d docproc

# Backup database
docker-compose exec postgres pg_dump -U docproc_user docproc > backup.sql

# Restore database
docker-compose exec -T postgres psql -U docproc_user -d docproc < backup.sql
```

## 🌐 Environment Variables

### Required Variables
```env
# Database
DATABASE_URL="postgresql://user:password@host:port/database"

# JWT
JWT_SECRET="your-secret-key"

# API
PORT=3001
NODE_ENV=development

# Web App
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

### Optional Variables
```env
# Redis
REDIS_URL="redis://localhost:6379"

# Admin Panel
ADMIN_PANEL_SECRET_PATH="7x9y2z-2024"
```

## 🚨 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Role-Based Access Control**: PATIENT, DOCTOR, ADMIN roles
- **Secure Admin Panel**: Hidden URL with complex path
- **Input Validation**: Server-side validation for all inputs
- **Audit Logging**: Complete admin action tracking
- **CORS Protection**: Configured cross-origin restrictions

## 🧪 Testing

### API Testing
```bash
# Access the test API page
http://localhost:3000/test-api

# Use the provided test endpoints
```

### Database Testing
```bash
# Open Prisma Studio
cd apps/api
npx prisma studio
```

## 📊 Monitoring

### Health Checks
```bash
# API Health
curl http://localhost:3001/health

# Database Health
docker-compose exec postgres pg_isready -U docproc_user
```

### Logs
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f web
docker-compose logs -f postgres
```

## 🚀 Deployment

### Production Environment
```bash
# Build production images
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d
```

### Environment-Specific Configs
```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d

# Staging
docker-compose -f docker-compose.staging.yml up -d
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -m 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

#### Database Connection Issues
```bash
# Check if PostgreSQL is running
docker-compose ps postgres

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres
```

#### API Connection Issues
```bash
# Check if API is running
docker-compose ps api

# Restart API
docker-compose restart api

# Check logs
docker-compose logs api
```

#### Web App Issues
```bash
# Check if web app is running
docker-compose ps web

# Restart web app
docker-compose restart web

# Check logs
docker-compose logs web
```

### Getting Help
- Check the [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for detailed architecture
- Review the [admin panel README](apps/web/app/admin-secure-panel-7x9y2z-2024/README.md)
- Open an issue on GitHub
- Contact the development team

## 🔄 Updates

### Updating Dependencies
```bash
# Update all dependencies
npm update

# Update specific packages
npm update @prisma/client next react

# Rebuild Docker containers
docker-compose build --no-cache
```

### Database Migrations
```bash
# Create new migration
cd apps/api
npx prisma migrate dev --name migration_name

# Apply migrations in production
npx prisma migrate deploy
```

---

**Made with ❤️ by the DocProc Development Team**

**Last Updated**: August 14, 2025  
**Version**: 2.0.0
