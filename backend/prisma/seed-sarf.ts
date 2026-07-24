/**
 * "Sarf asoslari" darslarini prisma/sarf-lessons.json fayldan o'qib DB'ga yozadi.
 * Idempotent: har lesson slug bo'yicha upsert qilinadi, eski savollar o'chirilib
 * qayta yaratiladi (shuning uchun script necha marta ishga tushirilsa ham xavfsiz).
 */
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

type Block = {
  type: "heading" | "paragraph" | "example" | "note" | "tableRef";
  text?: string;
  arabic?: string;
  translit?: string;
  meaning?: string;
  tableId?: string;
};

type ConjTable = {
  id: string;
  title: string;
  rootArabic: string;
  columns: string[];
  rows: { cells: string[]; highlight?: string }[];
};

type Q = {
  orderIndex: number;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

type Lesson = {
  slug: string;
  order: number;
  level: string;
  titleUz: string;
  titleAr: string;
  summary: string;
  estMinutes: number;
  isFree: boolean;
  theory: Block[];
  conjugationTables: ConjTable[];
  questions: Q[];
};

async function main() {
  console.log("📚 'Sarf asoslari' darslari qo'shilmoqda...");

  const jsonPath = path.join(__dirname, "sarf-lessons.json");
  const raw = fs.readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(raw) as { lessons: Lesson[] };

  let count = 0;
  for (const lesson of data.lessons) {
    const saved = await prisma.sarfLesson.upsert({
      where: { slug: lesson.slug },
      create: {
        slug: lesson.slug,
        order: lesson.order,
        level: lesson.level,
        titleUz: lesson.titleUz,
        titleAr: lesson.titleAr,
        summary: lesson.summary,
        estMinutes: lesson.estMinutes,
        isFree: lesson.isFree,
        theory: JSON.stringify(lesson.theory),
        conjugationTables: JSON.stringify(lesson.conjugationTables),
      },
      update: {
        order: lesson.order,
        level: lesson.level,
        titleUz: lesson.titleUz,
        titleAr: lesson.titleAr,
        summary: lesson.summary,
        estMinutes: lesson.estMinutes,
        isFree: lesson.isFree,
        theory: JSON.stringify(lesson.theory),
        conjugationTables: JSON.stringify(lesson.conjugationTables),
      },
    });

    // Idempotentlik: eski savollarni o'chirib, JSON'dan qayta yaratamiz.
    await prisma.sarfQuestion.deleteMany({ where: { lessonId: saved.id } });
    if (lesson.questions.length > 0) {
      await prisma.sarfQuestion.createMany({
        data: lesson.questions.map((q) => ({
          lessonId: saved.id,
          orderIndex: q.orderIndex,
          prompt: q.prompt,
          options: JSON.stringify(q.options),
          correctIndex: q.correctIndex,
          explanation: q.explanation,
        })),
      });
    }

    count++;
    console.log(`  ✅ ${lesson.slug} (${lesson.questions.length} ta savol)`);
  }

  console.log(`🎉 ${count} ta dars muvaffaqiyatli yozildi.`);
}

main()
  .catch((e) => {
    console.error("❌ Xatolik:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
