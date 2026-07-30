import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const services = await prisma.service.findMany();
  console.log(services.map(s => s.name));
}
main().catch(console.error).finally(() => prisma.$disconnect());
