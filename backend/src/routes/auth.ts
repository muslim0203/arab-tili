import { Router, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signAccess, signPasswordResetToken, verifyPasswordResetToken, passwordVersion, signEmailVerifyToken, verifyEmailVerifyToken } from "../lib/jwt.js";
import { issueRefreshToken, consumeRefreshToken, revokeRefreshToken, revokeAllForUser } from "../lib/refresh-tokens.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { authLimiter, registerLimiter, forgotPasswordLimiter } from "../middleware/rate-limit.js";
import { isEmailConfigured, sendPasswordResetEmail, sendSubscriptionReminder, sendVerificationEmail } from "../services/email.js";
import { setRefreshCookie, clearRefreshCookie, getRefreshCookie } from "../lib/cookies.js";
import { config } from "../config.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email("To‘g‘ri email kiriting"),
  password: z.string().min(8, "Parol kamida 8 belgi"),
  fullName: z.string().min(1, "Ism kiritilishi shart"),
  languagePreference: z.enum(["uz", "ru", "ar"]).optional().default("uz"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// refreshToken body'da ixtiyoriy — asosiy manba httpOnly cookie.
const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8, "Parol kamida 8 belgi"),
});

// POST /api/auth/register
router.post("/register", registerLimiter, async (req, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
    return;
  }
  const { email, password, fullName, languagePreference } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    res.status(409).json({ message: "Bu email allaqachon ro‘yxatdan o‘tgan" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      fullName,
      languagePreference,
      subscriptionTier: "FREE",
    },
  });

  await prisma.userProgress.create({
    data: { userId: user.id },
  });

  // Email tasdiqlash havolasini yuborish (email sozlangan bo'lsa; javobni kutmaymiz).
  if (isEmailConfigured()) {
    const verifyToken = signEmailVerifyToken({ email: user.email, purpose: "verify-email" });
    const verifyLink = `${config.backendUrl}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;
    sendVerificationEmail(user.email, verifyLink).catch(() => { });
  }

  const accessToken = signAccess({ userId: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id, passwordVersion(passwordHash));
  setRefreshCookie(res, refreshToken);

  res.status(201).json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      languagePreference: user.languagePreference,
      subscriptionTier: user.subscriptionTier,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
      isAdmin: user.isAdmin,
    },
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 min in seconds
  });
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Email va parol kiritilishi shart" });
    return;
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    res.status(401).json({ message: "Email yoki parol noto'g'ri" });
    return;
  }
  // Google orqali ro'yxatdan o'tgan foydalanuvchi (paroli yo'q)
  if (!user.passwordHash) {
    res.status(401).json({ message: "Bu hisob Google orqali yaratilgan. Google bilan kiring." });
    return;
  }
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ message: "Email yoki parol noto'g'ri" });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  // Obuna 3 kun ichida tugasa, eslatma email yuborish (email sozlangan bo'lsa)
  if (isEmailConfigured() && user.subscriptionExpiresAt && user.subscriptionTier !== "FREE") {
    const now = new Date();
    const expires = new Date(user.subscriptionExpiresAt);
    const daysLeft = (expires.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
    if (daysLeft > 0 && daysLeft <= 3) {
      sendSubscriptionReminder(user.email, user.fullName, expires).catch(() => { });
    }
  }

  const accessToken = signAccess({ userId: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id, passwordVersion(user.passwordHash));
  setRefreshCookie(res, refreshToken);
  const tier = user.subscriptionExpiresAt && new Date() > user.subscriptionExpiresAt ? "FREE" : user.subscriptionTier;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      languagePreference: user.languagePreference,
      subscriptionTier: tier,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
      isAdmin: user.isAdmin,
    },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
});

// POST /api/auth/refresh-token
// Token manbai: httpOnly cookie (asosiy) yoki body (eski mijozlar uchun fallback).
router.post("/refresh-token", async (req, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  const bodyToken = parsed.success ? parsed.data.refreshToken : undefined;
  const token = getRefreshCookie(req) ?? bodyToken;
  if (!token) {
    res.status(400).json({ message: "refreshToken kerak" });
    return;
  }

  // Tokenni bazada tekshirib, darhol bekor qilamiz (rotatsiya).
  // Bekor qilingan token qayta kelsa — o'g'irlik belgisi, barcha sessiyalar yopiladi.
  const consumed = await consumeRefreshToken(token);
  if (!consumed.ok) {
    clearRefreshCookie(res);
    res.status(401).json({ message: "Invalid or expired refresh token" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { id: consumed.payload.userId },
    select: { id: true, email: true, passwordHash: true },
  });
  if (!user) {
    clearRefreshCookie(res);
    res.status(401).json({ message: "User not found" });
    return;
  }
  // Parol o'zgargan bo'lsa refresh token yaroqsiz.
  if (consumed.payload.pwv !== passwordVersion(user.passwordHash)) {
    clearRefreshCookie(res);
    res.status(401).json({ message: "Invalid or expired refresh token" });
    return;
  }

  const accessToken = signAccess({ userId: user.id, email: user.email });
  const newRefreshToken = await issueRefreshToken(user.id, passwordVersion(user.passwordHash));
  setRefreshCookie(res, newRefreshToken);
  res.json({ accessToken, refreshToken: newRefreshToken, expiresIn: 900 });
});

// POST /api/auth/logout – refresh tokenni bazada bekor qilish + cookie'ni o'chirish
router.post("/logout", async (req, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  const token = getRefreshCookie(req) ?? (parsed.success ? parsed.data.refreshToken : undefined);
  if (token) await revokeRefreshToken(token);
  clearRefreshCookie(res);
  res.json({ message: "Chiqildi" });
});

// POST /api/auth/forgot-password
router.post("/forgot-password", forgotPasswordLimiter, async (req, res: Response) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Email kiritilishi shart" });
    return;
  }
  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (!user) {
    res.json({ message: "Agar bunday email ro'yxatdan o'tgan bo'lsa, parolni tiklash havolasi yuborildi." });
    return;
  }
  // pwv: token joriy parolga bog'lanadi — parol o'zgargach token yaroqsiz (bir martalik).
  const token = signPasswordResetToken({ email: user.email, purpose: "reset", pwv: passwordVersion(user.passwordHash) });
  const resetLink = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if (isEmailConfigured()) {
    await sendPasswordResetEmail(user.email, resetLink);
    res.json({ message: "Agar bunday email ro'yxatdan o'tgan bo'lsa, parolni tiklash havolasi emailga yuborildi." });
  } else if (config.nodeEnv === "development") {
    // FAQAT development: email sozlanmaganida havolani qaytaramiz (productionda hech qachon).
    res.json({
      message: "Email sozlanmagan. Development rejimida havola:",
      token,
      resetLink,
    });
  } else {
    // Production: token hech qachon javobda qaytarilmaydi (akkaunt egallab olish xavfi).
    console.error("[Auth] SMTP sozlanmagan — parol tiklash emaili yuborilmadi:", user.email);
    res.json({ message: "Agar bunday email ro'yxatdan o'tgan bo'lsa, parolni tiklash havolasi emailga yuborildi." });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Token va yangi parol (kamida 8 belgi) kerak" });
    return;
  }
  try {
    const { email, pwv } = verifyPasswordResetToken(parsed.data.token);
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
    if (!user) {
      res.status(400).json({ message: "Noto‘g‘ri yoki muddati o‘tgan token" });
      return;
    }
    // Bir martalik: token berilgandan keyin parol o'zgargan bo'lsa, token qabul qilinmaydi.
    if (pwv !== passwordVersion(user.passwordHash)) {
      res.status(400).json({ message: "Noto‘g‘ri yoki muddati o‘tgan token" });
      return;
    }
    const hash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
    });
    // Parol tiklandi — barcha eski sessiyalar (shu jumladan hujumchiniki) yopiladi.
    await revokeAllForUser(user.id);
    clearRefreshCookie(res);
    res.json({ message: "Parol yangilandi. Endi yangi parol bilan kiring." });
  } catch {
    res.status(400).json({ message: "Noto‘g‘ri yoki muddati o‘tgan token" });
  }
});

// GET /api/auth/verify-email?token=... – email tasdiqlash (xatdagi havola shu yerga keladi)
router.get("/verify-email", async (req, res: Response) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    res.redirect(`${config.frontendUrl}/login?verified=0`);
    return;
  }
  try {
    const { email } = verifyEmailVerifyToken(token);
    await prisma.user.updateMany({
      where: { email, emailVerifiedAt: null },
      data: { emailVerifiedAt: new Date() },
    });
    res.redirect(`${config.frontendUrl}/login?verified=1`);
  } catch {
    res.redirect(`${config.frontendUrl}/login?verified=0`);
  }
});

// POST /api/auth/resend-verification – tasdiqlash xatini qayta yuborish (login qilingan foydalanuvchi)
router.post("/resend-verification", authenticateToken, forgotPasswordLimiter, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    select: { email: true, emailVerifiedAt: true },
  });
  if (!user) {
    res.status(404).json({ message: "Foydalanuvchi topilmadi" });
    return;
  }
  if (user.emailVerifiedAt) {
    res.json({ message: "Email allaqachon tasdiqlangan" });
    return;
  }
  if (!isEmailConfigured()) {
    res.status(503).json({ message: "Email xizmati sozlanmagan" });
    return;
  }
  const verifyToken = signEmailVerifyToken({ email: user.email, purpose: "verify-email" });
  const verifyLink = `${config.backendUrl}/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`;
  await sendVerificationEmail(user.email, verifyLink);
  res.json({ message: "Tasdiqlash havolasi emailga yuborildi" });
});

// POST /api/auth/social/oauth (eski nom: /social/google, orqaga moslik uchun) – Google OAuth
const googleSchema = z.object({
  idToken: z.string().min(1, "Google token kerak"),
});

router.post(["/social/oauth", "/social/google"], authLimiter, async (req, res: Response) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "idToken kerak" });
    return;
  }

  let googleUser;
  try {
    const { verifyGoogleToken } = await import("../services/google-auth.js");
    googleUser = await verifyGoogleToken(parsed.data.idToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google tekshiruvi amalga oshmadi";
    res.status(401).json({ message: msg });
    return;
  }

  // 1) googleId bilan foydalanuvchini qidirish
  let user = await prisma.user.findUnique({
    where: { googleId: googleUser.sub },
  });

  if (!user) {
    // 2) Email bilan mavjud foydalanuvchini qidirish (account linking)
    user = await prisma.user.findUnique({
      where: { email: googleUser.email },
    });

    if (user) {
      // Mavjud hisobga Google ID ulash
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: googleUser.sub,
          avatarUrl: googleUser.picture ?? user.avatarUrl,
          // Google email tasdiqlangan — bizda ham tasdiqlangan deb belgilaymiz.
          emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        },
      });
    } else {
      // 3) Yangi foydalanuvchi yaratish
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          fullName: googleUser.name,
          googleId: googleUser.sub,
          avatarUrl: googleUser.picture ?? null,
          passwordHash: "", // Google foydalanuvchisida parol yo'q
          subscriptionTier: "FREE",
          languagePreference: "uz",
          emailVerifiedAt: new Date(), // Google email tasdiqlangan

        },
      });

      // UserProgress yaratish
      await prisma.userProgress.create({
        data: { userId: user.id },
      });
    }
  }

  // lastLogin yangilash
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const accessToken = signAccess({ userId: user.id, email: user.email });
  const refreshToken = await issueRefreshToken(user.id, passwordVersion(user.passwordHash));
  setRefreshCookie(res, refreshToken);
  const tier = user.subscriptionExpiresAt && new Date() > user.subscriptionExpiresAt ? "FREE" : user.subscriptionTier;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      languagePreference: user.languagePreference,
      subscriptionTier: tier,
      subscriptionExpiresAt: user.subscriptionExpiresAt?.toISOString() ?? null,
      isAdmin: user.isAdmin,
    },
    accessToken,
    refreshToken,
    expiresIn: 900,
  });
});

// GET /api/auth/me (protected)
router.get("/me", authenticateToken, (req: AuthRequest, res: Response) => {
  const u = req.user!;
  res.json({
    user: {
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      languagePreference: u.languagePreference,
      subscriptionTier: u.subscriptionTier,
      subscriptionExpiresAt: u.subscriptionExpiresAt?.toISOString?.() ?? null,
      isAdmin: u.isAdmin,
    },
  });
});

export const authRoutes = router;
