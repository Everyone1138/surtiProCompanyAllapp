# OrgJet

OrgJet is a work management and dispatch application built to help teams create, assign, track, and update service jobs from one central system.

The project is designed for organizations that need to manage operational requests such as repairs, maintenance work, warranty jobs, equipment-related service tasks, and field/employee assignments. Admin users can create and manage jobs, assign employees, upload supporting documents, and monitor job progress. Employee users can view the dispatch board and manage the jobs assigned to them.

---

## Project Objective

The objective of OrgJet is to provide a simple but powerful internal job management system where a company can:

- Submit new work requests/jobs.
- Categorize jobs by type, priority, due date, company, and equipment details.
- Assign one or more employees to a job.
- Track job status through a dispatch workflow.
- Allow employees to view and update assigned jobs.
- Keep job-related documents, photos, comments, and activity history attached to each request.
- Separate admin and employee access so each user only sees the tools relevant to their role.

OrgJet is intended to improve communication between dispatchers, administrators, and employees by keeping all job information in one place.

---

## Main Features

### User Authentication

OrgJet includes login-based access using JSON Web Tokens.

Users authenticate with an email and password. After login, the backend returns a JWT token that is used by the frontend for protected API requests.

### Role-Based Access

The application supports different views based on user role.

Admin and coordinator users can access the full system, including:

- My Work
- Dispatch Board
- Submit Request
- Driver Jobs
- Job Search
- Job assignment tools
- Job status updates
- Document uploads
- Request management

Employee/driver users have a limited view, including:

- Dispatch Board
- My Assigned Jobs

Employees can view the full dispatch board, but job-management permissions are limited. They can update the status of jobs assigned to them through a safer employee-specific endpoint.

### Submit Request

Admins can submit new jobs with details such as:

- Title
- Description
- Request type
- Priority
- Due date
- Company
- ID number
- Equipment ID
- Serial number
- Work order number
- Photos or image attachments

The request type dropdown was customized for service workflows and includes:

- Repair
- Maintenance
- Warranty

### Dispatch Board

The Dispatch Board groups jobs by status. Each status group is displayed as an accordion so users can expand or collapse each section.

Current job statuses include:

- NEW
- ASSIGNED
- DISASSEMBLE
- PURCHASES
- EN_ROUTE_PICKUP
- PICKED_UP
- EN_ROUTE_DROPOFF
- DELIVERED
- CANCELLED
- ISSUE

This makes it easier to organize many jobs without overwhelming the user interface.

### Job Details Page

Each job has a detail page where users can view:

- Job title and description
- Company information
- ID number
- Equipment ID
- Serial number
- Work order number
- Current status
- Assigned users
- Uploaded photos
- Uploaded documents
- Comments
- Posts
- Activity history

### Multi-Assignee Support

Jobs can have one or more assigned users. Admins and coordinators can add or remove assignees from a job.

### Document Uploads

Each job supports uploading important documents. The current document sections include:

- Cotizacion
- Orden de compra
- Remision

Supported file types include common formats such as:

- PDF
- Images
- Word documents
- Excel files
- PowerPoint files
- Text files
- CSV files
- ZIP files

### Camera and Photo Attachments

The frontend includes support for attaching image files and capturing photos using a camera component.

This is useful for field work, equipment inspections, repair documentation, and proof-of-work records.

### Job Search

Admin users can search jobs by multiple fields, including:

- Title
- Description
- Company
- Company ID
- Status
- Priority
- Type
- Team
- Assigned user
- Metadata fields such as equipment ID, serial number, and work order number

### Activity History

The system stores job-related events, such as:

- Status changes
- Comments
- Assignments
- Uploaded attachments
- Uploaded documents
- Posts

This creates a timeline of what happened on each job.

---

## Technologies Used

### Frontend

- React
- TypeScript
- Vite
- React Router
- Axios
- Tailwind CSS
- Browser File APIs
- Camera/media capture support through a custom React component

The frontend is responsible for the user interface, routing, API calls, authentication state, form handling, job views, dispatch board accordions, document uploads, and role-based navigation.

### Backend

- Node.js
- NestJS
- TypeScript
- Passport JWT
- bcrypt
- Multer
- Prisma ORM

The backend provides the REST API, authentication, authorization, request/job management, file uploads, status updates, user management, and database access.

### Database

- SQLite
- Prisma ORM

SQLite is used as the local development database. Prisma is used to define the schema, query the database, run migrations, and manage data through Prisma Studio.

### Authentication and Security

- JWT-based authentication
- Password hashing with bcrypt
- NestJS AuthGuard
- Custom role guard
- Role-based endpoint protection

The backend protects routes using JWT authentication. Admin-only operations are protected with a role guard so regular employees cannot manually call restricted API endpoints.

### File Uploads

