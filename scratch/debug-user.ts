import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "shooter@example.com" } });
  console.log("Shooter:", user);
}
main().finally(() => prisma.$disconnect());
