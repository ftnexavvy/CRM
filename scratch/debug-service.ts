import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }) });

async function main() {
  const service = await prisma.service.findFirst({
    where: { name: { contains: "Video", mode: "insensitive" } },
    include: { department: true, owner: true }
  });
  console.log("Service:", service?.name);
  console.log("Department:", service?.department?.name);
  console.log("Owner:", service?.owner?.email);
  
  const allServices = await prisma.service.findMany({
      include: { department: true, owner: true }
  });
  console.log("All services:");
  allServices.forEach(s => console.log(s.name, "Dept:", s.department?.name, "Owner:", s.owner?.email));
}
main().finally(() => prisma.$disconnect());
