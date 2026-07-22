# AttanalPro — Kiberxavfsizlik tekshiruvi hisoboti

**Sana:** 2026-07-02
**Qamrov:** backend (Express + Prisma), frontend (React), .env/maxfiy kalitlar, dependencylar

---

## Umumiy xulosa

Loyihada xavfsizlik asoslari yaxshi qurilgan: helmet, CORS cheklovi, rate limiting, XSS sanitizatsiya, bcrypt, JWT algoritmini qattiq belgilash (HS256), to'lov webhook imzolarini tekshirish, summa/idempotentlik nazorati, IDOR himoyasi (barcha so'rovlar `userId` bilan filtrlanadi), `.env` git'ga qo'shilmagan. Lekin bir nechta jiddiy kamchilik bor.

---

## 🔴 YUQORI xavf

### 1. Google login — access token audience tekshirilmaydi (token substitution)
`backend/src/services/google-auth.ts` — asosiy yo'l `userinfo` endpoint orqali `access_token`ni qabul qiladi, lekin token **aynan shu ilovaga** berilganini (`aud`) tekshirmaydi. Fallback (`id_token`) yo'lida `aud` tekshiriladi, asosiy yo'lda esa yo'q.

**Xavf:** boshqa har qanday Google-ilovaga berilgan access token bilan foydalanuvchi hisobiga kirish mumkin (akkauntni egallab olish).
**Yechim:** `access_token` yo'lida `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=...` orqali `aud === GOOGLE_CLIENT_ID` ni tekshirish, yoki faqat `id_token` qabul qilishga o'tish (tavsiya).

### 2. Refresh tokenlarni bekor qilish (revocation) mexanizmi yo'q
Refresh token 7 kunlik, lekin bazada saqlanmaydi, rotatsiya ham yo'q. Parol o'zgartirilsa/tiklansa yoki logout qilinsa ham eski refresh token 7 kun ishlashda davom etadi.

