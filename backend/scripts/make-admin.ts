import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = "zhonilynx.rivakonix@joseph-net.com";

async function main() {
  const result = await prisma.user.updateMany({
    where: { email: EMAIL },
    data: { isAdmin: true },
  });
  if (result.count === 0) {
    console.error(`Foydalanuvchi topilmadi: ${EMAIL}`);
    process.exit(1);
  }
  console.log(`Admin qilindi: ${EMAIL}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
