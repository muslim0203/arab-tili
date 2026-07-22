# Yaxlit loyiha — birlashtirish hisoboti

**Sana:** 2026-07-22
**Manba papkalar:** `arab tili/arab tili` (A) va `arab tili2` (B)
**Natija:** `arab tili yaxlit` (ushbu papka)

## Qaysi biri yangi edi?

Ikkalasi ham bir xil loyihaning (AttanalPro — arab tili imtihon platformasi) nusxalari.
Deyarli barcha fayllar "farq qiladi" ko'rinsa-da, aksariyati faqat qator oxiri (CRLF/LF)
farqi edi. Haqiqiy (mazmunli) farq atigi ~31 faylda bor edi.

- **A (`arab tili/arab tili`) — asosiy, yangiroq versiya (2026-07-02).**
  Boshqa mashinada (Windows) qilingan katta xavfsizlik + funksiya bosqichini o'z ichiga oladi:
  email tasdiqlash, httpOnly cookie refresh token, strukturali logger, kunlik fon vazifalari
  (scheduler), AI kunlik kvota, 16 ta xavfsizlik testi, GitHub CI, min-8 belgili parol,
  timing-safe imzo tekshiruvi, fail-closed to'lov webhooklari, Google `aud` tekshiruvi,
  audio kengaytma allowlist. (Qarang: `XAVFSIZLIK-HISOBOTI.md`, `YAXSHILASHLAR.md`.)

- **B (`arab tili2`) — git HEAD, 2026-02-28.**
  Deploy'ga oid oxirgi mayda tuzatishlar shu yerda edi va A ga o'tmagan.

Xulosa: **A ni asos qilib oldik**, B dagi noyob 2 ta yangilikni ustiga qo'shdik.

## B'dan qo'shilgan noyob yangiliklar

1. **Google auth route nomi — adblocker'dan qochish.**
   `POST /api/auth/social/oauth` (eski `/social/google` orqaga moslik uchun saqlangan).
   - `backend/src/routes/auth.ts` — route massivga o'zgartirildi.
   - `frontend/src/pages/Login.tsx`, `Register.tsx` — chaqiruv `/auth/social/oauth` ga o'tdi.

2. **`resolveApiBase()` — production'da localhost API'ga urilib qolmaslik fallback'i.**
   - `frontend/src/lib/api.ts` — VITE_API_URL localhost'ni ko'rsatsa-yu, ilova production
     domenida bo'lsa, avtomatik `/api` ga qaytadi. A ning httpOnly cookie logikasi saqlandi.

## B'da bor, LEKIN qo'shilmagan (A allaqachon yaxshiroq)

B'dagi qolgan farqli qatorlar — A xavfsizlik uchun almashtirgan **eski** kod edi
(masalan: `jwt.ts` da `pwv`siz eski token, `google-auth.ts` da `aud`siz oqim,
`s3.ts` da tekshiruvsiz kengaytma). Bularni qo'shish xavfsizlikni orqaga qaytargan
bo'lardi, shuning uchun A'niki qoldirildi.

## Ishga tushirish

```bash
cd backend && npm install && npx prisma migrate dev && npm run dev
cd frontend && npm install && npm run dev
```

Eslatma: `node_modules` va `.git` bu papkaga ko'chirilmadi (`npm install` bilan tiklanadi).
`_to_delete/` papkasidagi `.fuse_hidden*` fayllar tahrir jarayonidan qolgan artefakt —
o'chirib tashlashingiz mumkin.
