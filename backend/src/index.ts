import "dotenv/config";
import "express-async-errors";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config.js";

// Startup: required env for auth
if (!config.jwtSecret || !config.jwtRefreshSecret) {
  console.error("Xato: .env da JWT_SECRET va JWT_REFRESH_SECRET belgilangan bo‘lishi kerak.");
  process.exit(1);
}
if (!config.databaseUrl) {
  console.error("Xato: .env da DATABASE_URL belgilangan bo‘lishi kerak.");
  process.exit(1);
}

const app = express();
app.set("trust proxy", 1); // Railway/reverse proxy uchun – rate-limit to'g'ri ishlashi uchun
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const allowedOrigins = [
  config.frontendUrl,
  "http://localhost:5173",
  "http://localhost:4173",
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error("CORS policy: origin not allowed"));
  },
  credentials: true,
}));
app.use(express.json());
app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError) {
    res.status(400).json({ message: "Noto'g'ri so'rov formati. JSON kutilmoqda." });
    return;
  }
  next(err);
});
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(uploadsDir));

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
app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai-tutor", aiTutorRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/speaking", speakingRoutes);
app.use("/api/writing", writingRoutes);

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

  console.error("API xatosi:", err.message, err.stack);
  const isDev = config.nodeEnv === "development";
  const message =
    err.message?.includes("secret") || err.message?.includes("JWT")
      ? "Server sozlash xatosi: .env da JWT_SECRET va JWT_REFRESH_SECRET belgilang."
      : isDev
        ? err.message
        : "Internal Server Error";
  res.status(500).json({ message });
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`Arab Exam API running at http://localhost:${PORT}`);
});
