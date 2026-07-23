/**
 * Bepul demo mock imtihon huquqi (access-control) uchun testlar.
 * Baza soxtalashtiriladi (in-memory) — haqiqiy PostgreSQL kerak emas.
 *
 * Tekshiriladigan xatti-harakat:
 *  - FREE foydalanuvchi umrida 1 marta demo boshlashi mumkin
 *  - Demodan foydalangach ikkinchi marta 403 (bloklanadi)
 *  - PRO/Standard foydalanuvchiga demo taklif qilinmaydi (ularда to'liq imtihon bor)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// ── In-memory soxta jadvallar ──
type Sub = { userId: string; planType: string; status: string; expiresAt: Date; startedAt: Date };
type Purchase = { userId: string; productType: string; remainingUses: number; expiresAt: Date };
type Usage = { userId: string; type: string; usedCount: number; periodStart: Date; periodEnd: Date };

let subs: Sub[] = [];
let purchases: Purchase[] = [];
let usages: Usage[] = [];

const sumUsage = (userId: string, type: string) =>
    usages.filter((u) => u.userId === userId && u.type === type).reduce((s, u) => s + u.usedCount, 0);

vi.mock("../src/lib/prisma", () => ({
    prisma: {
        subscription: {
            findFirst: async ({ where }: any) => {
                const now = new Date();
                return (
                    subs.find(
                        (s) =>
                            s.userId === where.userId &&
                            s.planType === "pro" &&
                            s.status === "active" &&
                            s.expiresAt.getTime() > now.getTime()
                    ) ?? null
                );
            },
        },
        purchase: {
            findMany: async ({ where }: any) => {
                const now = new Date();
                return purchases.filter(
                    (p) =>
                        p.userId === where.userId &&
                        p.productType === where.productType &&
                        p.remainingUses > 0 &&
                        p.expiresAt.getTime() > now.getTime()
                );
            },
        },
        usageTracking: {
            aggregate: async ({ where }: any) => ({
                _sum: { usedCount: sumUsage(where.userId, where.type) },
            }),
            upsert: async ({ where, create, update }: any) => {
                const key = where.userId_type_periodStart;
                const existing = usages.find(
                    (u) =>
                        u.userId === key.userId &&
                        u.type === key.type &&
                        u.periodStart.getTime() === key.periodStart.getTime()
                );
                if (existing) {
                    existing.usedCount += update.usedCount.increment;
                    return existing;
                }
                const row: Usage = { ...create };
                usages.push(row);
                return row;
            },
        },
    },
}));

const { canStartDemoMock, recordDemoMockUsage } = await import("../src/services/access-control");

beforeEach(() => {
    subs = [];
    purchases = [];
    usages = [];
});

describe("canStartDemoMock — FREE foydalanuvchi", () => {
    it("hech qachon ishlatmagan FREE foydalanuvchiga ruxsat beradi", async () => {
        const res = await canStartDemoMock("free-user");
        expect(res.allowed).toBe(true);
        expect(res.planType).toBe("free");
    });

    it("demodan foydalangach ikkinchi marta bloklaydi", async () => {
        await recordDemoMockUsage("free-user");
        const res = await canStartDemoMock("free-user");
        expect(res.allowed).toBe(false);
        expect(res.reason).toMatch(/foydalangansiz/i);
    });

    it("recordDemoMockUsage umrbod yozuvni faqat bir marta yaratadi (idempotent emas — sanaydi)", async () => {
        await recordDemoMockUsage("free-user");
        await recordDemoMockUsage("free-user");
        // Ikki marta chaqirilса usedCount 2 bo'ladi, lekin bloklash 1 dан oshgani uchun ishlaydi.
        expect(sumUsage("free-user", "mock")).toBe(2);
        const res = await canStartDemoMock("free-user");
        expect(res.allowed).toBe(false);
    });
});

describe("canStartDemoMock — pullik foydalanuvchi", () => {
    it("PRO foydalanuvchiga demo taklif qilinmaydi (to'liq imtihon bor)", async () => {
        subs.push({
            userId: "pro-user",
            planType: "pro",
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 864e5),
            startedAt: new Date(),
        });
        const res = await canStartDemoMock("pro-user");
        expect(res.allowed).toBe(false);
        expect(res.planType).toBe("pro");
    });

    it("Standard (mock sotib olgan) foydalanuvchiga ham demo taklif qilinmaydi", async () => {
        purchases.push({
            userId: "std-user",
            productType: "mock_exam",
            remainingUses: 1,
            expiresAt: new Date(Date.now() + 7 * 864e5),
        });
        const res = await canStartDemoMock("std-user");
        expect(res.allowed).toBe(false);
        expect(res.planType).toBe("standard");
    });

    it("recordDemoMockUsage pullik foydalanuvchi uchun hech narsa yozmaydi", async () => {
        subs.push({
            userId: "pro-user",
            planType: "pro",
            status: "active",
            expiresAt: new Date(Date.now() + 30 * 864e5),
            startedAt: new Date(),
        });
        await recordDemoMockUsage("pro-user");
        expect(sumUsage("pro-user", "mock")).toBe(0);
    });
});
