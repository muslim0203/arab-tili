import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import { config } from "./config.js";

const isProd = config.nodeEnv === "production";

// ── Startup: maxfiy kalitlarni qat'iy tekshirish ──
const PLACEHOLDER_SECRETS = [
  "your-super-secret-jwt-key-min-32-chars",
  "your-refresh-secret-key-min-32-chars",
  "your-super-secret-refresh-key-min-32-chars",
  "CHANGE_ME_min_32_random_chars________________",
  "CHANGE_ME_different_32_random_chars__________",
  "change-me",
  "secret",
];

function assertStrongSecret(name: string, value: string): void {
  if (!value) {
    console.error(`Xato: .env da ${name} belgilangan bo‘lishi kerak.`);
    process.exit(1);
  }
  if (value.length < 32) {
    console.error(`Xato: ${name} kamida 32 ta belgidan iborat bo‘lishi kerak.`);
    process.exit(1);
  }
  if (PLACEHOLDER_SECRETS.includes(value)) {
    console.error(`Xato: ${name} namunaviy (placeholder) qiymatga teng. Haqiqiy maxfiy kalit kiriting.`);
    process.exit(1);
  }
}

assertStrongSecret("JWT_SECRET", config.jwtSecret);
assertStrongSecret("JWT_REFRESH_SECRET", config.jwtRefreshSecret);
if (config.jwtSecret === config.jwtRefreshSecret) {
  console.error("Xato: JWT_SECRET va JWT_REFRESH_SECRET bir xil bo‘lmasligi kerak.");
  process.exit(1);
}
if (!config.databaseUrl) {
  console.error("Xato: .env da DATABASE_URL belgilangan bo‘lishi kerak.");
  process.exit(1);
}

// To'lov kalitlari bo'sh bo'lsa webhooklar fail-closed rejimda rad etiladi (lib/click.ts, lib/payme.ts).
if (isProd) {
  if (!config.click.secretKey) console.warn("Ogohlantirish: CLICK_SECRET_KEY o'rnatilmagan — Click webhooklari rad etiladi (to'lovlar ishlamaydi).");
  if (!config.payme.merchantKey) console.warn("Ogohlantirish: PAYME_MERCHANT_KEY o'rnatilmagan — Payme webhooklari rad etiladi (to'lovlar ishlamaydi).");
}

const app = express();
app.set("trust proxy", 1); // Railway/reverse proxy uchun – rate-limit to'g'ri ishlashi uchun
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Xavfsizlik sarlavhalari (HSTS, X-Content-Type-Options, X-Frame-Options, va h.k.)
app.use(helmet({
  // Cross-origin resurslar (audio fayllar) frontenddan yuklanishi uchun.
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));

// Productionda faqat haqiqiy frontend origin ruxsat etiladi; localhost faqat dev uchun.
/**
 * Domenning www va www'siz variantlarini birga qaytaradi.
 *
 * Nega kerak: FRONTEND_URL da "https://arabexam.uz" turgan, sayt esa
 * "https://www.arabexam.uz" da ochiladi (apex o'sha yerga redirect qiladi).
 * Brauzer POST so'rovlarida Origin sarlavhasini yuboradi va u www bilan
 * keladi — natijada barcha so'rovlar rad etilardi.
 */
function withWwwVariant(url: string): string[] {
  try {
    const u = new URL(url);
    const host = u.host.startsWith("www.") ? u.host.slice(4) : `www.${u.host}`;
    return [u.origin, `${u.protocol}//${host}`];
  } catch {
    return [url];
  }
}

const allowedOrigins = [
  ...(config.frontendUrl ? withWwwVariant(config.frontendUrl) : []),
  // Qo'shimcha originlar (vergul bilan ajratilgan) — masalan alohida admin panel domeni.
  ...(process.env.CORS_EXTRA_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  ...(isProd ? [] : ["http://localhost:5173", "http://localhost:4173"]),
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Origin'siz so'rovlar (mobil app, Postman) faqat dev rejimda ruxsat etiladi.
    if (!origin) return callback(null, !isProd);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Ruxsatsiz origin — xato TASHLAMAYMIZ. Ilgari shu yerda new Error() bo'lgani
    // uchun oddiy CORS rad etishi 500 "Internal Server Error" ga aylanardi.
    // To'g'ri xatti-harakat: CORS sarlavhalarini qo'shmaslik — brauzer javobni
    // o'zi bloklaydi. (CORS himoya emas, u faqat brauzer siyosati.)
    logger.warn("CORS: ruxsat etilmagan origin", { origin });
    callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: "1mb" }));
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ message: "Noto'g'ri so'rov formati. JSON kutilmoqda." });
    return;
  }
  next(err);
});
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(uploadsDir, {
  setHeaders: (res) => {
    // Yuklangan fayllar brauzerda bajarilmasligi uchun (stored XSS himoyasi).
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "attachment");
  },
}));

// XSS sanitizatsiya – barcha body ma'lumotlarini tozalash
import { sanitizeBody } from "./middleware/sanitize.js";
app.use(sanitizeBody);

// Rate limiting – barcha API so'rovlari uchun
import { generalLimiter } from "./middleware/rate-limit.js";
app.use("/api", generalLimiter);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

import { authRoutes } from "./routes/auth.js";
import { examRoutes } from "./routes/exams.js";
import { attemptRoutes } from "./routes/attempts.js";
import { progressRoutes } from "./routes/progress.js";
import { aiTutorRoutes } from "./routes/ai-tutor.js";
import { subscriptionRoutes } from "./routes/subscriptions.js";
import { adminRoutes } from "./routes/admin.js";
import { profileRoutes } from "./routes/profile.js";
import { contactRoutes } from "./routes/contact.js";
import { speakingRoutes } from "./routes/speaking.js";
import { writingRoutes } from "./routes/writing.js";
import { accessRoutes } from "./routes/access.js";
import { sarfRoutes } from "./routes/sarf.js";
app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/sarf", sarfRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai-tutor", aiTutorRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/speaking", speakingRoutes);
app.use("/api/writing", writingRoutes);
app.use("/api/access", accessRoutes);

// Global error handler (async route xatolarini ushlaydi)
import multer from "multer";
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  // Multer fayl hajmi xatosi
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(413).json({ message: "Fayl hajmi juda katta. Maksimum 10MB ruxsat etiladi." });
      return;
    }
    res.status(400).json({ message: `Fayl yuklash xatosi: ${err.message}` });
    return;
  }

  // Ruxsat etilmagan fayl turi
  if (err.message?.includes("Ruxsat etilmagan fayl turi")) {
    res.status(415).json({ message: err.message });
    return;
  }

  logger.error("API xatosi", err);
  const isDev = config.nodeEnv === "development";
  const message =
    err.message?.includes("secret") || err.message?.includes("JWT")
      ? "Server sozlash xatosi: .env da JWT_SECRET va JWT_REFRESH_SECRET belgilang."
      : isDev
        ? err.message
        : "Internal Server Error";
  res.status(500).json({ message });
});

import { logger } from "./lib/logger.js";
import { startSchedulers } from "./lib/scheduler.js";

const PORT = config.port;
app.listen(PORT, () => {
  logger.info(`Arab Exam API running at http://localhost:${PORT}`);
  // Kunlik fon vazifalari: PENDING to'lovlarni tozalash + obuna eslatmalari
  startSchedulers();
});
