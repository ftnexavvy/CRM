import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const shooter = await prisma.user.findFirst({ where: { email: "shooter@example.com" } });
  
  if (shooter) {
      const tasks = await prisma.task.findMany({
          where: { 
              assignedToId: shooter.id
          }
      });
      console.log(`Shooter has ${tasks.length} tasks:`);
      for (const t of tasks) {
          console.log(t.title);
      }
  }
}
main().finally(() => prisma.$disconnect());
