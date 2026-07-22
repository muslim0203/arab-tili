/**
 * Strukturali (JSON) logger — qo'shimcha kutubxonasiz.
 *
 * Production'da har bir log bitta JSON qator sifatida chiqadi — Railway/Datadog/Grafana
 * kabi tizimlar uni avtomatik indekslaydi. Development'da o'qish oson oddiy format.
 *
 * Keyinchalik Sentry qo'shmoqchi bo'lsangiz: `npm i @sentry/node` va error() ichida
 * Sentry.captureException chaqiring.
 */
import { config } from "../config.js";

type Level = "info" | "warn" | "error";

const isProd = config.nodeEnv === "production";

function log(level: Level, msg: string, meta?: Record<string, unknown>): void {
    const time = new Date().toISOString();
    if (isProd) {
        // JSON format — log agregatorlar uchun
        const entry: Record<string, unknown> = { time, level, msg, ...meta };
        const line = JSON.stringify(entry);
        if (level === "error") console.error(line);
        else if (level === "warn") console.warn(line);
        else console.log(line);
    } else {
        const metaStr = meta && Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
        const line = `[${time}] ${level.toUpperCase()} ${msg}${metaStr}`;
        if (level === "error") console.error(line);
        else if (level === "warn") console.warn(line);
        else console.log(line);
    }
}

export const logger = {
    info: (msg: string, meta?: Record<string, unknown>) => log("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => log("warn", msg, meta),
    error: (msg: string, err?: unknown, meta?: Record<string, unknown>) => {
        const errMeta: Record<string, unknown> = { ...meta };
        if (err instanceof Error) {
            errMeta.error = err.message;
            if (!isProd) errMeta.stack = err.stack;
        } else if (err !== undefined) {
            errMeta.error = String(err);
        }
        log("error", msg, errMeta);
    },
};
