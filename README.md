# Re.Power V3 - Backend Architecture Prompt
> **Repo**: Re.Power-backend  
> **Hosting**: Railway  
> **Stack**: Node.js + Express + Prisma + PostgreSQL
---
## 🎯 Project Context
You are the backend architect and senior full-stack developer for Re.Power V3.
**Key constraints:**
- Entry file: `index.js` at project root
- Railway injects `PORT` via env variable; server must listen on `process.env.PORT`
- PostgreSQL connection via `DATABASE_URL` env var
- Use ES modules (`"type": "module"` in package.json)
- Target Node 18+
- All endpoints JSON-based
- Express-only (no Next.js, no frontend)
---
## 📋 Goal: Layer 1 Implementation
Refactor and extend this repo into a production-ready backend focusing on:
1. **Technician ↔ Company interaction**
2. **Recruitment marketplace** (job posts, applications)
3. **Digital passport** for technicians (skills, certs, evaluations)
4. **Basic chat** between technician and company (REST + polling, no real-time)
---
## 🗂️ 1. Project Structure

.
├── index.js
├── .env.example
├── prisma/
│ └── schema.prisma
├── src/
│ ├── app.js
│ ├── config/
│ │ ├── env.js
│ │ └── prisma.js
│ ├── middleware/
│ │ ├── errorHandler.js
│ │ ├── notFound.js
│ │ └── auth.js
│ ├── modules/
│ │ ├── auth/
│ │ │ ├── auth.routes.js
│ │ │ ├── auth.controller.js
│ │ │ └── auth.service.js
│ │ ├── users/
│ │ │ ├── user.routes.js
│ │ │ ├── user.controller.js
│ │ │ └── user.service.js
│ │ ├── technicians/
│ │ │ ├── technician.routes.js
│ │ │ ├── technician.controller.js
│ │ │ └── technician.service.js
│ │ ├── companies/
│ │ │ ├── company.routes.js
│ │ │ ├── company.controller.js
│ │ │ └── company.service.js
│ │ ├── jobs/
│ │ │ ├── job.routes.js
│ │ │ ├── job.controller.js
│ │ │ └── job.service.js
│ │ ├── applications/
│ │ │ ├── application.routes.js
│ │ │ ├── application.controller.js
│ │ │ └── application.service.js
│ │ └── chat/
│ │ ├── chat.routes.js
│ │ ├── chat.controller.js
│ │ └── chat.service.js
│ └── utils/
│ ├── apiResponse.js
│ ├── validation.js
│ ├── password.js
│ └── roles.js
└── package.json

