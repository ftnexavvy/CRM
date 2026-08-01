import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const users = await prisma.user.findMany({ include: { role: true } });
  for (const u of users) {
      if (u.role?.name === "Admin" || u.role?.name === "Super Admin") {
          console.log(`Admin: ${u.email}`);
      }
  }
}
main().finally(() => prisma.$disconnect());
