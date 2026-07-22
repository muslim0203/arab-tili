/**
 * Refresh token rotatsiyasi va bekor qilish (revocation) uchun testlar.
 * Baza soxtalashtiriladi (in-memory) — haqiqiy PostgreSQL/SQLite kerak emas.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

process.env.JWT_SECRET = "test_jwt_secret_kamida_32_belgidan_iborat!!";
process.env.JWT_REFRESH_SECRET = "test_refresh_secret_boshqa_32_belgili_qiymat";
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";

// ── In-memory soxta refresh_tokens jadvali ──
type Row = { tokenHash: string; userId: string; expiresAt: Date; revokedAt: Date | null; rotated: boolean };
let rows: Row[] = [];

vi.mock("../src/lib/prisma", () => ({
    prisma: {
        refreshToken: {
            create: async ({ data }: any) => {
                if (rows.some((r) => r.tokenHash === data.tokenHash)) {
                    throw new Error("Unique constraint failed on tokenHash");
                }
                const row: Row = { ...data, revokedAt: null, rotated: false };
                rows.push(row);
                return row;
            },
            findUnique: async ({ where }: any) => rows.find((r) => r.tokenHash === where.tokenHash) ?? null,
            update: async ({ where, data }: any) => {
                const row = rows.find((r) => r.tokenHash === where.tokenHash);
                if (!row) throw new Error("Record not found");
                Object.assign(row, data);
                return row;
            },
            updateMany: async ({ where, data }: any) => {
                const matched = rows.filter(
                    (r) =>
                        (where.tokenHash === undefined || r.tokenHash === where.tokenHash) &&
                        (where.userId === undefined || r.userId === where.userId) &&
                        (where.revokedAt !== null || r.revokedAt === null)
                );
                matched.forEach((r) => Object.assign(r, data));
                return { count: matched.length };
            },
            deleteMany: async ({ where }: any) => {
                const before = rows.length;
                rows = rows.filter((r) => r.expiresAt.getTime() >= where.expiresAt.lt.getTime());
                return { count: before - rows.length };
            },
        },
    },
}));

const { issueRefreshToken, consumeRefreshToken, revokeRefreshToken, revokeAllForUser, cleanupExpiredRefreshTokens } =
    await import("../src/lib/refresh-tokens");
const { signRefresh, verifyRefresh, hashRefreshToken } = await import("../src/lib/jwt");

beforeEach(() => {
    rows = [];
});

describe("jti — token noyobligi", () => {
    it("bir xil payload bilan imzolangan ikki token har xil bo'ladi", () => {
        const a = signRefresh({ userId: "u1", pwv: "abc" });
        const b = signRefresh({ userId: "u1", pwv: "abc" });
        expect(a).not.toBe(b);
        expect(verifyRefresh(a).jti).not.toBe(verifyRefresh(b).jti);
    });

    it("bir soniyada berilgan ikki token bazada to'qnashmaydi", async () => {
        await issueRefreshToken("u1", "abc");
        await expect(issueRefreshToken("u1", "abc")).resolves.toBeTruthy();
        expect(rows).toHaveLength(2);
    });
});

describe("hashRefreshToken", () => {
    it("tokenning o'zi emas, hash saqlanadi", async () => {
        const token = await issueRefreshToken("u1", "abc");
        expect(rows[0].tokenHash).toBe(hashRefreshToken(token));
        expect(rows[0].tokenHash).not.toContain(token);
        expect(rows[0].tokenHash).toHaveLength(64); // sha256 hex
    });
});

/** Yozuvni leeway oynasidan tashqariga surish (vaqt o'tgandek qilish). */
function ageBeyondLeeway(tokenHash: string) {
    const row = rows.find((r) => r.tokenHash === tokenHash)!;
    row.revokedAt = new Date(Date.now() - 60 * 1000);
}

describe("rotatsiya", () => {
    it("ishlatilgan token bekor qilinadi va rotated deb belgilanadi", async () => {
        const token = await issueRefreshToken("u1", "abc");

        expect((await consumeRefreshToken(token)).ok).toBe(true);
        expect(rows[0].revokedAt).not.toBeNull();
        expect(rows[0].rotated).toBe(true);
    });

    it("leeway ichida qayta kelgan token qabul qilinadi (ko'p tabli parallel refresh)", async () => {
        const token = await issueRefreshToken("u1", "abc");
        await consumeRefreshToken(token);

        // Darhol ikkinchi marta — bu o'g'irlik emas, tablar poygasi.
        expect((await consumeRefreshToken(token)).ok).toBe(true);
        // Boshqa sessiyalar yopilmagan bo'lishi kerak.
        expect(rows.filter((r) => r.revokedAt === null)).toHaveLength(0);
    });

    it("leeway tugagach qayta ishlatish BARCHA sessiyalarni yopadi", async () => {
        const stolen = await issueRefreshToken("u1", "abc");
        const otherDevice = await issueRefreshToken("u1", "abc");
        const otherUser = await issueRefreshToken("u2", "xyz");

        await consumeRefreshToken(stolen); // normal rotatsiya
        ageBeyondLeeway(hashRefreshToken(stolen));

        expect(await consumeRefreshToken(stolen)).toEqual({ ok: false, reason: "revoked" });

        // O'sha foydalanuvchining boshqa qurilmasi ham chiqarib yuborildi
        expect((await consumeRefreshToken(otherDevice)).ok).toBe(false);
        // Boshqa foydalanuvchiga ta'sir qilmaydi
        expect((await consumeRefreshToken(otherUser)).ok).toBe(true);
    });
});

describe("bekor qilish", () => {
    it("noma'lum (bazada yo'q) token rad etiladi", async () => {
        const orphan = signRefresh({ userId: "u1", pwv: "abc" }); // bazaga yozilmagan
        expect(await consumeRefreshToken(orphan)).toEqual({ ok: false, reason: "unknown" });
    });

    it("buzilgan imzo rad etiladi", async () => {
        expect(await consumeRefreshToken("not.a.jwt")).toEqual({ ok: false, reason: "invalid" });
    });

    it("muddati o'tgan yozuv rad etiladi", async () => {
        const token = await issueRefreshToken("u1", "abc");
        rows[0].expiresAt = new Date(Date.now() - 1000);
        expect(await consumeRefreshToken(token)).toEqual({ ok: false, reason: "expired" });
    });

    it("logout tokenni DARHOL bekor qiladi (leeway qo'llanilmaydi)", async () => {
        const token = await issueRefreshToken("u1", "abc");
        await revokeRefreshToken(token);
        // rotated=false — logout qat'iy, 30 soniyalik yengillik berilmaydi.
        expect(await consumeRefreshToken(token)).toEqual({ ok: false, reason: "revoked" });
    });

    it("revokeAllForUser faqat o'sha foydalanuvchini chiqaradi", async () => {
        await issueRefreshToken("u1", "abc");
        await issueRefreshToken("u1", "abc");
        const kept = await issueRefreshToken("u2", "xyz");

        expect(await revokeAllForUser("u1")).toBe(2);
        expect((await consumeRefreshToken(kept)).ok).toBe(true);
    });
});

describe("tozalash", () => {
    it("faqat muddati o'tgan yozuvlar o'chiriladi", async () => {
        await issueRefreshToken("u1", "abc");
        await issueRefreshToken("u2", "xyz");
        rows[0].expiresAt = new Date(Date.now() - 1000);

        expect(await cleanupExpiredRefreshTokens()).toBe(1);
        expect(rows).toHaveLength(1);
        expect(rows[0].userId).toBe("u2");
    });
});
