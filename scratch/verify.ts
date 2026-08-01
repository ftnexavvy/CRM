import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const user = await prisma.user.findFirst({ where: { email: "shooter@example.com" } });
  if (user) {
      const tasks = await prisma.task.findMany({ where: { assignedToId: user.id } });
      console.log(`Shooter Pro has ${tasks.length} tasks:`);
      tasks.forEach(t => console.log(t.title));
  }
}
main().finally(() => prisma.$disconnect());
