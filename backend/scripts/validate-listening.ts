/**
 * Listening savollarini tekshiruvchi mustaqil skript (DB'ga ulanmaydi).
 *
 * Har bir savol uchun tekshiradi:
 *   - matn bor (dialog `lines` yoki monolog `transcript`);
 *   - `options` uzunligi aynan 4;
 *   - `correctIndex` 0..3 oralig'ida;
 *   - variantlar bo'sh emas va takrorlanmaydi.
 *
 * ISHGA TUSHIRISH:
 *   cd backend && npx tsx scripts/validate-listening.ts
 * Xato topilsa 1 kod bilan chiqadi (CI uchun mos).
 */
import { validateItems, type ListeningDifficulty, type ListeningItem } from "../prisma/listening-common.js";
import { listeningEasyItems } from "../prisma/seed-listening-easy.js";
import { listeningMediumItems } from "../prisma/seed-listening-medium.js";
import { listeningHardItems } from "../prisma/seed-listening-hard.js";

const datasets: { difficulty: ListeningDifficulty; items: ListeningItem[] }[] = [
    { difficulty: "easy", items: listeningEasyItems },
    { difficulty: "medium", items: listeningMediumItems },
    { difficulty: "hard", items: listeningHardItems },
];

let totalErrors = 0;
let totalItems = 0;

console.log("🔍 Listening savollari tekshirilmoqda...\n");

for (const { difficulty, items } of datasets) {
    totalItems += items.length;

    // Umumiy validatsiya (listening-common.ts).
    const errors = validateItems(difficulty, items);

    // Qo'shimcha aniq tekshiruv (talab bo'yicha): options.length === 4 va correctIndex 0..3.
    items.forEach((item, i) => {
        const tag = `${difficulty}[${i + 1}]`;
        if (item.options.length !== 4) {
            errors.push(`${tag}: options.length = ${item.options.length} (kutilgan: 4)`);
        }
        if (item.correctIndex < 0 || item.correctIndex > 3) {
            errors.push(`${tag}: correctIndex = ${item.correctIndex} (kutilgan: 0..3)`);
        }
    });

    const unique = [...new Set(errors)];
    if (unique.length === 0) {
        console.log(`✅ ${difficulty.padEnd(6)} — ${items.length} ta savol, xato yo'q`);
    } else {
        totalErrors += unique.length;
        console.log(`❌ ${difficulty.padEnd(6)} — ${unique.length} ta xato:`);
        unique.forEach((e) => console.log("     - " + e));
    }
}

console.log("");
console.log(`Jami: ${totalItems} ta savol, ${totalErrors} ta xato`);

if (totalErrors > 0) {
    process.exit(1);
}
console.log("🎉 Barcha savollar to'g'ri!");
