/**
 * Xavfsizlik-kritik logika uchun unit testlar.
 * Ishga tushirish: npm test (backend papkasida)
 */
import { describe, it, expect, vi } from "vitest";
import crypto from "crypto";

// Config modul import paytida process.env o'qiydi — shuning uchun env'ni oldin o'rnatamiz.
const TEST_SECRET = "test_jwt_secret_kamida_32_belgidan_iborat!!";
const TEST_REFRESH = "test_refresh_secret_boshqa_32_belgili_qiymat";
const CLICK_KEY = "click_test_secret_key";
const PAYME_KEY = "payme_test_merchant_key";

process.env.JWT_SECRET = TEST_SECRET;
process.env.JWT_REFRESH_SECRET = TEST_REFRESH;
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/test";
process.env.CLICK_SECRET_KEY = CLICK_KEY;
process.env.PAYME_MERCHANT_KEY = PAYME_KEY;

const { passwordVersion, signRefresh, verifyRefresh, signPasswordResetToken, verifyPasswordResetToken } =
    await import("../src/lib/jwt");
const { verifyPrepareSign, timingSafeEqualStr } = await import("../src/lib/click");
const { verifyPaymeAuth } = await import("../src/lib/payme");
const { safeAudioExt } = await import("../src/lib/sanitize");

describe("passwordVersion (token revocation)", () => {
    it("bir xil hash uchun bir xil pwv qaytaradi", () => {
        expect(passwordVersion("hash123")).toBe(passwordVersion("hash123"));
    });

    it("parol o'zgarsa pwv ham o'zgaradi", () => {
        expect(passwordVersion("eski_hash")).not.toBe(passwordVersion("yangi_hash"));
    });

    it("null/undefined (Google foydalanuvchi) uchun ham ishlaydi", () => {
        expect(passwordVersion(null)).toBe(passwordVersion(undefined));
        expect(passwordVersion(null)).toHaveLength(16);
    });
});

describe("refresh token pwv bog'lanishi", () => {
    it("token ichida pwv saqlanadi va tekshiriladi", () => {
        const pwv = passwordVersion("somehash");
        const token = signRefresh({ userId: "u1", pwv });
        const payload = verifyRefresh(token);
        expect(payload.userId).toBe("u1");
        expect(payload.pwv).toBe(pwv);
        // Parol o'zgargan bo'lsa pwv mos kelmaydi
        expect(payload.pwv).not.toBe(passwordVersion("yangi_parol_hash"));
    });
});

describe("parol tiklash tokeni", () => {
    it("purpose va pwv bilan imzolanadi", () => {
        const pwv = passwordVersion("hash");
        const token = signPasswordResetToken({ email: "a@b.uz", purpose: "reset", pwv });
        const payload = verifyPasswordResetToken(token);
        expect(payload.email).toBe("a@b.uz");
        expect(payload.pwv).toBe(pwv);
    });

    it("refresh token reset token sifatida qabul qilinmaydi", () => {
        const token = signRefresh({ userId: "u1", pwv: "x" });
        expect(() => verifyPasswordResetToken(token)).toThrow();
    });
});

describe("Click imzo tekshiruvi", () => {
    const base = {
        click_trans_id: "12345",
        service_id: "111",
        merchant_trans_id: "pay_abc",
        amount: "89000.00",
        action: "0",
        sign_time: "2026-07-02 10:00:00",
    };

    function makeSign(secret: string): string {
        return crypto
            .createHash("md5")
            .update([base.click_trans_id, base.service_id, secret, base.merchant_trans_id, base.amount, base.action, base.sign_time].join(""))
            .digest("hex");
    }

    it("to'g'ri imzo qabul qilinadi", () => {
        expect(verifyPrepareSign({ ...base, sign_string: makeSign(CLICK_KEY) })).toBe(true);
    });

    it("noto'g'ri imzo rad etiladi", () => {
        expect(verifyPrepareSign({ ...base, sign_string: makeSign("boshqa_kalit") })).toBe(false);
        expect(verifyPrepareSign({ ...base, sign_string: "notogri" })).toBe(false);
    });

    it("bo'sh kalit bilan hech qanday imzo qabul qilinmaydi (fail closed)", async () => {
        vi.resetModules();
        process.env.CLICK_SECRET_KEY = "";
        const fresh = await import("../src/lib/click");
        // Bo'sh kalit bilan hisoblangan "to'g'ri" imzo ham rad etilishi kerak
        expect(fresh.verifyPrepareSign({ ...base, sign_string: makeSign("") })).toBe(false);
        process.env.CLICK_SECRET_KEY = CLICK_KEY;
        vi.resetModules();
    });
});

describe("Payme Basic auth", () => {
    function basic(login: string, pass: string): string {
        return "Basic " + Buffer.from(`${login}:${pass}`).toString("base64");
    }

    it("to'g'ri login/parol qabul qilinadi", () => {
        expect(verifyPaymeAuth(basic("Paycom", PAYME_KEY))).toBe(true);
    });

    it("noto'g'ri parol yoki login rad etiladi", () => {
        expect(verifyPaymeAuth(basic("Paycom", "notogri"))).toBe(false);
        expect(verifyPaymeAuth(basic("Boshqa", PAYME_KEY))).toBe(false);
        expect(verifyPaymeAuth(undefined)).toBe(false);
        expect(verifyPaymeAuth("Bearer xyz")).toBe(false);
    });

    it("bo'sh kalit bilan hech kim kira olmaydi (fail closed)", async () => {
        vi.resetModules();
        process.env.PAYME_MERCHANT_KEY = "";
        const fresh = await import("../src/lib/payme");
        expect(fresh.verifyPaymeAuth(basic("Paycom", ""))).toBe(false);
        process.env.PAYME_MERCHANT_KEY = PAYME_KEY;
        vi.resetModules();
    });
});

describe("timingSafeEqualStr", () => {
    it("teng satrlar uchun true", () => {
        expect(timingSafeEqualStr("abc123", "abc123")).toBe(true);
    });
    it("har xil uzunlik/qiymat uchun false", () => {
        expect(timingSafeEqualStr("abc", "abcd")).toBe(false);
        expect(timingSafeEqualStr("abc", "abd")).toBe(false);
    });
});

describe("safeAudioExt (fayl kengaytma allowlist)", () => {
    it("ruxsat etilgan kengaytmalar saqlanadi", () => {
        expect(safeAudioExt("audio.mp3")).toBe(".mp3");
        expect(safeAudioExt("recording.webm")).toBe(".webm");
        expect(safeAudioExt("BIG.WAV")).toBe(".wav");
    });
    it("xavfli kengaytmalar fallback bilan almashtiriladi", () => {
        expect(safeAudioExt("evil.php")).toBe(".webm");
        expect(safeAudioExt("page.html")).toBe(".webm");
        expect(safeAudioExt("script.js", "")).toBe("");
        expect(safeAudioExt(undefined)).toBe(".webm");
    });
});