---
## ⚙️ 2. Environment & Config
### `.env.example`
```env
DATABASE_URL=postgres://user:pass@host:port/dbname
JWT_SECRET=change_me
JWT_EXPIRES_IN=7d
NODE_ENV=development

src/config/env.js
Read and export env vars with sane defaults
Throw clear errors if critical vars are missing (DATABASE_URL, JWT_SECRET)
src/config/prisma.js
Instantiate and export PrismaClient
Handle graceful shutdown (SIGINT/SIGTERM)
🗃️ 3. Prisma Schema
Create prisma/schema.prisma with core entities:

User (generic account)
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         Role
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
enum Role {
  TECHNICIAN
  COMPANY_ADMIN
  COMPANY_MANAGER
  COMPANY_RECRUITER
  COMPANY_VIEWER
  SUPER_ADMIN
}

TechnicianProfile
model TechnicianProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(fields: [userId], references: [id])
  fullName          String
  country           String
  primaryDiscipline String   // Blade, Rope Access, Electrical, Commissioning
  yearsExperience   Int
  bio               String?
  mobility          Mobility
  dayRateMin        Int?
  dayRateMax        Int?
  availabilityFrom  DateTime?
  certifications    TechnicianCertification[]
  evaluations       TechnicianEvaluation[]
}
enum Mobility {
  LOCAL
  REGIONAL
  GLOBAL
}

TechnicianCertification
model TechnicianCertification {
  id           String   @id @default(cuid())
  technicianId String
  technician   TechnicianProfile @relation(fields: [technicianId], references: [id], onDelete: Cascade)
  name         String   // GWO Working at Heights, IRATA L1/L2/L3, OEM specific
  provider     String
  validFrom    DateTime
  validUntil   DateTime
  documentUrl  String?
}

TechnicianEvaluation
model TechnicianEvaluation {
  id           String   @id @default(cuid())
  technicianId String
  technician   TechnicianProfile @relation(fields: [technicianId], references: [id], onDelete: Cascade)
  companyId    String
  company      Company  @relation(fields: [companyId], references: [id])
  rating       Int      // 1-5
  comment      String?
  createdAt    DateTime @default(now())
}

Company
model Company {
  id          String   @id @default(cuid())
  name        String
  country     String
  website     String?
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  members     CompanyMember[]
  jobs        Job[]
  evaluations TechnicianEvaluation[]
}

CompanyMember
model CompanyMember {
  id        String      @id @default(cuid())
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  companyId String
  company   Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  role      CompanyRole
  createdAt DateTime    @default(now())
  @@unique([userId, companyId])
}
enum CompanyRole {
  ADMIN
  MANAGER
  RECRUITER
  VIEWER
}

Job
model Job {
  id           String       @id @default(cuid())
  companyId    String
  company      Company      @relation(fields: [companyId], references: [id], onDelete: Cascade)
  title        String
  description  String
  location     String
  projectName  String?
  discipline   Discipline
  contractType ContractType
  dayRateFrom  Int?
  dayRateTo    Int?
  startDate    DateTime
  endDate      DateTime?
  status       JobStatus    @default(DRAFT)
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  applications Application[]
  chatThreads  ChatThread[]
}
enum Discipline {
  BLADE_REPAIR
  INSPECTION
  ROPE_ACCESS
  ELECTRICAL
  OTHER
}
enum ContractType {
  DAY_RATE
  FIXED_PRICE
  HOURLY
}
enum JobStatus {
  DRAFT
  OPEN
  CLOSED
}

Application
model Application {
  id                  String            @id @default(cuid())
  jobId               String
  job                 Job               @relation(fields: [jobId], references: [id], onDelete: Cascade)
  technicianId        String
  technician          TechnicianProfile @relation(fields: [technicianId], references: [id])
  status              ApplicationStatus @default(APPLIED)
  messageToCompany    String?
  messageToTechnician String?
  createdAt           DateTime          @default(now())
  updatedAt           DateTime          @updatedAt
  @@unique([jobId, technicianId])
}
enum ApplicationStatus {
  APPLIED
  SHORTLISTED
  REJECTED
  OFFERED
  ACCEPTED
}

Chat
model ChatThread {
  id           String        @id @default(cuid())
  jobId        String?
  job          Job?          @relation(fields: [jobId], references: [id])
  companyId    String
  company      Company       @relation(fields: [companyId], references: [id])
  technicianId String
  technician   TechnicianProfile @relation(fields: [technicianId], references: [id])
  messages     ChatMessage[]
  createdAt    DateTime      @default(now())
  @@unique([companyId, technicianId, jobId])
}
model ChatMessage {
  id         String     @id @default(cuid())
  threadId   String
  thread     ChatThread @relation(fields: [threadId], references: [id], onDelete: Cascade)
  senderType SenderType
  text       String
  createdAt  DateTime   @default(now())
}
enum SenderType {
  COMPANY
  TECHNICIAN
}

🔐 4. Auth & Roles
JWT-based Authentication
POST /api/auth/register

{
  "email": "string",
  "password": "string",
  "role": "TECHNICIAN | COMPANY_ADMIN",
  "fullName": "string (if TECHNICIAN)",
  "country": "string",
  "companyName": "string (if COMPANY_ADMIN)"
}

Creates User + TechnicianProfile OR Company + CompanyMember
Returns JWT + user info + profile
POST /api/auth/login

{
  "email": "string",
  "password": "string"
}

Returns JWT + user info + attached profile
Middleware auth.js
Verify JWT token
Attach req.user = { id, role, technicianId?, companyId? }
Roles utility roles.js
Define permissions:

Action	Allowed Roles
Create jobs	COMPANY_ADMIN, MANAGER, RECRUITER
View candidates	COMPANY_ADMIN, MANAGER, RECRUITER
See company dashboard	All company roles
Update technician passport	TECHNICIAN (self)
Leave evaluations	All company roles
🔌 5. API Endpoints
Auth Routes /api/auth
Method	Endpoint	Description
POST	/register	Register new user
POST	/login	Login user
Technician Routes /api/technicians
Method	Endpoint	Description
GET	/me	Get logged-in technician profile
PATCH	/me	Update profile
GET	/me/passport	Get profile + certs + evaluations
POST	/me/certifications	Add certification
DELETE	/me/certifications/:id	Remove certification
Company Routes /api/companies
Method	Endpoint	Description
GET	/me	Get company for logged-in member
PATCH	/me	Update company info
GET	/me/members	List company members
GET	/me/jobs	List company's jobs
Job Routes /api/jobs
Method	Endpoint	Description
POST	/	Create job (company roles)
GET	/	List open jobs (public)
GET	/:id	Get job details
PATCH	/:id	Update job (owner)
PATCH	/:id/status	Update status
Query filters for GET /api/jobs:

discipline
country / location
startDateFrom
dayRateMin / dayRateMax
Application Routes /api/applications
Method	Endpoint	Description
POST	/jobs/:jobId/applications	Technician applies
GET	/jobs/:jobId/applications	Company views applications
GET	/me	Technician's applications
PATCH	/:id/status	Company updates status
Chat Routes /api/chat
Method	Endpoint	Description
POST	/threads	Create thread
GET	/threads	List user's threads
GET	/threads/:id/messages	Get messages
POST	/threads/:id/messages	Send message
🔧 6. App Wiring
src/app.js
import express from 'express';
import cors from 'cors';
import authRoutes from './modules/auth/auth.routes.js';
import technicianRoutes from './modules/technicians/technician.routes.js';
import companyRoutes from './modules/companies/company.routes.js';
import jobRoutes from './modules/jobs/job.routes.js';
import applicationRoutes from './modules/applications/application.routes.js';
import chatRoutes from './modules/chat/chat.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
const app = express();
app.use(cors());
app.use(express.json());
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/technicians', technicianRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/chat', chatRoutes);
// Error handling
app.use(notFound);
app.use(errorHandler);
export default app;

index.js
import { config } from './src/config/env.js';
import app from './src/app.js';
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Re.Power API running on port ${PORT}`);
  console.log(`📊 Environment: ${config.nodeEnv}`);
});

