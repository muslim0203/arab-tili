import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
    await p.writingTask.create({
        data: {
            difficulty: "hard",
            prompt: `اُكتُب مَقالَةً عَن مُستَقبَلِ الطّاقَةِ في العالَم.
١. أنواع مَصادِر الطّاقَة الحالِيَّة والبَديلَة
٢. التَّحَدِّيات البيئِيَّة والاقتِصادِيَّة
٣. رُؤيَة لِمُستَقبَل الطّاقَة النَّظيفَة`,
        },
    });
    const c = await p.writingTask.count({ where: { difficulty: "hard" } });
    console.log("Jami qiyin:", c);
}
main().finally(() => p.$disconnect());