- Multer
- Local `uploads` folder

Uploaded images and documents are stored locally in the backend project during development.

---

## Application Structure

The project is organized into two main applications:

```text
orgjet-backend/
orgjet-frontend/
```

### Backend Folder

```text
orgjet-backend/
```

Main responsibilities:

- NestJS API
- Authentication
- Prisma database access
- Request/job endpoints
- Board endpoints
- User endpoints
- File upload handling
- Role-based access control

Important backend areas include:

```text
src/modules/auth/
src/modules/requests/
src/modules/users/
src/common/
prisma/
uploads/
```

### Frontend Folder

```text
orgjet-frontend/
```

Main responsibilities:

- React UI
- Login flow
- Protected routes
- Dispatch board
- Request submission
- Request detail page
- Job search
- Employee assigned jobs
- API communication

Important frontend areas include:

```text
src/pages/
src/components/
src/lib/
src/state/
```

---

## API Overview

The backend exposes endpoints for:

### Authentication

```text
POST /api/auth/login
```

### Requests / Jobs

```text
GET    /api/requests
POST   /api/requests
GET    /api/requests/:id
PATCH  /api/requests/:id
DELETE /api/requests/:id
```

### Assignments

```text
POST  /api/requests/:id/assign
POST  /api/requests/:id/assignees
PATCH /api/requests/:id/assignees/remove
```

### Driver / Employee Jobs

```text
GET  /api/requests/driver/my-jobs
POST /api/requests/driver/:id/status
```

### Dispatch Board

```text
GET /api/board
```

### Users

```text
GET /api/me
GET /api/users
```

### Request Types

```text
GET /api/requests/types
```

---

## Local Development

### Backend

```bash
cd orgjet-backend
npm install
npx prisma generate
npx prisma migrate dev
npm run start:dev
```

Backend development server usually runs on:

```text
http://localhost:3000
```

### Frontend

```bash
cd orgjet-frontend
npm install
npm run dev
```

Frontend development server usually runs on:

```text
http://localhost:5173
```

---

## Environment Variables

The backend uses a `.env` file for database configuration.

Example:

```env
DATABASE_URL="file:./dev.db"
```

The frontend can use a Vite environment variable for the API base URL.

Example:

```env
VITE_API_BASE=http://localhost:3000/api
```

In production, the frontend can use:

```env
VITE_API_BASE=/api
```

---

## User Roles

Current role behavior:

### Admin / Coordinator

Admin and coordinator users can manage the system, including:

- Creating jobs
- Assigning users
- Removing assignees
- Updating job details
- Updating job status
- Deleting jobs
- Searching jobs
- Viewing the dispatch board
- Viewing assigned jobs

### Employee / Driver

Employee or driver users can:

- View the dispatch board
- View jobs assigned to them
- Update the status of jobs assigned to them

Employee users cannot create, delete, assign, or search all jobs through protected admin endpoints.

---

## Important Design Decisions

### Requests Are Used as Jobs

The system uses the `Request` model as the main job/work-order entity. This avoids creating a separate job model and keeps the workflow simpler.

### Metadata for Extra Fields

Fields such as equipment ID, serial number, and work order number are stored in `metadataJson`.

This makes the system flexible and avoids requiring a database migration every time a new custom field is added.

### Role-Based Frontend and Backend Protection

The frontend hides routes and navigation options based on role, while the backend enforces permissions using guards.

This is important because frontend-only protection is not enough. Backend protection prevents users from manually calling restricted API endpoints.

### Employee Status Updates Use a Separate Endpoint

Employees update status through:

```text
POST /api/requests/driver/:id/status
```

This endpoint verifies that the employee is assigned to the job before allowing the status change.

---

## Current Development Status

The project currently supports:

- Login authentication
- Admin and employee views
- Submit Request page
- Custom request types
- Extra job metadata fields
- Dispatch board with accordion statuses
- Multi-assignee support
- Employee assigned jobs
- Status updates
- Document uploads
- Photo uploads
- Job detail pages
- Activity history
- Backend role protection

---

## Future Improvements

Potential future improvements include:

- Production deployment
- Cloud storage for uploads
- Email notifications
- Real-time updates with WebSockets
- More advanced role management
- Better audit logs
- Mobile-first employee interface
- Calendar integration
- Export reports
- Advanced filtering and sorting
- Dashboard analytics
- PostgreSQL support for production
- Company/customer management
- Equipment inventory management

---

## Summary

OrgJet is a full-stack job dispatch and work management application built with React, NestJS, Prisma, and SQLite.

It allows administrators to create, assign, organize, and track service jobs while giving employees a focused view of the dispatch board and their assigned work. The project is structured to support real operational workflows such as repairs, maintenance, warranty work, document uploads, photo evidence, and status tracking.
