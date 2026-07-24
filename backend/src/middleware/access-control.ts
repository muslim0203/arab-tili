/**
 * Access Control Middleware
 *
 * Server-side route guards that check user access before allowing
 * access to protected features (full exams, writing AI, speaking AI, etc.)
 */

import { Response, NextFunction } from "express";
import { type AuthRequest } from "./auth.js";
import {
    canStartMock,
    canUseWritingAI,
    canUseSpeakingAI,
    canAccessFullSarf,
    canUseAITutor,
} from "../services/access-control.js";

/**
 * Middleware: Require full exam access (Standard purchase or Pro subscription)
 */
export async function requireMockAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ message: "Avtorizatsiya kerak." });
        return;
    }

    const result = await canStartMock(req.userId);
    if (!result.allowed) {
        res.status(403).json({
            message: result.reason,
            planType: result.planType,
            upgradeRequired: true,
        });
        return;
    }

    next();
}

/**
 * Middleware: Require Writing AI access (Free demo or Pro subscription)
 */
export async function requireWritingAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ message: "Avtorizatsiya kerak." });
        return;
    }

    const result = await canUseWritingAI(req.userId);
    if (!result.allowed) {
        res.status(403).json({
            message: result.reason,
            planType: result.planType,
            upgradeRequired: true,
        });
        return;
    }

    next();
}

/**
 * Middleware: Require Speaking AI access (Free demo or Pro subscription)
 */
export async function requireSpeakingAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ message: "Avtorizatsiya kerak." });
        return;
    }

    const result = await canUseSpeakingAI(req.userId);
    if (!result.allowed) {
        res.status(403).json({
            message: result.reason,
            planType: result.planType,
            upgradeRequired: true,
        });
        return;
    }

    next();
}

/**
 * Middleware: Require full Sarf platform access (Pro only)
 */
export async function requireSarfAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ message: "Avtorizatsiya kerak." });
        return;
    }

    const result = await canAccessFullSarf(req.userId);
    if (!result.allowed) {
        res.status(403).json({
            message: result.reason,
            planType: result.planType,
            upgradeRequired: true,
        });
        return;
    }

    next();
}

/**
 * Middleware: Require AI Tutor access (Pro only)
 */
export async function requireAITutorAccess(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    if (!req.userId) {
        res.status(401).json({ message: "Avtorizatsiya kerak." });
        return;
    }

    const result = await canUseAITutor(req.userId);
    if (!result.allowed) {
        res.status(403).json({
            message: result.reason,
            planType: result.planType,
            upgradeRequired: true,
        });
        return;
    }

    next();
}
