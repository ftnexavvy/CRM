import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const targetUser = await prisma.user.findFirst({
    where: { email: "admin@example.com" }
  });

  if (targetUser) {
    await prisma.user.update({
      where: { id: targetUser.id },
      data: { email: "ftnexavvyprivatelimited@gmail.com" }
    });
    console.log(`Successfully updated admin@example.com to ftnexavvyprivatelimited@gmail.com`);
  } else {
    console.log(`admin@example.com not found or already updated.`);
  }

  const allUsers = await prisma.user.findMany({
    select: { id: true, firstName: true, email: true, role: { select: { name: true } } }
  });
  console.log("All Users:", JSON.stringify(allUsers, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
