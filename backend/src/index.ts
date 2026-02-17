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
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/api/uploads", express.static(uploadsDir));

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
app.use("/api/auth", authRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/ai-tutor", aiTutorRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);

// Global error handler (async route xatolarini ushlaydi)
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
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
  console.log(`AttanalPro API running at http://localhost:${PORT}`);
});
