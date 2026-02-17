import rateLimit from "express-rate-limit";

/**
 * Umumiy API rate limiter – barcha endpointlar uchun.
 * 15 daqiqada 100 so'rov.
 */
export const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 min
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Juda ko'p so'rov. Iltimos, biroz kuting." },
});

/**
 * Auth endpointlari uchun qattiq limiter.
 * Login: 15 daqiqada 5 urinish.
 */
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Juda ko'p kirish urinishi. 15 daqiqadan so'ng qayta urinib ko'ring." },
});

/**
 * Register uchun limiter.
 * 1 soatda 3 ro'yxatdan o'tish.
 */
export const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 soat
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Juda ko'p ro'yxatdan o'tish urinishi. 1 soatdan so'ng qayta urinib ko'ring." },
});

/**
 * Parolni tiklash uchun limiter.
 * 1 soatda 3 so'rov.
 */
export const forgotPasswordLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Juda ko'p so'rov. 1 soatdan so'ng qayta urinib ko'ring." },
});

/**
 * AI endpointlari uchun limiter.
 * 1 daqiqada 10 so'rov.
 */
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 min
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "AI so'rovlari limiti. Biroz kuting." },
});
