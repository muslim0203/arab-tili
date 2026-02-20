import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
    const easy = await p.grammarQuestion.count({ where: { difficulty: "easy" } });
    const medium = await p.grammarQuestion.count({ where: { difficulty: "medium" } });
    const hard = await p.grammarQuestion.count({ where: { difficulty: "hard" } });
    console.log({ easy, medium, hard });
}
main().finally(() => p.$disconnect());
