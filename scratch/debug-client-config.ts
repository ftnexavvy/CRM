import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const client = await prisma.client.findFirst({ 
      where: { name: { contains: "dixit", mode: "insensitive" } },
      include: { services: { include: { service: true } } }
  });
  if (!client) return;
  console.log("Services:");
  client.services.forEach(s => console.log(s.service?.name, JSON.stringify(s.configuration)));
}
main().finally(() => prisma.$disconnect());
