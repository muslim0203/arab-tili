# "Sarf asoslari" bo'limi — dizayn spetsifikatsiyasi

Bu hujjat "Sarf asoslari" (arab tili morfologiyasi) bo'limining ma'lumotlar modeli,
API kontrakti va kontent JSON shaklini belgilaydi. Kontentning o'zi shu papkadagi
`lessons.json` faylida (7 ta poydevor dars, sahih fe'l).

Mavjud konvensiyalarga tayanadi:

- `backend/prisma/schema.prisma` — `@@map` snake_case jadval, `@map` snake_case ustun,
  `id String @default(cuid())`, `options` JSON matn (String) sifatida saqlanadi va
  route'da `JSON.parse` qilinadi (qarang: `GrammarQuestion`, `ReadingPassage` → `ReadingQuestion`).
- `backend/src/routes/exams.ts` — flat (16-78) va nested include (126-173) response pattern.
- `backend/src/middleware/access-control.ts:110` — `requireSarfAccess` (pro-only) tayyor.
- `backend/src/routes/admin.ts` — `router.use(authenticateToken, requireAdmin)` bilan
  himoyalangan CRUD pattern.

---

## (A) Prisma modellar

`schema.prisma` ga aynan qo'yiladigan snippet (MISC TABLES bo'limidan oldin, alohida
"SARF LESSONS" seksiya sarlavhasi bilan qo'yish tavsiya etiladi):

```prisma
// ══════════════════════════════════════════════════
// SARF (MORFOLOGIYA) LESSON TABLES
// ══════════════════════════════════════════════════

model SarfLesson {
  id                String   @id @default(cuid())
  slug              String   @unique
  order             Int      @default(0)
  level             String   @map("level") // "A1" | "A1/A2" | "A2" ...
  titleUz           String   @map("title_uz")
  titleAr           String   @map("title_ar")
  summary           String   @map("summary")
  estMinutes        Int      @map("est_minutes")
  isFree            Boolean  @default(false) @map("is_free")
  theory            String   @map("theory") // JSON: Block[] (qarang: C bo'lim)
  conjugationTables String   @map("conjugation_tables") // JSON: ConjTable[]
  isPublished       Boolean  @default(true) @map("is_published")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  questions SarfQuestion[]
  progress  SarfLessonProgress[]

  @@index([order])
  @@map("sarf_lessons")
}

model SarfQuestion {
  id           String   @id @default(cuid())
  lessonId     String   @map("lesson_id")
  orderIndex   Int      @default(0) @map("order_index")
  prompt       String   @map("prompt")
  options      String   @map("options") // JSON: string[] (4 options)
  correctIndex Int      @map("correct_index") // 0..3
  explanation  String   @map("explanation")
  createdAt    DateTime @default(now()) @map("created_at")

  lesson SarfLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@index([lessonId])
  @@map("sarf_questions")
}

model SarfLessonProgress {
  id          String    @id @default(cuid())
  userId      String    @map("user_id")
  lessonId    String    @map("lesson_id")
  status      String    @default("not_started") @map("status") // not_started | in_progress | completed
  bestScore   Int       @default(0) @map("best_score") // to'g'ri javoblar soni (savollar sonidan)
  completedAt DateTime? @map("completed_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  user   User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  lesson SarfLesson @relation(fields: [lessonId], references: [id], onDelete: Cascade)

  @@unique([userId, lessonId])
  @@map("sarf_lesson_progress")
}
```

`User` modeliga (mavjud relation ro'yxatiga, masalan `refreshTokens` qatoridan keyin)
qo'shiladigan qator:

```prisma
  sarfLessonProgress  SarfLessonProgress[]
```

Eslatmalar:

- `theory` va `conjugationTables` — `GrammarQuestion.options` kabi JSON matn (String).
  Route'da `JSON.parse`, seed/adminda `JSON.stringify` qilinadi.
- `SarfQuestion.createdAt` spec ro'yxatida yo'q edi, lekin `ReadingQuestion` (child model)
  konvensiyasiga mos ravishda qo'shildi.
- `bestScore` — foizsiz, "nechta to'g'ri" absolyut son (frontend `score/total` dan foiz chiqaradi).

---

## (B) API kontrakti

Router: `backend/src/routes/sarf.ts`, mount: `app.use("/api/sarf", sarfRoutes)`.
Barcha endpoint'lar `authenticateToken` talab qiladi.

### 1. `GET /api/sarf/lessons` — darslar ro'yxati (authed, hamma tarifga ochiq)

Faqat `isPublished: true` darslar, `order` bo'yicha. `theory`/`conjugationTables`
QAYTARILMAYDI (ro'yxat yengil bo'lsin). Har dars uchun shu userning progressi
join qilinadi (yo'q bo'lsa default). Qo'shimcha `hasAccess` flag — frontend qulf
ikonkasini shu bilan chizadi (`isFree || userning pro sarf access'i bor`).

Response `200`:

```json
{
  "lessons": [
    {
      "id": "cme...",
      "slug": "sarf-kirish",
      "order": 1,
      "level": "A1",
      "titleUz": "Kirish: sarf ilmi va harakatlar",
      "titleAr": "مُقَدِّمَةٌ فِي عِلْمِ الصَّرْفِ",
      "summary": "Sarf ilmi nima, harakatlar, sukun, tanvin, shadda va mizon.",
      "estMinutes": 12,
      "isFree": true,
      "questionCount": 7,
      "hasAccess": true,
      "progress": {
        "status": "completed",
        "bestScore": 6,
        "completedAt": "2026-07-20T10:00:00.000Z"
      }
    }
  ]
}
```

- Progress yozuvi bo'lmasa: `"progress": { "status": "not_started", "bestScore": 0, "completedAt": null }`.
- Implementatsiya: `prisma.sarfLesson.findMany({ where: { isPublished: true }, orderBy: { order: "asc" }, include: { _count: { select: { questions: true } } } })` + `prisma.sarfLessonProgress.findMany({ where: { userId } })` ni map'da birlashtirish. `hasAccess` uchun bir marta `canAccessFullSarf(userId)` chaqiriladi (middleware emas, service — ro'yxat 403 bermasligi kerak).

### 2. `GET /api/sarf/lessons/:slug` — dars detali

Gating (route ichida, ketma-ket):

1. `authenticateToken` — hamisha.
2. Lesson topilmasa yoki `isPublished: false` → `404 { "message": "Dars topilmadi" }`.
3. `lesson.isFree === true` → davom etiladi (authed yetarli).
4. Aks holda `canAccessFullSarf(userId)` tekshiriladi; ruxsat yo'q bo'lsa →
   `403 { "message": "<reason>", "planType": "free", "upgradeRequired": true }`
   (aynan `requireSarfAccess` formati). Eslatma: gating slug'ga bog'liq (isFree)
   bo'lgani uchun statik `requireSarfAccess` middleware emas, route ichida service
   chaqiriladi — lekin javob shakli middleware bilan bir xil saqlanadi.

Response `200` (theory/conjugationTables/options PARSE QILINGAN holda; bu mashq
rejimi, shuning uchun grammar mixed'dagi kabi `correctIndex` va `explanation`
QAYTARILADI — frontend darhol feedback beradi):

```json
{
  "lesson": {
    "id": "cme...",
    "slug": "mozi-tuslanishi",
    "order": 3,
    "level": "A1/A2",
    "titleUz": "Mozi fe'lning tuslanishi",
    "titleAr": "تَصْرِيفُ الْفِعْلِ الْمَاضِي",
    "summary": "...",
    "estMinutes": 20,
    "isFree": false,
    "theory": [
      { "type": "heading", "text": "Tuslanish nima?" },
      { "type": "paragraph", "text": "..." },
      { "type": "example", "arabic": "نَصَرَتْ", "translit": "nasarat", "meaning": "u (ayol) yordam berdi" },
      { "type": "tableRef", "tableId": "mozi-nasara-14" },
      { "type": "note", "text": "..." }
    ],
    "conjugationTables": [
      {
        "id": "mozi-nasara-14",
        "title": "نَصَرَ fe'lining mozi tuslanishi (14 siyg'a)",
        "rootArabic": "ن ص ر",
        "columns": ["Siyg'a", "Arabcha", "O'qilishi", "Ma'nosi"],
        "rows": [
          { "cells": ["3-shaxs, muzakkar, birlik", "نَصَرَ", "nasara", "u (erkak) yordam berdi"], "highlight": "َ" }
        ]
      }
    ],
    "questions": [
      {
        "id": "cme...",
        "orderIndex": 1,
        "prompt": "نَصَرَتْ qaysi siyg'a?",
        "options": ["3-shaxs muzakkar birlik", "3-shaxs muannas birlik", "2-shaxs muzakkar birlik", "1-shaxs birlik"],
        "correctIndex": 1,
        "explanation": "Oxiridagi sukunli تْ (ta'nis tosi) — 3-shaxs muannas birlik belgisi."
      }
    ],
    "progress": { "status": "in_progress", "bestScore": 0, "completedAt": null }
  }
}
```

- Implementatsiya: `prisma.sarfLesson.findUnique({ where: { slug }, include: { questions: { orderBy: { orderIndex: "asc" } } } })`
  (nested include pattern — `exams.ts:126-173` kabi), so'ng `JSON.parse(lesson.theory)`,
  `JSON.parse(lesson.conjugationTables)`, har savolda `JSON.parse(q.options)`.

### 3. `POST /api/sarf/lessons/:slug/complete` — darsni yakunlash

Gating — detail bilan bir xil (isFree → authed; aks holda pro).

Request body:

```json
{ "answers": [1, 0, 1, 1, 1, 1, 2, 0] }
```

- `answers[i]` — `orderIndex` bo'yicha tartiblangan i-savolga tanlangan variant indeksi
  (0..3). Javob berilmagan savol uchun `-1` yuborilishi mumkin (noto'g'ri hisoblanadi).
- Validatsiya: `answers` massiv bo'lmasa yoki uzunligi savollar soniga teng bo'lmasa →
  `400 { "message": "answers massivi savollar soniga mos emas" }`.

Server ballni hisoblaydi (`answers[i] === question.correctIndex` bo'lganlar soni), so'ng:

1. `prisma.sarfLessonProgress.upsert` (`userId_lessonId` unique bo'yicha):
   - `create`: `{ userId, lessonId, status: "completed", bestScore: score, completedAt: now }`
   - `update`: `{ status: "completed", bestScore: max(eski, score), completedAt: eski ?? now }`
     (max — tranzaksiyada yoki avval o'qib keyin yozish bilan).
2. `prisma.userProgress.upsert` — `lastActivityAt: new Date()` yangilanadi
   (`create` bo'lsa `{ userId, lastActivityAt }`).

Response `200`:

```json
{ "score": 6, "total": 8, "bestScore": 7 }
```

- `bestScore` — upsert'dan KEYINGI qiymat (foydalanuvchining shaxsiy rekordi).

### 4. Admin CRUD — `backend/src/routes/admin.ts` ichiga (router allaqachon
`authenticateToken, requireAdmin` bilan himoyalangan; grammar/reading CRUD pattern'iga mos):

| Method | Path | Tavsif |
|---|---|---|
| `GET` | `/api/admin/sarf/lessons` | Barcha darslar (isPublished'dan qat'i nazar), `order` bo'yicha, `_count.questions` bilan. |
| `GET` | `/api/admin/sarf/lessons/:id` | Bitta dars, questions include qilingan, JSON maydonlar parse qilingan. |
| `POST` | `/api/admin/sarf/lessons` | Yangi dars. Body: Lesson maydonlari; `theory`/`conjugationTables` obyekt kelsa `JSON.stringify` qilinadi. |
| `PUT` | `/api/admin/sarf/lessons/:id` | Darsni yangilash (shu jumladan `isPublished`, `order`). |
| `DELETE` | `/api/admin/sarf/lessons/:id` | Darsni o'chirish (savollar cascade, progress cascade). |
| `POST` | `/api/admin/sarf/lessons/:id/questions` | Darsga savol qo'shish. Body: `{ orderIndex, prompt, options: string[4], correctIndex, explanation }`. |
| `PUT` | `/api/admin/sarf/questions/:id` | Savolni yangilash. |
| `DELETE` | `/api/admin/sarf/questions/:id` | Savolni o'chirish. |

Validatsiya (POST/PUT savol): `options` uzunligi 4, `correctIndex` 0..3 — aks holda `400`.

---

## (C) Kontent JSON shakli

`lessons.json` (shu papkada) va frontend/seed shu type'larga tayanadi.
Seed skripti (`seed-sarf.ts`, keyin yoziladi) `lessons.json` ni o'qib, har lesson uchun
`theory`/`conjugationTables` ni `JSON.stringify` qilib DB'ga yozadi, savollarni
`SarfQuestion` sifatida yaratadi. Idempotentlik: slug bo'yicha upsert.

```ts
type Lesson = {
  slug: string;          // unique, kebab-case
  order: number;         // 1..n, ro'yxat tartibi
  level: string;         // "A1" | "A1/A2" | "A2"
  titleUz: string;
  titleAr: string;       // to'liq harakatlangan
  summary: string;       // 1-2 gap, ro'yxat kartochkasi uchun
  estMinutes: number;
  isFree: boolean;
  theory: Block[];
  conjugationTables: ConjTable[];
  questions: Q[];
};

type Block = {
  type: "heading" | "paragraph" | "example" | "note" | "tableRef";
  text?: string;      // heading | paragraph | note uchun (o'zbekcha)
  arabic?: string;    // example uchun — to'liq harakatlangan arabcha
  translit?: string;  // example uchun — lotin transliteratsiya
  meaning?: string;   // example uchun — o'zbekcha ma'no
  tableId?: string;   // tableRef uchun — conjugationTables[].id ga ishora
};

type ConjTable = {
  id: string;             // lesson ichida unique (tableRef shu id'ni ko'rsatadi)
  title: string;
  rootArabic: string;     // masalan "ن ص ر"
  columns: string[];      // ustun sarlavhalari
  rows: {
    cells: string[];      // uzunligi columns.length bilan teng
    highlight?: string;   // ixtiyoriy: qatorda ajratib ko'rsatiladigan qo'shimcha/prefiks
  }[];
};

type Q = {
  orderIndex: number;     // 1..n, dars ichida
  prompt: string;
  options: string[];      // aynan 4 ta
  correctIndex: number;   // 0..3
  explanation: string;    // to'g'ri javob izohi (o'zbekcha)
};
```

Frontend render qoidalari (ma'lumot uchun):

- `heading` → seksiya sarlavhasi; `paragraph` → oddiy matn; `note` → ajratilgan
  eslatma-karta; `example` → arabcha (RTL, katta shrift) + translit + ma'no uch qatorli
  karta; `tableRef` → `conjugationTables` dan `id` bo'yicha topib, shu joyda jadval chizish.
- `highlight` bo'lsa, qatordagi arabcha katakda shu bo'lak rangli ko'rsatiladi
  (suffiks/prefiksni ajratish uchun).
- Arabcha matn hamisha to'liq harakatli — frontend `dir="rtl"` va arab shrifti bilan chiqaradi.
