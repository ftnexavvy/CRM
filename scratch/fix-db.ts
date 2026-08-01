import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const dev = await prisma.user.findFirst({ where: { email: "dev@gmail.com" } });
  const shooter = await prisma.user.findFirst({ where: { email: "shooter@example.com" } });
  
  if (dev && shooter) {
      const res = await prisma.task.updateMany({
          where: { 
              assignedToId: shooter.id,
              title: { contains: "Reel" }
          },
          data: {
              assignedToId: dev.id
          }
      });
      console.log(`Reassigned ${res.count} reel tasks from Shooter to Dev.`);
  }
}
main().finally(() => prisma.$disconnect());
