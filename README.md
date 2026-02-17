# AttanalPro – Arabic Exam Prep Platform

Full-stack EdTech platform: mock exams (MCQ, essay, speaking), results dashboard, AI tutor, and Click-based subscriptions.

## Stack

- **Frontend:** Vite, React 18, TypeScript, Tailwind CSS, shadcn/ui, React Router, TanStack Query, Zustand, React Hook Form, Zod, react-i18next
- **Backend:** Express, TypeScript, Prisma (PostgreSQL), JWT auth, OpenAI, AWS S3, Click

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL
- pnpm or npm

### 1. Backend

Lokal sozlash bajarilgan: `backend/.env`, `npm install` (backend + frontend), `npx prisma generate`, PostgreSQL’da `attanalpro` baza, migratsiya (`init`), seed (exam type + 4 savol + 1 mock exam).

**Backend’ni ishga tushirish:**
```bash
cd backend
npm run dev
```

API runs at `http://localhost:3000`. Health: `GET /api/health`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at `http://localhost:5173`. API proxy: `/api` → backend.

### 3. From repo root (optional)

```bash
npm run dev:backend   # in one terminal
npm run dev:frontend  # in another
npm run db:migrate
npm run db:seed
npm run db:studio     # Prisma Studio
```

## Implementation status

- **Phase 0 (Bootstrap):** ✅ Monorepo, backend (Express + Prisma), frontend (Vite + React + Tailwind + shadcn), Prisma schema, seed (exam type + mock exam with 4 MCQ questions), `.env.example`
- **Phase 1:** Auth (backend routes + frontend store, pages, protected routes)
- **Phase 2:** Mock exam – list, start, MCQ only, timer, auto-save, submit, results
- **Phase 3:** Results page, dashboard, `/users/me`, progress
- **Phase 4:** AI tutor chat
- **Phase 5:** Essay & speaking questions, audio upload ✅ (writing word count; speaking record/upload, Whisper transcribe + AI grade)
- **Phase 6:** Subscriptions & Click payment ✅ (plans Premium/Intensive, create-payment → Click redirect, Prepare/Complete webhooks, User tier + expiry; pricing page, payment return)
- **Phase 7:** Admin panel ✅ (stats, users list, payments list; AdminRoute + isAdmin; first admin via DB: `UPDATE users SET is_admin = true WHERE ...`)

See `.cursor/plans/attanalpro_edtech_platform_*.plan.md` for the full plan.
