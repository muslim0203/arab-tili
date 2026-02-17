import { config } from "../config.js";

export interface GoogleUserInfo {
    sub: string;        // Google unique ID  
    email: string;
    email_verified: boolean;
    name: string;
    picture?: string;
    given_name?: string;
    family_name?: string;
}

/**
 * Google token orqali foydalanuvchi ma'lumotlarini olish.
 *
 * Frontend implicit flow ishlatganligi uchun access_token keladi.
 * access_token bilan Google userinfo endpoint'iga so'rov yuboriladi.
 * 
 * Agar id_token kelsa – tokeninfo endpoint ishlatiladi.
 */
export async function verifyGoogleToken(token: string): Promise<GoogleUserInfo> {
    const clientId = config.googleClientId;
    if (!clientId) {
        throw new Error("GOOGLE_CLIENT_ID sozlanmagan. .env da GOOGLE_CLIENT_ID ni belgilang.");
    }

    // Avval access_token sifatida userinfo endpoint'idan foydalanib ko'ramiz
    try {
        const userInfoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (userInfoRes.ok) {
            const payload = await userInfoRes.json() as Record<string, unknown>;

            if (!payload.sub || !payload.email) {
                throw new Error("Google javobida sub yoki email yo'q");
            }

            const emailVerified = payload.email_verified === true || payload.email_verified === "true";
            if (!emailVerified) {
                throw new Error("Google email tasdiqlanmagan");
            }

            return {
                sub: String(payload.sub),
                email: String(payload.email),
                email_verified: true,
                name: String(payload.name ?? payload.email),
                picture: payload.picture ? String(payload.picture) : undefined,
                given_name: payload.given_name ? String(payload.given_name) : undefined,
                family_name: payload.family_name ? String(payload.family_name) : undefined,
            };
        }
    } catch (e) {
        // userinfo ishlamasa, id_token sifatida tekshirib ko'ramiz
        if (e instanceof Error && e.message.includes("email")) throw e;
    }

    // Fallback: id_token sifatida tokeninfo endpoint
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);

    if (!tokenInfoRes.ok) {
        throw new Error("Google token noto'g'ri yoki muddati o'tgan");
    }

    const payload = await tokenInfoRes.json() as Record<string, unknown>;

    // aud (audience) tekshiruvi
    if (payload.aud !== clientId) {
        throw new Error("Google token noto'g'ri ilovaga tegishli");
    }

    if (payload.email_verified !== "true" && payload.email_verified !== true) {
        throw new Error("Google email tasdiqlanmagan");
    }

    return {
        sub: String(payload.sub),
        email: String(payload.email),
        email_verified: true,
        name: String(payload.name ?? payload.email),
        picture: payload.picture ? String(payload.picture) : undefined,
        given_name: payload.given_name ? String(payload.given_name) : undefined,
        family_name: payload.family_name ? String(payload.family_name) : undefined,
    };
}
