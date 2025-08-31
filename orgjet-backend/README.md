# OrgJet Backend (NestJS + Prisma + SQLite)

## Quick start
```bash
cd orgjet-backend
cp .env.example .env
npm ci
npx prisma generate
npm run prisma:migrate
npm run seed
npm run start:dev
```
API runs on `http://localhost:3000` with CORS allowed for `http://localhost:5173`.

### Default accounts (password: `password123`)
- admin@orgjet.local (ADMIN)
- lead@orgjet.local (COORDINATOR)
- doer@orgjet.local (ASSIGNEE)
- emp@orgjet.local (REQUESTER)

### Endpoints
- `POST /auth/login` { email, password }
- `GET /me` (Bearer token)
- `GET /requests`
- `POST /requests`
- `GET /requests/:id`
- `PATCH /requests/:id`
- `POST /requests/:id/comment`
- `GET /board`
