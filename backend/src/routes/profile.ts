import { Router, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticateToken, type AuthRequest } from "../middleware/auth.js";

const router = Router();

const updateProfileSchema = z.object({
    fullName: z.string().min(1, "Ism kiritilishi shart").max(100).optional(),
    languagePreference: z.enum(["uz", "ru", "ar"]).optional(),
});

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, "Joriy parol kiritilishi shart"),
    newPassword: z.string().min(6, "Yangi parol kamida 6 belgi"),
});

// GET /api/profile – foydalanuvchi profili
router.get("/", authenticateToken, async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: {
            id: true,
            email: true,
            fullName: true,
            languagePreference: true,
            subscriptionTier: true,
            subscriptionExpiresAt: true,
            isAdmin: true,
            createdAt: true,
            lastLogin: true,
        },
    });
    if (!user) {
        res.status(404).json({ message: "Foydalanuvchi topilmadi" });
        return;
    }
    res.json(user);
});

// PUT /api/profile – profil yangilash
router.put("/", authenticateToken, async (req: AuthRequest, res: Response) => {
    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
        return;
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.fullName) data.fullName = parsed.data.fullName;
    if (parsed.data.languagePreference) data.languagePreference = parsed.data.languagePreference;

    if (Object.keys(data).length === 0) {
        res.status(400).json({ message: "Hech qanday o'zgarish kiritilmadi" });
        return;
    }

    const updated = await prisma.user.update({
        where: { id: req.userId! },
        data,
        select: {
            id: true,
            email: true,
            fullName: true,
            languagePreference: true,
            subscriptionTier: true,
            subscriptionExpiresAt: true,
            isAdmin: true,
        },
    });

    res.json({ message: "Profil yangilandi", user: updated });
});

// PUT /api/profile/password – parol o'zgartirish
router.put("/password", authenticateToken, async (req: AuthRequest, res: Response) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        res.status(400).json({ message: "Validation error", errors: parsed.error.flatten() });
        return;
    }

    const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { passwordHash: true },
    });

    if (!user) {
        res.status(404).json({ message: "Foydalanuvchi topilmadi" });
        return;
    }

    const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!valid) {
        res.status(400).json({ message: "Joriy parol noto'g'ri" });
        return;
    }

    const hash = await bcrypt.hash(parsed.data.newPassword, 12);
    await prisma.user.update({
        where: { id: req.userId! },
        data: { passwordHash: hash },
    });

    res.json({ message: "Parol muvaffaqiyatli o'zgartirildi" });
});

export const profileRoutes = router;
