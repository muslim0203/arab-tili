# Backend – lokal sozlash

## Bajarilgan qadamlar (to‘liq)

- ✅ `backend/.env` yaratildi va `DATABASE_URL` (macbookpro@localhost) sozlandi
- ✅ `npm install` (dependency’lar o‘rnatildi)
- ✅ `npx prisma generate` (Prisma client yaratildi)
- ✅ Prisma schema’dagi relation xatosi tuzatildi
- ✅ PostgreSQL’da `Arab Exam` bazasi yaratildi / mavjudligi tekshirildi
- ✅ `npx prisma migrate dev --name init` (jadvalar yaratildi)
- ✅ `npm run db:seed` (exam type, 4 ta savol, 1 ta mock exam qo‘shildi)

## Serverni ishga tushirish

```bash
cd backend
npm run dev
```

API: `http://localhost:3000`, tekshiruv: `GET /api/health`.

Boshqa kompyuterdagi PostgreSQL yoki boshqa foydalanuvchi/parol ishlatilsa, `.env` da faqat `DATABASE_URL` ni o‘zgartiring.