🛠️ 7. Utils & Middleware
errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

notFound.js
export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
};

apiResponse.js
export const success = (res, data, message = 'Success', status = 200) => {
  res.status(status).json({ success: true, message, data });
};
export const error = (res, message, status = 400, details = null) => {
  res.status(status).json({ success: false, message, details });
};

password.js
import bcrypt from 'bcrypt';
export const hashPassword = (password) => bcrypt.hash(password, 12);
export const comparePassword = (password, hash) => bcrypt.compare(password, hash);

📦 8. Package.json
{
  "name": "repower-backend",
  "version": "3.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "prisma:migrate": "prisma migrate dev",
    "prisma:generate": "prisma generate",
    "prisma:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.x",
    "bcrypt": "^5.x",
    "cors": "^2.x",
    "dotenv": "^16.x",
    "express": "^4.x",
    "jsonwebtoken": "^9.x"
  },
  "devDependencies": {
    "nodemon": "^3.x",
    "prisma": "^5.x"
  }
}

🚂 9. Railway Compatibility
DO NOT hardcode ports or DB connection strings
Always use process.env.PORT and process.env.DATABASE_URL
App can start even if Prisma migrations haven't run yet
Clear console logs at startup:
Database connection success/fail
Routes mounted
Running environment
✅ 10. Deliverable Checklist
 Create all folders and files as described
 Update package.json with scripts and dependencies
 Keep index.js as entry point, delegating to src/app.js
 Project starts with npm start
 All endpoints return proper JSON responses
 Error handling middleware works
 Auth flow complete (register, login, JWT validation)
📊 Summary
File structure: Modular with src/modules/ per domain
Database: Prisma + PostgreSQL with 10+ models
Auth: JWT + bcrypt with role-based permissions
Endpoints: 20+ REST endpoints covering all Layer 1 features

Stack: Node.js 18+ | Express | Prisma | PostgreSQL | JWT
Hosting: Railway
Version: 3.0.0
