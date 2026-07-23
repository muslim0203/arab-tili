# Tinglab tushunish (Listening) audio + savollar

Bu hujjat listening imtihoni uchun audio savollarni qanday generatsiya qilish va
bazaga yozishni tushuntiradi.

## Tarkib

| Fayl | Vazifasi |
|------|----------|
| `prisma/listening-common.ts` | Umumiy tiplar, `audioObjectKey`/`audioFileName`, TTS sozlamalari, audio xaritasi (`listening-audio-map.json`) helperlari, validatsiya |
| `prisma/seed-listening-easy.ts` | 20 ta qisqa dialog (short_dialogue, A1–A2), `maxPlays = 2` |
| `prisma/seed-listening-medium.ts` | 20 ta uzun suhbat (long_conversation, B1–B2), `maxPlays = 2` |
| `prisma/seed-listening-hard.ts` | 20 ta ma'ruza (lecture, ~C1), `maxPlays = 1` |
| `scripts/generate-listening-audio.ts` | ElevenLabs TTS → DO Spaces → `listening-audio-map.json` |
| `scripts/validate-listening.ts` | Savollarni tekshiradi (options=4, correctIndex 0..3, matn bor) |

Transkriptlar seed fayllarida `export const listening*Items` massivlarida saqlanadi.
TTS skripti ham, seed ham AYNAN shu massivlardan foydalanadi — bir manba.

Dialog replikalari `lines: [{ speaker, text }]` ko'rinishida: **A = erkak ovoz, B = ayol ovoz**.
Ma'ruzalar bitta `transcript` matni (narrator ovozi).

## Muhim: tartib

Audio fayllar avval generatsiya qilinishi SHART. Seed skriptlar `audioUrl`ni
`prisma/listening-audio-map.json` dan oladi; xarita yo'q bo'lsa yoki biror kalit
yetishmasa, seed aniq xato bilan to'xtaydi (jim qolmaydi).

```
1) TTS generatsiya  →  listening-audio-map.json hosil bo'ladi
2) seed skriptlar   →  savollar bazaga yoziladi (audioUrl xaritadan)
```

## Kerakli env (`.env`)

```bash
# ElevenLabs
ELEVENLABS_API_KEY="..."

# DigitalOcean Spaces (S3-mos)
AWS_ENDPOINT="https://fra1.digitaloceanspaces.com"   # yoki CDN: https://fra1.cdn.digitaloceanspaces.com
AWS_S3_BUCKET="attanalpro-uploads"
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="fra1"

# Seed uchun
DATABASE_URL="postgresql://..."
```

`listening-common.ts` dagi `VOICES` obyektida ElevenLabs voice ID'larini
o'zingizning akkountingizdagi ovozlarga moslang (arabcha uchun "Multilingual"
belgili ovozlarni tanlang).

## 1-qadam: audiolarni generatsiya qilish

Avval quruq yurgizib (dry-run) rejasi va sozlamalarni tekshiring — API chaqirilmaydi,
kredit sarflanmaydi:

```bash
cd backend
npx tsx scripts/generate-listening-audio.ts --dry-run
```

Keyin haqiqiy generatsiya (kredit sarflaydi):

```bash
npx tsx scripts/generate-listening-audio.ts
```

Skript xususiyatlari:

- **Idempotent:** Spaces'da fayl allaqachon mavjud bo'lsa (`HeadObject`), qayta
  generatsiya qilmaydi. Majburan qayta yasash uchun `--force`.
- **Faqat bitta daraja:** `--only=easy` (yoki `medium` / `hard`).
- Har fayldan keyin `listening-audio-map.json` yangilanadi — uzilib qolsa progress
  yo'qolmaydi.
- Kalitlar yo'q bo'lsa `--dry-run` muloyim xabar beradi; haqiqiy rejimda esa
  generatsiyadan oldin aniq xato bilan to'xtaydi.

Natija: har bir mp3 DO Spaces'ga `listening/<daraja>/listening-<daraja>-NN.mp3`
kaliti bilan yuklanadi va public URL xaritaga yoziladi.

## 2-qadam: savollarni bazaga yozish

```bash
cd backend
npx tsx prisma/seed-listening-easy.ts
npx tsx prisma/seed-listening-medium.ts
npx tsx prisma/seed-listening-hard.ts
```

Yoki barcha seedlar bilan birga (`seed-all.ts` oxirida listening seedlar bor):

```bash
npx tsx prisma/seed-all.ts
```

Seedlar **idempotent**: har biri o'z darajasidagi eski savollarni o'chirib, qaytadan
yozadi — dublikat bo'lmaydi. Stage (`short_dialogue`/`long_conversation`/`lecture`)
mavjud bo'lmasa yaratiladi.

## Validatsiya

DB'ga tegmasdan barcha savollarni tekshirish:

```bash
cd backend
npx tsx scripts/validate-listening.ts
```

Har savol uchun: `options` uzunligi 4, `correctIndex` 0..3, matn mavjud,
variantlar takrorlanmasligi tekshiriladi.

## Audio saqlash (S3 / DO Spaces) haqida

Loyihaning `src/lib/s3.ts` fayli obyekt saqlashni boshqaradi:

- `isObjectStorageEnabled()` — `AWS_S3_BUCKET` bo'lsa `true`.
- `uploadLocalFileToSpaces(localPath, key)` — lokal faylni Spaces'ga yuklab, public
  URL qaytaradi.
- `objectExistsInSpaces(key)` — idempotentlik uchun `HeadObject` (yangi qo'shildi).
- `publicUrlFor(key)` — `https://<bucket>.<endpoint-host>/<key>` (virtual-hosted uslub).

Frontend (`ListeningStageRunner.tsx`, `ExamPage.tsx`, `AdminListening.tsx`) `audioUrl`
to'liq `http(s)://...` bo'lsa uni to'g'ridan-to'g'ri ishlatadi. Shuning uchun bu yerda
xaritaga to'liq Spaces public URL yoziladi (nisbiy `/api/uploads/...` emas) — audio
CDN/Spaces orqali beriladi va backend diskiga bog'liq bo'lmaydi.
