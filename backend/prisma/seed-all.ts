/**
 * Barcha seed skriptlarni ketma-ket ishlatadigan yagona script.
 * Railway'da bir marta ishlatish uchun:
 *   RAILPACK_START_CMD = "npx prisma migrate deploy && npx tsx prisma/seed-all.ts && node dist/index.js"
 */
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const scripts = [
    "seed.ts",               // Asosiy seed (listening stages, namuna savollar, admin user)
    "seed-grammar-easy.ts",  // 100 ta oson grammar
    "seed-grammar-medium.ts",// 100 ta o'rta grammar
    "seed-grammar-hard.ts",  // 100 ta qiyin grammar
    "seed-reading-easy-1.ts",
    "seed-reading-easy-2.ts",
    "seed-reading-easy-3.ts",
    "seed-reading-easy-4.ts",
    "seed-reading-easy-5.ts",
    "seed-reading-med-1.ts",
    "seed-reading-med-2.ts",
    "seed-reading-med-3.ts",
    "seed-reading-med-4.ts",
    "seed-reading-med-5.ts",
    "seed-reading-med-6.ts",
    "seed-reading-med-7.ts",
    "seed-reading-med-8.ts",
    "seed-reading-med-9.ts",
    "seed-reading-med-10.ts",
    "seed-reading-hard-1.ts",
    "seed-reading-hard-2.ts",
    "seed-reading-hard-3.ts",
    "seed-reading-hard-4.ts",
    "seed-reading-hard-5.ts",
    "seed-reading-hard-6.ts",
    "seed-reading-hard-7.ts",
    "seed-reading-hard-8.ts",
    "seed-reading-hard-9.ts",
    "seed-reading-hard-10.ts",
    "seed-writing-medium.ts",
    "seed-writing-hard.ts",
    "seed-speaking-easy.ts",
    "seed-speaking-medium.ts",
    "seed-speaking-hard.ts",
];

async function main() {
    console.log("🚀 Barcha seed skriptlar ishga tushmoqda...\n");

    let success = 0;
    let failed = 0;

    for (const script of scripts) {
        const scriptPath = path.join(__dirname, script);
        console.log(`\n📦 Ishlatilmoqda: ${script}`);
        try {
            execSync(`npx tsx "${scriptPath}"`, {
                cwd: path.join(__dirname, ".."),
                stdio: "inherit",
                env: process.env,
            });
            success++;
            console.log(`✅ ${script} tugadi`);
        } catch (err) {
            failed++;
            console.error(`❌ ${script} xatolik bilan tugadi`);
        }
    }

    console.log(`\n🎉 Natija: ${success} muvaffaqiyatli, ${failed} xatolik`);
}

main().catch((e) => {
    console.error("❌ Global xatolik:", e);
    process.exit(1);
});
