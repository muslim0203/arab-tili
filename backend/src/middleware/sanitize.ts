import { Request, Response, NextFunction } from "express";
import { sanitizeObject } from "../lib/sanitize.js";

/**
 * Barcha POST/PUT/PATCH so'rovlarning body'sini sanitize qiladi.
 * HTML va script teglarini olib tashlaydi.
 */
export function sanitizeBody(req: Request, _res: Response, next: NextFunction): void {
    if (req.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
        req.body = sanitizeObject(req.body);
    }
    next();
}
