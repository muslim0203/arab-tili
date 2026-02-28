import { Router, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { signAccess, signRefresh, verifyRefresh, signPasswordResetToken, verifyPasswordResetToken } from "../lib/jwt.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";
import { authLimiter, registerLimiter, forgotPasswordLimiter } from "../middleware/rate-limit.js";
import { isEmailConfigured, sendPasswordResetEmail, sendSubscriptionReminder } from "../services/email.js";
import { config } from "../config.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email("To‘g‘ri email kiriting"),
  password: z.string().min(6, "Parol kamida 6 belgi"),
  fullName: z.string().min(1, "Ism kiritilishi shart"),
  languagePreference: z.enum(["uz", "ru", "ar"]).optional().default("uz"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6, "Parol kamida 6 belgi"),
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

  const accessToken = signAccess({ userId: user.id, email: user.email });
  const refreshToken = signRefresh({ userId: user.id });

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
  const refreshToken = signRefresh({ userId: user.id });
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
router.post("/refresh-token", async (req, res: Response) => {
  const parsed = refreshSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "refreshToken kerak" });
    return;
  }

  try {
    const payload = verifyRefresh(parsed.data.refreshToken);
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true },
    });
    if (!user) {
      res.status(401).json({ message: "User not found" });
      return;
    }
    const accessToken = signAccess({ userId: user.id, email: user.email });
    res.json({ accessToken, expiresIn: 900 });
  } catch {
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
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
  const token = signPasswordResetToken({ email: user.email, purpose: "reset" });
  const resetLink = `${config.frontendUrl}/reset-password?token=${encodeURIComponent(token)}`;

  if (isEmailConfigured()) {
    await sendPasswordResetEmail(user.email, resetLink);
    res.json({ message: "Agar bunday email ro'yxatdan o'tgan bo'lsa, parolni tiklash havolasi emailga yuborildi." });
  } else {
    // Development: token qaytariladi (email sozlanmaganida)
    res.json({
      message: "Email sozlanmagan. Development rejimida havola:",
      token,
      resetLink: config.nodeEnv === "development" ? resetLink : undefined,
    });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res: Response) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Token va yangi parol (kamida 6 belgi) kerak" });
    return;
  }
  try {
    const { email } = verifyPasswordResetToken(parsed.data.token);
    const hash = await bcrypt.hash(parsed.data.newPassword, 10);
    await prisma.user.update({
      where: { email },
      data: { passwordHash: hash },
    });
    res.json({ message: "Parol yangilandi. Endi yangi parol bilan kiring." });
  } catch {
    res.status(400).json({ message: "Noto‘g‘ri yoki muddati o‘tgan token" });
  }
});

// POST /api/auth/social/google – Google OAuth (frontend sends idToken)
const googleSchema = z.object({
  idToken: z.string().min(1, "Google token kerak"),
});

router.post("/social/google", authLimiter, async (req, res: Response) => {
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
  const refreshToken = signRefresh({ userId: user.id });
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