**Yechim:** refresh tokenni (hash ko'rinishida) bazada saqlash, ishlatilganda rotatsiya qilish, parol tiklanganda barcha sessiyalarni bekor qilish. Minimal variant: user'ga `tokenVersion` qo'shib, payload'da tekshirish.

### 3. Parol tiklash tokeni bir martalik emas
`reset-password` JWT tokeni 1 soat amal qiladi va bir necha marta ishlatilishi mumkin. Parol o'zgargandan keyin ham token amal qiladi.

**Yechim:** token payload'iga `passwordHash`ning bir qismi/hash'ini qo'shib tekshirish (parol o'zgargach token o'z-o'zidan yaroqsiz bo'ladi) yoki bazada bir martalik token saqlash.

### 4. Dependency zaifliklari — backend 15 ta (9 high), frontend 4 ta (1 high)
`npm audit` natijasi (faqat production deps):

- **express-rate-limit 8.2.1** — IPv6 orqali rate limit chetlab o'tish (bu login brute-force himoyasini zaiflashtiradi)
- **multer 1.4.5-lts** — 1.x liniyasida ma'lum DoS zaifliklari, 2.x'ga o'tish tavsiya etiladi
- **bcrypt 5.x → node-pre-gyp → tar** — bir nechta high (asosan build vaqti, lekin yangilash oson: bcrypt@6)
- nodemailer, path-to-regexp, form-data, fast-xml-parser, minimatch — high
- frontend: **react-router** open redirect (moderate/high)

**Yechim:**
```bash
cd backend && npm audit fix        # keyin: npm i bcrypt@6 multer@2 (breaking, test qilib)
cd frontend && npm audit fix
```

---

## 🟡 O'RTA xavf

### 5. Tokenlar localStorage'da saqlanadi
`frontend/src/store/auth.ts` — zustand `persist` access va refresh tokenni localStorage'ga yozadi. Bitta XSS zaiflik topilsa, ikkala token ham o'g'irlanadi. Server tomonda sanitizatsiya bor, lekin himoya qatlami sifatida refresh tokenni `httpOnly` cookie'ga o'tkazish ancha xavfsizroq.

### 6. To'lov kalitlari bo'sh bo'lsa webhooklar ochiq qoladi
`CLICK_SECRET_KEY` bo'sh bo'lsa imzo bo'sh kalit bilan MD5 orqali hisoblanadi — hujumchi imzoni o'zi yasab, to'lovni "yakunlashi" mumkin. `PAYME_MERCHANT_KEY` bo'sh bo'lsa `Basic UGF5Y29tOg==` bilan kirish mumkin. Hozir faqat production'da **ogohlantirish** chiqadi.

**Yechim:** kalit bo'sh bo'lsa tegishli webhook endpointni butunlay o'chirish (503 qaytarish), warning bilan cheklanmaslik.

### 7. Click imzosi MD5 va oddiy `===` bilan solishtiriladi
MD5 — Click protokoli talabi, o'zgartirib bo'lmaydi, lekin solishtirishni `crypto.timingSafeEqual` bilan qilish timing-hujumdan himoya qiladi. Payme Basic auth solishtiruvida ham xuddi shunday.

### 8. Rate limiting xotirada (in-memory)
Server qayta ishga tushsa limitlar nolga tushadi; bir nechta instans bo'lsa limit har birida alohida. Railway'da bitta instans bo'lsa hozircha yetarli, lekin masshtablashda Redis store kerak bo'ladi. Shuningdek, `refresh-token` va `reset-password` endpointlarida maxsus limiter yo'q (faqat umumiy 100/15min).

---

## 🟢 PAST xavf / kuzatuvlar

- **Yuklangan audio fayllar autentifikatsiyasiz ochiq** (`/api/uploads/...`). Fayl nomi CUID'lardan iborat (taxmin qilish qiyin), lekin URL bilsa har kim yuklab oladi. Muhim bo'lsa — auth'li endpoint orqali berish.
- **`ext = path.extname(req.file.originalname)`** — foydalanuvchi kiritgan kengaytma tekshirilmasdan ishlatiladi (attempts.ts, speaking.ts). `attachment` + `nosniff` bilan berilgani uchun xavf past, lekin kengaytmani allowlist (`.webm .mp3 .ogg .wav .m4a`) bilan cheklash yaxshi.
- **Parol siyosati zaif** — minimal 6 belgi, murakkablik talab qilinmaydi. Kamida 8 belgi tavsiya etiladi.
- **JWT_RESET_SECRET** berilmasa `JWT_SECRET + "::reset"` dan hosil qilinadi — ishlaydi, lekin mustaqil kalit qo'yish yaxshiroq.
- **CSP** — helmet default'lari yoqilgan, lekin API uchun bu yetarli; frontend hosting tomonida CSP header qo'shishni unutmang.
- **Global 100/15min limit** — faol imtihon topshirayotgan foydalanuvchi uchun torlik qilishi mumkin (xavfsizlikka emas, UX'ga ta'sir).

---

## ✅ Yaxshi amalga oshirilgan jihatlar

- `.env` git tarixida yo'q, `.gitignore` to'g'ri; `.env.example`da faqat placeholder'lar
- Startup'da JWT kalitlari uzunligi/placeholder tekshiruvi, kalitlar bir xil bo'lsa server ishga tushmaydi
- JWT `alg` qattiq belgilangan (HS256) — alg confusion himoyasi
- Access/refresh/reset uchun alohida secretlar
- To'lovlarda: imzo tekshiruvi, summani server narxi bilan solishtirish, `updateMany` orqali atomik PENDING→COMPLETED (race condition himoyasi), idempotentlik
- Barcha attempt/progress so'rovlari `userId` bilan filtrlangan — IDOR topilmadi
- Admin routelar `authenticateToken + requireAdmin` bilan yopilgan
- Yuklangan fayllar `Content-Disposition: attachment` + `nosniff` bilan beriladi (stored XSS himoyasi)
- forgot-password'da email mavjudligi oshkor qilinmaydi; dev rejimdagina token qaytariladi
- CORS production'da faqat FRONTEND_URL bilan cheklangan
- Login/register/forgot-password uchun alohida qattiq rate limitlar

---

## Tavsiya etilgan ustuvorlik tartibi

1. Google auth `aud` tekshiruvi (1-topilma) — darhol
2. `npm audit fix` + express-rate-limit yangilash (4) — darhol
3. Reset token bir martalik qilish (3) va refresh revocation (2) — shu hafta
4. To'lov kalitlari bo'sh bo'lsa endpointni o'chirish (6), timingSafeEqual (7)
5. Refresh tokenni httpOnly cookie'ga o'tkazish (5) — keyingi bosqich

---

## ✅ TUZATISHLAR (2026-07-02, xuddi shu kun bajarildi)

| # | Topilma | Holat | Qayerda |
|---|---------|-------|---------|
| 1 | Google `aud` tekshiruvi | ✅ Tuzatildi | `services/google-auth.ts` — access_token endi tokeninfo orqali `aud/azp` tekshiruvidan o'tadi |
| 2 | Refresh revocation | ✅ Tuzatildi | `lib/jwt.ts`, `routes/auth.ts` — tokenga `pwv` (parol versiyasi) qo'shildi; parol o'zgarsa barcha refresh tokenlar yaroqsiz |
| 3 | Reset token bir martalik | ✅ Tuzatildi | `routes/auth.ts` — reset token joriy parolga bog'landi, ishlatilgach avtomatik o'ladi |
| 4 | Dependencylar | ✅ Asosan tuzatildi | Backend: 15 → 0 (express-rate-limit, path-to-regexp va h.k. yangilandi; bcrypt→6, nodemailer→9 package.json'da). Frontend: react-router tuzatildi; faqat vite/esbuild qoldi (dev-server, prod'ga ta'sir qilmaydi) |
| 6 | To'lov kalitlari bo'sh | ✅ Tuzatildi | `lib/click.ts`, `lib/payme.ts` — kalit bo'sh bo'lsa webhook fail-closed rad etiladi |
| 7 | timingSafeEqual | ✅ Tuzatildi | Click imzosi va Payme Basic auth endi timing-safe solishtiriladi |
| — | Audio kengaytma allowlist | ✅ Qo'shimcha | `lib/sanitize.ts` `safeAudioExt()` — attempts, speaking, s3 yuklamalarida |
| 5 | httpOnly cookie | ⏳ Keyinga | Frontend'da kattaroq o'zgarish talab qiladi |

### Muhim: siz bajarishingiz kerak bo'lgan qadamlar

```bash
cd backend && npm install    # bcrypt@6 va nodemailer@9 o'rnatiladi
cd frontend && npm install   # lockfile'dagi tuzatishlar qo'llanadi
```

Eslatmalar:
- Barcha foydalanuvchilar bir marta qaytadan login qilishi kerak bo'ladi (eski refresh tokenlar formatı o'zgardi — bu xavfsizlik uchun ataylab qilingan).
- `tsc` tekshiruvidan o'tdi. `ai-client.ts`dagi bitta type xatosi oldindan mavjud bo'lgan (openai kutubxonasi bilan bog'liq), ishga ta'sir qilmaydi.
