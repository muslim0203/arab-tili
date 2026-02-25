/**
 * Seed script for pricing system demo data.
 *
 * Creates:
 *   1. A free user (demo@arabexam.uz)
 *   2. A standard user with a mock_exam purchase (standard@arabexam.uz)
 *   3. A pro user with an active subscription (pro@arabexam.uz)
 *
 * Run: npx tsx prisma/seed-pricing.ts
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
    const passwordHash = await bcrypt.hash("Test1234!", 10);

    // ── 1. Free user ──
    const freeUser = await prisma.user.upsert({
        where: { email: "demo@arabexam.uz" },
        update: {},
        create: {
            email: "demo@arabexam.uz",
            fullName: "Demo Foydalanuvchi",
            passwordHash,
            subscriptionTier: "FREE",
            languagePreference: "uz",
        },
    });
    console.log(`✅ Free user created: ${freeUser.email} (${freeUser.id})`);

    // ── 2. Standard user (has purchased a mock exam) ──
    const standardUser = await prisma.user.upsert({
        where: { email: "standard@arabexam.uz" },
        update: {},
        create: {
            email: "standard@arabexam.uz",
            fullName: "Standard Foydalanuvchi",
            passwordHash,
            subscriptionTier: "FREE", // base tier is FREE, access comes from Purchase
            languagePreference: "uz",
        },
    });

    const purchaseExpiry = new Date();
    purchaseExpiry.setDate(purchaseExpiry.getDate() + 7);

    await prisma.purchase.upsert({
        where: { id: "seed-purchase-standard" },
        update: {},
        create: {
            id: "seed-purchase-standard",
            userId: standardUser.id,
            productType: "mock_exam",
            quantity: 1,
            remainingUses: 1,
            expiresAt: purchaseExpiry,
        },
    });
    console.log(`✅ Standard user created: ${standardUser.email} (${standardUser.id}) with 1 mock exam purchase`);

    // ── 3. Pro user (active subscription) ──
    const proUser = await prisma.user.upsert({
        where: { email: "pro@arabexam.uz" },
        update: {
            subscriptionTier: "PRO",
            subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        },
        create: {
            email: "pro@arabexam.uz",
            fullName: "Pro Foydalanuvchi",
            passwordHash,
            subscriptionTier: "PRO",
            subscriptionExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            languagePreference: "uz",
        },
    });

    const subStart = new Date();
    const subEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.subscription.upsert({
        where: { id: "seed-sub-pro" },
        update: {
            status: "active",
            expiresAt: subEnd,
        },
        create: {
            id: "seed-sub-pro",
            userId: proUser.id,
            planType: "pro",
            startedAt: subStart,
            expiresAt: subEnd,
            status: "active",
        },
    });

    // Create usage tracking for Pro user (simulate some usage)
    const types = ["mock", "writing", "speaking"] as const;
    const usedCounts = [1, 3, 2]; // simulate partial usage

    for (let i = 0; i < types.length; i++) {
        await prisma.usageTracking.upsert({
            where: {
                userId_type_periodStart: {
                    userId: proUser.id,
                    type: types[i],
                    periodStart: subStart,
                },
            },
            update: { usedCount: usedCounts[i] },
            create: {
                userId: proUser.id,
                type: types[i],
                usedCount: usedCounts[i],
                periodStart: subStart,
                periodEnd: subEnd,
            },
        });
    }

    console.log(`✅ Pro user created: ${proUser.email} (${proUser.id}) with active subscription`);
    console.log(`   Mock: ${usedCounts[0]}/3, Writing: ${usedCounts[1]}/10, Speaking: ${usedCounts[2]}/6`);

    console.log("\n🎉 Pricing seed data complete!");
    console.log("Passwords for all accounts: Test1234!");
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
